/**
 * PdfDownloadButton component
 *
 * A small React island button for triggering PDF generation and download.
 * Used on the report detail page header. Shows a loading spinner while
 * the POST request is in progress, then triggers a browser download.
 */
import * as React from 'react';

export interface PdfDownloadButtonProps {
  /** The report week ID to download */
  reportWeekId: string;
}

export function PdfDownloadButton({ reportWeekId }: PdfDownloadButtonProps) {
  const [downloading, setDownloading] = React.useState(false);

  async function handleClick() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/reports/${reportWeekId}/pdf`, { method: 'POST' });
      const json = await res.json();
      if (json.success && json.data?.downloadUrl) {
        const link = document.createElement('a');
        link.href = json.data.downloadUrl;
        link.download = '';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch {
      // Silently fail
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={downloading}
      aria-label="Download PDF"
      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
    >
      {downloading ? (
        <svg
          className="w-4 h-4 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
          role="status"
          aria-label="Loading"
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
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
      )}
      Download PDF
    </button>
  );
}
