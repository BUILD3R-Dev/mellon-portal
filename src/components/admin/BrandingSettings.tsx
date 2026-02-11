import * as React from 'react';

interface PortalBranding {
  id: string;
  headerLogoLightUrl: string | null;
  headerLogoDarkUrl: string | null;
  footerLogoLightUrl: string | null;
  footerLogoDarkUrl: string | null;
  faviconUrl: string | null;
  adminThemeId: string;
}

interface BrandingSettingsProps {
  initialBranding: PortalBranding;
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];
const FAVICON_TYPES = [...ALLOWED_TYPES, 'image/x-icon', 'image/vnd.microsoft.icon'];
const MAX_FILE_SIZE = 500 * 1024;

interface PortalLogoUploadProps {
  type: string;
  label: string;
  currentUrl: string | null;
  onLogoChange: (url: string | null) => void;
  helpText?: string;
  acceptFavicon?: boolean;
}

function PortalLogoUpload({ type, label, currentUrl, onLogoChange, helpText, acceptFavicon }: PortalLogoUploadProps) {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(currentUrl);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const inputId = `logo-upload-${type}`;

  React.useEffect(() => {
    setPreviewUrl(currentUrl);
  }, [currentUrl]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    const allowed = acceptFavicon ? FAVICON_TYPES : ALLOWED_TYPES;
    if (!allowed.includes(file.type)) {
      const formats = acceptFavicon ? 'PNG, JPG, SVG, or ICO' : 'PNG, JPG, or SVG';
      setError(`Invalid file type. Please upload ${formats}.`);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('File size exceeds 500KB limit.');
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch(`/api/admin/branding/logo?type=${type}`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to upload file');
        setPreviewUrl(currentUrl);
        return;
      }

      // Add cache-busting query param
      const newUrl = `${data.data.url}?t=${Date.now()}`;
      setPreviewUrl(newUrl);
      onLogoChange(newUrl);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload. Please try again.');
      setPreviewUrl(currentUrl);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!previewUrl) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/branding/logo?type=${type}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to delete file');
        return;
      }

      setPreviewUrl(null);
      onLogoChange(null);
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const acceptAttr = acceptFavicon ? '.png,.jpg,.jpeg,.svg,.ico' : '.png,.jpg,.jpeg,.svg';

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium" style={{ color: 'var(--foreground-muted, #6B7280)' }}>{label}</label>

      <div className="flex items-start gap-4">
        <div className="relative flex-shrink-0">
          <div
            className="w-40 h-20 border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: 'var(--background-secondary, #F9FAFB)', borderColor: 'var(--border, #D1D5DB)' }}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={`${label} preview`}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="text-center p-2">
                <svg className="mx-auto h-6 w-6" style={{ color: 'var(--foreground-muted, #9CA3AF)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--foreground-muted, #6B7280)' }}>No image</p>
              </div>
            )}
          </div>

          {(isUploading || isDeleting) && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, var(--card-background, #FFFFFF) 80%, transparent)' }}>
              <svg className="animate-spin h-5 w-5" style={{ color: 'var(--foreground-muted, #6B7280)' }} fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptAttr}
              onChange={handleFileSelect}
              disabled={isUploading || isDeleting}
              className="hidden"
              id={inputId}
            />
            <label
              htmlFor={inputId}
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer border ${
                isUploading || isDeleting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              style={{
                color: 'var(--foreground, #111827)',
                backgroundColor: 'var(--card-background, #FFFFFF)',
                borderColor: 'var(--border, #E5E7EB)',
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {isUploading ? 'Uploading...' : 'Upload'}
            </label>
          </div>

          {previewUrl && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isUploading || isDeleting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--card-background, #FFFFFF)' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {isDeleting ? 'Removing...' : 'Remove'}
            </button>
          )}

          {helpText && <p className="text-xs" style={{ color: 'var(--foreground-muted, #6B7280)' }}>{helpText}</p>}
        </div>
      </div>

      {error && (
        <div className="p-2 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}

export function BrandingSettings({ initialBranding }: BrandingSettingsProps) {
  const [branding, setBranding] = React.useState<PortalBranding>(initialBranding);
  const [themeSaving, setThemeSaving] = React.useState(false);

  const handleThemeChange = async (themeId: 'light' | 'dark') => {
    if (themeId === branding.adminThemeId) return;

    setThemeSaving(true);
    const previous = branding.adminThemeId;
    setBranding((prev) => ({ ...prev, adminThemeId: themeId }));

    try {
      const response = await fetch('/api/admin/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminThemeId: themeId }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        setBranding((prev) => ({ ...prev, adminThemeId: previous }));
      }
    } catch {
      setBranding((prev) => ({ ...prev, adminThemeId: previous }));
    } finally {
      setThemeSaving(false);
    }
  };

  const updateUrl = (field: keyof PortalBranding) => (url: string | null) => {
    setBranding((prev) => ({ ...prev, [field]: url }));
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--foreground, #111827)' }}>Branding</h1>
        <p className="mt-1" style={{ color: 'var(--foreground-muted, #6B7280)' }}>Configure the portal appearance for the admin dashboard.</p>
      </div>

      {/* Admin Theme */}
      <div className="rounded-xl border p-6" style={{ backgroundColor: 'var(--card-background, #FFFFFF)', borderColor: 'var(--card-border, #E5E7EB)' }}>
        <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--foreground, #111827)' }}>Admin Theme</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--foreground-muted, #6B7280)' }}>Choose the color scheme for the admin dashboard.</p>

        <div className="inline-flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border, #E5E7EB)' }}>
          <button
            type="button"
            onClick={() => handleThemeChange('light')}
            disabled={themeSaving}
            className="px-4 py-2 text-sm font-medium transition-colors"
            style={branding.adminThemeId === 'light'
              ? { backgroundColor: 'var(--foreground, #111827)', color: 'var(--background, #F9FAFB)' }
              : { backgroundColor: 'var(--card-background, #FFFFFF)', color: 'var(--foreground-muted, #6B7280)' }
            }
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Light
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleThemeChange('dark')}
            disabled={themeSaving}
            className="px-4 py-2 text-sm font-medium transition-colors border-l"
            style={branding.adminThemeId === 'dark'
              ? { backgroundColor: 'var(--foreground, #111827)', color: 'var(--background, #F9FAFB)', borderColor: 'var(--border, #E5E7EB)' }
              : { backgroundColor: 'var(--card-background, #FFFFFF)', color: 'var(--foreground-muted, #6B7280)', borderColor: 'var(--border, #E5E7EB)' }
            }
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              Dark
            </span>
          </button>
        </div>
        {themeSaving && <p className="mt-2 text-xs" style={{ color: 'var(--foreground-muted, #6B7280)' }}>Saving...</p>}
      </div>

      {/* Header Logos */}
      <div className="rounded-xl border p-6" style={{ backgroundColor: 'var(--card-background, #FFFFFF)', borderColor: 'var(--card-border, #E5E7EB)' }}>
        <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--foreground, #111827)' }}>Header Logos</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--foreground-muted, #6B7280)' }}>Displayed in the top navigation bar. Upload separate logos for light and dark themes.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PortalLogoUpload
            type="header-light"
            label="Light Mode"
            currentUrl={branding.headerLogoLightUrl}
            onLogoChange={updateUrl('headerLogoLightUrl')}
            helpText="PNG, JPG, or SVG. Max 500KB."
          />
          <PortalLogoUpload
            type="header-dark"
            label="Dark Mode"
            currentUrl={branding.headerLogoDarkUrl}
            onLogoChange={updateUrl('headerLogoDarkUrl')}
            helpText="PNG, JPG, or SVG. Max 500KB."
          />
        </div>
      </div>

      {/* Footer Logos */}
      <div className="rounded-xl border p-6" style={{ backgroundColor: 'var(--card-background, #FFFFFF)', borderColor: 'var(--card-border, #E5E7EB)' }}>
        <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--foreground, #111827)' }}>Footer Logos</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--foreground-muted, #6B7280)' }}>Displayed in the page footer. Upload separate logos for light and dark themes.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PortalLogoUpload
            type="footer-light"
            label="Light Mode"
            currentUrl={branding.footerLogoLightUrl}
            onLogoChange={updateUrl('footerLogoLightUrl')}
            helpText="PNG, JPG, or SVG. Max 500KB."
          />
          <PortalLogoUpload
            type="footer-dark"
            label="Dark Mode"
            currentUrl={branding.footerLogoDarkUrl}
            onLogoChange={updateUrl('footerLogoDarkUrl')}
            helpText="PNG, JPG, or SVG. Max 500KB."
          />
        </div>
      </div>

      {/* Favicon */}
      <div className="rounded-xl border p-6" style={{ backgroundColor: 'var(--card-background, #FFFFFF)', borderColor: 'var(--card-border, #E5E7EB)' }}>
        <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--foreground, #111827)' }}>Favicon</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--foreground-muted, #6B7280)' }}>The small icon shown in browser tabs.</p>

        <PortalLogoUpload
          type="favicon"
          label="Favicon"
          currentUrl={branding.faviconUrl}
          onLogoChange={updateUrl('faviconUrl')}
          helpText="ICO, PNG, SVG, or JPG. Max 500KB. Recommended: 32x32 or 64x64 pixels."
          acceptFavicon
        />
      </div>
    </div>
  );
}
