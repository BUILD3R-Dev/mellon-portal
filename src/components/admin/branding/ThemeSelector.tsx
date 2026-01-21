import * as React from 'react';
import { themes, type ThemeId, type ThemeConfig } from '@/lib/themes';

interface ThemeSelectorProps {
  selectedTheme: string;
  onThemeChange: (themeId: ThemeId) => void;
}

/**
 * Theme preview card component
 */
function ThemePreview({ theme, isSelected }: { theme: ThemeConfig; isSelected: boolean }) {
  return (
    <div
      className={`relative p-3 rounded-lg border-2 transition-all cursor-pointer ${
        isSelected
          ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-2'
          : 'border-gray-200 hover:border-gray-400'
      }`}
      style={{ backgroundColor: theme.background }}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* Theme preview */}
      <div className="space-y-2">
        {/* Header preview */}
        <div
          className="h-4 rounded"
          style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.border}` }}
        >
          <div className="flex items-center gap-1 px-1.5 py-0.5">
            <div className="w-2 h-2 rounded" style={{ backgroundColor: theme.accentColor }} />
            <div className="flex-1 h-1.5 rounded" style={{ backgroundColor: theme.foregroundMuted }} />
          </div>
        </div>

        {/* Content preview */}
        <div className="flex gap-1">
          <div
            className="flex-1 h-8 rounded"
            style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.border}` }}
          >
            <div className="p-1">
              <div className="h-1.5 w-3/4 rounded mb-1" style={{ backgroundColor: theme.foreground }} />
              <div className="h-1 w-1/2 rounded" style={{ backgroundColor: theme.foregroundMuted }} />
            </div>
          </div>
          <div
            className="flex-1 h-8 rounded"
            style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.border}` }}
          >
            <div className="p-1">
              <div className="h-1.5 w-3/4 rounded mb-1" style={{ backgroundColor: theme.foreground }} />
              <div className="h-1 w-1/2 rounded" style={{ backgroundColor: theme.foregroundMuted }} />
            </div>
          </div>
        </div>

        {/* Button preview */}
        <div className="flex justify-end">
          <div
            className="h-3 w-12 rounded text-[6px] flex items-center justify-center"
            style={{ backgroundColor: theme.accentColor, color: theme.accentText }}
          >
            Button
          </div>
        </div>
      </div>

      {/* Theme name */}
      <div className="mt-3 text-center">
        <p className="text-sm font-medium" style={{ color: theme.foreground }}>
          {theme.name}
        </p>
      </div>
    </div>
  );
}

export function ThemeSelector({ selectedTheme, onThemeChange }: ThemeSelectorProps) {
  const themeEntries = Object.entries(themes) as [ThemeId, ThemeConfig][];

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">Theme</label>
      <p className="text-sm text-gray-500">
        Select a color theme for the tenant portal. This affects background colors, text, and buttons.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {themeEntries.map(([themeId, theme]) => (
          <div key={themeId} onClick={() => onThemeChange(themeId)}>
            <ThemePreview theme={theme} isSelected={selectedTheme === themeId} />
          </div>
        ))}
      </div>
    </div>
  );
}
