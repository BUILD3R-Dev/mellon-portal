/**
 * ContentEditorForm component
 *
 * Main form component for editing report week manual content.
 * Includes three collapsible sections: Narrative, Initiatives, Needs From Client
 * Also includes a Preview button to open the report preview in a new tab.
 */
import * as React from 'react';
import { CollapsibleSection } from './CollapsibleSection';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

export interface ContentEditorFormProps {
  /** Report week ID */
  reportWeekId: string;
  /** Tenant ID */
  tenantId: string;
  /** Initial content data */
  initialData: {
    narrativeRich: string | null;
    initiativesRich: string | null;
    needsRich: string | null;
  };
  /** Report week status ('draft' or 'published') */
  status: 'draft' | 'published';
  /** Week period display string */
  weekPeriod: string;
}

interface NotificationState {
  type: 'success' | 'error';
  message: string;
}

export function ContentEditorForm({
  reportWeekId,
  tenantId,
  initialData,
  status,
  weekPeriod,
}: ContentEditorFormProps) {
  // Track current values
  const [narrativeRich, setNarrativeRich] = React.useState(initialData.narrativeRich || '');
  const [initiativesRich, setInitiativesRich] = React.useState(initialData.initiativesRich || '');
  const [needsRich, setNeedsRich] = React.useState(initialData.needsRich || '');

  // Track initial values for dirty state comparison
  const [savedNarrative, setSavedNarrative] = React.useState(initialData.narrativeRich || '');
  const [savedInitiatives, setSavedInitiatives] = React.useState(initialData.initiativesRich || '');
  const [savedNeeds, setSavedNeeds] = React.useState(initialData.needsRich || '');

  // UI state
  const [isSaving, setIsSaving] = React.useState(false);
  const [notification, setNotification] = React.useState<NotificationState | null>(null);

  // Calculate dirty state
  const hasChanges = React.useMemo(() => {
    return (
      narrativeRich !== savedNarrative ||
      initiativesRich !== savedInitiatives ||
      needsRich !== savedNeeds
    );
  }, [narrativeRich, savedNarrative, initiativesRich, savedInitiatives, needsRich, savedNeeds]);

  // Setup unsaved changes warning
  useUnsavedChangesWarning({ hasChanges });

  // Auto-hide notification after 5 seconds
  React.useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const isReadOnly = status === 'published';

  // Generate preview URL
  const previewUrl = `/admin/tenants/${tenantId}/report-weeks/${reportWeekId}/preview`;

  const handleSave = async () => {
    if (!hasChanges || isReadOnly) return;

    setIsSaving(true);

    try {
      const response = await fetch(
        `/api/tenants/${tenantId}/report-weeks/${reportWeekId}/manual`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            narrativeRich: narrativeRich || null,
            initiativesRich: initiativesRich || null,
            needsRich: needsRich || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setNotification({
          type: 'error',
          message: data.error || 'Failed to save content',
        });
        return;
      }

      // Update saved state to match current state
      setSavedNarrative(narrativeRich);
      setSavedInitiatives(initiativesRich);
      setSavedNeeds(needsRich);

      setNotification({
        type: 'success',
        message: 'Content saved successfully',
      });
    } catch (error) {
      console.error('Save error:', error);
      setNotification({
        type: 'error',
        message: 'Failed to save content. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Preview button at top */}
      <div className="flex justify-end">
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          Preview
        </a>
      </div>

      {/* Published status banner */}
      {isReadOnly && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Published
            </span>
            <span className="text-sm text-green-700">
              This report week is published. Content cannot be edited.
            </span>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div
          className={cn(
            'p-4 rounded-lg border',
            notification.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          )}
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Content sections */}
      <div className="space-y-4">
        {/* Narrative Section */}
        <CollapsibleSection
          title="Narrative"
          description="Weekly performance summary and key highlights"
          hasContent={!!narrativeRich}
        >
          <RichTextEditor
            value={narrativeRich}
            onChange={setNarrativeRich}
            disabled={isReadOnly}
            placeholder="Enter weekly narrative content..."
          />
        </CollapsibleSection>

        {/* Initiatives Section */}
        <CollapsibleSection
          title="Initiatives"
          description="Current marketing initiatives and activities"
          hasContent={!!initiativesRich}
        >
          <RichTextEditor
            value={initiativesRich}
            onChange={setInitiativesRich}
            disabled={isReadOnly}
            placeholder="Enter current initiatives..."
          />
        </CollapsibleSection>

        {/* Needs From Client Section */}
        <CollapsibleSection
          title="Needs From Client"
          description="Action items or requests for the client"
          hasContent={!!needsRich}
        >
          <RichTextEditor
            value={needsRich}
            onChange={setNeedsRich}
            disabled={isReadOnly}
            placeholder="Enter client action items or requests..."
          />
        </CollapsibleSection>
      </div>

      {/* Save button area */}
      {!isReadOnly && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="text-sm text-amber-600 font-medium flex items-center gap-1">
                <svg
                  className="w-4 h-4"
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
                Unsaved changes
              </span>
            )}
          </div>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
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
                Saving...
              </>
            ) : (
              'Save Content'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
