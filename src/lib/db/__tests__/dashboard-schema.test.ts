import { describe, it, expect } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { pipelineStageCounts, leadMetrics, tenants } from '../schema';

/**
 * Tests for dashboard-related schema changes:
 * - dollarValue column on pipelineStageCounts
 * - clienttetherAccessToken column on tenants
 * - Performance indexes on pipelineStageCounts and leadMetrics
 */
describe('Dashboard Schema Changes', () => {
  describe('pipelineStageCounts dollarValue column', () => {
    it('accepts a dollarValue decimal column', () => {
      const columns = Object.keys(pipelineStageCounts);
      expect(columns).toContain('dollarValue');
      expect(pipelineStageCounts.dollarValue.name).toBe('dollar_value');
    });
  });

  describe('tenants clienttetherAccessToken column', () => {
    it('accepts a clienttetherAccessToken text column', () => {
      const columns = Object.keys(tenants);
      expect(columns).toContain('clienttetherAccessToken');
      expect(tenants.clienttetherAccessToken.name).toBe('clienttether_access_token');
    });
  });

  describe('pipelineStageCounts indexes', () => {
    it('has indexes on tenantId and reportWeekId', () => {
      const config = getTableConfig(pipelineStageCounts);
      const indexNames = config.indexes.map((i) => i.config.name);

      expect(indexNames).toContain('pipeline_stage_counts_tenant_id_idx');
      expect(indexNames).toContain('pipeline_stage_counts_report_week_id_idx');
    });
  });

  describe('leadMetrics indexes', () => {
    it('has indexes on tenantId and reportWeekId', () => {
      const config = getTableConfig(leadMetrics);
      const indexNames = config.indexes.map((i) => i.config.name);

      expect(indexNames).toContain('lead_metrics_tenant_id_idx');
      expect(indexNames).toContain('lead_metrics_report_week_id_idx');
    });
  });
});
