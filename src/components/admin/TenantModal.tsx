import * as React from 'react';
import { LogoUpload } from './branding/LogoUpload';

/**
 * Common timezone options
 */
const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (MST)' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HST)' },
];

interface Tenant {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'suspended';
  timezone: string;
  clienttetherWebKey?: string | null;
  clienttetherAccessToken?: string | null;
  branding?: {
    tenantLogoUrl?: string | null;
    tenantLogoDarkUrl?: string | null;
    themeId?: string | null;
  } | null;
}

interface TenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
  mode: 'create' | 'edit';
  tenant?: Tenant;
}

interface FormState {
  name: string;
  timezone: string;
  status: 'active' | 'inactive' | 'suspended';
  themeId: 'light' | 'dark';
  clienttetherWebKey: string;
  clienttetherAccessToken: string;
}

interface FormErrors {
  name?: string;
  general?: string;
}

export function TenantModal({ isOpen, onClose, onSuccess, mode, tenant }: TenantModalProps) {
  const [formState, setFormState] = React.useState<FormState>({
    name: tenant?.name || '',
    timezone: tenant?.timezone || 'America/New_York',
    status: tenant?.status || 'active',
    themeId: (tenant?.branding?.themeId as 'light' | 'dark') || 'light',
    clienttetherWebKey: tenant?.clienttetherWebKey || '',
    clienttetherAccessToken: tenant?.clienttetherAccessToken || '',
  });
  const [tenantLogoUrl, setTenantLogoUrl] = React.useState<string | null>(tenant?.branding?.tenantLogoUrl || null);
  const [tenantLogoDarkUrl, setTenantLogoDarkUrl] = React.useState<string | null>(tenant?.branding?.tenantLogoDarkUrl || null);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const modalRef = React.useRef<HTMLDivElement>(null);

  // Update form state when tenant prop changes
  React.useEffect(() => {
    if (tenant) {
      setFormState({
        name: tenant.name,
        timezone: tenant.timezone,
        status: tenant.status,
        themeId: (tenant.branding?.themeId as 'light' | 'dark') || 'light',
        clienttetherWebKey: tenant.clienttetherWebKey || '',
        clienttetherAccessToken: tenant.clienttetherAccessToken || '',
      });
      setTenantLogoUrl(tenant.branding?.tenantLogoUrl || null);
      setTenantLogoDarkUrl(tenant.branding?.tenantLogoDarkUrl || null);
    } else {
      setFormState({
        name: '',
        timezone: 'America/New_York',
        status: 'active',
        themeId: 'light',
        clienttetherWebKey: '',
        clienttetherAccessToken: '',
      });
      setTenantLogoUrl(null);
      setTenantLogoDarkUrl(null);
    }
    setErrors({});
  }, [tenant, isOpen]);

  // Close on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Focus trap and body scroll lock
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      modalRef.current?.focus();
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleClose = () => {
    if (!isSubmitting) {
      setErrors({});
      onClose();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formState.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formState.name.length > 255) {
      newErrors.name = 'Name must be 255 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const url = mode === 'create' ? '/api/tenants' : `/api/tenants/${tenant?.id}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';

      const requestBody: Record<string, any> = {
        name: formState.name.trim(),
        timezone: formState.timezone,
        status: formState.status,
      };

      // Include ClientTether credentials and theme for edit mode
      if (mode === 'edit') {
        requestBody.clienttetherWebKey = formState.clienttetherWebKey.trim() || null;
        requestBody.clienttetherAccessToken = formState.clienttetherAccessToken.trim() || null;
        requestBody.themeId = formState.themeId;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrors({
          general: data.error || `Failed to ${mode} tenant. Please try again.`,
        });
        setIsSubmitting(false);
        return;
      }

      onSuccess(data.data);
      handleClose();
    } catch (error) {
      console.error('Tenant save error:', error);
      setErrors({
        general: 'A network error occurred. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tenant-modal-title"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={handleClose} />

      {/* Modal */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative w-full max-w-lg rounded-xl shadow-xl mx-4 max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: 'var(--card-background, white)',
          color: 'var(--foreground, #111827)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-6 border-b"
          style={{ borderColor: 'var(--border, #E5E7EB)' }}
        >
          <h2 id="tenant-modal-title" className="text-lg font-semibold">
            {mode === 'create' ? 'Create Tenant' : 'Edit Tenant'}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="transition-colors"
            style={{ color: 'var(--foreground-muted, #6B7280)' }}
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error message */}
            {errors.general && (
              <div
                className="p-3 rounded-lg bg-red-50 border border-red-200"
                role="alert"
                aria-live="polite"
              >
                <p className="text-sm text-red-700">{errors.general}</p>
              </div>
            )}

            {/* Name field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground, #111827)' }}>
                Tenant name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formState.name}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
                className="w-full px-4 py-2.5 rounded-lg outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'var(--background-secondary, #F9FAFB)',
                  color: 'var(--foreground, #111827)',
                  border: '1px solid var(--border, #D1D5DB)',
                }}
                placeholder="Enter tenant name"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
              {errors.name && (
                <p id="name-error" className="mt-1 text-sm text-red-600">
                  {errors.name}
                </p>
              )}
            </div>

            {/* Timezone field */}
            <div>
              <label htmlFor="timezone" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground, #111827)' }}>
                Timezone
              </label>
              <select
                id="timezone"
                name="timezone"
                value={formState.timezone}
                onChange={handleInputChange}
                disabled={isSubmitting}
                className="w-full px-4 py-2.5 rounded-lg outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'var(--background-secondary, #F9FAFB)',
                  color: 'var(--foreground, #111827)',
                  border: '1px solid var(--border, #D1D5DB)',
                }}
              >
                {TIMEZONE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status field (only for edit mode) */}
            {mode === 'edit' && (
              <div>
                <label htmlFor="status" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground, #111827)' }}>
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formState.status}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  className="w-full px-4 py-2.5 rounded-lg outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: 'var(--background-secondary, #F9FAFB)',
                    color: 'var(--foreground, #111827)',
                    border: '1px solid var(--border, #D1D5DB)',
                  }}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
                <p className="mt-1 text-xs" style={{ color: 'var(--foreground-muted, #6B7280)' }}>
                  Note: Changing status to inactive will log out all tenant users.
                </p>
              </div>
            )}

            {/* ClientTether API fields (only for edit mode) */}
            {mode === 'edit' && (
              <>
                <div className="border-t pt-5" style={{ borderColor: 'var(--border, #E5E7EB)' }}>
                  <h3 className="text-sm font-medium mb-3">ClientTether Integration</h3>
                  <p className="text-xs mb-4" style={{ color: 'var(--foreground-muted, #6B7280)' }}>
                    API credentials from the ClientTether Settings &gt; API page. Both fields are required for data sync.
                  </p>
                </div>

                {/* Access Token */}
                <div>
                  <label htmlFor="clienttetherAccessToken" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground, #111827)' }}>
                    Access Token
                  </label>
                  <input
                    type="password"
                    id="clienttetherAccessToken"
                    name="clienttetherAccessToken"
                    value={formState.clienttetherAccessToken}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2.5 rounded-lg outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed font-mono text-sm"
                    style={{
                      backgroundColor: 'var(--background-secondary, #F9FAFB)',
                      color: 'var(--foreground, #111827)',
                      border: '1px solid var(--border, #D1D5DB)',
                    }}
                    placeholder="X-Access-Token value"
                    autoComplete="off"
                  />
                  <p className="mt-1 text-xs" style={{ color: 'var(--foreground-muted, #6B7280)' }}>
                    The X-Access-Token header value from ClientTether API settings
                  </p>
                </div>

                {/* Web Key */}
                <div>
                  <label htmlFor="clienttetherWebKey" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground, #111827)' }}>
                    Web Key
                  </label>
                  <input
                    type="text"
                    id="clienttetherWebKey"
                    name="clienttetherWebKey"
                    value={formState.clienttetherWebKey}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2.5 rounded-lg outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed font-mono text-sm"
                    style={{
                      backgroundColor: 'var(--background-secondary, #F9FAFB)',
                      color: 'var(--foreground, #111827)',
                      border: '1px solid var(--border, #D1D5DB)',
                    }}
                    placeholder="X-Web-Key value (e.g., CT_...)"
                    autoComplete="off"
                  />
                  <p className="mt-1 text-xs" style={{ color: 'var(--foreground-muted, #6B7280)' }}>
                    The X-Web-Key header value from ClientTether API settings
                  </p>
                </div>
              </>
            )}

            {/* Branding section (only for edit mode) */}
            {mode === 'edit' && tenant && (
              <>
                <div className="border-t pt-5" style={{ borderColor: 'var(--border, #E5E7EB)' }}>
                  <h3 className="text-sm font-medium mb-3">Branding</h3>
                  <p className="text-xs mb-4" style={{ color: 'var(--foreground-muted, #6B7280)' }}>
                    Upload logos for light and dark themes. PNG, JPG, or SVG. Max 500KB.
                  </p>
                </div>

                {/* Logo Uploads - Light and Dark side by side */}
                <div className="grid grid-cols-2 gap-4">
                  <LogoUpload
                    tenantId={tenant.id}
                    currentLogoUrl={tenantLogoUrl}
                    onLogoChange={setTenantLogoUrl}
                    variant="light"
                    label="Light Mode Logo"
                  />
                  <LogoUpload
                    tenantId={tenant.id}
                    currentLogoUrl={tenantLogoDarkUrl}
                    onLogoChange={setTenantLogoDarkUrl}
                    variant="dark"
                    label="Dark Mode Logo"
                  />
                </div>

                {/* Light/Dark Theme Toggle */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground, #111827)' }}>
                    Theme
                  </label>
                  <div className="inline-flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border, #D1D5DB)' }}>
                    <button
                      type="button"
                      onClick={() => setFormState((prev) => ({ ...prev, themeId: 'light' }))}
                      className="px-4 py-2 text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: formState.themeId === 'light' ? 'var(--accent-color, #1F2937)' : 'var(--card-background, white)',
                        color: formState.themeId === 'light' ? 'white' : 'var(--foreground, #374151)',
                      }}
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
                      onClick={() => setFormState((prev) => ({ ...prev, themeId: 'dark' }))}
                      className="px-4 py-2 text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: formState.themeId === 'dark' ? 'var(--accent-color, #1F2937)' : 'var(--card-background, white)',
                        color: formState.themeId === 'dark' ? 'white' : 'var(--foreground, #374151)',
                        borderLeft: '1px solid var(--border, #D1D5DB)',
                      }}
                    >
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                        Dark
                      </span>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'var(--card-background, white)',
                  color: 'var(--foreground, #374151)',
                  border: '1px solid var(--border, #D1D5DB)',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ backgroundColor: 'var(--accent-color, #1F2937)' }}
              >
                {isSubmitting ? (
                  <>
                    <span>{mode === 'create' ? 'Creating...' : 'Saving...'}</span>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  </>
                ) : (
                  <span>{mode === 'create' ? 'Create Tenant' : 'Save Changes'}</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
