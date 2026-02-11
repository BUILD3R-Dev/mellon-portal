import * as React from 'react';
import { RichTextEditor } from '../editor/RichTextEditor';

interface NoteData {
  id: string;
  contactId: string | null;
  noteDate: string;
  author: string | null;
  authorUserName: string | null;
  source: string;
  content: string | null;
  createdAt: string;
}

interface NotesIslandProps {
  canAddNotes: boolean;
}

const PAGE_SIZE = 50;

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getDisplayAuthor(note: NoteData): string {
  return note.authorUserName || note.author || 'Unknown Author';
}

/**
 * Checks if a string contains HTML tags.
 */
function isHtmlContent(content: string): boolean {
  return /<[a-z][\s\S]*>/i.test(content);
}

export function NotesIsland({ canAddNotes }: NotesIslandProps) {
  const [notes, setNotes] = React.useState<NoteData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [hasMore, setHasMore] = React.useState(false);
  const [offset, setOffset] = React.useState(0);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');

  // Add note form state
  const [noteContent, setNoteContent] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);

  // Edit/delete state
  const [editingNoteId, setEditingNoteId] = React.useState<string | null>(null);
  const [editContent, setEditContent] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState<string | null>(null);

  // Notification state
  const [notification, setNotification] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Auto-hide notification
  React.useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch notes
  React.useEffect(() => {
    let cancelled = false;

    async function fetchNotes() {
      setLoading(true);
      setOffset(0);
      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: '0',
          timeWindow: 'rolling-7',
        });
        if (debouncedSearch.trim()) {
          params.set('search', debouncedSearch.trim());
        }

        const response = await fetch(`/api/dashboard/notes?${params}`);
        const result = await response.json();
        if (!cancelled && result.success) {
          setNotes(result.data.notes);
          setHasMore(result.data.notes.length >= PAGE_SIZE);
          setOffset(PAGE_SIZE);
        }
      } catch {
        // Silently handle fetch errors
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchNotes();
    return () => { cancelled = true; };
  }, [debouncedSearch]);

  async function handleLoadMore() {
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
        timeWindow: 'rolling-7',
      });
      if (debouncedSearch.trim()) {
        params.set('search', debouncedSearch.trim());
      }

      const response = await fetch(`/api/dashboard/notes?${params}`);
      const result = await response.json();
      if (result.success) {
        setNotes((prev) => [...prev, ...result.data.notes]);
        setHasMore(result.data.notes.length >= PAGE_SIZE);
        setOffset((prev) => prev + PAGE_SIZE);
      }
    } catch {
      // Silently handle fetch errors
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleImageUpload(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/uploads/notes', {
      method: 'POST',
      body: formData,
    });
    const result = await response.json();

    if (!result.success) {
      setNotification({ type: 'error', message: result.error || 'Failed to upload image' });
      throw new Error(result.error);
    }

    return result.url;
  }

  async function handleSubmitNote(e: React.FormEvent) {
    e.preventDefault();
    // Strip tags to check if there's actual content
    const textOnly = noteContent.replace(/<[^>]*>/g, '').trim();
    if (!textOnly || submitting) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/dashboard/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteContent }),
      });
      const result = await response.json();

      if (result.success) {
        setNotes((prev) => [result.data, ...prev]);
        setNoteContent('');
        setShowForm(false);
        setNotification({ type: 'success', message: 'Note added successfully' });
      } else {
        setNotification({ type: 'error', message: result.error || 'Failed to add note' });
      }
    } catch {
      setNotification({ type: 'error', message: 'Failed to add note. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  function startEditing(note: NoteData) {
    setEditingNoteId(note.id);
    setEditContent(note.content || '');
  }

  function cancelEditing() {
    setEditingNoteId(null);
    setEditContent('');
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    const textOnly = editContent.replace(/<[^>]*>/g, '').trim();
    if (!textOnly || saving || !editingNoteId) return;

    setSaving(true);
    try {
      const response = await fetch('/api/dashboard/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingNoteId, content: editContent }),
      });
      const result = await response.json();

      if (result.success) {
        setNotes((prev) => prev.map((n) => n.id === editingNoteId ? result.data : n));
        setEditingNoteId(null);
        setEditContent('');
        setNotification({ type: 'success', message: 'Note updated successfully' });
      } else {
        setNotification({ type: 'error', message: result.error || 'Failed to update note' });
      }
    } catch {
      setNotification({ type: 'error', message: 'Failed to update note. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(noteId: string) {
    if (!window.confirm('Are you sure you want to delete this note?')) return;

    setDeleting(noteId);
    try {
      const response = await fetch('/api/dashboard/notes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: noteId }),
      });
      const result = await response.json();

      if (result.success) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        setNotification({ type: 'success', message: 'Note deleted successfully' });
      } else {
        setNotification({ type: 'error', message: result.error || 'Failed to delete note' });
      }
    } catch {
      setNotification({ type: 'error', message: 'Failed to delete note. Please try again.' });
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div
          className={`p-4 rounded-lg border ${
            notification.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm">{notification.message}</p>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="text-current opacity-70 hover:opacity-100"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Add Note Button */}
      {canAddNotes && !showForm && (
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Note
          </button>
        </div>
      )}

      {/* Add Note Form */}
      {canAddNotes && showForm && (
        <div className="rounded-xl border p-6" style={{ backgroundColor: 'var(--card-background, #FFFFFF)', borderColor: 'var(--card-border, #E5E7EB)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground, #111827)' }}>New Note</h3>
          <form onSubmit={handleSubmitNote}>
            <RichTextEditor
              value={noteContent}
              onChange={setNoteContent}
              placeholder="Write your note..."
              onImageUpload={handleImageUpload}
              disabled={submitting}
            />
            <div className="flex items-center justify-end mt-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setNoteContent(''); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !noteContent.replace(/<[^>]*>/g, '').trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--card-background, #FFFFFF)', borderColor: 'var(--card-border, #E5E7EB)' }}>
        <label htmlFor="notes-search" className="sr-only">Search notes</label>
        <input
          type="text"
          id="notes-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by content or author..."
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-colors"
          style={{
            backgroundColor: 'var(--background, #F9FAFB)',
            borderColor: 'var(--border, #E5E7EB)',
            color: 'var(--foreground, #111827)',
          } as React.CSSProperties}
        />
      </div>

      {/* Notes List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border p-6" style={{ backgroundColor: 'var(--card-background, #FFFFFF)', borderColor: 'var(--card-border, #E5E7EB)' }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-4 w-24 rounded animate-pulse" style={{ backgroundColor: 'var(--border, #E5E7EB)' }} />
                <div className="h-4 w-32 rounded animate-pulse" style={{ backgroundColor: 'var(--border, #E5E7EB)' }} />
              </div>
              <div className="h-4 w-full rounded animate-pulse mt-2" style={{ backgroundColor: 'var(--border-muted, #F3F4F6)' }} />
              <div className="h-4 w-3/4 rounded animate-pulse mt-1" style={{ backgroundColor: 'var(--border-muted, #F3F4F6)' }} />
            </div>
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="rounded-xl border p-8 text-center" style={{ backgroundColor: 'var(--card-background, #FFFFFF)', borderColor: 'var(--card-border, #E5E7EB)', color: 'var(--foreground-muted, #6B7280)' }}>
          {debouncedSearch ? 'No notes match your search' : 'No notes found in the last 7 days'}
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <div key={note.id} className="rounded-xl border p-6" style={{ backgroundColor: 'var(--card-background, #FFFFFF)', borderColor: 'var(--card-border, #E5E7EB)' }}>
              {editingNoteId === note.id ? (
                <form onSubmit={handleSaveEdit}>
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <span className="text-sm font-medium" style={{ color: 'var(--foreground, #111827)' }}>
                      {getDisplayAuthor(note)}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--foreground-muted, #6B7280)' }}>
                      {formatDate(note.noteDate)}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                      Editing
                    </span>
                  </div>
                  <RichTextEditor
                    value={editContent}
                    onChange={setEditContent}
                    placeholder="Write your note..."
                    onImageUpload={handleImageUpload}
                    disabled={saving}
                  />
                  <div className="flex items-center justify-end mt-3 gap-2">
                    <button
                      type="button"
                      onClick={cancelEditing}
                      disabled={saving}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving || !editContent.replace(/<[^>]*>/g, '').trim()}
                      className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="text-sm font-medium" style={{ color: 'var(--foreground, #111827)' }}>
                        {getDisplayAuthor(note)}
                      </span>
                      <span className="text-sm" style={{ color: 'var(--foreground-muted, #6B7280)' }}>
                        {formatDate(note.noteDate)}
                      </span>
                      {note.source === 'manual' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          Manual
                        </span>
                      )}
                    </div>
                    {note.content ? (
                      isHtmlContent(note.content) ? (
                        <div
                          className="prose prose-sm max-w-none prose-img:max-w-full prose-img:rounded-lg prose-a:text-blue-600 prose-a:underline"
                          style={{ color: 'var(--foreground-muted, #6B7280)' }}
                          dangerouslySetInnerHTML={{ __html: note.content }}
                        />
                      ) : (
                        <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--foreground-muted, #6B7280)' }}>
                          {note.content}
                        </p>
                      )
                    ) : (
                      <p className="text-sm" style={{ color: 'var(--foreground-muted, #6B7280)' }}>No content</p>
                    )}
                  </div>
                  {canAddNotes && note.source === 'manual' && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEditing(note)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Edit note"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(note.id)}
                        disabled={deleting === note.id}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                        title="Delete note"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {hasMore && !loading && (
        <div className="text-center">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-6 py-2 border rounded-lg transition-colors disabled:opacity-50"
            style={{
              backgroundColor: 'var(--card-background, #FFFFFF)',
              borderColor: 'var(--border, #E5E7EB)',
              color: 'var(--foreground, #111827)',
            }}
          >
            {loadingMore ? 'Loading...' : 'Show More'}
          </button>
        </div>
      )}
    </div>
  );
}
