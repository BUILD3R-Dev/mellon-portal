/**
 * RichTextEditor component
 *
 * A reusable Tiptap-based rich text editor with support for:
 * - Bold, Italic, Bullet lists, Numbered lists, Links, Headings (H2, H3)
 *
 * Outputs content as HTML strings
 */
import * as React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { EditorToolbar } from './EditorToolbar';
import { cn } from '@/lib/utils/cn';

export interface RichTextEditorProps {
  /** Current HTML content value */
  value: string;
  /** Called when content changes */
  onChange: (value: string) => void;
  /** Whether the editor is disabled */
  disabled?: boolean;
  /** Placeholder text when editor is empty */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  disabled = false,
  placeholder,
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Enable only specific formatting options
        heading: {
          levels: [2, 3],
        },
        // Disable features not in scope
        codeBlock: false,
        code: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800',
        },
      }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none focus:outline-none min-h-[120px] p-4',
          'prose-headings:font-semibold prose-h2:text-xl prose-h3:text-lg',
          'prose-p:my-2 prose-ul:my-2 prose-ol:my-2',
          'prose-li:my-0',
          placeholder && 'empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:float-left empty:before:h-0 empty:before:pointer-events-none'
        ),
        ...(placeholder && { 'data-placeholder': placeholder }),
      },
    },
  });

  // Update editor content when value prop changes externally
  React.useEffect(() => {
    if (editor && editor.getHTML() !== value) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  // Update editable state when disabled prop changes
  React.useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  return (
    <div
      className={cn(
        'border border-gray-300 rounded-lg overflow-hidden',
        'focus-within:ring-2 focus-within:ring-gray-900 focus-within:border-transparent',
        disabled && 'bg-gray-50 cursor-not-allowed',
        className
      )}
    >
      <EditorToolbar editor={editor} disabled={disabled} />
      <EditorContent editor={editor} />
    </div>
  );
}
