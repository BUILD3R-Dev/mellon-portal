import * as React from 'react';
import { LogoUpload } from './LogoUpload';
import { ThemeSelector } from './ThemeSelector';
import { AccentColorPicker } from './AccentColorPicker';
import { getTheme, type ThemeId } from '@/lib/themes';

interface BrandingData {
  themeId: string;
  accentColorOverride: string | null;
  tenantLogoUrl: string | null;
}

interface BrandingFormProps {
  tenantId: string;
  initialData: BrandingData;
  tenantName?: string;
}

export function BrandingForm({ tenantId, initialData, tenantName }: BrandingFormProps) {
  const [themeId, setThemeId] = React.useState<ThemeId>(initialData.themeId as ThemeId || 'light');
  const [accentColorOverride, setAccentColorOverride] = React.useState<string | null>(
    initialData.accentColorOverride
  );
  const [logoUrl, setLogoUrl] = React.useState<string | null>(initialData.tenantLogoUrl);
  const [isSaving, setIsSaving] = React.useState(false);
  const [notification, setNotification] = React.useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Track if there are unsaved changes
  const hasChanges =
    themeId !== initialData.themeId || accentColorOverride !== initialData.accentColorOverride;

  // Auto-hide notification
  React.useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Get the default accent color from the selected theme
  const selectedTheme = getTheme(themeId);
  const defaultAccentColor = selectedTheme.accentColor;

  const handleSave = async () => {
    setIsSaving(true);
    setNotification(null);

    try {
      const response = await fetch(`/api/tenants/${tenantId}/branding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          themeId,
          accentColorOverride,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setNotification({
          type: 'error',
          message: data.error || 'Failed to save branding settings',
        });
        return;
      }

      setNotification({
        type: 'success',
        message: 'Branding settings saved successfully',
      });
    } catch (error) {
      console.error('Save error:', error);
      setNotification({
        type: 'error',
        message: 'Failed to save branding settings. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Branding Configuration</h2>
        <p className="mt-1 text-sm text-gray-500">
          Customize the visual appearance of the portal for{' '}
          {tenantName ? <span className="font-medium">{tenantName}</span> : 'this tenant'}.
        </p>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`p-4 rounded-lg border ${
            notification.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
              <p className="text-sm">{notification.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="text-current opacity-70 hover:opacity-100"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Logo Upload Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <LogoUpload tenantId={tenantId} currentLogoUrl={logoUrl} onLogoChange={setLogoUrl} />
      </div>

      {/* Theme Selection Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <ThemeSelector selectedTheme={themeId} onThemeChange={setThemeId} />
      </div>

      {/* Accent Color Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <AccentColorPicker
          value={accentColorOverride}
          onChange={setAccentColorOverride}
          defaultColor={defaultAccentColor}
        />
      </div>

      {/* Live Preview */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-4">Live Preview</label>
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: selectedTheme.background,
            borderColor: selectedTheme.border,
          }}
        >
          <div className="flex items-center gap-4 mb-4">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo preview" className="h-10 object-contain" />
            ) : (
              <div className="h-10 w-24 bg-gray-200 rounded flex items-center justify-center">
                <span className="text-xs text-gray-500">Logo</span>
              </div>
            )}
            <span
              className="text-lg font-semibold"
              style={{ color: selectedTheme.foreground }}
            >
              Mellon Portal
            </span>
          </div>

          <div
            className="p-4 rounded-lg mb-4"
            style={{
              backgroundColor: selectedTheme.cardBackground,
              borderColor: selectedTheme.cardBorder,
              borderWidth: 1,
              borderStyle: 'solid',
            }}
          >
            <h3 className="text-sm font-medium mb-2" style={{ color: selectedTheme.foreground }}>
              Sample Card
            </h3>
            <p className="text-sm" style={{ color: selectedTheme.foregroundMuted }}>
              This is how cards will appear with the selected theme.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
              style={{
                backgroundColor: accentColorOverride || selectedTheme.accentColor,
                color: selectedTheme.accentText,
              }}
            >
              Primary Button
            </button>
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors"
              style={{
                color: accentColorOverride || selectedTheme.accentColor,
                borderColor: accentColorOverride || selectedTheme.accentColor,
                backgroundColor: 'transparent',
              }}
            >
              Secondary Button
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div>
          {hasChanges && (
            <p className="text-sm text-amber-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              You have unsaved changes
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <a
            href="/admin/tenants"
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back to Tenants
          </a>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="px-4 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <span>Saving...</span>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
