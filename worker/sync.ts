/**
 * Mellon Portal - ClientTether Sync Worker
 *
 * This worker runs on a schedule (hourly) to sync data from
 * ClientTether API into the local PostgreSQL database.
 *
 * Usage:
 *   npm run sync
 *   npx tsx worker/sync.ts
 *
 * The worker will:
 * 1. Fetch all active tenants with clienttetherWebKey from the database
 * 2. For each tenant, sync leads, opportunities, notes, and activities
 * 3. Store raw snapshots and update normalized tables
 * 4. Log sync status and any errors
 * 5. On Sundays, create weekly snapshots linked to reportWeeks
 */

import 'dotenv/config';
import cron from 'node-cron';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, isNotNull, and, isNull } from 'drizzle-orm';
import * as schema from '../src/lib/db/schema';
import {
  createClientTetherClient,
  type CTLeadResponse,
  type CTOpportunityResponse,
  type CTNoteResponse,
  type CTActivityResponse,
} from '../src/lib/clienttether/client';

// Types
type Database = ReturnType<typeof drizzle<typeof schema>>;
type SyncStatus = 'running' | 'success' | 'failed';

interface SyncRunRecord {
  id: string;
  tenantId: string;
  status: SyncStatus;
  startedAt: Date;
  finishedAt?: Date | null;
  recordsUpdated?: number | null;
  errorMessage?: string | null;
}

interface TenantRecord {
  id: string;
  name: string;
  clienttetherWebKey: string | null;
  clienttetherAccessToken: string | null;
  status: 'active' | 'inactive' | 'suspended';
}

// Export functions for testing
export async function createSyncRun(
  db: Database,
  tenantId: string
): Promise<SyncRunRecord> {
  const [syncRun] = await db
    .insert(schema.syncRuns)
    .values({
      tenantId,
      status: 'running',
      startedAt: new Date(),
    })
    .returning();

  return syncRun as SyncRunRecord;
}

export async function updateSyncRunStatus(
  db: Database,
  syncRunId: string,
  status: SyncStatus,
  options?: { recordsUpdated?: number; errorMessage?: string }
): Promise<SyncRunRecord> {
  const [updated] = await db
    .update(schema.syncRuns)
    .set({
      status,
      finishedAt: new Date(),
      recordsUpdated: options?.recordsUpdated ?? 0,
      errorMessage: options?.errorMessage,
    })
    .where(eq(schema.syncRuns.id, syncRunId))
    .returning();

  return updated as SyncRunRecord;
}

export async function storeRawSnapshot(
  db: Database,
  tenantId: string,
  endpoint: string,
  payload: unknown
) {
  const [snapshot] = await db
    .insert(schema.ctRawSnapshots)
    .values({
      tenantId,
      endpoint,
      payloadJson: payload,
      fetchedAt: new Date(),
    })
    .returning();

  return snapshot;
}

export async function fetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  maxAttempts: number = 3
): Promise<T> {
  const delays = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fetchFn();
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        throw error;
      }
      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
    }
  }

  throw new Error('Max retry attempts exceeded');
}

export async function getTenantsWithWebKey(db: Database): Promise<TenantRecord[]> {
  const tenants = await db
    .select({
      id: schema.tenants.id,
      name: schema.tenants.name,
      clienttetherWebKey: schema.tenants.clienttetherWebKey,
      clienttetherAccessToken: schema.tenants.clienttetherAccessToken,
      status: schema.tenants.status,
    })
    .from(schema.tenants)
    .where(
      and(
        isNotNull(schema.tenants.clienttetherWebKey),
        eq(schema.tenants.status, 'active')
      )
    );

  return tenants as TenantRecord[];
}

/**
 * Parses a date string from CT API, returning a Date or null.
 */
function parseSourceDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Returns the earliest source date from a group of leads/opportunities.
 */
function getEarliestSourceDate(dates: (Date | null)[]): Date | null {
  const valid = dates.filter((d): d is Date => d !== null);
  if (valid.length === 0) return null;
  return valid.reduce((earliest, d) => (d < earliest ? d : earliest));
}

