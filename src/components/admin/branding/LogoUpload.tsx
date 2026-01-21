import * as React from 'react';

interface LogoUploadProps {
  tenantId: string;
  currentLogoUrl: string | null;
  onLogoChange: (url: string | null) => void;
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];
const MAX_FILE_SIZE = 500 * 1024; // 500KB

export function LogoUpload({ tenantId, currentLogoUrl, onLogoChange }: LogoUploadProps) {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(currentLogoUrl);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    // Client-side validation
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Show local preview
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    // Upload file
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch(`/api/tenants/${tenantId}/logo`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to upload logo');
        setPreviewUrl(currentLogoUrl);
        return;
      }

      setPreviewUrl(data.data.tenantLogoUrl);
      onLogoChange(data.data.tenantLogoUrl);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload logo. Please try again.');
      setPreviewUrl(currentLogoUrl);
    } finally {
      setIsUploading(false);
      // Clear input to allow re-uploading same file
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
      const response = await fetch(`/api/tenants/${tenantId}/logo`, {
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

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">Tenant Logo</label>

      {/* Logo preview or placeholder */}
      <div className="flex items-start gap-6">
        <div className="relative flex-shrink-0">
          <div className="w-48 h-24 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Tenant logo preview"
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="text-center p-4">
                <svg
                  className="mx-auto h-8 w-8 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="mt-1 text-xs text-gray-500">No logo</p>
              </div>
            )}
          </div>

          {/* Loading overlay */}
          {(isUploading || isDeleting) && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
              <svg
                className="animate-spin h-6 w-6 text-gray-600"
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
            </div>
          )}
        </div>

        <div className="flex-1 space-y-3">
          {/* Upload button */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.svg"
              onChange={handleFileSelect}
              disabled={isUploading || isDeleting}
              className="hidden"
              id="logo-upload"
            />
            <label
              htmlFor="logo-upload"
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                isUploading || isDeleting
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              {isUploading ? 'Uploading...' : 'Upload Logo'}
            </label>
          </div>

          {/* Delete button */}
          {previewUrl && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isUploading || isDeleting}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              {isDeleting ? 'Deleting...' : 'Remove Logo'}
            </button>
          )}

          {/* Help text */}
          <p className="text-xs text-gray-500">
            PNG, JPG, or SVG. Max 500KB. Recommended: 400x150 pixels or smaller.
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
