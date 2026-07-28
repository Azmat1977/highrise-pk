// pages/developer/projects/[id]/documents.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import Link from 'next/link';
import {
  ArrowLeft,
  Upload,
  Trash2,
  Edit3,
  Loader2,
  FileText,
  Plus,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  Download,
  Eye,
  ChevronDown,
  File,
  FileSpreadsheet,
  Image as ImageIcon,
  Shield,
  Lock,
  Globe,
  Users,
} from 'lucide-react';
import DeveloperLayout from '@/components/developer/DeveloperLayout';

// ════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════

interface ProjectDocument {
  url:          string;
  publicId:     string;
  title:        string;
  description?: string;
  category:     string;
  visibility:   string;
  fileType:     string;
  fileSize?:    number;
  order:        number;
  uploadedAt?:  string;
}

const CATEGORY_OPTIONS = [
  { value: 'noc',                     label: 'NOC' },
  { value: 'approval_letter',        label: 'Approval Letter' },
  { value: 'building_plan',          label: 'Building Plan' },
  { value: 'layout_plan',            label: 'Layout Plan' },
  { value: 'development_agreement',  label: 'Development Agreement' },
  { value: 'allotment_letter',       label: 'Allotment Letter' },
  { value: 'rera_registration',      label: 'RERA Registration' },
  { value: 'environmental_clearance', label: 'Environmental Clearance' },
  { value: 'brochure',               label: 'Brochure' },
  { value: 'payment_plan',           label: 'Payment Plan' },
  { value: 'floor_plan',             label: 'Floor Plan' },
  { value: 'specification',          label: 'Specification' },
  { value: 'legal',                  label: 'Legal' },
  { value: 'financial',              label: 'Financial' },
  { value: 'other',                  label: 'Other' },
];

const VISIBILITY_OPTIONS = [
  { value: 'public',     label: 'Public',          icon: <Globe className="w-3.5 h-3.5" />, description: 'Anyone can view' },
  { value: 'registered', label: 'Registered Users', icon: <Users className="w-3.5 h-3.5" />, description: 'Logged-in users only' },
  { value: 'admin_only', label: 'Admin Only',       icon: <Lock className="w-3.5 h-3.5" />,  description: 'Admin + you only' },
];

const MAX_DOCUMENTS = 20;

// ════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function getFileIcon(fileType: string): React.ReactElement {
  const icons: Record<string, React.ReactElement> = {
    pdf:   <FileText className="w-5 h-5 text-red-500" />,
    doc:   <FileText className="w-5 h-5 text-blue-500" />,
    docx:  <FileText className="w-5 h-5 text-blue-500" />,
    xls:   <FileSpreadsheet className="w-5 h-5 text-green-600" />,
    xlsx:  <FileSpreadsheet className="w-5 h-5 text-green-600" />,
    jpeg:  <ImageIcon className="w-5 h-5 text-purple-500" />,
    png:   <ImageIcon className="w-5 h-5 text-purple-500" />,
    webp:  <ImageIcon className="w-5 h-5 text-purple-500" />,
  };
  return icons[fileType] ?? <File className="w-5 h-5 text-gray-400" />;
}

function getVisibilityIcon(visibility: string): React.ReactElement {
  if (visibility === 'admin_only') return <Lock className="w-3 h-3 text-red-500" />;
  if (visibility === 'registered') return <Users className="w-3 h-3 text-amber-500" />;
  return <Globe className="w-3 h-3 text-emerald-500" />;
}

function getVisibilityLabel(visibility: string): string {
  const opt = VISIBILITY_OPTIONS.find((v) => v.value === visibility);
  return opt?.label ?? visibility;
}

function getCategoryLabel(category: string): string {
  const opt = CATEGORY_OPTIONS.find((c) => c.value === category);
  return opt?.label ?? category;
}

// ════════════════════════════════════════════════════
// BANNER COMPONENT
// ════════════════════════════════════════════════════

