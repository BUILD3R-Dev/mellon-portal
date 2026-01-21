import * as React from 'react';

interface UserRemovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName?: string;
  userEmail: string;
  isLoading: boolean;
}

export function UserRemovalModal({
  isOpen,
  onClose,
  onConfirm,
  userName,
  userEmail,
  isLoading,
}: UserRemovalModalProps) {
  const [confirmationEmail, setConfirmationEmail] = React.useState('');
  const modalRef = React.useRef<HTMLDivElement>(null);

  // Reset confirmation when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setConfirmationEmail('');
    }
  }, [isOpen]);

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

  const displayName = userName || userEmail;
  const isConfirmationValid =
    confirmationEmail.toLowerCase().trim() === userEmail.toLowerCase().trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="removal-modal-title"
      aria-describedby="removal-modal-description"
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
        className="relative w-full max-w-md bg-white rounded-xl shadow-xl mx-4"
      >
        {/* Content */}
        <div className="p-6">
          {/* Warning icon */}
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </div>

          {/* Title */}
          <h3
            id="removal-modal-title"
            className="text-lg font-semibold text-gray-900 text-center mb-2"
          >
            Remove User from Tenant
          </h3>

          {/* Description */}
          <p id="removal-modal-description" className="text-sm text-gray-600 text-center mb-6">
            Are you sure you want to remove{' '}
            <span className="font-semibold">{displayName}</span> from this tenant?
          </p>

          {/* Warning list */}
          <ul className="text-sm text-gray-600 space-y-2 mb-6 bg-red-50 rounded-lg p-4 border border-red-200">
            <li className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
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
              <span className="font-medium">This action cannot be undone</span>
            </li>
            <li className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              <span>User will be permanently removed from this tenant</span>
            </li>
            <li className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>User will be logged out immediately</span>
            </li>
          </ul>

          {/* Confirmation input */}
          <div className="mb-6">
            <label
              htmlFor="confirm-email"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Type <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">{userEmail}</span> to
              confirm
            </label>
            <input
              type="text"
              id="confirm-email"
              value={confirmationEmail}
              onChange={(e) => setConfirmationEmail(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Enter email to confirm"
              autoComplete="off"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading || !isConfirmationValid}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span>Removing...</span>
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
                <span>Remove from Tenant</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
