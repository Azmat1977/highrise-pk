// components/admin/FileUploader.tsx

import React, { useState, useRef } from 'react';
import {
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  Download,
} from 'lucide-react';

interface FileUploaderProps {
  label: string;
  accept: 'image' | 'pdf' | 'both';
  folder: string;
  value?: {
    url: string;
    publicId: string;
  } | null;
  onChange: (file: { url: string; publicId: string } | null) => void;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function FileUploader({
  label,
  accept,
  folder,
  value,
  onChange,
  helpText,
  required = false,
  disabled = false,
}: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [imageError, setImageError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Determine accept attribute
  const acceptAttr =
    accept === 'image'
      ? 'image/jpeg,image/png,image/webp,image/gif,image/tiff'
      : accept === 'pdf'
      ? 'application/pdf'
      : 'image/jpeg,image/png,image/webp,image/gif,image/tiff,application/pdf';

  // Get file type for API
  const fileType = accept === 'both' ? 'auto' : accept;

  // Handle file selection
  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    // Validate file type
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    if (accept === 'image' && !isImage) {
      setError('Please select an image file (JPG, PNG, WebP, TIFF)');
      return;
    }

    if (accept === 'pdf' && !isPdf) {
      setError('Please select a PDF file');
      return;
    }

    if (accept === 'both' && !isImage && !isPdf) {
      setError('Please select an image or PDF file');
      return;
    }

    setError(null);
    setImageError(false);
    setUploading(true);

    try {
      // Delete old file if exists — resource type detected from URL path
      // (legacy raw PDFs: /raw/upload/ · new image-resource PDFs: /image/upload/)
      if (value?.publicId) {
        const oldIsRaw = value.url.includes('/raw/upload/');
        await fetch('/api/upload/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            publicId: value.publicId,
            resourceType: oldIsRaw ? 'raw' : 'image',
          }),
        });
      }

      // Upload new file — folder goes in the QUERY string (endpoint contract:
      // it reads req.query.folder; FormData fields were silently ignored).
      // Dynamic sub-paths collapse to their root key:
      //   'projects/slug/floor-plans' → 'project-floorplans' (full-detail, no crop)
      //   'projects/slug/documents'   → 'projects' (PDF + images)
      const folderKey = folder.toLowerCase().includes('floor-plan')
        ? 'project-floorplans'
        : folder.split('/')[0]?.toLowerCase() ?? 'general';

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/upload?folder=${encodeURIComponent(folderKey)}`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        onChange({
          url: data.data.url,
          publicId: data.data.publicId,
        });
      } else {
        setError(data.message || 'Upload failed');
      }
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!value?.publicId) return;

    try {
      // Resource type from URL path — robust for legacy raw + new image PDFs
      const oldIsRaw = value.url.includes('/raw/upload/');
      
      await fetch('/api/upload/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicId: value.publicId,
          resourceType: oldIsRaw ? 'raw' : 'image',
        }),
      });

      onChange(null);
      setImageError(false);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Check if value is PDF or image
  // NOTE: DocumentsSection jahan se ye component use ho raha hai wahan accept="pdf" set hai,
  // is liye hum primarily `accept` prop pe rely karte hain, aur fallback ke طور pe URL ending se check karte hain.
  const isPdf =
    accept === 'pdf' ||
    (!!value?.url && value.url.toLowerCase().endsWith('.pdf'));

  // PDF page-1 preview (image-resource PDFs only — raw cannot transform).
  // Gives admins instant visual confirmation that the PDF will display
  // on the detail page.
  const pdfPreviewUrl = (() => {
    if (!isPdf || !value?.url) return null;
    const idx = value.url.indexOf('/image/upload/');
    if (idx === -1) return null;
    const prefix = `${value.url.slice(0, idx)}/image/upload/`;
    let rest = value.url.slice(idx + '/image/upload/'.length);
    const vIdx = rest.search(/\/v\d+\//);
    if (vIdx > 0) rest = rest.slice(vIdx + 1);
    const lastSlash = rest.lastIndexOf('/');
    const file = rest.slice(lastSlash + 1);
    const dot = file.lastIndexOf('.');
    const stem = dot > 0 ? file.slice(0, dot) : file;
    rest = `${rest.slice(0, lastSlash + 1)}${stem}.jpg`;
    return `${prefix}f_jpg,pg_1/${rest}`;
  })();

  return (
    <div className="space-y-2">
      {/* Label */}
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Upload Area or Preview */}
      {!value ? (
        <div
          onClick={() => !disabled && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
            transition-all duration-200
            ${dragOver ? 'border-[#029bba] bg-[#029bba]/5' : 'border-gray-300 hover:border-[#029bba]'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${error ? 'border-red-300 bg-red-50' : ''}
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept={acceptAttr}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
            className="hidden"
            disabled={disabled}
          />

          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-[#029bba] animate-spin" />
              <span className="text-sm text-gray-600">Uploading...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                {accept === 'pdf' ? (
                  <FileText className="w-6 h-6 text-gray-400" />
                ) : accept === 'image' ? (
                  <ImageIcon className="w-6 h-6 text-gray-400" />
                ) : (
                  <Upload className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div>
                <span className="text-sm font-medium text-[#029bba]">
                  Click to upload
                </span>
                <span className="text-sm text-gray-500"> or drag and drop</span>
              </div>
              <span className="text-xs text-gray-400">
                {accept === 'pdf'
                  ? 'PDF (max 10MB)'
                  : accept === 'image'
                  ? 'JPG, PNG, WebP (max 10MB)'
                  : 'Image or PDF (max 10MB)'}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="relative border border-gray-200 rounded-xl p-4 bg-gray-50">
          <div className="flex items-center gap-4">
            {/* Preview */}
            {isPdf ? (
              <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0
                              border border-gray-200 flex items-center justify-center">
                {pdfPreviewUrl && !imageError ? (
                  <img
                    src={pdfPreviewUrl}
                    alt="PDF page 1 preview"
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <FileText className="w-8 h-8 text-red-500" />
                )}
              </div>
            ) : (
              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200 flex items-center justify-center">
                {!imageError ? (
                  <img
                    src={value.url}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                )}
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700 truncate">
                  {isPdf ? 'PDF Document' : 'Image'} uploaded
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate mt-1">
                {value.url.split('/').pop()}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* View/Download */}
              <a
                href={value.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                title={isPdf ? 'Download' : 'View'}
              >
                {isPdf ? (
                  <Download className="w-4 h-4 text-gray-600" />
                ) : (
                  <Eye className="w-4 h-4 text-gray-600" />
                )}
              </a>

              {/* Delete */}
              {!disabled && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="p-2 rounded-lg bg-white border border-red-200 hover:bg-red-50 transition-colors"
                  title="Delete"
                >
                  <X className="w-4 h-4 text-red-500" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Help Text */}
      {helpText && !error && (
        <p className="text-xs text-gray-500">{helpText}</p>
      )}
    </div>
  );
}
