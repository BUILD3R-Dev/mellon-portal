import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  jsonb,
  integer,
  decimal,
  date,
  boolean,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// Enums
export const tenantStatusEnum = pgEnum('tenant_status', ['active', 'inactive', 'suspended']);
export const userStatusEnum = pgEnum('user_status', ['active', 'inactive', 'pending']);
export const membershipRoleEnum = pgEnum('membership_role', ['agency_admin', 'tenant_admin', 'tenant_viewer']);
export const reportWeekStatusEnum = pgEnum('report_week_status', ['draft', 'published']);
export const syncStatusEnum = pgEnum('sync_status', ['running', 'success', 'failed']);

// Core Tables
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  timezone: varchar('timezone', { length: 100 }).notNull().default('America/New_York'),
  status: tenantStatusEnum('status').notNull().default('active'),
  clienttetherWebKey: text('clienttether_web_key'),
  clienttetherAccessToken: text('clienttether_access_token'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const tenantBranding = pgTable('tenant_branding', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  mellonLogoUrl: text('mellon_logo_url'),
  tenantLogoUrl: text('tenant_logo_url'),
  primaryColor: varchar('primary_color', { length: 7 }).default('#1E40AF'),
  accentColor: varchar('accent_color', { length: 7 }).default('#3B82F6'),
  headerLayout: varchar('header_layout', { length: 50 }).default('default'),
  themeId: varchar('theme_id', { length: 50 }).notNull().default('light'),
  accentColorOverride: varchar('accent_color_override', { length: 7 }),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  passwordHash: text('password_hash'),
  timezone: varchar('timezone', { length: 100 }),
  status: userStatusEnum('status').notNull().default('pending'),
  inviteToken: text('invite_token'),
  inviteExpiresAt: timestamp('invite_expires_at'),
  resetToken: text('reset_token'),
  resetExpiresAt: timestamp('reset_expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const memberships = pgTable('memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  role: membershipRoleEnum('role').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('memberships_user_id_idx').on(table.userId),
  index('memberships_tenant_id_idx').on(table.tenantId),
]);

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('sessions_user_id_idx').on(table.userId),
]);

// Weekly Reporting Tables
export const reportWeeks = pgTable('report_weeks', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  weekEndingDate: date('week_ending_date').notNull(),
  periodStartAt: timestamp('period_start_at').notNull(),
  periodEndAt: timestamp('period_end_at').notNull(),
  status: reportWeekStatusEnum('status').notNull().default('draft'),
  publishedAt: timestamp('published_at'),
  publishedBy: uuid('published_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('report_weeks_tenant_id_idx').on(table.tenantId),
  index('report_weeks_week_ending_date_idx').on(table.weekEndingDate),
]);

export const reportWeekManual = pgTable('report_week_manual', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportWeekId: uuid('report_week_id').notNull().references(() => reportWeeks.id, { onDelete: 'cascade' }),
  narrativeRich: text('narrative_rich'),
  initiativesRich: text('initiatives_rich'),
  needsRich: text('needs_rich'),
  discoveryDaysRich: text('discovery_days_rich'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  // Unique constraint to ensure one-to-one relationship
  uniqueIndex('report_week_manual_report_week_id_idx').on(table.reportWeekId),
]);

// Sync Tables
export const syncRuns = pgTable('sync_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  finishedAt: timestamp('finished_at'),
  status: syncStatusEnum('status').notNull().default('running'),
  errorMessage: text('error_message'),
  recordsUpdated: integer('records_updated').default(0),
}, (table) => [
  index('sync_runs_tenant_id_idx').on(table.tenantId),
]);

export const ctRawSnapshots = pgTable('ct_raw_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  endpoint: varchar('endpoint', { length: 255 }).notNull(),
  fetchedAt: timestamp('fetched_at').notNull().defaultNow(),
  payloadJson: jsonb('payload_json'),
}, (table) => [
  index('ct_raw_snapshots_tenant_id_idx').on(table.tenantId),
  index('ct_raw_snapshots_endpoint_idx').on(table.endpoint),
]);

