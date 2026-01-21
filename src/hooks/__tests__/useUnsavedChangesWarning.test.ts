/**
 * @vitest-environment jsdom
 */
/**
 * Tests for useUnsavedChangesWarning hook
 *
 * Task Group 5.1: Write 3 focused tests for useUnsavedChangesWarning hook
 * - Test that beforeunload event is attached when hasChanges is true
 * - Test that beforeunload event is removed when hasChanges is false
 * - Test that hook returns correct hasChanges state
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUnsavedChangesWarning } from '../useUnsavedChangesWarning';

describe('useUnsavedChangesWarning', () => {
  const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
  const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('attaches beforeunload event listener when hasChanges is true', () => {
    renderHook(() => useUnsavedChangesWarning({ hasChanges: true }));

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function)
    );
  });

  it('removes beforeunload event listener when hasChanges becomes false', () => {
    const { rerender } = renderHook(
      ({ hasChanges }) => useUnsavedChangesWarning({ hasChanges }),
      { initialProps: { hasChanges: true } }
    );

    // Should have added listener
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function)
    );

    // Rerender with hasChanges = false
    rerender({ hasChanges: false });

    // Should have removed listener (cleanup from effect)
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function)
    );
  });

  it('does not attach listener when hasChanges is false', () => {
    renderHook(() => useUnsavedChangesWarning({ hasChanges: false }));

    expect(addEventListenerSpy).not.toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function)
    );
  });

  it('returns correct hasChanges state', () => {
    const { result, rerender } = renderHook(
      ({ hasChanges }) => useUnsavedChangesWarning({ hasChanges }),
      { initialProps: { hasChanges: false } }
    );

    expect(result.current.hasChanges).toBe(false);

    rerender({ hasChanges: true });
    expect(result.current.hasChanges).toBe(true);

    rerender({ hasChanges: false });
    expect(result.current.hasChanges).toBe(false);
  });

  it('confirmNavigation returns true when no changes', () => {
    const { result } = renderHook(() =>
      useUnsavedChangesWarning({ hasChanges: false })
    );

    expect(result.current.confirmNavigation()).toBe(true);
  });

  it('confirmNavigation shows confirmation dialog when changes exist', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    const { result } = renderHook(() =>
      useUnsavedChangesWarning({ hasChanges: true })
    );

    const confirmed = result.current.confirmNavigation();

    expect(confirmSpy).toHaveBeenCalled();
    expect(confirmed).toBe(false);

    confirmSpy.mockRestore();
  });
});
