import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image as ImageIcon,
  FileText,
  Trash2,
  Upload,
  Search,
  Grid,
  List,
  Copy,
  Check,
  X,
  RefreshCw,
  Download,
  Eye,
  MoreVertical,
  FolderOpen,
  Clock,
  HardDrive,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';

// Types
interface MediaItem {
  _id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  format: string;
  size: number;
  width?: number;
  height?: number;
  url: string;
  publicId: string;
  resourceType: 'image' | 'video' | 'raw';
  folder: string;
  alt: string;
  caption: string;
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  };
  isDeleted: boolean;
  createdAt: string;
  formattedSize?: string;
}

interface MediaCounts {
  all: number;
  images: number;
  documents: number;
  trash: number;
}

type TabType = 'all' | 'images' | 'documents' | 'trash';

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper function to format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default function MediaLibraryPage() {
  // State
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [counts, setCounts] = useState<MediaCounts>({ all: 0, images: 0, documents: 0, trash: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<MediaItem | null>(null);
  const [isPermanentDelete, setIsPermanentDelete] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 24;

  // Tabs configuration
  const tabs = [
    { id: 'all' as TabType, label: 'All Media', icon: Grid, count: counts.all },
    { id: 'images' as TabType, label: 'Images', icon: ImageIcon, count: counts.images },
    { id: 'documents' as TabType, label: 'Documents', icon: FileText, count: counts.documents },
    { id: 'trash' as TabType, label: 'Trash', icon: Trash2, count: counts.trash },
  ];

  // Folders
  const folders = [
    { value: 'all', label: 'All Folders' },
    { value: 'blog', label: 'Blog' },
    { value: 'properties', label: 'Properties' },
    { value: 'projects', label: 'Projects' },
    { value: 'developers', label: 'Developers' },
    { value: 'general', label: 'General' },
  ];

  // Fetch media
  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        deleted: activeTab === 'trash' ? 'true' : 'false',
      });

      if (activeTab === 'images') params.append('type', 'image');
      if (activeTab === 'documents') params.append('type', 'document');
      if (selectedFolder !== 'all') params.append('folder', selectedFolder);
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`/api/admin/media?${params}`);
      const data = await res.json();

      if (data.success) {
        setMedia(data.media);
        setCounts(data.counts);
        setTotalPages(data.pagination.totalPages);
      } else {
        toast.error(data.message || 'Failed to fetch media');
      }
    } catch (error) {
      console.error('Error fetching media:', error);
      toast.error('Failed to fetch media');
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, selectedFolder, searchQuery]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [activeTab, selectedFolder, searchQuery]);

  // Get user ID from localStorage
  const getUserId = (): string => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user._id || user.id || '';
      }
    }
    return '';
  };

  // Upload handler
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const userId = getUserId();
    if (!userId) {
      toast.error('Please login to upload files');
      return;
    }

    setUploading(true);

    for (const file of acceptedFiles) {
      const fileId = `${file.name}-${Date.now()}`;
      setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }));

      try {
        // Convert to base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const base64 = await base64Promise;
        setUploadProgress((prev) => ({ ...prev, [fileId]: 50 }));

        // Upload to API
        const res = await fetch('/api/admin/media/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file: base64,
            filename: file.name,
            mimeType: file.type,
            folder: selectedFolder === 'all' ? 'general' : selectedFolder,
            uploadedBy: userId,
          }),
        });

        const data = await res.json();
        setUploadProgress((prev) => ({ ...prev, [fileId]: 100 }));

        if (data.success) {
          toast.success(`${file.name} uploaded successfully`);
        } else {
          toast.error(data.message || `Failed to upload ${file.name}`);
        }
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Failed to upload ${file.name}`);
      } finally {
        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
      }
    }

    setUploading(false);
    fetchMedia();
    
    // Refresh sidebar stats
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('refreshAdminStats'));
    }
  }, [selectedFolder, fetchMedia]);

  // Dropzone config
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif', '.svg'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  // Copy URL
  const copyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success('URL copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Delete handler
  const handleDelete = async () => {
    if (!mediaToDelete) return;

    try {
      const res = await fetch(
        `/api/admin/media/${mediaToDelete._id}?permanent=${isPermanentDelete}`,
        { method: 'DELETE' }
      );
      const data = await res.json();

      if (data.success) {
        toast.success(isPermanentDelete ? 'Media permanently deleted' : 'Media moved to trash');
        setShowDeleteModal(false);
        setMediaToDelete(null);
        fetchMedia();
        
        // Refresh sidebar stats
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('refreshAdminStats'));
        }
      } else {
        toast.error(data.message || 'Failed to delete media');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete media');
    }
  };

  // Restore handler
  const handleRestore = async (mediaItem: MediaItem) => {
    try {
      const res = await fetch(`/api/admin/media/${mediaItem._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore' }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Media restored successfully');
        fetchMedia();
        
        // Refresh sidebar stats
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('refreshAdminStats'));
        }
      } else {
        toast.error(data.message || 'Failed to restore media');
      }
    } catch (error) {
      console.error('Restore error:', error);
      toast.error('Failed to restore media');
    }
  };

  // Render media item
  const renderMediaItem = (item: MediaItem) => {
    const isImage = item.resourceType === 'image';

    if (viewMode === 'grid') {
      return (
        <motion.div
          key={item._id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="group relative bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-[#029bba]/30 transition-all duration-200"
        >
          {/* Thumbnail */}
          <div
            className="aspect-square bg-gray-100 cursor-pointer"
            onClick={() => setSelectedMedia(item)}
          >
            {isImage ? (
              <img
                src={item.url}
                alt={item.alt || item.originalName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                <FileText className="w-12 h-12 mb-2" />
                <span className="text-xs uppercase font-medium">{item.format}</span>
              </div>
            )}
          </div>

          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              onClick={() => setSelectedMedia(item)}
              className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
              title="View"
            >
              <Eye className="w-4 h-4 text-gray-700" />
            </button>
            <button
              onClick={() => copyUrl(item.url, item._id)}
              className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
              title="Copy URL"
            >
              {copiedId === item._id ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-gray-700" />
              )}
            </button>
            {activeTab === 'trash' ? (
              <button
                onClick={() => handleRestore(item)}
                className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                title="Restore"
              >
                <RotateCcw className="w-4 h-4 text-blue-600" />
              </button>
            ) : null}
            <button
              onClick={() => {
                setMediaToDelete(item);
                setIsPermanentDelete(activeTab === 'trash');
                setShowDeleteModal(true);
              }}
              className="p-2 bg-white rounded-lg hover:bg-red-50 transition-colors"
              title={activeTab === 'trash' ? 'Delete Permanently' : 'Move to Trash'}
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          </div>

          {/* Info */}
          <div className="p-3">
            <p className="text-sm font-medium text-gray-900 truncate" title={item.originalName}>
              {item.originalName}
            </p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-gray-500">{formatFileSize(item.size)}</span>
              <span className="text-xs text-gray-400">{formatDate(item.createdAt)}</span>
            </div>
          </div>
        </motion.div>
      );
    }

    // List view
    return (
      <motion.div
        key={item._id}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:shadow-md hover:border-[#029bba]/30 transition-all duration-200"
      >
        {/* Thumbnail */}
        <div
          className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden cursor-pointer"
          onClick={() => setSelectedMedia(item)}
        >
          {isImage ? (
            <img
              src={item.url}
              alt={item.alt || item.originalName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <FileText className="w-8 h-8" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{item.originalName}</p>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5" />
              {formatFileSize(item.size)}
            </span>
            {item.width && item.height && (
              <span>{item.width} � {item.height}</span>
            )}
            <span className="flex items-center gap-1">
              <FolderOpen className="w-3.5 h-3.5" />
              {item.folder}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatDate(item.createdAt)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => copyUrl(item.url, item._id)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Copy URL"
          >
            {copiedId === item._id ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4 text-gray-500" />
            )}
          </button>
          {activeTab === 'trash' ? (
            <button
              onClick={() => handleRestore(item)}
              className="p-2 rounded-lg hover:bg-blue-50 transition-colors"
              title="Restore"
            >
              <RotateCcw className="w-4 h-4 text-blue-600" />
            </button>
          ) : null}
          <button
            onClick={() => {
              setMediaToDelete(item);
              setIsPermanentDelete(activeTab === 'trash');
              setShowDeleteModal(true);
            }}
            className="p-2 rounded-lg hover:bg-red-50 transition-colors"
            title={activeTab === 'trash' ? 'Delete Permanently' : 'Move to Trash'}
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Media Library</h1>
            <p className="text-gray-600 mt-1">
              Manage your images, documents, and other media files
            </p>
          </div>
          <button
            onClick={() => document.getElementById('file-upload')?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#029bba] hover:bg-[#027a94] text-white rounded-xl font-medium transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload Files
          </button>
        </div>

        {/* Upload Area */}
        <div
          {...getRootProps()}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 cursor-pointer ${
            isDragActive
              ? 'border-[#029bba] bg-[#029bba]/5'
              : 'border-gray-300 hover:border-[#029bba] hover:bg-gray-50'
          }`}
        >
          <input {...getInputProps()} id="file-upload" />
          <div className="flex flex-col items-center">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${
                isDragActive ? 'bg-[#029bba]/10' : 'bg-gray-100'
              }`}
            >
              <Upload
                className={`w-8 h-8 ${isDragActive ? 'text-[#029bba]' : 'text-gray-400'}`}
              />
            </div>
            <p className="text-lg font-medium text-gray-900 mb-1">
              {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-sm text-gray-500">
              or click to browse � Max 10MB per file
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Supports: JPG, PNG, WebP, GIF, SVG, PDF, DOC, DOCX
            </p>
          </div>

          {/* Upload Progress */}
          {Object.keys(uploadProgress).length > 0 && (
            <div className="absolute inset-0 bg-white/90 rounded-2xl flex items-center justify-center">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 text-[#029bba] animate-spin mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Uploading...</p>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-[#029bba] text-white shadow-lg shadow-[#029bba]/25'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search media..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all"
            />
          </div>

          {/* Folder Filter */}
          <select
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all"
          >
            {folders.map((folder) => (
              <option key={folder.value} value={folder.value}>
                {folder.label}
              </option>
            ))}
          </select>

          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white shadow-sm text-[#029bba]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-white shadow-sm text-[#029bba]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Media Grid/List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-[#029bba] animate-spin" />
          </div>
        ) : media.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
            <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No media found</h3>
            <p className="text-gray-500">
              {activeTab === 'trash'
                ? 'Trash is empty'
                : 'Upload some files to get started'}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={viewMode}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4'
                  : 'space-y-3'
              }
            >
              {media.map(renderMediaItem)}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        )}

        {/* Media Preview Modal */}
        <AnimatePresence>
          {selectedMedia && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedMedia(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {selectedMedia.originalName}
                  </h3>
                  <button
                    onClick={() => setSelectedMedia(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="flex flex-col lg:flex-row">
                  {/* Preview */}
                  <div className="flex-1 bg-gray-100 flex items-center justify-center p-4 min-h-[300px]">
                    {selectedMedia.resourceType === 'image' ? (
                      <img
                        src={selectedMedia.url}
                        alt={selectedMedia.alt || selectedMedia.originalName}
                        className="max-w-full max-h-[60vh] object-contain rounded-lg"
                      />
                    ) : (
                      <div className="text-center text-gray-400">
                        <FileText className="w-24 h-24 mx-auto mb-4" />
                        <p className="text-lg font-medium uppercase">{selectedMedia.format}</p>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="w-full lg:w-80 p-4 border-t lg:border-t-0 lg:border-l border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-4">File Details</h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="text-gray-500">File Name:</span>
                        <p className="text-gray-900 break-all">{selectedMedia.originalName}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Type:</span>
                        <p className="text-gray-900">{selectedMedia.mimeType}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Size:</span>
                        <p className="text-gray-900">{formatFileSize(selectedMedia.size)}</p>
                      </div>
                      {selectedMedia.width && selectedMedia.height && (
                        <div>
                          <span className="text-gray-500">Dimensions:</span>
                          <p className="text-gray-900">
                            {selectedMedia.width} � {selectedMedia.height} px
                          </p>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">Folder:</span>
                        <p className="text-gray-900 capitalize">{selectedMedia.folder}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Uploaded:</span>
                        <p className="text-gray-900">{formatDate(selectedMedia.createdAt)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">URL:</span>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="text"
                            value={selectedMedia.url}
                            readOnly
                            className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-xs text-gray-600 truncate"
                          />
                          <button
                            onClick={() => copyUrl(selectedMedia.url, selectedMedia._id)}
                            className="p-2 bg-[#029bba] hover:bg-[#027a94] text-white rounded-lg transition-colors"
                          >
                            {copiedId === selectedMedia._id ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 flex gap-2">
                      <a
                        href={selectedMedia.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </a>
                      <button
                        onClick={() => {
                          setMediaToDelete(selectedMedia);
                          setIsPermanentDelete(false);
                          setShowDeleteModal(true);
                          setSelectedMedia(null);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-medium transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteModal && mediaToDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setShowDeleteModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl max-w-md w-full p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {isPermanentDelete ? 'Delete Permanently?' : 'Move to Trash?'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {isPermanentDelete
                        ? 'This action cannot be undone.'
                        : 'You can restore it later from trash.'}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl mb-6">
                  <p className="text-sm text-gray-700 truncate">{mediaToDelete.originalName}</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
                  >
                    {isPermanentDelete ? 'Delete Forever' : 'Move to Trash'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}
