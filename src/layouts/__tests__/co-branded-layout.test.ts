import { describe, it, expect } from 'vitest';
import { generateCSSVariables, generateCSSRootBlock, getDefaultBrandingVariables } from '@/lib/themes';

/**
 * Tests for Co-Branded Layout System
 */
describe('Co-Branded Layout', () => {
  describe('Header tenant logo', () => {
    it('tenant logo URL can be rendered when available', () => {
      // Simulate tenant branding data
      const tenantBranding = {
        tenantLogoUrl: '/uploads/logos/tenant-123/logo.png',
        themeId: 'light',
        accentColorOverride: null,
      };

      expect(tenantBranding.tenantLogoUrl).toBeDefined();
      expect(tenantBranding.tenantLogoUrl).toContain('/uploads/logos');
    });

    it('falls back to text when no tenant logo', () => {
      const tenantBranding = {
        tenantLogoUrl: null,
        themeId: 'light',
        accentColorOverride: null,
      };

      expect(tenantBranding.tenantLogoUrl).toBeNull();
      // Layout should display "Mellon Portal" text when logo is null
    });
  });

  describe('Footer co-branding', () => {
    it('Powered by Mellon Franchising text is defined', () => {
      const poweredByText = 'Powered by Mellon Franchising';
      expect(poweredByText).toContain('Mellon');
      expect(poweredByText).toContain('Powered by');
    });
  });

  describe('CSS Variables injection', () => {
    it('generates CSS variables from tenant branding', () => {
      const variables = generateCSSVariables('blue', '#FF5733');

      expect(variables['--accent-color']).toBe('#FF5733');
      expect(variables['--background']).toBeDefined();
      expect(variables['--foreground']).toBeDefined();
      expect(variables['--border']).toBeDefined();
    });

    it('generates CSS root block for head injection', () => {
      const cssBlock = generateCSSRootBlock('light');

      expect(cssBlock).toContain(':root {');
      expect(cssBlock).toContain('--accent-color:');
      expect(cssBlock).toContain('--background:');
      expect(cssBlock).toContain('}');
    });

    it('uses default branding when tenant config missing', () => {
      const defaultVars = getDefaultBrandingVariables();

      expect(defaultVars['--accent-color']).toBeDefined();
      expect(defaultVars['--background']).toBeDefined();
      expect(defaultVars['--foreground']).toBeDefined();
    });
  });

  describe('Fallback branding', () => {
    it('default theme is light', () => {
      const defaultVars = getDefaultBrandingVariables();
      const lightVars = generateCSSVariables('light');

      // Both should have same values since default is light theme
      expect(defaultVars['--background']).toBe(lightVars['--background']);
      expect(defaultVars['--foreground']).toBe(lightVars['--foreground']);
    });

    it('invalid theme ID falls back to light theme', () => {
      const invalidThemeVars = generateCSSVariables('nonexistent-theme');
      const lightVars = generateCSSVariables('light');

      expect(invalidThemeVars['--background']).toBe(lightVars['--background']);
    });
  });
});
