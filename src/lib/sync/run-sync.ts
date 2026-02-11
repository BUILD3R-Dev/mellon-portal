/**
 * Sync functions for use within the Astro app (API routes).
 * This module re-implements the core sync logic without importing
 * dotenv/config or node-cron, which can't be resolved by Vite.
 */
import { eq, isNull, and, sql } from 'drizzle-orm';
import * as schema from '../db/schema';
import {
  createClientTetherClient,
  type CTLeadResponse,
  type CTOpportunityResponse,
  type CTNoteResponse,
  type CTActivityResponse,
} from '../clienttether/client';

type Database = Parameters<typeof schema.tenants._.columns.id.mapFromDriverValue> extends never
  ? any
  : any;

interface TenantRecord {
  id: string;
  name: string;
  clienttetherWebKey: string | null;
  clienttetherAccessToken: string | null;
}

/**
 * Creates a sync run record in the database.
 */
export async function createSyncRun(db: any, tenantId: string) {
  const [syncRun] = await db
    .insert(schema.syncRuns)
    .values({
      tenantId,
      status: 'running',
      startedAt: new Date(),
    })
    .returning();
  return syncRun;
}

/**
 * Updates a sync run record with final status.
 */
export async function updateSyncRunStatus(
  db: any,
  syncRunId: string,
  status: 'success' | 'failed',
  options?: { recordsUpdated?: number; errorMessage?: string }
) {
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
  return updated;
}

/**
 * Fetches data with retry logic (exponential backoff).
 */
async function fetchWithRetry<T>(
  fn: () => Promise<{ data?: T; error?: string }>,
  retries = 3
): Promise<{ data?: T; error?: string }> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const result = await fn();
    if (result.data || attempt === retries - 1) return result;
    await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
  }
  return { error: 'Max retries exceeded' };
}

/**
 * Parses a date string from ClientTether into a Date object.
 */
function parseSourceDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

const PROSPECT_CONTACT_TYPE = '1';

/**
 * Normalizes lead data into leadMetrics rows grouped by source and status.
 * Time-window KPIs (new leads counts) are now derived at query time from the contacts table.
 */
async function normalizeLeadMetrics(db: any, tenantId: string, leads: CTLeadResponse[]): Promise<number> {
  // Only include Prospects (contact_type "1") to match CT's pipeline view
  const prospects = leads.filter((l) => l.contact_type === PROSPECT_CONTACT_TYPE);

  // Clear existing live metrics (non-report-week)
  await db
    .delete(schema.leadMetrics)
    .where(and(eq(schema.leadMetrics.tenantId, tenantId), isNull(schema.leadMetrics.reportWeekId)));

  const bySource = new Map<string, number>();
  const byStatus = new Map<string, number>();

  for (const lead of prospects) {
    const source = lead.clients_lead_source || lead.source || 'Unknown';
    const status = lead.clients_sales_cycle || lead.status || 'Unknown';
    bySource.set(source, (bySource.get(source) || 0) + 1);
    byStatus.set(status, (byStatus.get(status) || 0) + 1);
  }

  const rows: any[] = [];
  for (const [source, count] of bySource) {
    rows.push({ tenantId, dimensionType: 'source', dimensionValue: source, leads: count });
  }
  for (const [status, count] of byStatus) {
    rows.push({ tenantId, dimensionType: 'status', dimensionValue: status, leads: count });
  }

  if (rows.length > 0) {
    await db.insert(schema.leadMetrics).values(rows);
  }

  return rows.length;
}

/**
 * Normalizes opportunity data into pipelineStageCounts rows with dollar values.
 */