// Data normalization functions
async function normalizeLeadMetrics(
  db: Database,
  tenantId: string,
  leads: CTLeadResponse[]
) {
  // Group leads by source and status, tracking earliest creation dates
  const sourceGroups = new Map<string, number>();
  const statusGroups = new Map<string, number>();
  const sourceDates = new Map<string, (Date | null)[]>();
  const statusDates = new Map<string, (Date | null)[]>();

  for (const lead of leads) {
    const source = lead.clients_lead_source || lead.source || 'unknown';
    const status = lead.clients_sales_cycle || lead.status || 'unknown';
    const sourceDate = parseSourceDate(lead.created || lead.last_modified_date);

    sourceGroups.set(source, (sourceGroups.get(source) || 0) + 1);
    statusGroups.set(status, (statusGroups.get(status) || 0) + 1);

    if (!sourceDates.has(source)) sourceDates.set(source, []);
    sourceDates.get(source)!.push(sourceDate);

    if (!statusDates.has(status)) statusDates.set(status, []);
    statusDates.get(status)!.push(sourceDate);
  }

  let recordsUpdated = 0;

  // Delete existing metrics for this tenant (non-report-week linked)
  await db
    .delete(schema.leadMetrics)
    .where(
      and(
        eq(schema.leadMetrics.tenantId, tenantId),
        isNull(schema.leadMetrics.reportWeekId)
      )
    );

  // Insert source dimension metrics
  for (const [source, count] of sourceGroups) {
    await db.insert(schema.leadMetrics).values({
      tenantId,
      dimensionType: 'source',
      dimensionValue: source,
      leads: count,
      sourceCreatedAt: getEarliestSourceDate(sourceDates.get(source) || []),
    });
    recordsUpdated++;
  }

  // Insert status dimension metrics
  for (const [status, count] of statusGroups) {
    await db.insert(schema.leadMetrics).values({
      tenantId,
      dimensionType: 'status',
      dimensionValue: status,
      leads: count,
      sourceCreatedAt: getEarliestSourceDate(statusDates.get(status) || []),
    });
    recordsUpdated++;
  }

  return recordsUpdated;
}

export async function normalizePipelineStages(
  db: Database,
  tenantId: string,
  opportunities: CTOpportunityResponse[]
) {
  // Group opportunities by stage, tracking count, dollar value, and source dates
  const stageGroups = new Map<string, number>();
  const stageDollarValues = new Map<string, number>();
  const stageDates = new Map<string, (Date | null)[]>();

  for (const opp of opportunities) {
    const stage = opp.contact_sales_cycle || opp.stage || 'unknown';
    const dollarVal = parseFloat(opp.deal_size || '0') || opp.value || 0;
    const sourceDate = parseSourceDate(opp.created || opp.last_modified_date);
    stageGroups.set(stage, (stageGroups.get(stage) || 0) + 1);
    stageDollarValues.set(stage, (stageDollarValues.get(stage) || 0) + dollarVal);
    if (!stageDates.has(stage)) stageDates.set(stage, []);
    stageDates.get(stage)!.push(sourceDate);
  }

  let recordsUpdated = 0;

  // Delete existing stage counts for this tenant (non-report-week linked)
  await db
    .delete(schema.pipelineStageCounts)
    .where(
      and(
        eq(schema.pipelineStageCounts.tenantId, tenantId),
        isNull(schema.pipelineStageCounts.reportWeekId)
      )
    );

  // Insert stage counts with dollar values
  for (const [stage, count] of stageGroups) {
    const dollarValue = stageDollarValues.get(stage) || 0;
    await db.insert(schema.pipelineStageCounts).values({
      tenantId,
      stage,
      count,
      dollarValue: String(dollarValue),
      sourceCreatedAt: getEarliestSourceDate(stageDates.get(stage) || []),
    });
    recordsUpdated++;
  }

  return recordsUpdated;
}

async function normalizeHotListItems(
  db: Database,
  tenantId: string,
  opportunities: CTOpportunityResponse[]
) {
  // Filter for high-probability opportunities (hot list items)
  const hotItems = opportunities.filter((opp) => (opp.probability || 0) >= 50);

  let recordsUpdated = 0;

  // Delete existing hot list items for this tenant (non-report-week linked)
  await db
    .delete(schema.hotListItems)
    .where(
      and(
        eq(schema.hotListItems.tenantId, tenantId),
        isNull(schema.hotListItems.reportWeekId)
      )
    );

  // Insert hot list items
  for (const item of hotItems) {
    await db.insert(schema.hotListItems).values({
      tenantId,
      candidateName: item.title || 'Unknown',
      stage: item.stage || 'unknown',
      likelyPct: item.probability || 0,
      iff: String(item.value || 0),
      weightedIff: String((item.value || 0) * ((item.probability || 0) / 100)),
      rawJson: item,
      sourceCreatedAt: parseSourceDate(item.created || item.last_modified_date),
    });
    recordsUpdated++;
  }

  return recordsUpdated;
}

