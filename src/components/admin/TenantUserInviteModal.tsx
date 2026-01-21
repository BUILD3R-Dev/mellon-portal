import * as React from 'react';

/**
 * Role options for the invite form
 */
const ROLE_OPTIONS = [
  {
    value: 'tenant_admin',
    label: 'Tenant Administrator',
    description: 'Full access to this tenant',
  },
  {
    value: 'tenant_viewer',
    label: 'Tenant Viewer',
    description: 'View-only access to this tenant',
  },
];

interface TenantUserInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: { userId: string; email: string }) => void;
  tenantId: string;
  tenantName: string;
  allowedRoles: string[];
}

interface FormState {
  email: string;
  role: 'tenant_admin' | 'tenant_viewer' | '';
}

interface FormErrors {
  email?: string;
  role?: string;
  general?: string;
}

export function TenantUserInviteModal({
  isOpen,
  onClose,
  onSuccess,
  tenantId,
  tenantName,
  allowedRoles,
}: TenantUserInviteModalProps) {
  const [formState, setFormState] = React.useState<FormState>({
    email: '',
    role: '',
  });
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [successData, setSuccessData] = React.useState<{ email: string } | null>(null);

  const modalRef = React.useRef<HTMLDivElement>(null);

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
      resetForm();
      onClose();
    }
  };

  const resetForm = () => {
    setFormState({ email: '', role: '' });
    setErrors({});
    setShowSuccess(false);
    setSuccessData(null);
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

    if (!formState.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formState.role) {
      newErrors.role = 'Role is required';
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
      const response = await fetch(`/api/tenants/${tenantId}/users/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formState.email.trim().toLowerCase(),
          role: formState.role,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (response.status === 429) {
          setErrors({
            general: 'Rate limit exceeded. Please wait before sending more invites.',
          });
        } else {
          setErrors({
            general: data.error || 'Failed to create invite. Please try again.',
          });
        }
        setIsSubmitting(false);
        return;
      }

      // Show success state
      setSuccessData({
        email: data.data.email,
      });
      setShowSuccess(true);
      setIsSubmitting(false);

      // Notify parent
      onSuccess({
        userId: data.data.userId,
        email: data.data.email,
      });
    } catch (error) {
      console.error('Invite error:', error);
      setErrors({
        general: 'A network error occurred. Please try again.',
      });
      setIsSubmitting(false);
    }
  };

  const handleInviteAnother = () => {
    resetForm();
  };

  // Filter role options based on allowed roles
  const availableRoles = ROLE_OPTIONS.filter((r) => allowedRoles.includes(r.value));

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-modal-title"
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
          <h2 id="invite-modal-title" className="text-lg font-semibold text-gray-900">
            {showSuccess ? 'Invite Sent' : 'Invite User'}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {showSuccess && successData ? (
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-gray-900 font-medium mb-2">Invitation sent successfully!</p>
              <p className="text-gray-600 text-sm mb-6">
                An invitation email has been sent to{' '}
                <span className="font-medium">{successData.email}</span> to join{' '}
                <span className="font-medium">{tenantName}</span>
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleInviteAnother}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Invite another
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Tenant info (read-only) */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Tenant
                </p>
                <p className="text-sm font-medium text-gray-900">{tenantName}</p>
              </div>

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

              {/* Email field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formState.email}
                  onChange={handleInputChange}
                  required
                  autoComplete="email"
                  disabled={isSubmitting}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="user@example.com"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
                {errors.email && (
                  <p id="email-error" className="mt-1 text-sm text-red-600">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Role field */}
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  value={formState.role}
                  onChange={handleInputChange}
                  required
                  disabled={isSubmitting}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                  aria-invalid={!!errors.role}
                  aria-describedby={errors.role ? 'role-error' : 'role-description'}
                >
                  <option value="">Select a role</option>
                  {availableRoles.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.role ? (
                  <p id="role-error" className="mt-1 text-sm text-red-600">
                    {errors.role}
                  </p>
                ) : formState.role ? (
                  <p id="role-description" className="mt-1 text-sm text-gray-500">
                    {availableRoles.find((r) => r.value === formState.role)?.description}
                  </p>
                ) : null}
              </div>

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
                      <span>Sending...</span>
                      <svg
                        className="animate-spin h-4 w-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
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
                    <span>Send invite</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