async function normalizePipelineStages(db: any, tenantId: string, opportunities: CTOpportunityResponse[]): Promise<number> {
  // Clear existing live pipeline stage counts
  await db
    .delete(schema.pipelineStageCounts)
    .where(and(eq(schema.pipelineStageCounts.tenantId, tenantId), isNull(schema.pipelineStageCounts.reportWeekId)));

  const stageGroups = new Map<string, number>();
  const stageDollarValues = new Map<string, number>();

  for (const opp of opportunities) {
    const stage = opp.contact_sales_cycle || opp.stage || 'Unknown';
    const dollarValue = parseFloat(opp.deal_size || '0') || opp.value || 0;
    stageGroups.set(stage, (stageGroups.get(stage) || 0) + 1);
    stageDollarValues.set(stage, (stageDollarValues.get(stage) || 0) + dollarValue);
  }

  const rows: any[] = [];
  for (const [stage, count] of stageGroups) {
    rows.push({
      tenantId,
      stage,
      count,
      dollarValue: String(stageDollarValues.get(stage) || 0),
    });
  }

  if (rows.length > 0) {
    await db.insert(schema.pipelineStageCounts).values(rows);
  }

  return rows.length;
}

/**
 * Normalizes opportunities into hotListItems (probability >= 50%).
 */
async function normalizeHotListItems(db: any, tenantId: string, opportunities: CTOpportunityResponse[]): Promise<number> {
  await db.delete(schema.hotListItems).where(eq(schema.hotListItems.tenantId, tenantId));

  // Hot list stages: Discovery Day Booked (50%), Discovery Day Completed (80%),
  // FA Requested (90%), FA Sent (95%), FA Signed (100%)
  const HOT_STAGES = ['Discovery Day Booked', 'Discovery Day Completed', 'FA Requested', 'FA Sent', 'FA Signed'];
  const hotItems = opportunities.filter((opp) => {
    const stage = opp.contact_sales_cycle || opp.stage || '';
    return HOT_STAGES.includes(stage);
  });
  if (hotItems.length === 0) return 0;

  const rows = hotItems.map((opp) => {
    const stage = opp.contact_sales_cycle || opp.stage || 'Unknown';
    const name = [opp.firstName, opp.lastName].filter(Boolean).join(' ') || opp.title || 'Unknown';
    return {
      tenantId,
      candidateName: name,
      stage,
      likelyPct: opp.probability || 0,
      rawJson: JSON.stringify(opp),
    };
  });

  await db.insert(schema.hotListItems).values(rows);
  return rows.length;
}

/**
 * Normalizes notes into ctNotes rows.
 */
async function normalizeNotes(db: any, tenantId: string, notes: CTNoteResponse[]): Promise<number> {
  await db.delete(schema.ctNotes).where(eq(schema.ctNotes.tenantId, tenantId));

  if (notes.length === 0) return 0;

  const rows = notes.map((note) => ({
    tenantId,
    contactId: note.contact_id || note.id,
    noteDate: new Date(note.date),
    author: note.author || '',
    content: note.content || '',
    rawJson: JSON.stringify(note),
  }));

  await db.insert(schema.ctNotes).values(rows);
  return rows.length;
}

/**
 * Normalizes activities into ctScheduledActivities rows.
 */
async function normalizeScheduledActivities(db: any, tenantId: string, activities: CTActivityResponse[]): Promise<number> {
  await db.delete(schema.ctScheduledActivities).where(eq(schema.ctScheduledActivities.tenantId, tenantId));

  if (activities.length === 0) return 0;

  const rows = activities.map((activity) => ({
    tenantId,
    activityType: activity.type,
    scheduledAt: new Date(activity.scheduled_at),
    contactName: activity.contact_name,
    description: activity.description,
    status: activity.status,
    rawJson: JSON.stringify(activity),
  }));

  await db.insert(schema.ctScheduledActivities).values(rows);
  return rows.length;
}

/**
 * Upserts individual contact records from CT leads into the contacts table.
 */
