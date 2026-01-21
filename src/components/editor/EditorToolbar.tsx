/**
 * EditorToolbar component for RichTextEditor
 *
 * Provides formatting buttons for: Bold, Italic, H2, H3, Bullet List, Numbered List, Link
 * Uses icons consistent with existing admin UI (simple SVG icons)
 */
import * as React from 'react';
import { type Editor } from '@tiptap/react';
import { cn } from '@/lib/utils/cn';

interface EditorToolbarProps {
  editor: Editor | null;
  disabled?: boolean;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, isActive, disabled, ariaLabel, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={isActive}
      className={cn(
        'p-2 rounded-md transition-colors',
        'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent',
        isActive && 'bg-gray-200 text-gray-900'
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-gray-200 mx-1" aria-hidden="true" />;
}

export function EditorToolbar({ editor, disabled = false }: EditorToolbarProps) {
  const [showLinkInput, setShowLinkInput] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState('');
  const linkInputRef = React.useRef<HTMLInputElement>(null);

  const handleSetLink = () => {
    if (!editor || !linkUrl) return;

    if (linkUrl === '') {
      editor.chain().focus().unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: linkUrl })
        .run();
    }

    setLinkUrl('');
    setShowLinkInput(false);
  };

  const handleLinkClick = () => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href || '';
    setLinkUrl(previousUrl);
    setShowLinkInput(true);

    // Focus the input after state update
    setTimeout(() => {
      linkInputRef.current?.focus();
    }, 0);
  };

  const handleRemoveLink = () => {
    if (!editor) return;
    editor.chain().focus().unsetLink().run();
    setShowLinkInput(false);
    setLinkUrl('');
  };

  const isDisabled = disabled || !editor;

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 bg-gray-50 rounded-t-lg">
      {/* Text formatting */}
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleBold().run()}
        isActive={editor?.isActive('bold')}
        disabled={isDisabled}
        ariaLabel="Bold"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleItalic().run()}
        isActive={editor?.isActive('italic')}
        disabled={isDisabled}
        ariaLabel="Italic"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 4h4m2 0l-6 16m-2 0h4" />
        </svg>
      </ToolbarButton>

      <ToolbarDivider />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor?.isActive('heading', { level: 2 })}
        disabled={isDisabled}
        ariaLabel="Heading 2"
      >
        <span className="text-sm font-bold">H2</span>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor?.isActive('heading', { level: 3 })}
        disabled={isDisabled}
        ariaLabel="Heading 3"
      >
        <span className="text-sm font-bold">H3</span>
      </ToolbarButton>

      <ToolbarDivider />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
        isActive={editor?.isActive('bulletList')}
        disabled={isDisabled}
        ariaLabel="Bullet list"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        isActive={editor?.isActive('orderedList')}
        disabled={isDisabled}
        ariaLabel="Numbered list"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 6h13M7 12h13M7 18h13M3 5v2M3 11v2M3 17v2" />
        </svg>
      </ToolbarButton>

      <ToolbarDivider />

      {/* Link */}
      <div className="relative">
        <ToolbarButton
          onClick={handleLinkClick}
          isActive={editor?.isActive('link')}
          disabled={isDisabled}
          ariaLabel="Link"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </ToolbarButton>

        {showLinkInput && (
          <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 flex gap-2">
            <input
              ref={linkInputRef}
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="Enter URL..."
              className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 w-48"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSetLink();
                }
                if (e.key === 'Escape') {
                  setShowLinkInput(false);
                  setLinkUrl('');
                }
              }}
            />
            <button
              type="button"
              onClick={handleSetLink}
              className="px-2 py-1 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800"
            >
              Set
            </button>
            {editor?.isActive('link') && (
              <button
                type="button"
                onClick={handleRemoveLink}
                className="px-2 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-500"
              >
                Remove
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setShowLinkInput(false);
                setLinkUrl('');
              }}
              className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
