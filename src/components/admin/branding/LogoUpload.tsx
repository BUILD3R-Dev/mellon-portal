import * as React from 'react';

interface LogoUploadProps {
  tenantId: string;
  currentLogoUrl: string | null;
  onLogoChange: (url: string | null) => void;
  variant?: 'light' | 'dark';
  label?: string;
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];
const MAX_FILE_SIZE = 500 * 1024; // 500KB

export function LogoUpload({ tenantId, currentLogoUrl, onLogoChange, variant = 'light', label }: LogoUploadProps) {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(currentLogoUrl);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const inputId = `logo-upload-${variant}`;

  React.useEffect(() => {
    setPreviewUrl(currentLogoUrl);
  }, [currentLogoUrl]);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload PNG, JPG, or SVG.';
    }

    if (file.size > MAX_FILE_SIZE) {
      return 'File size exceeds 500KB limit.';
    }

    return null;
  };

  const apiUrl = `/api/tenants/${tenantId}/logo${variant === 'dark' ? '?variant=dark' : ''}`;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to upload logo');
        setPreviewUrl(currentLogoUrl);
        return;
      }

      const newUrl = data.data.logoUrl || data.data.tenantLogoUrl;
      setPreviewUrl(newUrl);
      onLogoChange(newUrl);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload logo. Please try again.');
      setPreviewUrl(currentLogoUrl);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!previewUrl) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(apiUrl, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to delete logo');
        return;
      }

      setPreviewUrl(null);
      onLogoChange(null);
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete logo. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const displayLabel = label || (variant === 'dark' ? 'Dark Mode Logo' : 'Light Mode Logo');

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium" style={{ color: 'var(--foreground, #111827)' }}>{displayLabel}</label>

      {/* Preview */}
      <div className="relative">
        <div
          className="w-full h-20 border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden"
          style={{
            backgroundColor: variant === 'dark' ? '#1E293B' : 'var(--background-secondary, #F3F4F6)',
            borderColor: 'var(--border, #D1D5DB)',
          }}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={`${displayLabel} preview`}
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="text-center p-2">
              <svg
                className="mx-auto h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{ color: 'var(--foreground-muted, #9CA3AF)' }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--foreground-muted, #9CA3AF)' }}>No logo</p>
            </div>
          )}
        </div>

        {(isUploading || isDeleting) && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
            <svg
              className="animate-spin h-5 w-5 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.svg"
          onChange={handleFileSelect}
          disabled={isUploading || isDeleting}
          className="hidden"
          id={inputId}
        />
        <label
          htmlFor={inputId}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer border"
          style={{
            backgroundColor: 'var(--card-background, white)',
            color: 'var(--foreground, #374151)',
            borderColor: 'var(--border, #D1D5DB)',
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          {isUploading ? 'Uploading...' : 'Upload'}
        </label>

        {previewUrl && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isUploading || isDeleting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {isDeleting ? 'Removing...' : 'Remove'}
          </button>
        )}
      </div>

      {error && (
        <div className="p-2 rounded-lg bg-red-50 border border-red-200">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