async function syncContacts(db: any, tenantId: string, leads: CTLeadResponse[]): Promise<number> {
  if (leads.length === 0) return 0;

  let upserted = 0;
  // Process in batches to avoid huge single queries
  const BATCH_SIZE = 100;
  for (let i = 0; i < leads.length; i += BATCH_SIZE) {
    const batch = leads.slice(i, i + BATCH_SIZE);
    const rows = batch
      .filter((lead) => lead.client_id)
      .map((lead) => ({
        tenantId,
        externalId: lead.client_id,
        firstName: lead.firstName || null,
        lastName: lead.lastName || null,
        email: lead.email || null,
        phone: lead.phone || null,
        company: lead.compName || null,
        leadSource: lead.clients_lead_source || lead.source || null,
        stage: lead.clients_sales_cycle || lead.status || null,
        contactType: lead.contact_type || null,
        dealSize: lead.deal_size || null,
        assignedUser: lead.assigned_user || null,
        sourceCreatedAt: parseSourceDate(lead.created),
        sourceModifiedAt: parseSourceDate(lead.last_modified_date),
        updatedAt: new Date(),
      }));

    if (rows.length > 0) {
      await db
        .insert(schema.contacts)
        .values(rows)
        .onConflictDoUpdate({
          target: [schema.contacts.tenantId, schema.contacts.externalId],
          set: {
            firstName: sql`excluded.first_name`,
            lastName: sql`excluded.last_name`,
            email: sql`excluded.email`,
            phone: sql`excluded.phone`,
            company: sql`excluded.company`,
            leadSource: sql`excluded.lead_source`,
            stage: sql`excluded.stage`,
            contactType: sql`excluded.contact_type`,
            dealSize: sql`excluded.deal_size`,
            assignedUser: sql`excluded.assigned_user`,
            sourceCreatedAt: sql`excluded.source_created_at`,
            sourceModifiedAt: sql`excluded.source_modified_at`,
            updatedAt: sql`excluded.updated_at`,
          },
        });
      upserted += rows.length;
    }
  }

  return upserted;
}

/**
 * Stores a raw JSON snapshot from the API.
 */
async function storeRawSnapshot(db: any, tenantId: string, endpoint: string, data: any): Promise<void> {
  await db.insert(schema.ctRawSnapshots).values({
    tenantId,
    endpoint,
    payload: JSON.stringify(data),
  });
}

/**
 * Syncs all data for a single tenant from ClientTether API.
 */
export async function syncTenant(db: any, tenant: TenantRecord): Promise<number> {
  console.log(`  Syncing tenant: ${tenant.name} (${tenant.id})`);

  const client = createClientTetherClient(
    tenant.clienttetherWebKey!,
    tenant.clienttetherAccessToken ?? undefined
  );
  let totalRecords = 0;

  // Fetch leads
  console.log('    Fetching leads...');
  const leadsResponse = await fetchWithRetry(() => client.getLeads());
  if (leadsResponse.data) {
    await storeRawSnapshot(db, tenant.id, '/leads', leadsResponse.data);
    totalRecords += await normalizeLeadMetrics(db, tenant.id, leadsResponse.data);
    totalRecords += await syncContacts(db, tenant.id, leadsResponse.data);
  }

  // Fetch opportunities
  console.log('    Fetching opportunities...');
  const opportunitiesResponse = await fetchWithRetry(() => client.getOpportunities());
  if (opportunitiesResponse.data) {
    await storeRawSnapshot(db, tenant.id, '/opportunities', opportunitiesResponse.data);
    totalRecords += await normalizePipelineStages(db, tenant.id, opportunitiesResponse.data);
    totalRecords += await normalizeHotListItems(db, tenant.id, opportunitiesResponse.data);
  }

  // Fetch notes
  console.log('    Fetching notes...');
  const notesResponse = await fetchWithRetry(() => client.getNotes());
  if (notesResponse.data) {
    await storeRawSnapshot(db, tenant.id, '/notes', notesResponse.data);
    totalRecords += await normalizeNotes(db, tenant.id, notesResponse.data);
  }

  // Fetch scheduled activities
  console.log('    Fetching scheduled activities...');
  const activitiesResponse = await fetchWithRetry(() => client.getScheduledActivities());
  if (activitiesResponse.data) {
    await storeRawSnapshot(db, tenant.id, '/activities', activitiesResponse.data);
    totalRecords += await normalizeScheduledActivities(db, tenant.id, activitiesResponse.data);
  }

  console.log(`    Completed: ${totalRecords} records updated`);
  return totalRecords;
}
