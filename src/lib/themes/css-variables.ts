/**
 * CSS Variable Generator
 *
 * Generates CSS custom properties based on theme configuration
 * and optional accent color override.
 */

import { getTheme, type ThemeConfig } from './config';

export interface CSSVariables {
  '--accent-color': string;
  '--accent-hover': string;
  '--accent-text': string;
  '--background': string;
  '--background-secondary': string;
  '--foreground': string;
  '--foreground-muted': string;
  '--border': string;
  '--border-muted': string;
  '--card-background': string;
  '--card-border': string;
}

/**
 * Darkens a hex color by a percentage
 */
function darkenColor(hex: string, percent: number): string {
  // Remove # if present
  const cleanHex = hex.replace('#', '');

  // Parse RGB values
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  // Darken each channel
  const factor = 1 - percent / 100;
  const newR = Math.max(0, Math.floor(r * factor));
  const newG = Math.max(0, Math.floor(g * factor));
  const newB = Math.max(0, Math.floor(b * factor));

  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Determines appropriate text color for a given background
 * Returns white for dark backgrounds, black for light backgrounds
 */
function getContrastTextColor(hex: string): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

/**
 * Generates CSS variables object from theme configuration
 *
 * @param themeId - The theme identifier ('light', 'dark', 'blue', 'green')
 * @param accentColorOverride - Optional hex color to override the theme's accent color
 * @returns Object with CSS variable names and values
 */
export function generateCSSVariables(
  themeId: string,
  accentColorOverride?: string | null
): CSSVariables {
  const theme = getTheme(themeId);

  // Use accent color override if provided, otherwise use theme default
  const accentColor = accentColorOverride || theme.accentColor;
  const accentHover = accentColorOverride ? darkenColor(accentColorOverride, 15) : theme.accentHover;
  const accentText = accentColorOverride ? getContrastTextColor(accentColorOverride) : theme.accentText;

  return {
    '--accent-color': accentColor,
    '--accent-hover': accentHover,
    '--accent-text': accentText,
    '--background': theme.background,
    '--background-secondary': theme.backgroundSecondary,
    '--foreground': theme.foreground,
    '--foreground-muted': theme.foregroundMuted,
    '--border': theme.border,
    '--border-muted': theme.borderMuted,
    '--card-background': theme.cardBackground,
    '--card-border': theme.cardBorder,
  };
}

/**
 * Generates a CSS variable string for inline style injection
 *
 * @param themeId - The theme identifier
 * @param accentColorOverride - Optional hex color override
 * @returns CSS string like "--accent-color:#2563EB;--accent-hover:#1D4ED8;..."
 */
export function generateCSSVariableString(
  themeId: string,
  accentColorOverride?: string | null
): string {
  const variables = generateCSSVariables(themeId, accentColorOverride);

  return Object.entries(variables)
    .map(([key, value]) => `${key}:${value}`)
    .join(';');
}

/**
 * Generates a CSS :root block for theme variables
 *
 * @param themeId - The theme identifier
 * @param accentColorOverride - Optional hex color override
 * @returns CSS block like ":root { --accent-color: #2563EB; ... }"
 */
export function generateCSSRootBlock(
  themeId: string,
  accentColorOverride?: string | null
): string {
  const variables = generateCSSVariables(themeId, accentColorOverride);

  const variableDeclarations = Object.entries(variables)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');

  return `:root {\n${variableDeclarations}\n}`;
}

/**
 * Gets the default Mellon branding CSS variables (light theme, no override)
 */
export function getDefaultBrandingVariables(): CSSVariables {
  return generateCSSVariables('light');
}
