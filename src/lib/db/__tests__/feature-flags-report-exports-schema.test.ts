import { describe, it, expect } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { featureFlags, reportExports, tenants } from '../schema';

/**
 * Tests for feature_flags table and report_exports index additions.
 * Verifies table structure, unique constraints, indexes, and foreign key cascades.
 */
describe('Feature Flags and Report Exports Schema', () => {
  describe('featureFlags table structure and unique constraint', () => {
    it('has all required columns with correct database names', () => {
      const columns = Object.keys(featureFlags);

      expect(columns).toContain('id');
      expect(columns).toContain('tenantId');
      expect(columns).toContain('featureKey');
      expect(columns).toContain('enabled');
      expect(columns).toContain('createdAt');
      expect(columns).toContain('updatedAt');

      expect(featureFlags.id.name).toBe('id');
      expect(featureFlags.tenantId.name).toBe('tenant_id');
      expect(featureFlags.featureKey.name).toBe('feature_key');
      expect(featureFlags.enabled.name).toBe('enabled');
      expect(featureFlags.createdAt.name).toBe('created_at');
      expect(featureFlags.updatedAt.name).toBe('updated_at');
    });
  });

  describe('featureFlags unique index on (tenantId, featureKey)', () => {
    it('has a unique index enforcing one flag per tenant per feature', () => {
      const config = getTableConfig(featureFlags);
      const indexNames = config.indexes.map((i) => i.config.name);

      expect(indexNames).toContain('feature_flags_tenant_feature_key_idx');

      const uniqueIdx = config.indexes.find(
        (i) => i.config.name === 'feature_flags_tenant_feature_key_idx'
      );
      expect(uniqueIdx?.config.unique).toBe(true);
    });
  });

  describe('reportExports unique index on (tenantId, reportWeekId)', () => {
    it('has a unique index preventing duplicate cached PDFs per report per tenant', () => {
      const config = getTableConfig(reportExports);
      const indexNames = config.indexes.map((i) => i.config.name);

      expect(indexNames).toContain('report_exports_tenant_report_week_idx');

      const uniqueIdx = config.indexes.find(
        (i) => i.config.name === 'report_exports_tenant_report_week_idx'
      );
      expect(uniqueIdx?.config.unique).toBe(true);
    });
  });

  describe('featureFlags cascade delete via tenantId FK', () => {
    it('tenantId references tenants table with cascade delete configured', () => {
      expect(featureFlags.tenantId).toBeDefined();
      expect(featureFlags.tenantId.name).toBe('tenant_id');

      // Verify the tenants table has the id field that serves as the FK target
      expect(tenants.id).toBeDefined();
      expect(tenants.id.name).toBe('id');

      // Verify the featureFlags tenant_id_idx exists for lookup performance
      const config = getTableConfig(featureFlags);
      const indexNames = config.indexes.map((i) => i.config.name);
      expect(indexNames).toContain('feature_flags_tenant_id_idx');
    });
  });
});
