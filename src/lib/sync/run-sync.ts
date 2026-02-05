/**
 * Sync functions for use within the Astro app (API routes).
 * This module re-implements the core sync logic without importing
 * dotenv/config or node-cron, which can't be resolved by Vite.
 */
import { eq, isNull, and } from 'drizzle-orm';
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
 * Normalizes lead data into leadMetrics rows grouped by source and status.
 */
async function normalizeLeadMetrics(db: any, tenantId: string, leads: CTLeadResponse[]): Promise<number> {
  // Clear existing live metrics (non-report-week)
  await db
    .delete(schema.leadMetrics)
    .where(and(eq(schema.leadMetrics.tenantId, tenantId), isNull(schema.leadMetrics.reportWeekId)));

  const bySource = new Map<string, number>();
  const byStatus = new Map<string, number>();

  for (const lead of leads) {
    const source = lead.source || 'Unknown';
    const status = lead.status || 'Unknown';
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
    const stage = opp.stage || 'Unknown';
    stageGroups.set(stage, (stageGroups.get(stage) || 0) + 1);
    stageDollarValues.set(stage, (stageDollarValues.get(stage) || 0) + (opp.value || 0));
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

  const hotItems = opportunities.filter((opp) => (opp.probability || 0) >= 50);
  if (hotItems.length === 0) return 0;

  const rows = hotItems.map((opp) => ({
    tenantId,
    candidateName: opp.title || 'Unknown',
    stage: opp.stage || 'Unknown',
    likelyPct: opp.probability || 0,
    rawJson: JSON.stringify(opp),
  }));

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
    contactId: note.contact_id,
    noteDate: new Date(note.date),
    author: note.author,
    content: note.content,
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