// Normalized Metrics Tables
export const leadMetrics = pgTable('lead_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  reportWeekId: uuid('report_week_id').references(() => reportWeeks.id, { onDelete: 'cascade' }),
  dimensionType: varchar('dimension_type', { length: 100 }).notNull(),
  dimensionValue: varchar('dimension_value', { length: 255 }).notNull(),
  clicks: integer('clicks').default(0),
  impressions: integer('impressions').default(0),
  cost: decimal('cost', { precision: 12, scale: 2 }).default('0'),
  leads: integer('leads').default(0),
  qualifiedLeads: integer('qualified_leads').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('lead_metrics_tenant_id_idx').on(table.tenantId),
  index('lead_metrics_report_week_id_idx').on(table.reportWeekId),
]);

export const pipelineStageCounts = pgTable('pipeline_stage_counts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  reportWeekId: uuid('report_week_id').references(() => reportWeeks.id, { onDelete: 'cascade' }),
  stage: varchar('stage', { length: 100 }).notNull(),
  count: integer('count').default(0),
  dollarValue: decimal('dollar_value', { precision: 12, scale: 2 }).default('0'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('pipeline_stage_counts_tenant_id_idx').on(table.tenantId),
  index('pipeline_stage_counts_report_week_id_idx').on(table.reportWeekId),
]);

export const hotListItems = pgTable('hot_list_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  reportWeekId: uuid('report_week_id').references(() => reportWeeks.id, { onDelete: 'cascade' }),
  candidateName: varchar('candidate_name', { length: 255 }).notNull(),
  market: varchar('market', { length: 255 }),
  units: integer('units').default(0),
  weightedUnits: decimal('weighted_units', { precision: 10, scale: 2 }).default('0'),
  iff: decimal('iff', { precision: 12, scale: 2 }).default('0'),
  weightedIff: decimal('weighted_iff', { precision: 12, scale: 2 }).default('0'),
  salesLead: varchar('sales_lead', { length: 255 }),
  stage: varchar('stage', { length: 100 }),
  likelyPct: integer('likely_pct').default(0),
  rawJson: jsonb('raw_json'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ClientTether Notes Table
export const ctNotes = pgTable('ct_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  contactId: varchar('contact_id', { length: 255 }),
  noteDate: timestamp('note_date').notNull(),
  author: varchar('author', { length: 255 }),
  content: text('content'),
  rawJson: jsonb('raw_json'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('ct_notes_tenant_id_idx').on(table.tenantId),
  index('ct_notes_note_date_idx').on(table.noteDate),
]);

// ClientTether Scheduled Activities Table
export const ctScheduledActivities = pgTable('ct_scheduled_activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  activityType: varchar('activity_type', { length: 100 }),
  scheduledAt: timestamp('scheduled_at').notNull(),
  contactName: varchar('contact_name', { length: 255 }),
  description: text('description'),
  status: varchar('status', { length: 100 }),
  rawJson: jsonb('raw_json'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('ct_scheduled_activities_tenant_id_idx').on(table.tenantId),
  index('ct_scheduled_activities_scheduled_at_idx').on(table.scheduledAt),
]);

// Optional Tables
export const reportExports = pgTable('report_exports', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  reportWeekId: uuid('report_week_id').notNull().references(() => reportWeeks.id, { onDelete: 'cascade' }),
  pdfUrl: text('pdf_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorUserId: uuid('actor_user_id').references(() => users.id),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 100 }).notNull(),
  metadataJson: jsonb('metadata_json'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Field Mapping Configuration (per-tenant)
export const tenantFieldMappings = pgTable('tenant_field_mappings', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  leadSourceField: varchar('lead_source_field', { length: 255 }),
  qualifiedLeadLogic: jsonb('qualified_lead_logic'),
  pipelineStageMapping: jsonb('pipeline_stage_mapping'),
  customFieldMappings: jsonb('custom_field_mappings'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
