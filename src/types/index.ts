export type TenantStatus = 'active' | 'inactive' | 'suspended';
export type UserStatus = 'active' | 'inactive' | 'pending';
export type MembershipRole = 'agency_admin' | 'tenant_admin' | 'tenant_viewer';
export type ReportWeekStatus = 'draft' | 'published';
export type SyncStatus = 'running' | 'success' | 'failed';

export interface Tenant {
  id: string;
  name: string;
  timezone: string;
  status: TenantStatus;
  clienttetherWebKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantBranding {
  id: string;
  tenantId: string;
  mellonLogoUrl: string | null;
  tenantLogoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  headerLayout: string;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Membership {
  id: string;
  userId: string;
  tenantId: string | null;
  role: MembershipRole;
  createdAt: Date;
}

export interface ReportWeek {
  id: string;
  tenantId: string;
  weekEndingDate: string;
  periodStartAt: Date;
  periodEndAt: Date;
  status: ReportWeekStatus;
  publishedAt: Date | null;
  publishedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportWeekManual {
  id: string;
  reportWeekId: string;
  narrativeRich: string | null;
  initiativesRich: string | null;
  needsRich: string | null;
  discoveryDaysRich: string | null;
  updatedAt: Date;
}

export interface SyncRun {
  id: string;
  tenantId: string;
  startedAt: Date;
  finishedAt: Date | null;
  status: SyncStatus;
  errorMessage: string | null;
  recordsUpdated: number;
}

export interface LeadMetric {
  id: string;
  tenantId: string;
  reportWeekId: string | null;
  dimensionType: string;
  dimensionValue: string;
  clicks: number;
  impressions: number;
  cost: string;
  leads: number;
  qualifiedLeads: number;
  createdAt: Date;
}

export interface PipelineStageCount {
  id: string;
  tenantId: string;
  reportWeekId: string | null;
  stage: string;
  count: number;
  createdAt: Date;
}

export interface HotListItem {
  id: string;
  tenantId: string;
  reportWeekId: string | null;
  candidateName: string;
  market: string | null;
  units: number;
  weightedUnits: string;
  iff: string;
  weightedIff: string;
  salesLead: string | null;
  stage: string | null;
  likelyPct: number;
  rawJson: unknown;
  createdAt: Date;
}

export interface SessionUser extends User {
  memberships: Membership[];
  isAgencyAdmin: boolean;
  activeTenantId: string | null;
}
