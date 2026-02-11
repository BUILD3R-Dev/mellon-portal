import * as React from 'react';
import { TIMEZONE_OPTIONS, formatTimezone } from '@/lib/utils/timezones';

interface ProfileData {
  id: string;
  email: string;
  name: string | null;
  timezone: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PersonalInfoFormProps {
  initialData: ProfileData;
}

interface FormState {
  name: string;
  timezone: string;
}

interface FormErrors {
  name?: string;
  timezone?: string;
  general?: string;
}

export function PersonalInfoForm({ initialData }: PersonalInfoFormProps) {
  const [formState, setFormState] = React.useState<FormState>({
    name: initialData.name || '',
    timezone: initialData.timezone || '',
  });
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [notification, setNotification] = React.useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Track if form has changes
  const hasChanges =
    formState.name !== (initialData.name || '') ||
    formState.timezone !== (initialData.timezone || '');

  // Auto-hide notification
  React.useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

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
    } else if (formState.name.trim().length > 255) {
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
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formState.name.trim(),
          timezone: formState.timezone || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrors({
          general: data.error || 'Failed to update profile. Please try again.',
        });
        setIsSubmitting(false);
        return;
      }

      setNotification({
        type: 'success',
        message: 'Profile updated successfully',
      });
      setIsSubmitting(false);
    } catch (error) {
      console.error('Profile update error:', error);
      setErrors({
        general: 'A network error occurred. Please try again.',
      });
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormState({
      name: initialData.name || '',
      timezone: initialData.timezone || '',
    });
    setErrors({});
  };

  return (
    <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--card-background, white)', border: '1px solid var(--border, #E5E7EB)' }}>
      <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--foreground, #111827)' }}>Personal Information</h2>
      <p className="text-sm mb-6" style={{ color: 'var(--foreground-muted, #6B7280)' }}>Update your name and timezone preferences</p>

      {/* Notification */}
      {notification && (
        <div
          className={`mb-6 p-4 rounded-lg border ${
            notification.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
          role="alert"
          aria-live="polite"
        >
          <p className="text-sm">{notification.message}</p>
        </div>
      )}

      {/* Error message */}
      {errors.general && (
        <div
          className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200"
          role="alert"
          aria-live="polite"
        >
          <p className="text-sm text-red-700">{errors.general}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email (read-only) */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground, #111827)' }}>
            Email address
          </label>
          <input
            type="email"
            id="email"
            value={initialData.email}
            disabled
            className="w-full px-4 py-2.5 rounded-lg cursor-not-allowed opacity-60"
            style={{ backgroundColor: 'var(--background-secondary, #F9FAFB)', color: 'var(--foreground-muted, #6B7280)', border: '1px solid var(--border, #D1D5DB)' }}
          />
          <p className="mt-1 text-xs" style={{ color: 'var(--foreground-muted, #6B7280)' }}>Email cannot be changed</p>
        </div>

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground, #111827)' }}>
            Full name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formState.name}
            onChange={handleInputChange}
            disabled={isSubmitting}
            className="w-full px-4 py-2.5 rounded-lg outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--background-secondary, #F9FAFB)', color: 'var(--foreground, #111827)', border: '1px solid var(--border, #D1D5DB)' }}
            placeholder="Enter your full name"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'name-error' : undefined}
          />
          {errors.name && (
            <p id="name-error" className="mt-1 text-sm text-red-600">
              {errors.name}
            </p>
          )}
        </div>

        {/* Timezone */}
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
            style={{ backgroundColor: 'var(--background-secondary, #F9FAFB)', color: 'var(--foreground, #111827)', border: '1px solid var(--border, #D1D5DB)' }}
            aria-invalid={!!errors.timezone}
            aria-describedby={errors.timezone ? 'timezone-error' : undefined}
          >
            <option value="">Select a timezone</option>
            <optgroup label="US Timezones">
              {TIMEZONE_OPTIONS.slice(0, 7).map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label} ({tz.offset})
                </option>
              ))}
            </optgroup>
            <optgroup label="International">
              {TIMEZONE_OPTIONS.slice(7).map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label} ({tz.offset})
                </option>
              ))}
            </optgroup>
          </select>
          {errors.timezone && (
            <p id="timezone-error" className="mt-1 text-sm text-red-600">
              {errors.timezone}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={isSubmitting || !hasChanges}
            className="px-4 py-2.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--card-background, white)', color: 'var(--foreground, #374151)', border: '1px solid var(--border, #D1D5DB)' }}
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !hasChanges}
            className="px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            style={{ backgroundColor: 'var(--accent-color, #1F2937)' }}
          >
            {isSubmitting ? (
              <>
                <span>Saving...</span>
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
              <span>Save changes</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