function Banner({
  type,
  message,
  onDismiss,
}: {
  type: 'success' | 'error';
  message: string;
  onDismiss: () => void;
}): React.ReactElement {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50
                     px-5 py-3 rounded-xl shadow-xl flex items-center gap-3
                     ${type === 'success'
                       ? 'bg-emerald-600 text-white'
                       : 'bg-red-600 text-white'
                     }`}>
      {type === 'success'
        ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
        : <AlertCircle className="w-5 h-5 flex-shrink-0" />
      }
      <p className="text-sm font-semibold">{message}</p>
      <button onClick={onDismiss} className="p-1 hover:bg-white/20 rounded-full">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════
// UPLOAD MODAL
// ════════════════════════════════════════════════════

function UploadDocumentModal({
  onUpload,
  onClose,
  uploading,
}: {
  onUpload:  (files: FileList, title: string, category: string, visibility: string) => Promise<void>;
  onClose:   () => void;
  uploading: boolean;
}): React.ReactElement {
  const [title, setTitle]           = useState('');
  const [category, setCategory]     = useState('other');
  const [visibility, setVisibility] = useState('public');
  const [files, setFiles]           = useState<FileList | null>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleSubmit = async () => {
    if (!files || files.length === 0) return;
    await onUpload(files, title, category, visibility);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center
                 bg-black/50 backdrop-blur-sm px-4 overflow-y-auto py-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-5 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg text-[#004063]">Upload Document</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* File input */}
        <label className="block mb-4">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            File <span className="text-red-500">*</span>
          </span>
          <div className="mt-1 border-2 border-dashed border-gray-200 rounded-xl p-6
                          text-center hover:border-[#029bba] hover:bg-[#029bba]/5
                          cursor-pointer transition-all">
            <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 font-medium">
              {files && files.length > 0
                ? `${files.length} file(s) selected`
                : 'Click to select files'
              }
            </p>
            <p className="text-[10px] text-gray-400 mt-1">
              PDF, DOC, DOCX, XLS, XLSX, JPEG, PNG, WebP — Max 25MB
            </p>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpeg,.jpg,.png,.webp"
              multiple
              onChange={(e) => setFiles(e.target.files)}
              className="hidden"
            />
          </div>
        </label>

        {/* Title */}
        <label className="block mb-4">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            Title
          </span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="e.g., NOC Certificate"
            className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200
                       text-sm focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]
                       outline-none transition-colors"
          />
        </label>

        {/* Category */}
        <label className="block mb-4">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            Category
          </span>
          <div className="relative mt-1">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200
                         text-sm appearance-none bg-white
                         focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]
                         outline-none transition-colors"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2
                                    w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </label>

        {/* Visibility */}
        <div className="mb-5">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
            Visibility
          </span>
          <div className="space-y-2">
            {VISIBILITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setVisibility(opt.value)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2
                            transition-all text-left
                            ${visibility === opt.value
                              ? 'border-[#029bba] bg-[#029bba]/5'
                              : 'border-gray-100 hover:border-gray-200'
                            }`}
              >
                <div className={`p-1.5 rounded-lg
                                 ${visibility === opt.value
                                   ? 'bg-[#029bba] text-white'
                                   : 'bg-gray-100 text-gray-400'
                                 }`}>
                  {opt.icon}
                </div>
                <div>
                  <p className={`text-sm font-bold
                                 ${visibility === opt.value ? 'text-[#029bba]' : 'text-gray-700'}`}>
                    {opt.label}
                  </p>
                  <p className="text-[10px] text-gray-400">{opt.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200
                       text-sm font-semibold text-gray-700 hover:bg-gray-50
                       transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploading || !files || files.length === 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                       bg-gradient-to-r from-[#029bba] to-[#027a94]
                       text-sm font-semibold text-white
                       hover:from-[#02a8c9] hover:to-[#028aaa]
                       disabled:opacity-50 transition-all"
          >
            {uploading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Upload className="w-4 h-4" />
            }
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// EDIT DOCUMENT MODAL
// ════════════════════════════════════════════════════

function EditDocumentModal({
  doc,
  onSave,
  onClose,
}: {
  doc:     ProjectDocument;
  onSave:  (publicId: string, title: string, description: string, category: string, visibility: string) => Promise<void>;
  onClose: () => void;
}): React.ReactElement {
  const [title, setTitle]           = useState(doc.title);
  const [description, setDescription] = useState(doc.description ?? '');
  const [category, setCategory]     = useState(doc.category);
  const [visibility, setVisibility] = useState(doc.visibility);
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await onSave(doc.publicId, title, description, category, visibility);
    setSaving(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center
                 bg-black/50 backdrop-blur-sm px-4 overflow-y-auto py-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-5 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg text-[#004063]">Edit Document</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current file info */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 mb-4">
          {getFileIcon(doc.fileType)}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-700 truncate">{doc.title}</p>
            <p className="text-[10px] text-gray-400">
              {doc.fileType.toUpperCase()} {doc.fileSize ? `· ${formatFileSize(doc.fileSize)}` : ''}
            </p>
          </div>
        </div>

        {/* Title */}
        <label className="block mb-4">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200
                       text-sm focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]
                       outline-none transition-colors"
          />
        </label>

        {/* Description */}
        <label className="block mb-4">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Optional description..."
            className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200
                       text-sm resize-none focus:border-[#029bba] focus:ring-1
                       focus:ring-[#029bba] outline-none transition-colors"
          />
          <p className="text-[10px] text-gray-400 mt-1 text-right">{description.length}/500</p>
        </label>

        {/* Category */}
        <label className="block mb-4">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Category</span>
          <div className="relative mt-1">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200
                         text-sm appearance-none bg-white
                         focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]
                         outline-none transition-colors"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2
                                    w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </label>

        {/* Visibility */}
        <div className="mb-5">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
            Visibility
          </span>
          <div className="flex gap-2">
            {VISIBILITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setVisibility(opt.value)}
                className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border-2
                            transition-all
                            ${visibility === opt.value
                              ? 'border-[#029bba] bg-[#029bba]/5'
                              : 'border-gray-100 hover:border-gray-200'
                            }`}
              >
                <span className={visibility === opt.value ? 'text-[#029bba]' : 'text-gray-400'}>
                  {opt.icon}
                </span>
                <span className={`text-[10px] font-bold
                                  ${visibility === opt.value ? 'text-[#029bba]' : 'text-gray-500'}`}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200
                       text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                       bg-gradient-to-r from-[#029bba] to-[#027a94]
                       text-sm font-semibold text-white
                       hover:from-[#02a8c9] hover:to-[#028aaa]
                       disabled:opacity-50 transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// DELETE CONFIRMATION MODAL
// ════════════════════════════════════════════════════

function DeleteDocModal({
  doc,
  onConfirm,
  onClose,
}: {
  doc:       ProjectDocument;
  onConfirm: () => Promise<void>;
  onClose:   () => void;
}): React.ReactElement {
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleDelete = async () => {
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center
                 bg-black/50 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-100 mb-4">
          {getFileIcon(doc.fileType)}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-700 truncate">{doc.title}</p>
            <p className="text-[10px] text-gray-400">{doc.fileType.toUpperCase()}</p>
          </div>
        </div>

        <h3 className="font-bold text-base text-gray-800 mb-1">
          Delete this document?
        </h3>
        <p className="text-sm text-gray-500 mb-5">
          Yeh document permanently delete ho jaye ga. Is action ko undo nahi kiya ja sakta.
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200
                       text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                       bg-red-500 text-white text-sm font-semibold
                       hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════

export default function ProjectDocumentsPage(): React.ReactElement {
  const router = useRouter();
  const { id } = router.query;

  // State
  const [documents, setDocuments]       = useState<ProjectDocument[]>([]);
  const [projectName, setProjectName]   = useState('');
  const [loading, setLoading]           = useState(true);
  const [uploading, setUploading]       = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editDoc, setEditDoc]                 = useState<ProjectDocument | null>(null);
  const [deleteDoc, setDeleteDoc]             = useState<ProjectDocument | null>(null);

  // Banner
  const [banner, setBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // ── Fetch documents ──
  const fetchDocuments = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/projects/${id}/documents`, { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.data) {
        setDocuments(data.data.documents ?? []);
      }
    } catch {
      setBanner({ type: 'error', message: 'Documents load nahi ho sake. Dobara try karein.' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  // ── Fetch project name ──
  useEffect(() => {
    if (!id) return;
    fetch(`/api/projects/${id}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setProjectName(
            (data.data?.project?.projectName ?? data.project?.projectName) ?? 'Project'
          );
        }
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // ── Upload document ──
  const handleUpload = useCallback(async (
    files:      FileList,
    title:      string,
    category:   string,
    visibility: string
  ) => {
    if (!id) return;
    setUploading(true);

    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('documents', file);
      });
      formData.append('title', title);
      formData.append('category', category);
      formData.append('visibility', visibility);

      const res  = await fetch(`/api/projects/${id}/documents`, {
        method:      'POST',
        credentials: 'include',
        body:        formData,
      });
      const data = await res.json();

      if (data.success) {
        setBanner({ type: 'success', message: data.message ?? 'Document uploaded successfully' });
        setShowUploadModal(false);
        fetchDocuments();
      } else {
        setBanner({ type: 'error', message: data.message ?? 'Upload failed' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Upload failed. Please try again.' });
    } finally {
      setUploading(false);
    }
  }, [id, fetchDocuments]);

  // ── Update document ──
  const handleUpdate = useCallback(async (
    publicId:    string,
    title:       string,
    description: string,
    category:    string,
    visibility:  string
  ) => {
    if (!id) return;

    try {
      const res = await fetch(`/api/projects/${id}/documents`, {
        method:      'PATCH',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ publicId, title, description, category, visibility }),
      });
      const data = await res.json();

      if (data.success) {
        setDocuments((prev) =>
          prev.map((doc) =>
            doc.publicId === publicId
              ? { ...doc, title, description, category, visibility }
              : doc
          )
        );
        setBanner({ type: 'success', message: 'Document updated' });
      } else {
        setBanner({ type: 'error', message: data.message ?? 'Update failed' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Update failed. Please try again.' });
    }
  }, [id]);

  // ── Delete document ──
  const handleDelete = useCallback(async () => {
    if (!id || !deleteDoc) return;

    try {
      const res = await fetch(`/api/projects/${id}/documents`, {
        method:      'DELETE',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ publicId: deleteDoc.publicId }),
      });
      const data = await res.json();

      if (data.success) {
        setDocuments((prev) => prev.filter((d) => d.publicId !== deleteDoc.publicId));
        setBanner({ type: 'success', message: 'Document deleted' });
      } else {
        setBanner({ type: 'error', message: data.message ?? 'Delete failed' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Delete failed. Please try again.' });
    }
  }, [id, deleteDoc]);

  // ── Filter ──
  const filteredDocs = filterCategory === 'all'
    ? documents
    : documents.filter((d) => d.category === filterCategory);

  // ── Available categories ──
  const availableCategories = React.useMemo(() => {
    const cats = new Set(documents.map((d) => d.category).filter(Boolean));
    return CATEGORY_OPTIONS.filter((opt) => cats.has(opt.value));
  }, [documents]);

  // ── Group by category ──
  const groupedDocs = React.useMemo(() => {
    if (filterCategory !== 'all') return null;
    const groups: Record<string, ProjectDocument[]> = {};
    for (const doc of documents) {
      const cat = doc.category ?? 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(doc);
    }
    return groups;
  }, [documents, filterCategory]);

  return (
    <DeveloperLayout>
      <Head>
        <title>Documents — {projectName} | Highrise.pk Developer</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {/* Banner */}
      {banner && (
        <Banner
          type={banner.type}
          message={banner.message}
          onDismiss={() => setBanner(null)}
        />
      )}

      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/developer/projects/${id}/edit`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500
                     hover:text-[#029bba] transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Project
        </Link>

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#004063]">
              Project Documents
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {projectName} — {documents.length}/{MAX_DOCUMENTS} documents
            </p>
          </div>

          <button
            onClick={() => setShowUploadModal(true)}
            disabled={documents.length >= MAX_DOCUMENTS}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                       bg-gradient-to-r from-[#029bba] to-[#027a94]
                       text-white text-sm font-semibold
                       hover:from-[#02a8c9] hover:to-[#028aaa]
                       hover:shadow-lg disabled:opacity-50
                       transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            Upload Document
          </button>
        </div>
      </div>

      {/* Category filter */}
      {availableCategories.length > 0 && (
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap
                        transition-all
                        ${filterCategory === 'all'
                          ? 'bg-[#029bba] text-white'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
          >
            All ({documents.length})
          </button>
          {availableCategories.map((cat) => {
            const count = documents.filter((d) => d.category === cat.value).length;
            return (
              <button
                key={cat.value}
                onClick={() => setFilterCategory(cat.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap
                            transition-all
                            ${filterCategory === cat.value
                              ? 'bg-[#029bba] text-white'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-[#029bba] animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && documents.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-700 mb-1">
            Koi Document Nahi Hai
          </h3>
          <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
            Project ke documents upload karein — NOC, approval letter, building plan, brochure, aur doosre important documents.
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                       bg-gradient-to-r from-[#029bba] to-[#027a94]
                       text-white text-sm font-semibold
                       hover:from-[#02a8c9] hover:to-[#028aaa]
                       hover:shadow-lg transition-all"
          >
            <Upload className="w-4 h-4" />
            Upload First Document
          </button>
        </div>
      )}

      {/* Document list */}
      {!loading && filteredDocs.length > 0 && (
        <div className="space-y-3">
          {filteredDocs.map((doc) => (
            <div
              key={doc.publicId}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4
                         hover:border-gray-200 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                {/* File icon */}
                <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100
                                flex items-center justify-center flex-shrink-0">
                  {getFileIcon(doc.fileType)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-sm text-gray-900 truncate">
                      {doc.title}
                    </h4>
                    {getVisibilityIcon(doc.visibility)}
                  </div>

                  {doc.description && (
                    <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                      {doc.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Category */}
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600
                                     text-[10px] font-semibold">
                      {getCategoryLabel(doc.category)}
                    </span>

                    {/* File type */}
                    <span className="text-[10px] text-gray-400 font-medium uppercase">
                      {doc.fileType}
                    </span>

                    {/* File size */}
                    {doc.fileSize && (
                      <span className="text-[10px] text-gray-400">
                        {formatFileSize(doc.fileSize)}
                      </span>
                    )}

                    {/* Visibility */}
                    <span className="px-2 py-0.5 rounded-full bg-gray-50 text-gray-400
                                     text-[10px] font-medium flex items-center gap-0.5">
                      {getVisibilityIcon(doc.visibility)}
                      {getVisibilityLabel(doc.visibility)}
                    </span>

                    {/* Upload date */}
                    {doc.uploadedAt && (
                      <span className="text-[10px] text-gray-400">
                        {new Date(doc.uploadedAt).toLocaleDateString('en-PK', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* View/Download */}
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400
                               hover:text-[#029bba] transition-colors"
                    title="View/Download"
                  >
                    <Download className="w-4 h-4" />
                  </a>

                  {/* Edit */}
                  <button
                    onClick={() => setEditDoc(doc)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400
                               hover:text-[#029bba] transition-colors"
                    title="Edit"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => setDeleteDoc(doc)}
                    className="p-2 rounded-lg hover:bg-red-50 text-gray-400
                               hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload modal */}
      {showUploadModal && (
        <UploadDocumentModal
          onUpload={handleUpload}
          onClose={() => setShowUploadModal(false)}
          uploading={uploading}
        />
      )}

      {/* Edit modal */}
      {editDoc && (
        <EditDocumentModal
          doc={editDoc}
          onSave={handleUpdate}
          onClose={() => setEditDoc(null)}
        />
      )}

      {/* Delete modal */}
      {deleteDoc && (
        <DeleteDocModal
          doc={deleteDoc}
          onConfirm={handleDelete}
          onClose={() => setDeleteDoc(null)}
        />
      )}
    </DeveloperLayout>
  );
}