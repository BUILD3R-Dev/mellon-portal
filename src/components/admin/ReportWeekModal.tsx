import * as React from 'react';

interface ReportWeek {
  id: string;
  tenantId: string;
  weekEndingDate: string;
  periodStartAt: string;
  periodEndAt: string;
  weekPeriod: string;
  status: 'draft' | 'published';
  publishedAt: string | null;
  publishedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ReportWeekModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: ReportWeek) => void;
  mode: 'create' | 'edit';
  tenantId: string;
  tenantTimezone: string;
  reportWeek?: ReportWeek;
}

interface FormState {
  weekEndingDate: string;
}

interface FormErrors {
  weekEndingDate?: string;
  general?: string;
}

/**
 * Validates that a date string is a Friday
 */
function isFriday(dateString: string): boolean {
  if (!dateString) return false;
  const date = new Date(dateString + 'T12:00:00Z');
  return date.getUTCDay() === 5;
}

/**
 * Calculates Monday date from Friday
 */
function getMondayFromFriday(fridayDate: string): string {
  if (!fridayDate) return '';
  const friday = new Date(fridayDate + 'T12:00:00Z');
  const monday = new Date(friday);
  monday.setUTCDate(friday.getUTCDate() - 4);
  return monday.toISOString().split('T')[0];
}

/**
 * Formats the week period for display
 */
function formatWeekPeriod(mondayDate: string, fridayDate: string): string {
  if (!mondayDate || !fridayDate) return '';

  const monday = new Date(mondayDate + 'T12:00:00Z');
  const friday = new Date(fridayDate + 'T12:00:00Z');

  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  const startMonth = monthNames[monday.getUTCMonth()];
  const startDay = monday.getUTCDate();
  const endMonth = monthNames[friday.getUTCMonth()];
  const endDay = friday.getUTCDate();
  const year = friday.getUTCFullYear();

  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

/**
 * Formats a date for display
 */
function formatDateDisplay(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString + 'T12:00:00Z');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function ReportWeekModal({
  isOpen,
  onClose,
  onSuccess,
  mode,
  tenantId,
  tenantTimezone,
  reportWeek,
}: ReportWeekModalProps) {
  const [formState, setFormState] = React.useState<FormState>({
    weekEndingDate: reportWeek?.weekEndingDate || '',
  });
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const modalRef = React.useRef<HTMLDivElement>(null);

  // Update form state when reportWeek prop changes
  React.useEffect(() => {
    if (reportWeek) {
      setFormState({
        weekEndingDate: reportWeek.weekEndingDate,
      });
    } else {
      setFormState({
        weekEndingDate: '',
      });
    }
    setErrors({});
  }, [reportWeek, isOpen]);

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

    if (!formState.weekEndingDate) {
      newErrors.weekEndingDate = 'Week ending date is required';
    } else if (!isFriday(formState.weekEndingDate)) {
      newErrors.weekEndingDate = 'Selected date must be a Friday';
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
      const url =
        mode === 'create'
          ? `/api/tenants/${tenantId}/report-weeks`
          : `/api/tenants/${tenantId}/report-weeks/${reportWeek?.id}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weekEndingDate: formState.weekEndingDate,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrors({
          general: data.error || `Failed to ${mode} report week. Please try again.`,
        });
        setIsSubmitting(false);
        return;
      }

      onSuccess(data.data);
      handleClose();
    } catch (error) {
      console.error('Report week save error:', error);
      setErrors({
        general: 'A network error occurred. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const mondayDate = getMondayFromFriday(formState.weekEndingDate);
  const weekPeriod = formatWeekPeriod(mondayDate, formState.weekEndingDate);
  const isFridaySelected = formState.weekEndingDate && isFriday(formState.weekEndingDate);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-week-modal-title"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={handleClose} />

      {/* Modal */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative w-full max-w-md rounded-xl shadow-xl mx-4 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--card-background, white)', color: 'var(--foreground, #111827)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-6 border-b"
          style={{ borderColor: 'var(--border, #E5E7EB)' }}
        >
          <h2 id="report-week-modal-title" className="text-lg font-semibold" style={{ color: 'var(--foreground, #111827)' }}>
            {mode === 'create' ? 'Create Report Week' : 'Edit Report Week'}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="transition-colors"
            style={{ color: 'var(--foreground-muted, #6B7280)' }}
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

            {/* Week Ending Date field */}
            <div>
              <label
                htmlFor="weekEndingDate"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--foreground, #111827)' }}
              >
                Week Ending Date (Friday)
              </label>
              <input
                type="date"
                id="weekEndingDate"
                name="weekEndingDate"
                value={formState.weekEndingDate}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
                className="w-full px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--background-secondary, #F9FAFB)', color: 'var(--foreground, #111827)', border: '1px solid var(--border, #D1D5DB)' }}
                aria-invalid={!!errors.weekEndingDate}
                aria-describedby={errors.weekEndingDate ? 'weekEndingDate-error' : 'weekEndingDate-hint'}
              />
              {errors.weekEndingDate ? (
                <p id="weekEndingDate-error" className="mt-1 text-sm text-red-600">
                  {errors.weekEndingDate}
                </p>
              ) : (
                <p id="weekEndingDate-hint" className="mt-1 text-xs" style={{ color: 'var(--foreground-muted, #6B7280)' }}>
                  Select a Friday as the week ending date
                </p>
              )}
            </div>

            {/* Week Period Display */}
            {isFridaySelected && (
              <div
                className="rounded-lg p-4 space-y-3"
                style={{ backgroundColor: 'var(--background-secondary, #F3F4F6)' }}
              >
                <h3 className="text-sm font-medium" style={{ color: 'var(--foreground, #111827)' }}>Week Period Preview</h3>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--foreground-muted, #6B7280)' }}>Start Date (Monday):</span>
                    <span className="font-medium" style={{ color: 'var(--foreground, #111827)' }}>
                      {formatDateDisplay(mondayDate)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--foreground-muted, #6B7280)' }}>End Date (Friday):</span>
                    <span className="font-medium" style={{ color: 'var(--foreground, #111827)' }}>
                      {formatDateDisplay(formState.weekEndingDate)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t" style={{ borderColor: 'var(--border, #E5E7EB)' }}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: 'var(--foreground-muted, #6B7280)' }}>Week Period:</span>
                    <span
                      className="text-sm font-semibold px-3 py-1 rounded"
                      style={{ color: 'var(--foreground, #111827)', backgroundColor: 'var(--card-background, white)', border: '1px solid var(--border, #E5E7EB)' }}
                    >
                      {weekPeriod}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Non-Friday Warning */}
            {formState.weekEndingDate && !isFridaySelected && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-amber-800">Not a Friday</p>
                    <p className="text-sm text-amber-700 mt-1">
                      The selected date ({formatDateDisplay(formState.weekEndingDate)}) is not a
                      Friday. Please select a Friday for the week ending date.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Timezone notice */}
            <p className="text-xs" style={{ color: 'var(--foreground-muted, #6B7280)' }}>
              Dates are calculated in the tenant's timezone: {tenantTimezone}
            </p>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--card-background, white)', color: 'var(--foreground, #374151)', border: '1px solid var(--border, #D1D5DB)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !isFridaySelected}
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
                  <span>{mode === 'create' ? 'Create Report Week' : 'Save Changes'}</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