async function normalizeNotes(
  db: Database,
  tenantId: string,
  notes: CTNoteResponse[]
) {
  let recordsUpdated = 0;

  for (const note of notes) {
    // Check if note already exists (by id)
    const existing = await db
      .select()
      .from(schema.ctNotes)
      .where(
        and(
          eq(schema.ctNotes.tenantId, tenantId),
          eq(schema.ctNotes.contactId, note.contact_id)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.ctNotes).values({
        tenantId,
        contactId: note.contact_id,
        noteDate: new Date(note.date),
        author: note.author,
        content: note.content,
        rawJson: note,
      });
      recordsUpdated++;
    }
  }

  return recordsUpdated;
}

async function normalizeScheduledActivities(
  db: Database,
  tenantId: string,
  activities: CTActivityResponse[]
) {
  let recordsUpdated = 0;

  for (const activity of activities) {
    await db.insert(schema.ctScheduledActivities).values({
      tenantId,
      activityType: activity.type,
      scheduledAt: new Date(activity.scheduled_at),
      contactName: activity.contact_name,
      description: activity.description,
      status: activity.status,
      rawJson: activity,
    });
    recordsUpdated++;
  }

  return recordsUpdated;
}

/**
 * Creates a weekly snapshot by copying current live rows (reportWeekId IS NULL)
 * from leadMetrics and pipelineStageCounts into report-week-linked rows.
 */
export async function createWeeklySnapshot(
  db: Database,
  tenantId: string,
  reportWeekId: string
): Promise<number> {
  let snapshotCount = 0;

  // Read current live leadMetrics rows for this tenant
  const liveLeadMetrics = await db
    .select()
    .from(schema.leadMetrics)
    .where(
      and(
        eq(schema.leadMetrics.tenantId, tenantId),
        isNull(schema.leadMetrics.reportWeekId)
      )
    );

  // Insert copies linked to the report week
  for (const row of liveLeadMetrics) {
    await db.insert(schema.leadMetrics).values({
      tenantId: row.tenantId,
      reportWeekId,
      dimensionType: row.dimensionType,
      dimensionValue: row.dimensionValue,
      clicks: row.clicks,
      impressions: row.impressions,
      cost: row.cost,
      leads: row.leads,
      qualifiedLeads: row.qualifiedLeads,
      sourceCreatedAt: row.sourceCreatedAt,
    });
    snapshotCount++;
  }

  // Read current live pipelineStageCounts rows for this tenant
  const livePipelineStages = await db
    .select()
    .from(schema.pipelineStageCounts)
    .where(
      and(
        eq(schema.pipelineStageCounts.tenantId, tenantId),
        isNull(schema.pipelineStageCounts.reportWeekId)
      )
    );

  // Insert copies linked to the report week
  for (const row of livePipelineStages) {
    await db.insert(schema.pipelineStageCounts).values({
      tenantId: row.tenantId,
      reportWeekId,
      stage: row.stage,
      count: row.count,
      dollarValue: row.dollarValue,
      sourceCreatedAt: row.sourceCreatedAt,
    });
    snapshotCount++;
  }

  return snapshotCount;
}

// Main sync function for a single tenant
export async function syncTenant(db: Database, tenant: TenantRecord): Promise<number> {
  console.log(`  Syncing tenant: ${tenant.name} (${tenant.id})`);

  const client = createClientTetherClient(
    tenant.clienttetherWebKey!,
    tenant.clienttetherAccessToken ?? undefined
  );
  let totalRecords = 0;

  // Fetch leads with retry
  console.log('    Fetching leads...');
  const leadsResponse = await fetchWithRetry(() => client.getLeads());
  if (leadsResponse.data) {
    await storeRawSnapshot(db, tenant.id, '/leads', leadsResponse.data);
    totalRecords += await normalizeLeadMetrics(db, tenant.id, leadsResponse.data);
  }

  // Fetch opportunities with retry
  console.log('    Fetching opportunities...');
  const opportunitiesResponse = await fetchWithRetry(() => client.getOpportunities());
  if (opportunitiesResponse.data) {
    await storeRawSnapshot(db, tenant.id, '/opportunities', opportunitiesResponse.data);
    totalRecords += await normalizePipelineStages(db, tenant.id, opportunitiesResponse.data);
    totalRecords += await normalizeHotListItems(db, tenant.id, opportunitiesResponse.data);
  }

  // Fetch notes with retry
  console.log('    Fetching notes...');
  const notesResponse = await fetchWithRetry(() => client.getNotes());
  if (notesResponse.data) {
    await storeRawSnapshot(db, tenant.id, '/notes', notesResponse.data);
    totalRecords += await normalizeNotes(db, tenant.id, notesResponse.data);
  }

  // Fetch scheduled activities with retry
  console.log('    Fetching scheduled activities...');
  const activitiesResponse = await fetchWithRetry(() => client.getScheduledActivities());
  if (activitiesResponse.data) {
    await storeRawSnapshot(db, tenant.id, '/activities', activitiesResponse.data);
    totalRecords += await normalizeScheduledActivities(db, tenant.id, activitiesResponse.data);
  }

  console.log(`    Completed: ${totalRecords} records updated`);
  return totalRecords;
}

