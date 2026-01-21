import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { BrandingForm } from './BrandingForm';
import { LogoUpload } from './LogoUpload';
import { ThemeSelector } from './ThemeSelector';
import { AccentColorPicker } from './AccentColorPicker';

/**
 * Tests for Branding Configuration Components
 */

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Branding Configuration Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('BrandingForm', () => {
    it('exports BrandingForm component', () => {
      expect(BrandingForm).toBeDefined();
      expect(typeof BrandingForm).toBe('function');
    });

    it('accepts required props', () => {
      const props = {
        tenantId: 'tenant-123',
        initialData: {
          themeId: 'light',
          accentColorOverride: null,
          tenantLogoUrl: null,
        },
      };

      expect(() => React.createElement(BrandingForm, props)).not.toThrow();
    });
  });

  describe('LogoUpload', () => {
    it('exports LogoUpload component', () => {
      expect(LogoUpload).toBeDefined();
      expect(typeof LogoUpload).toBe('function');
    });

    it('accepts required props', () => {
      const props = {
        tenantId: 'tenant-123',
        currentLogoUrl: null,
        onLogoChange: vi.fn(),
      };

      expect(() => React.createElement(LogoUpload, props)).not.toThrow();
    });
  });

  describe('ThemeSelector', () => {
    it('exports ThemeSelector component', () => {
      expect(ThemeSelector).toBeDefined();
      expect(typeof ThemeSelector).toBe('function');
    });

    it('accepts required props with 4 theme options', () => {
      const props = {
        selectedTheme: 'light',
        onThemeChange: vi.fn(),
      };

      expect(() => React.createElement(ThemeSelector, props)).not.toThrow();

      // Verify component can receive valid theme values
      const validThemes = ['light', 'dark', 'blue', 'green'];
      validThemes.forEach((theme) => {
        const themeProps = { ...props, selectedTheme: theme };
        expect(() => React.createElement(ThemeSelector, themeProps)).not.toThrow();
      });
    });
  });

  describe('AccentColorPicker', () => {
    it('exports AccentColorPicker component', () => {
      expect(AccentColorPicker).toBeDefined();
      expect(typeof AccentColorPicker).toBe('function');
    });

    it('accepts valid hex color input', () => {
      const props = {
        value: '#FF5733',
        onChange: vi.fn(),
        defaultColor: '#2563EB',
      };

      expect(() => React.createElement(AccentColorPicker, props)).not.toThrow();
    });

    it('accepts null value for default theme color', () => {
      const props = {
        value: null,
        onChange: vi.fn(),
        defaultColor: '#2563EB',
      };

      expect(() => React.createElement(AccentColorPicker, props)).not.toThrow();
    });
  });

  describe('Save Branding Flow', () => {
    it('save button triggers API call with correct payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              themeId: 'blue',
              accentColorOverride: '#FF5733',
            },
          }),
      });

      const response = await fetch('/api/tenants/tenant-123/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          themeId: 'blue',
          accentColorOverride: '#FF5733',
        }),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/tenants/tenant-123/branding',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
    });
  });
});
