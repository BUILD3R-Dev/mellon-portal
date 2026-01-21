import * as React from 'react';

interface FormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface FormErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  general?: string;
}

export function PasswordChangeForm() {
  const [formState, setFormState] = React.useState<FormState>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [notification, setNotification] = React.useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Auto-hide notification
  React.useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    if (!formState.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!formState.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formState.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters long';
    }

    if (!formState.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (formState.newPassword !== formState.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
      const response = await fetch('/api/profile/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: formState.currentPassword,
          newPassword: formState.newPassword,
          confirmPassword: formState.confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (data.code === 'INVALID_PASSWORD') {
          setErrors({
            currentPassword: 'Current password is incorrect',
          });
        } else {
          setErrors({
            general: data.error || 'Failed to change password. Please try again.',
          });
        }
        setIsSubmitting(false);
        return;
      }

      // Success - clear form and show success message
      setFormState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      setNotification({
        type: 'success',
        message: data.message || 'Password changed successfully. Other sessions have been logged out.',
      });
      setIsSubmitting(false);
    } catch (error) {
      console.error('Password change error:', error);
      setErrors({
        general: 'A network error occurred. Please try again.',
      });
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormState({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setErrors({});
  };

  const hasInput =
    formState.currentPassword.length > 0 ||
    formState.newPassword.length > 0 ||
    formState.confirmPassword.length > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Change Password</h2>
      <p className="text-sm text-gray-500 mb-6">
        Update your password. All other sessions will be logged out.
      </p>

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
        {/* Current Password */}
        <div>
          <label
            htmlFor="currentPassword"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            Current password
          </label>
          <input
            type="password"
            id="currentPassword"
            name="currentPassword"
            value={formState.currentPassword}
            onChange={handleInputChange}
            disabled={isSubmitting}
            autoComplete="current-password"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Enter your current password"
            aria-invalid={!!errors.currentPassword}
            aria-describedby={errors.currentPassword ? 'currentPassword-error' : undefined}
          />
          {errors.currentPassword && (
            <p id="currentPassword-error" className="mt-1 text-sm text-red-600">
              {errors.currentPassword}
            </p>
          )}
        </div>

        {/* New Password */}
        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
            New password
          </label>
          <input
            type="password"
            id="newPassword"
            name="newPassword"
            value={formState.newPassword}
            onChange={handleInputChange}
            disabled={isSubmitting}
            autoComplete="new-password"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Enter your new password"
            aria-invalid={!!errors.newPassword}
            aria-describedby={errors.newPassword ? 'newPassword-error' : 'newPassword-help'}
          />
          {errors.newPassword ? (
            <p id="newPassword-error" className="mt-1 text-sm text-red-600">
              {errors.newPassword}
            </p>
          ) : (
            <p id="newPassword-help" className="mt-1 text-xs text-gray-500">
              Must be at least 8 characters long
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            Confirm new password
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formState.confirmPassword}
            onChange={handleInputChange}
            disabled={isSubmitting}
            autoComplete="new-password"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Confirm your new password"
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
          />
          {errors.confirmPassword && (
            <p id="confirmPassword-error" className="mt-1 text-sm text-red-600">
              {errors.confirmPassword}
            </p>
          )}
        </div>

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <svg
              className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-blue-700">
              For security, changing your password will log you out of all other devices and
              sessions.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={isSubmitting || !hasInput}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !hasInput}
            className="px-4 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span>Changing...</span>
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
              <span>Change password</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