/**
 * Finds or creates a reportWeeks row for the given tenant and week ending date (Sunday).
 * Returns the reportWeekId.
 */
async function findOrCreateReportWeek(
  db: Database,
  tenantId: string,
  weekEndingDate: Date
): Promise<string> {
  const dateStr = weekEndingDate.toISOString().split('T')[0];

  // Check if a report week already exists for this tenant and date
  const existing = await db
    .select()
    .from(schema.reportWeeks)
    .where(
      and(
        eq(schema.reportWeeks.tenantId, tenantId),
        eq(schema.reportWeeks.weekEndingDate, dateStr)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0].id;
  }

  // Calculate period start (Monday) and period end (Sunday 23:59:59)
  const periodStart = new Date(weekEndingDate);
  periodStart.setDate(periodStart.getDate() - 6);
  periodStart.setHours(0, 0, 0, 0);

  const periodEnd = new Date(weekEndingDate);
  periodEnd.setHours(23, 59, 59, 999);

  const [reportWeek] = await db
    .insert(schema.reportWeeks)
    .values({
      tenantId,
      weekEndingDate: dateStr,
      periodStartAt: periodStart,
      periodEndAt: periodEnd,
    })
    .returning();

  return reportWeek.id;
}

// Main sync execution
async function runSync() {
  console.log('');
  console.log('Mellon Portal Sync Worker');
  console.log('='.repeat(50));
  console.log(`Starting sync at ${new Date().toISOString()}`);
  console.log('');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  try {
    // Get all tenants with clienttetherWebKey
    const tenants = await getTenantsWithWebKey(db);
    console.log(`Found ${tenants.length} tenant(s) with ClientTether web keys`);
    console.log('');

    if (tenants.length === 0) {
      console.log('No tenants to sync. Exiting.');
      return;
    }

    // Process each tenant sequentially
    for (const tenant of tenants) {
      // Create sync run record
      const syncRun = await createSyncRun(db, tenant.id);

      try {
        const recordsUpdated = await syncTenant(db, tenant);

        // Update sync run to success
        await updateSyncRunStatus(db, syncRun.id, 'success', { recordsUpdated });

        // Create weekly snapshot on Sundays (end of Monday-Sunday week)
        const today = new Date();
        if (today.getDay() === 0) {
          console.log(`    Sunday detected - creating weekly snapshot for ${tenant.name}`);
          const reportWeekId = await findOrCreateReportWeek(db, tenant.id, today);
          const snapshotCount = await createWeeklySnapshot(db, tenant.id, reportWeekId);
          console.log(`    Weekly snapshot created: ${snapshotCount} rows`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`  ERROR syncing tenant ${tenant.name}: ${errorMessage}`);

        // Update sync run to failed
        await updateSyncRunStatus(db, syncRun.id, 'failed', { errorMessage });
      }
    }

    console.log('');
    console.log('Sync completed successfully');
    console.log(`Finished at ${new Date().toISOString()}`);
  } catch (error) {
    console.error('Fatal error during sync:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Only run when executed directly (not when imported for tests)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

if (isMainModule && !isTestEnvironment) {
  const isScheduledMode = process.argv.includes('--scheduled');

  if (isScheduledMode) {
    console.log('Starting sync worker in scheduled mode (hourly)');
    console.log('Press Ctrl+C to stop');
    console.log('');

    // Schedule hourly sync at the top of each hour
    cron.schedule('0 * * * *', () => {
      console.log('Scheduled sync triggered');
      runSync().catch(console.error);
    });

    // Run immediately on startup in scheduled mode
    runSync().catch(console.error);
  } else {
    // Run once and exit
    runSync()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Sync failed:', error);
        process.exit(1);
      });
  }
}

// Export runSync for testing or programmatic use
export { runSync };
