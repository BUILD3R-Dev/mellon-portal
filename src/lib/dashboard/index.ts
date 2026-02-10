/**
 * Dashboard data module exports
 *
 * Provides reusable dashboard data query functions and types
 * for KPI, pipeline, and lead trend data. Used by both API
 * endpoints and the PDF generation service.
 */

export {
  getKPIData,
  getPipelineByStage,
  getLeadTrends,
  ACTIVE_PIPELINE_STAGES,
  isActiveStage,
  EARLY_FUNNEL_STAGES,
  HOT_LIST_STAGES,
} from './queries';

export type {
  KPIData,
  PipelineByStagePoint,
  LeadTrendPoint,
} from './queries';
