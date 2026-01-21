import * as React from 'react';
import { type ThemeId, getTheme, type ThemeConfig } from './config';
import { generateCSSVariables, type CSSVariables } from './css-variables';

interface ThemeContextValue {
  themeId: ThemeId;
  theme: ThemeConfig;
  cssVariables: CSSVariables;
  accentColorOverride: string | null;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: React.ReactNode;
  themeId?: ThemeId;
  accentColorOverride?: string | null;
}

/**
 * ThemeProvider component
 *
 * Provides theme values to React component tree.
 * Can be used to access theme configuration and CSS variables in client components.
 */
export function ThemeProvider({
  children,
  themeId = 'light',
  accentColorOverride = null,
}: ThemeProviderProps) {
  const theme = getTheme(themeId);
  const cssVariables = generateCSSVariables(themeId, accentColorOverride);

  const contextValue: ThemeContextValue = {
    themeId,
    theme,
    cssVariables,
    accentColorOverride,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context
 *
 * @returns Theme context value with theme configuration and CSS variables
 * @throws Error if used outside of ThemeProvider
 */
export function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}

/**
 * Hook to get the current accent color
 *
 * @returns The current accent color (from override or theme default)
 */
export function useAccentColor(): string {
  const { accentColorOverride, theme } = useTheme();
  return accentColorOverride || theme.accentColor;
}

/**
 * Hook to get a specific CSS variable value
 *
 * @param variableName - The CSS variable name (e.g., '--accent-color')
 * @returns The CSS variable value
 */
export function useCSSVariable(variableName: keyof CSSVariables): string {
  const { cssVariables } = useTheme();
  return cssVariables[variableName];
}

export { ThemeContext };
