/**
 * ReportSectionCard component
 *
 * A read-only card component for displaying report content sections.
 * Used in both preview (agency admin) and published report views (tenant users).
 * Always expanded (non-collapsible), hides entirely when content is empty.
 */
import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils/cn';

export interface ReportSectionCardProps {
  /** Section title displayed in the header */
  title: string;
  /** HTML content to render (from rich text editor) */
  htmlContent: string | null;
  /** Optional description text below the title */
  description?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ReportSectionCard renders a card with a title and HTML content.
 * Returns null if htmlContent is falsy (implements hide-empty behavior).
 */
export function ReportSectionCard({
  title,
  htmlContent,
  description,
  className,
}: ReportSectionCardProps) {
  // Return null for empty content - hides the section entirely
  if (!htmlContent) {
    return null;
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </CardHeader>
      <CardContent className="pt-0 pb-4 px-4">
        <div
          className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-foreground prose-p:text-foreground prose-a:text-primary prose-a:underline prose-ul:list-disc prose-ol:list-decimal"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </CardContent>
    </Card>
  );
}
