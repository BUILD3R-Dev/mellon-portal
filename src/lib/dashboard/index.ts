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
  INACTIVE_PIPELINE_STAGES,
  EARLY_FUNNEL_STAGES,
} from './queries';

export type {
  KPIData,
  PipelineByStagePoint,
  LeadTrendPoint,
} from './queries';
