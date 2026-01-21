/**
 * @vitest-environment jsdom
 */
/**
 * Tests for ContentEditorForm component
 *
 * Task Group 6.1: Write 5 focused tests for ContentEditorForm component
 * - Test renders three collapsible sections (Narrative, Initiatives, Needs)
 * - Test tracks dirty state when content changes
 * - Test save button disabled when no changes
 * - Test displays "Unsaved changes" indicator when dirty
 * - Test read-only mode hides save button and disables editors
 *
 * Task Group 2.1: Write 4-5 focused tests for preview feature
 * - Test Preview button renders on content edit page
 * - Test Preview button has correct href with target="_blank"
 * - Test Preview button visible for both draft and published reports
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContentEditorForm } from '../ContentEditorForm';

// Mock the RichTextEditor component
vi.mock('@/components/editor/RichTextEditor', () => ({
  RichTextEditor: ({ value, onChange, disabled, placeholder }: any) => (
    <textarea
      data-testid="rich-text-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
    />
  ),
}));

// Mock the useUnsavedChangesWarning hook
vi.mock('@/hooks/useUnsavedChangesWarning', () => ({
  useUnsavedChangesWarning: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

describe('ContentEditorForm', () => {
  const defaultProps = {
    reportWeekId: 'report-week-1',
    tenantId: 'tenant-1',
    initialData: {
      narrativeRich: '',
      initiativesRich: '',
      needsRich: '',
    },
    status: 'draft' as const,
    weekPeriod: 'Jan 13 - Jan 19, 2024',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: {} }),
    });
  });

  it('renders three collapsible sections (Narrative, Initiatives, Needs)', () => {
    render(<ContentEditorForm {...defaultProps} />);

    expect(screen.getByText('Narrative')).toBeInTheDocument();
    expect(screen.getByText('Initiatives')).toBeInTheDocument();
    expect(screen.getByText('Needs From Client')).toBeInTheDocument();
  });

  it('tracks dirty state when content changes', async () => {
    render(<ContentEditorForm {...defaultProps} />);

    // Initially no unsaved changes indicator
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();

    // Find the first editor (Narrative) and type in it
    // We need to expand the section first
    const narrativeSection = screen.getByText('Narrative');
    fireEvent.click(narrativeSection);

    const editors = screen.getAllByTestId('rich-text-editor');
    fireEvent.change(editors[0], { target: { value: '<p>New content</p>' } });

    // Now should show unsaved changes
    await waitFor(() => {
      expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    });
  });

  it('save button is disabled when no changes', () => {
    render(<ContentEditorForm {...defaultProps} />);

    const saveButton = screen.getByRole('button', { name: /save content/i });
    expect(saveButton).toBeDisabled();
  });

  it('displays "Unsaved changes" indicator when dirty', async () => {
    render(<ContentEditorForm {...defaultProps} />);

    // Expand section and make changes
    const narrativeSection = screen.getByText('Narrative');
    fireEvent.click(narrativeSection);

    const editors = screen.getAllByTestId('rich-text-editor');
    fireEvent.change(editors[0], { target: { value: '<p>New content</p>' } });

    await waitFor(() => {
      expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    });
  });

  it('read-only mode hides save button and shows published banner', () => {
    render(
      <ContentEditorForm
        {...defaultProps}
        status="published"
      />
    );

    // Save button should not be present
    expect(screen.queryByRole('button', { name: /save content/i })).not.toBeInTheDocument();

    // Published banner should be visible
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText(/content cannot be edited/i)).toBeInTheDocument();
  });

  it('read-only mode disables all editors', () => {
    render(
      <ContentEditorForm
        {...defaultProps}
        status="published"
      />
    );

    // Expand all sections
    fireEvent.click(screen.getByText('Narrative'));
    fireEvent.click(screen.getByText('Initiatives'));
    fireEvent.click(screen.getByText('Needs From Client'));

    const editors = screen.getAllByTestId('rich-text-editor');
    editors.forEach((editor) => {
      expect(editor).toBeDisabled();
    });
  });

  it('calls API and shows success notification on save', async () => {
    render(<ContentEditorForm {...defaultProps} />);

    // Make changes
    fireEvent.click(screen.getByText('Narrative'));
    const editors = screen.getAllByTestId('rich-text-editor');
    fireEvent.change(editors[0], { target: { value: '<p>New content</p>' } });

    // Click save
    const saveButton = screen.getByRole('button', { name: /save content/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/tenants/tenant-1/report-weeks/report-week-1/manual',
        expect.objectContaining({
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    // Success notification
    await waitFor(() => {
      expect(screen.getByText('Content saved successfully')).toBeInTheDocument();
    });
  });
});

describe('ContentEditorForm - Preview Feature', () => {
  const defaultProps = {
    reportWeekId: 'rw-123',
    tenantId: 'tenant-456',
    initialData: {
      narrativeRich: '<p>Test narrative</p>',
      initiativesRich: null,
      needsRich: null,
    },
    status: 'draft' as const,
    weekPeriod: 'Jan 13 - Jan 17, 2025',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: {} }),
    });
  });

  it('renders Preview button on content edit page', () => {
    render(<ContentEditorForm {...defaultProps} />);

    const previewLink = screen.getByRole('link', { name: /preview/i });
    expect(previewLink).toBeInTheDocument();
  });

  it('Preview button has correct href with target="_blank"', () => {
    render(<ContentEditorForm {...defaultProps} />);

    const previewLink = screen.getByRole('link', { name: /preview/i });
    expect(previewLink).toHaveAttribute(
      'href',
      '/admin/tenants/tenant-456/report-weeks/rw-123/preview'
    );
    expect(previewLink).toHaveAttribute('target', '_blank');
    expect(previewLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('Preview button is visible for both draft and published reports', () => {
    // Test with draft status
    const { rerender } = render(<ContentEditorForm {...defaultProps} status="draft" />);
    expect(screen.getByRole('link', { name: /preview/i })).toBeInTheDocument();

    // Test with published status
    rerender(<ContentEditorForm {...defaultProps} status="published" />);
    expect(screen.getByRole('link', { name: /preview/i })).toBeInTheDocument();
  });

  it('Preview button styled as secondary/outline to differentiate from primary actions', () => {
    render(<ContentEditorForm {...defaultProps} />);

    const previewLink = screen.getByRole('link', { name: /preview/i });
    // Check for outline or secondary styling classes
    expect(previewLink.className).toMatch(/border/);
  });
});
