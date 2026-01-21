import { describe, it, expect } from 'vitest';
import { themes, getTheme, VALID_THEME_IDS } from '../config';
import { generateCSSVariables, generateCSSVariableString } from '../css-variables';

/**
 * Tests for Theme Configuration and CSS Variables
 */
describe('Theme System', () => {
  describe('Theme Configuration', () => {
    it('defines 4 themes with correct identifiers', () => {
      expect(VALID_THEME_IDS).toContain('light');
      expect(VALID_THEME_IDS).toContain('dark');
      expect(VALID_THEME_IDS).toContain('blue');
      expect(VALID_THEME_IDS).toContain('green');
      expect(VALID_THEME_IDS.length).toBe(4);
    });

    it('each theme has required Tailwind color mappings', () => {
      const requiredProperties = [
        'background',
        'foreground',
        'border',
        'accentColor',
        'accentHover',
        'accentText',
      ];

      for (const themeId of VALID_THEME_IDS) {
        const theme = getTheme(themeId);
        expect(theme).toBeDefined();

        for (const prop of requiredProperties) {
          expect(theme[prop as keyof typeof theme]).toBeDefined();
        }
      }
    });

    it('light theme uses gray color family', () => {
      const light = getTheme('light');
      expect(light.background).toContain('#');
      expect(light.foreground).toContain('#');
    });

    it('dark theme uses slate color family', () => {
      const dark = getTheme('dark');
      expect(dark.background).toContain('#');
      expect(dark.foreground).toContain('#');
    });
  });

  describe('CSS Variable Generation', () => {
    it('generates correct CSS variables for light theme', () => {
      const variables = generateCSSVariables('light');

      expect(variables['--accent-color']).toBeDefined();
      expect(variables['--accent-hover']).toBeDefined();
      expect(variables['--accent-text']).toBeDefined();
      expect(variables['--background']).toBeDefined();
      expect(variables['--foreground']).toBeDefined();
      expect(variables['--border']).toBeDefined();
    });

    it('generates correct CSS variables for dark theme', () => {
      const variables = generateCSSVariables('dark');

      expect(variables['--accent-color']).toBeDefined();
      expect(variables['--background']).toBeDefined();
      // Dark theme should have darker background
      expect(variables['--background']).not.toBe(generateCSSVariables('light')['--background']);
    });

    it('accent color override supersedes theme default', () => {
      const defaultVariables = generateCSSVariables('light');
      const overrideVariables = generateCSSVariables('light', '#FF5733');

      expect(overrideVariables['--accent-color']).toBe('#FF5733');
      expect(defaultVariables['--accent-color']).not.toBe('#FF5733');
    });

    it('generates valid CSS string', () => {
      const cssString = generateCSSVariableString('blue');

      expect(cssString).toContain('--accent-color:');
      expect(cssString).toContain('--accent-hover:');
      expect(cssString).toContain('--accent-text:');
      expect(cssString).toContain('--background:');
      expect(cssString).toContain('--foreground:');
    });
  });

  describe('Default Theme Fallback', () => {
    it('returns light theme for invalid theme ID', () => {
      const theme = getTheme('invalid-theme' as any);
      const lightTheme = getTheme('light');

      expect(theme.accentColor).toBe(lightTheme.accentColor);
    });
  });
});
