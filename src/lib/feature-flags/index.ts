/**
 * Feature flags module exports
 *
 * Provides per-tenant feature flag management including lookups,
 * listings, and upsert operations with well-known feature key constants.
 */

export {
  isFeatureEnabled,
  getFeatureFlagsForTenant,
  setFeatureFlag,
} from './queries';

/** Feature key constant for PDF export capability */
export const FEATURE_PDF_EXPORT = 'pdf_export';
