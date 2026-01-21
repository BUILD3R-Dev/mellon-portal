/**
 * CollapsibleSection component
 *
 * A collapsible card-based section for grouping content with expand/collapse functionality.
 * Used for content editor sections (Narrative, Initiatives, Needs From Client).
 */
import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils/cn';

export interface CollapsibleSectionProps {
  /** Section title displayed in the header */
  title: string;
  /** Content to render inside the collapsible section */
  children: React.ReactNode;
  /** Whether the section should be expanded by default */
  defaultExpanded?: boolean;
  /** Whether the section has content (used for default expanded state) */
  hasContent?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Optional description text below the title */
  description?: string;
  /** Controlled expanded state */
  expanded?: boolean;
  /** Callback when expanded state changes */
  onExpandedChange?: (expanded: boolean) => void;
}

export function CollapsibleSection({
  title,
  children,
  defaultExpanded,
  hasContent = false,
  className,
  description,
  expanded: controlledExpanded,
  onExpandedChange,
}: CollapsibleSectionProps) {
  // Determine initial state: expanded if controlled, or if content exists, or if defaultExpanded
  const [internalExpanded, setInternalExpanded] = React.useState(() => {
    if (controlledExpanded !== undefined) return controlledExpanded;
    if (defaultExpanded !== undefined) return defaultExpanded;
    return hasContent;
  });

  // Use controlled state if provided, otherwise internal state
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  const handleToggle = () => {
    const newExpanded = !isExpanded;
    if (onExpandedChange) {
      onExpandedChange(newExpanded);
    } else {
      setInternalExpanded(newExpanded);
    }
  };

  // Generate unique ID for accessibility
  const sectionId = React.useId();
  const contentId = `${sectionId}-content`;
  const headerId = `${sectionId}-header`;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader
        className="cursor-pointer select-none hover:bg-gray-50 transition-colors p-4"
        onClick={handleToggle}
        role="button"
        aria-expanded={isExpanded}
        aria-controls={contentId}
        id={headerId}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className="ml-4 flex-shrink-0">
            <svg
              className={cn(
                'w-5 h-5 text-gray-500 transition-transform duration-200',
                isExpanded && 'rotate-180'
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </CardHeader>
      <div
        id={contentId}
        role="region"
        aria-labelledby={headerId}
        className={cn(
          'overflow-hidden transition-all duration-200 ease-in-out',
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <CardContent className="pt-0 pb-4 px-4">
          {children}
        </CardContent>
      </div>
    </Card>
  );
}
