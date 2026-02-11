import * as React from 'react';

interface StatusChangeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  tenantName: string;
  newStatus: 'active' | 'inactive' | 'suspended';
  isLoading: boolean;
}

/**
 * Confirmation dialog for changing tenant status
 */
export function StatusChangeDialog({
  isOpen,
  onClose,
  onConfirm,
  tenantName,
  newStatus,
  isLoading,
}: StatusChangeDialogProps) {
  const modalRef = React.useRef<HTMLDivElement>(null);

  // Close on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isLoading, onClose]);

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

  if (!isOpen) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600';
      case 'inactive':
        return '';
      case 'suspended':
        return 'text-amber-600';
      default:
        return '';
    }
  };

  const getStatusStyle = (status: string) => {
    if (status === 'inactive' || (status !== 'active' && status !== 'suspended')) {
      return { color: 'var(--foreground-muted, #6B7280)' };
    }
    return undefined;
  };

  const getImpactMessage = () => {
    switch (newStatus) {
      case 'active':
        return 'Users will be able to log in and access this tenant.';
      case 'inactive':
        return 'All users belonging to this tenant will be logged out and unable to access the system until reactivated.';
      case 'suspended':
        return 'All users belonging to this tenant will be logged out. This status indicates a temporary restriction.';
      default:
        return '';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="status-change-modal-title"
      aria-describedby="status-change-modal-description"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={() => !isLoading && onClose()}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative w-full max-w-md rounded-xl shadow-xl mx-4"
        style={{ backgroundColor: 'var(--card-background, white)', color: 'var(--foreground, #111827)' }}
      >
        {/* Content */}
        <div className="p-6">
          {/* Icon */}
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 mb-4">
            <svg
              className="h-6 w-6 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
          </div>

          {/* Title */}
          <h3
            id="status-change-modal-title"
            className="text-lg font-semibold text-center mb-2"
            style={{ color: 'var(--foreground, #111827)' }}
          >
            Change Tenant Status
          </h3>

          {/* Description */}
          <p
            id="status-change-modal-description"
            className="text-sm text-center mb-4"
            style={{ color: 'var(--foreground-muted, #6B7280)' }}
          >
            Are you sure you want to change the status of{' '}
            <span className="font-semibold">{tenantName}</span> to{' '}
            <span className={`font-semibold ${getStatusColor(newStatus)}`} style={getStatusStyle(newStatus)}>
              {newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}
            </span>
            ?
          </p>

          {/* Impact message */}
          <div
            className="rounded-lg p-4 mb-6"
            style={{ backgroundColor: 'var(--background-secondary, #F3F4F6)' }}
          >
            <p className="text-sm" style={{ color: 'var(--foreground-muted, #6B7280)' }}>
              <span className="font-medium">Impact: </span>
              {getImpactMessage()}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--card-background, white)', color: 'var(--foreground, #374151)', border: '1px solid var(--border, #D1D5DB)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--accent-color, #1F2937)' }}
            >
              {isLoading ? (
                <>
                  <span>Updating...</span>
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
                <span>Confirm Change</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
