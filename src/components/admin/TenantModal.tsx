import * as React from 'react';

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
  branding?: {
    mellonLogoUrl?: string | null;
    tenantLogoUrl?: string | null;
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
  mellonLogoUrl: string;
  tenantLogoUrl: string;
}

interface FormErrors {
  name?: string;
  mellonLogoUrl?: string;
  tenantLogoUrl?: string;
  general?: string;
}

/**
 * Validates URL format
 */
function isValidUrl(url: string): boolean {
  if (!url.trim()) return true; // Empty is valid (optional field)
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function TenantModal({ isOpen, onClose, onSuccess, mode, tenant }: TenantModalProps) {
  const [formState, setFormState] = React.useState<FormState>({
    name: tenant?.name || '',
    timezone: tenant?.timezone || 'America/New_York',
    status: tenant?.status || 'active',
    mellonLogoUrl: tenant?.branding?.mellonLogoUrl || '',
    tenantLogoUrl: tenant?.branding?.tenantLogoUrl || '',
  });
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
        mellonLogoUrl: tenant.branding?.mellonLogoUrl || '',
        tenantLogoUrl: tenant.branding?.tenantLogoUrl || '',
      });
    } else {
      setFormState({
        name: '',
        timezone: 'America/New_York',
        status: 'active',
        mellonLogoUrl: '',
        tenantLogoUrl: '',
      });
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

    // Validate logo URLs if provided (edit mode only)
    if (mode === 'edit') {
      if (formState.mellonLogoUrl && !isValidUrl(formState.mellonLogoUrl)) {
        newErrors.mellonLogoUrl = 'Please enter a valid URL';
      }
      if (formState.tenantLogoUrl && !isValidUrl(formState.tenantLogoUrl)) {
        newErrors.tenantLogoUrl = 'Please enter a valid URL';
      }
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

      // Include logo URLs for edit mode
      if (mode === 'edit') {
        if (formState.mellonLogoUrl.trim()) {
          requestBody.mellonLogoUrl = formState.mellonLogoUrl.trim();
        } else if (tenant?.branding?.mellonLogoUrl) {
          // Clear the logo URL if it was previously set but now empty
          requestBody.mellonLogoUrl = null;
        }
        if (formState.tenantLogoUrl.trim()) {
          requestBody.tenantLogoUrl = formState.tenantLogoUrl.trim();
        } else if (tenant?.branding?.tenantLogoUrl) {
          // Clear the logo URL if it was previously set but now empty
          requestBody.tenantLogoUrl = null;
        }
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
        className="relative w-full max-w-md bg-white rounded-xl shadow-xl mx-4 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id="tenant-modal-title" className="text-lg font-semibold text-gray-900">
            {mode === 'create' ? 'Create Tenant' : 'Edit Tenant'}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
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
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
              <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1.5">
                Timezone
              </label>
              <select
                id="timezone"
                name="timezone"
                value={formState.timezone}
                onChange={handleInputChange}
                disabled={isSubmitting}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white"
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
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formState.status}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Note: Changing status to inactive will log out all tenant users.
                </p>
              </div>
            )}

            {/* Logo URL fields (only for edit mode) */}
            {mode === 'edit' && (
              <>
                <div className="border-t border-gray-200 pt-5">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Branding</h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Provide URLs to logo images. For advanced branding options, visit the Branding settings page.
                  </p>
                </div>

                {/* Mellon Logo URL */}
                <div>
                  <label htmlFor="mellonLogoUrl" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Mellon Logo URL
                  </label>
                  <input
                    type="url"
                    id="mellonLogoUrl"
                    name="mellonLogoUrl"
                    value={formState.mellonLogoUrl}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="https://example.com/mellon-logo.png"
                    aria-invalid={!!errors.mellonLogoUrl}
                    aria-describedby={errors.mellonLogoUrl ? 'mellonLogoUrl-error' : 'mellonLogoUrl-hint'}
                  />
                  {errors.mellonLogoUrl ? (
                    <p id="mellonLogoUrl-error" className="mt-1 text-sm text-red-600">
                      {errors.mellonLogoUrl}
                    </p>
                  ) : (
                    <p id="mellonLogoUrl-hint" className="mt-1 text-xs text-gray-500">
                      URL for the Mellon branding logo displayed in the portal
                    </p>
                  )}
                </div>

                {/* Tenant Logo URL */}
                <div>
                  <label htmlFor="tenantLogoUrl" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tenant Logo URL
                  </label>
                  <input
                    type="url"
                    id="tenantLogoUrl"
                    name="tenantLogoUrl"
                    value={formState.tenantLogoUrl}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="https://example.com/tenant-logo.png"
                    aria-invalid={!!errors.tenantLogoUrl}
                    aria-describedby={errors.tenantLogoUrl ? 'tenantLogoUrl-error' : 'tenantLogoUrl-hint'}
                  />
                  {errors.tenantLogoUrl ? (
                    <p id="tenantLogoUrl-error" className="mt-1 text-sm text-red-600">
                      {errors.tenantLogoUrl}
                    </p>
                  ) : (
                    <p id="tenantLogoUrl-hint" className="mt-1 text-xs text-gray-500">
                      URL for the tenant/franchise brand logo displayed in the header
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
