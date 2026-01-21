/**
 * Theme configuration module
 *
 * Defines 4 predefined themes that map to Tailwind color families.
 * Each theme includes background, text, border, and default accent colors.
 */

export type ThemeId = 'light' | 'dark' | 'blue' | 'green';

export const VALID_THEME_IDS: ThemeId[] = ['light', 'dark', 'blue', 'green'];

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  // Background colors
  background: string;
  backgroundSecondary: string;
  // Foreground (text) colors
  foreground: string;
  foregroundMuted: string;
  // Border colors
  border: string;
  borderMuted: string;
  // Accent colors (used for buttons, links, etc.)
  accentColor: string;
  accentHover: string;
  accentText: string;
  // Card styling
  cardBackground: string;
  cardBorder: string;
}

/**
 * Light theme - uses gray color family
 * Default Mellon branding theme
 */
const lightTheme: ThemeConfig = {
  id: 'light',
  name: 'Light',
  description: 'Clean and professional light theme',
  // Background - gray-50, white
  background: '#F9FAFB',
  backgroundSecondary: '#FFFFFF',
  // Foreground - gray-900, gray-500
  foreground: '#111827',
  foregroundMuted: '#6B7280',
  // Border - gray-200, gray-100
  border: '#E5E7EB',
  borderMuted: '#F3F4F6',
  // Accent - blue-600 (Mellon brand)
  accentColor: '#2563EB',
  accentHover: '#1D4ED8',
  accentText: '#FFFFFF',
  // Card
  cardBackground: '#FFFFFF',
  cardBorder: '#E5E7EB',
};

/**
 * Dark theme - uses slate color family
 */
const darkTheme: ThemeConfig = {
  id: 'dark',
  name: 'Dark',
  description: 'Modern dark theme for low-light environments',
  // Background - slate-900, slate-800
  background: '#0F172A',
  backgroundSecondary: '#1E293B',
  // Foreground - slate-50, slate-400
  foreground: '#F8FAFC',
  foregroundMuted: '#94A3B8',
  // Border - slate-700, slate-800
  border: '#334155',
  borderMuted: '#1E293B',
  // Accent - sky-500
  accentColor: '#0EA5E9',
  accentHover: '#0284C7',
  accentText: '#FFFFFF',
  // Card
  cardBackground: '#1E293B',
  cardBorder: '#334155',
};

/**
 * Blue theme - uses blue color family
 * Professional corporate feel
 */
const blueTheme: ThemeConfig = {
  id: 'blue',
  name: 'Blue',
  description: 'Professional blue corporate theme',
  // Background - slate-50, white
  background: '#F8FAFC',
  backgroundSecondary: '#FFFFFF',
  // Foreground - slate-900, slate-500
  foreground: '#0F172A',
  foregroundMuted: '#64748B',
  // Border - slate-200, slate-100
  border: '#E2E8F0',
  borderMuted: '#F1F5F9',
  // Accent - blue-700
  accentColor: '#1D4ED8',
  accentHover: '#1E40AF',
  accentText: '#FFFFFF',
  // Card
  cardBackground: '#FFFFFF',
  cardBorder: '#DBEAFE',
};

/**
 * Green theme - uses green color family
 * Fresh and growth-oriented
 */
const greenTheme: ThemeConfig = {
  id: 'green',
  name: 'Green',
  description: 'Fresh green theme representing growth',
  // Background - gray-50, white
  background: '#F9FAFB',
  backgroundSecondary: '#FFFFFF',
  // Foreground - gray-900, gray-500
  foreground: '#111827',
  foregroundMuted: '#6B7280',
  // Border - gray-200, gray-100
  border: '#E5E7EB',
  borderMuted: '#F3F4F6',
  // Accent - emerald-600
  accentColor: '#059669',
  accentHover: '#047857',
  accentText: '#FFFFFF',
  // Card
  cardBackground: '#FFFFFF',
  cardBorder: '#D1FAE5',
};

/**
 * All available themes
 */
export const themes: Record<ThemeId, ThemeConfig> = {
  light: lightTheme,
  dark: darkTheme,
  blue: blueTheme,
  green: greenTheme,
};

/**
 * Gets a theme configuration by ID
 * Falls back to light theme for invalid IDs
 */
export function getTheme(themeId: string): ThemeConfig {
  if (themeId in themes) {
    return themes[themeId as ThemeId];
  }
  return themes.light;
}

/**
 * Validates if a theme ID is valid
 */
export function isValidThemeId(themeId: string): themeId is ThemeId {
  return VALID_THEME_IDS.includes(themeId as ThemeId);
}
