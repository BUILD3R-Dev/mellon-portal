/**
 * Theme System Module Exports
 *
 * Provides theme configuration, CSS variable generation, and React context
 * for the co-branded layout system.
 */

// Theme configuration
export {
  themes,
  getTheme,
  isValidThemeId,
  VALID_THEME_IDS,
  type ThemeId,
  type ThemeConfig,
} from './config';

// CSS variable utilities
export {
  generateCSSVariables,
  generateCSSVariableString,
  generateCSSRootBlock,
  getDefaultBrandingVariables,
  type CSSVariables,
} from './css-variables';

// React context and hooks
export {
  ThemeProvider,
  useTheme,
  useAccentColor,
  useCSSVariable,
  ThemeContext,
} from './ThemeProvider';
