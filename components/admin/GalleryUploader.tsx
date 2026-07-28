// components/admin/GalleryUploader.tsx

import React, { useState, useRef, useCallback } from 'react';
import {
  Upload,
  X,
  Image as ImageIcon,
  Loader2,
  GripVertical,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  FileText
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export type ImageCategory = 
  | 'exterior' 
  | 'interior' 
  | 'bedroom' 
  | 'bathroom' 
  | 'kitchen' 
  | 'living' 
  | 'view' 
  | 'amenity' 
  | 'floor_plan' 
  | 'construction' 
  | 'render' 
  | 'other';

export interface GalleryImage {
  url: string;
  publicId: string; // Changed from public_id to publicId to match your prop type
  caption?: string;
  category?: ImageCategory;
  order: number;
  mimeType?: string; // Track file type
}

interface GalleryUploaderProps {
  label?: string;
  value: GalleryImage[];
  onChange: (images: GalleryImage[]) => void;
  folder: string;
  maxImages?: number;
  required?: boolean;
  disabled?: boolean;
  helpText?: string;
  showCategories?: boolean;
  allowedCategories?: ImageCategory[];
}

// ============================================
// CATEGORY OPTIONS
// ============================================

const CATEGORY_OPTIONS: { value: ImageCategory; label: string; icon: string }[] = [
  { value: 'exterior', label: 'Exterior', icon: '🏠' },
  { value: 'interior', label: 'Interior', icon: '🛋️' },
  { value: 'bedroom', label: 'Bedroom', icon: '🛏️' },
  { value: 'bathroom', label: 'Bathroom', icon: '🚿' },
  { value: 'kitchen', label: 'Kitchen', icon: '🍳' },
  { value: 'living', label: 'Living Room', icon: '🪑' },
  { value: 'view', label: 'View', icon: '🌆' },
  { value: 'amenity', label: 'Amenity', icon: '🏊' },
  { value: 'floor_plan', label: 'Floor Plan', icon: '📐' },
  { value: 'construction', label: 'Construction', icon: '🏗️' },
  { value: 'render', label: '3D Render', icon: '🖼️' },
  { value: 'other', label: 'Other', icon: '📷' },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function GalleryUploader({
  label = 'Gallery Images',
  value = [],
  onChange,
  folder,
  maxImages = 20,
  required = false,
  disabled = false,
  helpText,
  showCategories = true,
  allowedCategories,
}: GalleryUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter categories if specific ones are allowed
  const categoryOptions = allowedCategories
    ? CATEGORY_OPTIONS.filter((cat) => allowedCategories.includes(cat.value))
    : CATEGORY_OPTIONS;

  // ============================================
  // UPLOAD HANDLER (SECURE)
  // ============================================

  const uploadImage = async (file: File): Promise<GalleryImage | null> => {
    // 1. Client-Side Validation
    if (file.size > 10 * 1024 * 1024) {
      setError(`File ${file.name} is too large (Max 10MB)`);
      return null;
    }

    if (!file.type.startsWith('image/')) {
      setError(`File ${file.name} is not an image`);
      return null;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);
      
      // ✅ Explicitly set image type for backend validation
      formData.append('fileType', 'image'); 

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        // No Content-Type header needed (browser sets multipart/form-data boundary)
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait.');
        }
        throw new Error('Upload failed');
      }

      const data = await response.json();

      if (data.success) {
        return {
          url: data.data.url,
          publicId: data.data.publicId, // Normalized to camelCase
          category: 'other',
          order: value.length,
          mimeType: file.type,
        };
      }
      
      throw new Error(data.message || 'Upload failed');
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload image');
      return null;
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - value.length;
    if (remainingSlots <= 0) {
      setError(`Maximum ${maxImages} images allowed`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setUploading(true);
    setUploadingCount(filesToUpload.length);
    setError(null);

    const uploadedImages: GalleryImage[] = [];

    // Parallel uploads (max 3 at a time to prevent browser stall)
    // For simplicity here, we do sequential, but batching is better.
    for (const file of filesToUpload) {
      const result = await uploadImage(file);
      if (result) {
        // Adjust order locally
        result.order = value.length + uploadedImages.length;
        uploadedImages.push(result);
      }
      setUploadingCount((prev) => Math.max(0, prev - 1));
    }

    if (uploadedImages.length > 0) {
      onChange([...value, ...uploadedImages]);
    }

    setUploading(false);
    setUploadingCount(0);
  };

  // ============================================
  // DELETE HANDLER (SECURE)
  // ============================================

  const handleDelete = async (index: number) => {
    const imageToDelete = value[index];
    
    // Optimistic UI update
    const newImages = value
      .filter((_, i) => i !== index)
      .map((img, i) => ({ ...img, order: i }));
    
    onChange(newImages);

    try {
      // Secure delete call
      const res = await fetch('/api/upload/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicId: imageToDelete.publicId,
          resourceType: 'image', // Explicit resource type
        }),
      });

      if (!res.ok) {
        console.error('Failed to delete from server, but removed from UI');
        // We don't revert UI here to avoid jankiness, but you could show a toast
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // ============================================
  // UPDATE HANDLERS
  // ============================================

  const handleCategoryChange = (index: number, category: ImageCategory) => {
    const newImages = [...value];
    newImages[index] = { ...newImages[index], category };
    onChange(newImages);
  };

  const handleCaptionChange = (index: number, caption: string) => {
    const newImages = [...value];
    newImages[index] = { ...newImages[index], caption };
    onChange(newImages);
  };

  // ============================================
  // DRAG & DROP REORDER
  // ============================================

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...value];
    const draggedImage = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedImage);

    // Update order
    newImages.forEach((img, i) => {
      img.order = i;
    });

    onChange(newImages);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // ============================================
  // DROP ZONE
  // ============================================

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-4">
      {/* Label */}
      <div className="flex justify-between items-center">
        <label className="block text-sm font-bold text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <span className="text-xs font-medium text-gray-500">
          {value.length} / {maxImages} images
        </span>
      </div>

      {/* Upload Area */}
      {value.length < maxImages && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
            transition-all duration-200 ease-in-out
            ${dragOver ? 'border-[#029bba] bg-[#029bba]/5 scale-[1.01]' : 'border-gray-300 hover:border-[#029bba] hover:bg-gray-50'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${error ? 'border-red-300 bg-red-50' : ''}
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            disabled={disabled || uploading}
          />

          {uploading ? (
            <div className="flex flex-col items-center gap-3 py-2">
              <Loader2 className="w-10 h-10 text-[#029bba] animate-spin" />
              <div className="text-sm font-medium text-gray-600">
                Uploading {uploadingCount} image{uploadingCount !== 1 ? 's' : ''}...
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${dragOver ? 'bg-[#029bba]/10 text-[#029bba]' : 'bg-gray-100 text-gray-400'}`}>
                <Upload className="w-7 h-7" />
              </div>
              <div>
                <span className="text-sm font-bold text-[#029bba]">Click to upload</span>
                <span className="text-sm text-gray-500"> or drag and drop</span>
              </div>
              <p className="text-xs text-gray-400">
                JPG, PNG, WebP (Max 10MB)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Help Text */}
      {helpText && !error && (
        <p className="text-xs text-gray-500 flex items-center gap-1.5">
          <CheckCircle className="w-3 h-3 text-green-500" />
          {helpText}
        </p>
      )}

      {/* Image Grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in duration-500">
          {value.map((image, index) => (
            <div
              key={image.publicId}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`
                relative group bg-white rounded-xl border overflow-hidden shadow-sm
                transition-all duration-200
                ${draggedIndex === index ? 'opacity-40 scale-95 ring-2 ring-[#029bba]' : 'opacity-100 hover:shadow-md'}
                ${index === 0 ? 'border-[#029bba] ring-1 ring-[#029bba]/20' : 'border-gray-200'}
              `}
            >
              {/* Image Preview */}
              <div className="aspect-square relative bg-gray-50">
                <img
                  src={image.url}
                  alt={image.caption || `Image ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />

                {/* Drag Handle Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors cursor-grab active:cursor-grabbing" />

                <div className="absolute top-2 left-2 p-1.5 bg-white/90 backdrop-blur rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                  <GripVertical className="w-4 h-4 text-gray-600" />
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(index)}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 hover:scale-105 transform duration-150"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Badges */}
                {index === 0 && (
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-[#029bba] text-white text-[10px] font-bold uppercase tracking-wider rounded shadow-sm">
                    Main Photo
                  </div>
                )}

                <div className="absolute bottom-2 right-2 w-6 h-6 bg-black/60 backdrop-blur text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {index + 1}
                </div>
              </div>

              {/* Controls */}
              {showCategories && (
                <div className="p-3 space-y-2 bg-white border-t border-gray-100">
                  <select
                    value={image.category || 'other'}
                    onChange={(e) => handleCategoryChange(index, e.target.value as ImageCategory)}
                    className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] bg-gray-50 hover:bg-white transition-colors cursor-pointer"
                  >
                    {categoryOptions.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={image.caption || ''}
                    onChange={(e) => handleCaptionChange(index, e.target.value)}
                    placeholder="Caption (optional)"
                    className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] placeholder:text-gray-400"
                    maxLength={50}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Helper Tip */}
      {value.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-2">
          <div className="mt-0.5 min-w-[16px]">💡</div>
          <p className="text-xs text-blue-700 leading-snug">
            <strong>Pro Tip:</strong> Drag and drop images to reorder them. The first image will be your listing's main cover photo.
          </p>
        </div>
      )}
    </div>
  );
}
