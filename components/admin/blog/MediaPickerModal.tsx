import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  Image as ImageIcon,
  Check,
  RefreshCw,
  Upload,
  Info,
  CheckCircle2,
  Maximize2,
  FileImage,
  Type,
  AlignLeft,
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface MediaItem {
  _id: string;
  url: string;
  originalName: string;
  format: string;
  size: number;
  width?: number;
  height?: number;
}

interface SelectedMediaPayload extends MediaItem {
  alt?: string;
  caption?: string;
}

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (media: SelectedMediaPayload | SelectedMediaPayload[]) => void;
  title?: string;
  multiple?: boolean;
}

function formatFileSize(bytes: number) {
  if (!bytes || Number.isNaN(bytes)) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function MediaPickerModal({
  isOpen,
  onClose,
  onSelect,
  title = 'Select Image',
  multiple = false,
}: MediaPickerModalProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(t);
  }, [banner]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [selectedMediaList, setSelectedMediaList] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);

  const [altText, setAltText] = useState('');
  const [caption, setCaption] = useState('');

  // fetch media
  const fetchMedia = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: 'image',
        limit: '60',
      });

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const res = await fetch(`/api/admin/media?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setMedia(Array.isArray(data.media) ? data.media : []);
      } else {
        setBanner({ message: data.message || 'Failed to fetch media', type: 'error' });
      }
    } catch (error) {
      console.error('Error fetching media:', error);
      setBanner({ message: 'Failed to fetch media', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMedia();
    }
  }, [isOpen, searchQuery]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedMedia(null);
      setSelectedMediaList([]);
      setAltText('');
      setCaption('');
    }
  }, [isOpen]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      window.addEventListener('keydown', onEsc);
    }

    return () => window.removeEventListener('keydown', onEsc);
  }, [isOpen, onClose]);

  // Upload handler
  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploading(true);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const base64 = await base64Promise;

      const res = await fetch('/api/admin/media/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: base64,
          filename: file.name,
          mimeType: file.type,
          folder: 'blog',
        }),
      });

      const data = await res.json();

      if (data.success && data.media) {
        setBanner({ message: 'Image uploaded successfully', type: 'success' });
        await fetchMedia();

        if (multiple) {
          setSelectedMediaList((prev) => {
            const exists = prev.find((m) => m._id === data.media._id);
            if (exists) return prev;
            return [data.media, ...prev];
          });
        } else {
          setSelectedMedia(data.media);
        }
      } else {
        setBanner({ message: data.message || 'Failed to upload', type: 'error' });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setBanner({ message: 'Failed to upload image', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif'],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  });

  const selectedCount = multiple ? selectedMediaList.length : selectedMedia ? 1 : 0;

  const previewItem = multiple
    ? selectedMediaList[0] || null
    : selectedMedia;

  const toggleMediaSelection = (item: MediaItem) => {
    if (!multiple) {
      setSelectedMedia(item);
      return;
    }

    setSelectedMediaList((prev) => {
      const exists = prev.some((m) => m._id === item._id);
      if (exists) {
        return prev.filter((m) => m._id !== item._id);
      }
      return [...prev, item];
    });
  };

  const isSelected = (item: MediaItem) => {
    if (multiple) return selectedMediaList.some((m) => m._id === item._id);
    return selectedMedia?._id === item._id;
  };

  const handleSelect = () => {
    if (!multiple && selectedMedia) {
      onSelect({
        ...selectedMedia,
        alt: altText.trim(),
        caption: caption.trim(),
      });
      onClose();
      return;
    }

    if (multiple && selectedMediaList.length > 0) {
      onSelect(
        selectedMediaList.map((item) => ({
          ...item,
          alt: altText.trim(),
          caption: caption.trim(),
        }))
      );
      onClose();
    }
  };

  const clearSelection = () => {
    setSelectedMedia(null);
    setSelectedMediaList([]);
    setAltText('');
    setCaption('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="media-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          key="media-modal-content"
          initial={{ scale: 0.96, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 12 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-3xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl relative"
          onClick={(e) => e.stopPropagation()}
        >
          {banner && (
            <div
              className={`absolute top-5 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold transition-all ${
                banner.type === 'success'
                  ? 'bg-[#004063] text-white border border-[#029bba]/30'
                  : 'bg-red-600 text-white'
              }`}
            >
              <span>{banner.message}</span>
            </div>
          )}
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-white">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {multiple
                  ? 'Select one or more images for your gallery'
                  : 'Select a featured image or insert an image into your content'}
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Controls */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/70">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by filename..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none bg-white"
                />
              </div>

              {/* Upload Zone Button */}
              <div
                {...getRootProps()}
                className={`rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                  isDragActive
                    ? 'border-[#029bba] bg-[#029bba]/5'
                    : 'border-gray-300 bg-white hover:border-[#029bba]/50'
                }`}
              >
                <input {...getInputProps()} />
                <div className="px-5 py-3 flex items-center gap-3 min-w-[220px]">
                  {uploading ? (
                    <RefreshCw className="w-5 h-5 animate-spin text-[#029bba]" />
                  ) : (
                    <Upload className="w-5 h-5 text-[#029bba]" />
                  )}
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">
                      {uploading ? 'Uploading...' : isDragActive ? 'Drop image here' : 'Upload image'}
                    </div>
                    <div className="text-gray-500 text-xs">PNG, JPG, WEBP, GIF • up to 10MB</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden grid lg:grid-cols-12">
            {/* Media Grid */}
            <div className="lg:col-span-8 border-r border-gray-200 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <RefreshCw className="w-8 h-8 text-[#029bba] animate-spin" />
                </div>
              ) : media.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <ImageIcon className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-700 font-medium">No images found</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Try searching differently or upload a new image.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {media.map((item) => {
                    const selected = isSelected(item);

                    return (
                      <button
                        type="button"
                        key={item._id}
                        onClick={() => toggleMediaSelection(item)}
                        className={`group relative rounded-2xl overflow-hidden border-2 transition-all text-left ${
                          selected
                            ? 'border-[#029bba] ring-2 ring-[#029bba]/20'
                            : 'border-transparent hover:border-gray-300'
                        }`}
                      >
                        <div className="aspect-square bg-gray-100 overflow-hidden">
                          <img
                            src={item.url}
                            alt={item.originalName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>

                        <div className="p-3 bg-white">
                          <p className="text-xs font-medium text-gray-800 line-clamp-1">
                            {item.originalName}
                          </p>
                          <div className="mt-1 text-[11px] text-gray-500 flex items-center justify-between">
                            <span>{item.format?.toUpperCase()}</span>
                            <span>{formatFileSize(item.size)}</span>
                          </div>
                        </div>

                        {selected && (
                          <div className="absolute inset-0 bg-[#029bba]/15 flex items-start justify-end p-3">
                            <div className="w-8 h-8 rounded-full bg-[#029bba] flex items-center justify-center shadow-md">
                              <Check className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Preview Panel */}
            <div className="lg:col-span-4 overflow-y-auto p-6 bg-gray-50/50">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">Selection Details</h4>
                {selectedCount > 0 && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-sm text-gray-500 hover:text-red-500 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              {selectedCount === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <Info className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">No image selected</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Choose an image from the library or upload a new one.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-2xl overflow-hidden bg-white border border-gray-200">
                    {previewItem ? (
                      <img
                        src={previewItem.url}
                        alt={previewItem.originalName}
                        className="w-full h-56 object-cover"
                      />
                    ) : null}
                  </div>

                  {previewItem && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <FileImage className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 break-all">
                            {previewItem.originalName}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {previewItem.format?.toUpperCase()} • {formatFileSize(previewItem.size)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Maximize2 className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div className="text-sm text-gray-700">
                          {previewItem.width || '-'} × {previewItem.height || '-'} px
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 text-[#029bba] mt-0.5" />
                        <div className="text-sm text-gray-700">
                          {multiple
                            ? `${selectedCount} image(s) selected`
                            : 'Ready to insert'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Alt text */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-800 mb-2">
                      <Type className="w-4 h-4 text-gray-400" />
                      Alt text
                    </label>
                    <input
                      type="text"
                      value={altText}
                      onChange={(e) => setAltText(e.target.value)}
                      placeholder="Describe the image for SEO and accessibility"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Helps search engines and screen readers understand the image.
                    </p>
                  </div>

                  {/* Caption */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-800 mb-2">
                      <AlignLeft className="w-4 h-4 text-gray-400" />
                      Caption
                    </label>
                    <textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      rows={3}
                      placeholder="Optional image caption..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-sm text-gray-500">
              {selectedCount > 0 ? (
                <span>
                  Selected <strong>{selectedCount}</strong> item{selectedCount > 1 ? 's' : ''}
                </span>
              ) : (
                <span>No image selected</span>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSelect}
                disabled={selectedCount === 0}
                className="px-5 py-2.5 bg-[#029bba] hover:bg-[#027a94] text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {multiple ? 'Insert Selected Images' : 'Select Image'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
