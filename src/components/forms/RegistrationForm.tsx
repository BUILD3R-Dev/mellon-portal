import * as React from 'react';

/**
 * Common IANA timezones for the dropdown
 */
const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'America/Anchorage', label: 'Alaska' },
  { value: 'Pacific/Honolulu', label: 'Hawaii' },
  { value: 'America/Phoenix', label: 'Arizona' },
  { value: 'America/Toronto', label: 'Eastern Time (Canada)' },
  { value: 'America/Vancouver', label: 'Pacific Time (Canada)' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Shanghai', label: 'Shanghai' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Australia/Sydney', label: 'Sydney' },
  { value: 'Australia/Melbourne', label: 'Melbourne' },
  { value: 'Pacific/Auckland', label: 'Auckland' },
];

interface RegistrationFormProps {
  token: string;
  email: string;
  role: string;
  tenantName?: string;
}

interface FormState {
  name: string;
  password: string;
  passwordConfirmation: string;
  timezone: string;
}

interface FormErrors {
  name?: string;
  password?: string;
  passwordConfirmation?: string;
  timezone?: string;
  general?: string;
}

/**
 * Gets the user's detected timezone
 */
function getDetectedTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'America/New_York';
  }
}

/**
 * Formats role for display
 */
function formatRole(role: string): string {
  const roleMap: Record<string, string> = {
    agency_admin: 'Agency Administrator',
    tenant_admin: 'Tenant Administrator',
    tenant_viewer: 'Tenant Viewer',
  };
  return roleMap[role] || role;
}

export function RegistrationForm({ token, email, role, tenantName }: RegistrationFormProps) {
  const [formState, setFormState] = React.useState<FormState>({
    name: '',
    password: '',
    passwordConfirmation: '',
    timezone: getDetectedTimezone(),
  });
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formState.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formState.password) {
      newErrors.password = 'Password is required';
    } else if (formState.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!formState.passwordConfirmation) {
      newErrors.passwordConfirmation = 'Please confirm your password';
    } else if (formState.password !== formState.passwordConfirmation) {
      newErrors.passwordConfirmation = 'Passwords do not match';
    }

    if (!formState.timezone) {
      newErrors.timezone = 'Please select a timezone';
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
      const response = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          name: formState.name.trim(),
          password: formState.password,
          passwordConfirmation: formState.passwordConfirmation,
          timezone: formState.timezone,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrors({
          general: data.error || 'An error occurred. Please try again.',
        });
        setIsSubmitting(false);
        return;
      }

      // Success - redirect to dashboard
      window.location.href = data.data.redirectUrl;
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({
        general: 'A network error occurred. Please check your connection and try again.',
      });
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Role and Tenant Info */}
      <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
        <p className="text-sm text-gray-600">
          You're being invited as:{' '}
          <span className="font-medium text-gray-900">{formatRole(role)}</span>
        </p>
        {tenantName && (
          <p className="text-sm text-gray-600 mt-1">
            Organization: <span className="font-medium text-gray-900">{tenantName}</span>
          </p>
        )}
        <p className="text-sm text-gray-500 mt-2">{email}</p>
      </div>

      {/* Error message */}
      {errors.general && (
        <div
          className="p-4 rounded-lg bg-red-50 border border-red-200"
          role="alert"
          aria-live="polite"
        >
          <p className="text-sm text-red-700">{errors.general}</p>
        </div>
      )}

      {/* Name field */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Full name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formState.name}
          onChange={handleInputChange}
          required
          autoComplete="name"
          disabled={isSubmitting}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="John Doe"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && (
          <p id="name-error" className="mt-1 text-sm text-red-600">
            {errors.name}
          </p>
        )}
      </div>

      {/* Password field */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
          Password
        </label>
        <input
          type="password"
          id="password"
          name="password"
          value={formState.password}
          onChange={handleInputChange}
          required
          autoComplete="new-password"
          disabled={isSubmitting}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="Minimum 8 characters"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'password-error' : undefined}
        />
        {errors.password && (
          <p id="password-error" className="mt-1 text-sm text-red-600">
            {errors.password}
          </p>
        )}
      </div>

      {/* Password confirmation field */}
      <div>
        <label
          htmlFor="passwordConfirmation"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Confirm password
        </label>
        <input
          type="password"
          id="passwordConfirmation"
          name="passwordConfirmation"
          value={formState.passwordConfirmation}
          onChange={handleInputChange}
          required
          autoComplete="new-password"
          disabled={isSubmitting}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="Re-enter your password"
          aria-invalid={!!errors.passwordConfirmation}
          aria-describedby={errors.passwordConfirmation ? 'passwordConfirmation-error' : undefined}
        />
        {errors.passwordConfirmation && (
          <p id="passwordConfirmation-error" className="mt-1 text-sm text-red-600">
            {errors.passwordConfirmation}
          </p>
        )}
      </div>

      {/* Timezone field */}
      <div>
        <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-2">
          Timezone
        </label>
        <select
          id="timezone"
          name="timezone"
          value={formState.timezone}
          onChange={handleInputChange}
          required
          disabled={isSubmitting}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white"
          aria-invalid={!!errors.timezone}
          aria-describedby={errors.timezone ? 'timezone-error' : undefined}
        >
          <option value="">Select a timezone</option>
          {COMMON_TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
          {/* Include detected timezone if not in list */}
          {!COMMON_TIMEZONES.find((tz) => tz.value === formState.timezone) &&
            formState.timezone && (
              <option value={formState.timezone}>{formState.timezone} (Detected)</option>
            )}
        </select>
        {errors.timezone && (
          <p id="timezone-error" className="mt-1 text-sm text-red-600">
            {errors.timezone}
          </p>
        )}
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-4 py-3 text-base font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <span>Creating account...</span>
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
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
          <span>Complete registration</span>
        )}
      </button>
    </form>
  );
}
