/**
 * useUnsavedChangesWarning hook
 *
 * Provides unsaved changes warning functionality:
 * - Attaches beforeunload event listener when changes exist
 * - Removes listener when changes are saved or component unmounts
 * - Provides utility to check if navigation should be blocked
 */
import { useEffect, useCallback, useRef } from 'react';

export interface UseUnsavedChangesWarningOptions {
  /** Whether there are unsaved changes */
  hasChanges: boolean;
  /** Custom warning message (optional) */
  message?: string;
}

export interface UseUnsavedChangesWarningReturn {
  /** Check if navigation should be blocked and show confirmation */
  confirmNavigation: () => boolean;
  /** Returns true if there are unsaved changes */
  hasChanges: boolean;
}

/**
 * Hook to warn users about unsaved changes before leaving the page
 *
 * @param options - Configuration options
 * @returns Utilities for handling unsaved changes warning
 */
export function useUnsavedChangesWarning({
  hasChanges,
  message = 'You have unsaved changes. Are you sure you want to leave?',
}: UseUnsavedChangesWarningOptions): UseUnsavedChangesWarningReturn {
  // Use ref to access current hasChanges value in event handler
  const hasChangesRef = useRef(hasChanges);
  hasChangesRef.current = hasChanges;

  // Handle beforeunload event for browser navigation/refresh
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasChangesRef.current) {
        // Standard way to trigger the browser's built-in warning
        event.preventDefault();
        // For older browsers, return value is used as the message
        // Modern browsers show a generic message regardless
        return message;
      }
    };

    if (hasChanges) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasChanges, message]);

  /**
   * Confirms navigation when there are unsaved changes
   * Shows a browser confirmation dialog
   *
   * @returns true if user confirms navigation, false otherwise
   */
  const confirmNavigation = useCallback((): boolean => {
    if (!hasChangesRef.current) {
      return true;
    }

    return window.confirm(message);
  }, [message]);

  return {
    confirmNavigation,
    hasChanges,
  };
}
