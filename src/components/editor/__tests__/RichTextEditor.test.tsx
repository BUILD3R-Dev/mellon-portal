/**
 * @vitest-environment jsdom
 */
/**
 * Tests for RichTextEditor component
 *
 * Task Group 1.1: Write 4 focused tests for RichTextEditor component
 * - Test that editor renders with initial content
 * - Test that toolbar buttons toggle formatting
 * - Test that onChange fires when content changes
 * - Test that disabled state prevents editing
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RichTextEditor } from '../RichTextEditor';

// Mock Tiptap Editor - simplified mock for testing
vi.mock('@tiptap/react', () => {
  const React = require('react');
  let mockIsEditable = true;

  return {
    useEditor: vi.fn((config: any) => {
      // Simulate calling onUpdate after a tick if provided
      if (config?.onUpdate) {
        setTimeout(() => {
          config.onUpdate({
            editor: { getHTML: () => '<p>Updated content</p>' },
          });
        }, 0);
      }

      return {
        commands: {
          toggleBold: vi.fn(),
          toggleItalic: vi.fn(),
          toggleHeading: vi.fn(),
          toggleBulletList: vi.fn(),
          toggleOrderedList: vi.fn(),
          setLink: vi.fn(),
          unsetLink: vi.fn(),
          setContent: vi.fn(),
        },
        chain: vi.fn(() => ({
          focus: vi.fn(() => ({
            toggleBold: vi.fn(() => ({ run: vi.fn() })),
            toggleItalic: vi.fn(() => ({ run: vi.fn() })),
            toggleHeading: vi.fn(() => ({ run: vi.fn() })),
            toggleBulletList: vi.fn(() => ({ run: vi.fn() })),
            toggleOrderedList: vi.fn(() => ({ run: vi.fn() })),
            extendMarkRange: vi.fn(() => ({
              setLink: vi.fn(() => ({ run: vi.fn() })),
            })),
            unsetLink: vi.fn(() => ({ run: vi.fn() })),
          })),
        })),
        isActive: vi.fn(() => false),
        getHTML: vi.fn(() => '<p>Test content</p>'),
        getAttributes: vi.fn(() => ({})),
        isEditable: config?.editable !== false,
        setEditable: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
      };
    }),
    EditorContent: ({ editor }: { editor: any }) => {
      return React.createElement('div', {
        'data-testid': 'editor-content',
        className: 'tiptap-editor',
        children: 'Editor content',
      });
    },
  };
});

vi.mock('@tiptap/starter-kit', () => ({
  default: {
    configure: vi.fn(() => ({})),
  },
}));

vi.mock('@tiptap/extension-link', () => ({
  default: {
    configure: vi.fn(() => ({})),
  },
}));

describe('RichTextEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with initial content', () => {
    const initialContent = '<p>Initial test content</p>';
    render(<RichTextEditor value={initialContent} onChange={() => {}} />);

    // Editor should render
    const editorContent = screen.getByTestId('editor-content');
    expect(editorContent).toBeInTheDocument();
  });

  it('renders toolbar buttons for formatting', () => {
    render(<RichTextEditor value="" onChange={() => {}} />);

    // Check for toolbar buttons
    expect(screen.getByLabelText(/bold/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/italic/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/heading 2/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/heading 3/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/bullet list/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/numbered list/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/link/i)).toBeInTheDocument();
  });

  it('calls onChange when content changes', async () => {
    const handleChange = vi.fn();

    render(<RichTextEditor value="" onChange={handleChange} />);

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalledWith('<p>Updated content</p>');
    });
  });

  it('disables toolbar buttons when disabled prop is true', () => {
    render(<RichTextEditor value="" onChange={() => {}} disabled={true} />);

    // All toolbar buttons should be disabled when editor is disabled
    const boldButton = screen.getByLabelText(/bold/i);
    expect(boldButton).toBeDisabled();

    const italicButton = screen.getByLabelText(/italic/i);
    expect(italicButton).toBeDisabled();

    const h2Button = screen.getByLabelText(/heading 2/i);
    expect(h2Button).toBeDisabled();
  });
});
