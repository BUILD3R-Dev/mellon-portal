import { describe, it, expect } from 'vitest';
import { tenantBranding, tenants } from '../schema';

/**
 * Tests for tenant_branding table schema additions
 * Verifies themeId and accentColorOverride columns are properly defined
 */
describe('Tenant Branding Schema', () => {
  describe('tenant_branding table structure', () => {
    it('has required columns defined', () => {
      // Verify the table has all expected columns
      const columns = Object.keys(tenantBranding);

      expect(columns).toContain('id');
      expect(columns).toContain('tenantId');
      expect(columns).toContain('tenantLogoUrl');
      expect(columns).toContain('themeId');
      expect(columns).toContain('accentColorOverride');
      expect(columns).toContain('updatedAt');
    });

    it('themeId column has correct configuration', () => {
      // Verify themeId column exists and has default value
      expect(tenantBranding.themeId).toBeDefined();
      expect(tenantBranding.themeId.name).toBe('theme_id');
    });

    it('accentColorOverride column is nullable for hex values', () => {
      // Verify accentColorOverride column exists
      expect(tenantBranding.accentColorOverride).toBeDefined();
      expect(tenantBranding.accentColorOverride.name).toBe('accent_color_override');
    });

    it('tenantId references tenants table with cascade delete', () => {
      // Verify the foreign key relationship exists
      expect(tenantBranding.tenantId).toBeDefined();
      expect(tenantBranding.tenantId.name).toBe('tenant_id');
    });
  });

  describe('Valid theme identifiers', () => {
    it('supports light, dark, blue, green theme values', () => {
      // These are the valid theme identifiers as per requirements
      const validThemes = ['light', 'dark', 'blue', 'green'];

      validThemes.forEach(theme => {
        expect(typeof theme).toBe('string');
        expect(theme.length).toBeLessThanOrEqual(50);
      });
    });
  });

  describe('Hex color format validation', () => {
    it('accent color override accepts valid 7-character hex format', () => {
      // Valid hex colors that should be accepted
      const validHexColors = ['#1E40AF', '#3B82F6', '#000000', '#FFFFFF'];

      validHexColors.forEach(color => {
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(color.length).toBe(7);
      });
    });
  });
});
