// pages/admin/campaign-templates/index.tsx
// 🏗️ CAMPAIGN TEMPLATES MANAGEMENT PAGE — HIGHRISE.PK
// ═══════════════════════════════════════════════════════════════
// PURPOSE:
//   Admin page to manage all saved campaign templates.
//   - View all templates in a card grid
//   - Search + category filter + sort
//   - Preview template content
//   - Edit template details
//   - Delete templates
//   - Usage stats per template
//
// DESIGN:
//   ✅ useSession() + useRouter() auth guard
//   ✅ AdminLayout wrapper
//   ✅ No Card imports — native Tailwind divs
//   ✅ No react-hot-toast — inline Banner
//   ✅ Mobile responsive grid
//   ✅ Empty states with CTA
//   ✅ 2-step delete confirmation
//   ✅ Tailwind CSS only
//   ✅ Lucide React icons only
// ═══════════════════════════════════════════════════════════════

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useSession }  from 'next-auth/react';
import { useRouter }   from 'next/router';
import Head            from 'next/head';
import Link            from 'next/link';
import AdminLayout     from '@/components/admin/AdminLayout';
import DOMPurify       from 'isomorphic-dompurify';
import {
  Sparkles,
  Newspaper,
  Bell,
  TrendingUp,
  Megaphone,
  FileText,
  Search,
  Filter,
  Trash2,
  Eye,
  Edit3,
  RefreshCw,
  X,
  CheckCircle,
  AlertCircle,
  Info,
  Tag,
  BarChart3,
  Clock,
  Plus,
  BookTemplate,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { TemplateCategory } from '@/models/CampaignTemplate';

// ═══════════════════════════════════════════════════════════════
// 🔐 TYPES
// ═══════════════════════════════════════════════════════════════

interface TemplateItem {
  _id:         string;
  name:        string;
  description: string;
  category:    TemplateCategory;
  subject:     string;
  previewText: string;
  tags:        string[];
  usageCount:  number;
  lastUsedAt:  string | null;
  createdAt:   string;
  updatedAt:   string;
  createdBy?:  { name: string; email: string } | null;
}

interface Pagination {
  page:       number;
  limit:      number;
  total:      number;
  totalPages: number;
}

interface CategoryCounts {
  [key: string]: number;
}

type SortOption = 'newest' | 'oldest' | 'most_used' | 'name_asc';

// Edit form state
interface EditForm {
  name:        string;
  description: string;
  category:    TemplateCategory;
  subject:     string;
  previewText: string;
  tags:        string;
}

// ═══════════════════════════════════════════════════════════════
// 🔐 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const PAGE_LIMIT = 20;

const CATEGORY_META: Record<string, {
  label:    string;
  icon:     React.ReactNode;
  gradient: string;
  color:    string;
}> = {
  welcome: {
    label:    'Welcome',
    icon:     <Sparkles   className="w-4 h-4" />,
    gradient: 'from-emerald-500 to-teal-500',
    color:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  newsletter: {
    label:    'Newsletter',
    icon:     <Newspaper  className="w-4 h-4" />,
    gradient: 'from-blue-500 to-cyan-500',
    color:    'bg-blue-50 text-blue-700 border-blue-200',
  },
  property_alert: {
    label:    'Property Alert',
    icon:     <Bell       className="w-4 h-4" />,
    gradient: 'from-amber-500 to-orange-500',
    color:    'bg-amber-50 text-amber-700 border-amber-200',
  },
  market_insights: {
    label:    'Market Insights',
    icon:     <TrendingUp className="w-4 h-4" />,
    gradient: 'from-purple-500 to-pink-500',
    color:    'bg-purple-50 text-purple-700 border-purple-200',
  },
  promotion: {
    label:    'Promotion',
    icon:     <Megaphone  className="w-4 h-4" />,
    gradient: 'from-rose-500 to-red-500',
    color:    'bg-rose-50 text-rose-700 border-rose-200',
  },
  announcement: {
    label:    'Announcement',
    icon:     <Megaphone  className="w-4 h-4" />,
    gradient: 'from-[#029bba] to-[#004063]',
    color:    'bg-[#029bba]/10 text-[#029bba] border-[#029bba]/20',
  },
  custom: {
    label:    'Custom',
    icon:     <FileText   className="w-4 h-4" />,
    gradient: 'from-gray-500 to-slate-600',
    color:    'bg-gray-100 text-gray-600 border-gray-200',
  },
};

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest',    label: 'Newest First'  },
  { value: 'oldest',    label: 'Oldest First'  },
  { value: 'most_used', label: 'Most Used'     },
  { value: 'name_asc',  label: 'Name A → Z'   },
];

const ALLOWED_CATEGORIES: TemplateCategory[] = [
  'welcome', 'newsletter', 'property_alert',
  'market_insights', 'promotion', 'announcement', 'custom',
];

// ═══════════════════════════════════════════════════════════════
// 🛠️ HELPERS
// ═══════════════════════════════════════════════════════════════

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-PK', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return '—'; }
}

function getCategoryMeta(category: string) {
  return CATEGORY_META[category] || CATEGORY_META.custom;
}

function parseTags(input: string): string[] {
  return input
    .split(/[,،\n]/)
    .map((t) => t.trim().slice(0, 50))
    .filter((t) => t.length > 0)
    .slice(0, 10);
}

// ═══════════════════════════════════════════════════════════════
// 🎨 SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

// ─── Banner ──────────────────────────────────────────────────

interface BannerProps {
  type:      'success' | 'error' | 'info';
  message:   string;
  onDismiss: () => void;
}

function Banner({ type, message, onDismiss }: BannerProps) {
  const styles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error:   'bg-red-50     border-red-200     text-red-800',
    info:    'bg-blue-50    border-blue-200    text-blue-800',
  };
  const icons = {
    success: <CheckCircle className="w-4 h-4 shrink-0" />,
    error:   <AlertCircle className="w-4 h-4 shrink-0" />,
    info:    <Info        className="w-4 h-4 shrink-0" />,
  };
  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl border shadow-xl text-sm font-semibold max-w-md w-full ${styles[type]}`}>
      {icons[type]}
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="shrink-0 opacity-60 hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Confirm Delete Modal ─────────────────────────────────────

interface ConfirmDeleteProps {
  templateName: string;
  onConfirm:    () => void;
  onCancel:     () => void;
  loading:      boolean;
}

function ConfirmDeleteModal({
  templateName, onConfirm, onCancel, loading,
}: ConfirmDeleteProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="text-lg font-black text-[#004063] text-center mb-2">
          Delete Template?
        </h3>
        <p className="text-sm text-gray-600 text-center mb-1">
          Are you sure you want to delete:
        </p>
        <p className="text-sm font-bold text-gray-800 text-center mb-6 truncate px-4">
          &ldquo;{templateName}&rdquo;
        </p>
        <p className="text-xs text-gray-400 text-center mb-6">
          This template will be removed from your library. Campaigns that already used it will not be affected.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading
              ? <><RefreshCw className="w-4 h-4 animate-spin" />Deleting...</>
              : <><Trash2 className="w-4 h-4" />Delete</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Preview Modal ────────────────────────────────────────────

interface PreviewModalProps {
  template: TemplateItem;
  content:  string;
  onClose:  () => void;
}

function PreviewModal({ template, content, onClose }: PreviewModalProps) {
  const meta = getCategoryMeta(template.category);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handler);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-white shrink-0`}>
              {meta.icon}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-[#004063] truncate">
                {template.name}
              </h3>
              <p className="text-xs text-gray-400 truncate">
                {template.subject || 'No subject set'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content preview */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
            {/* Email header simulation */}
            <div className="bg-gradient-to-r from-[#029bba] to-[#004063] px-6 py-4 text-center">
              <p className="text-white font-black text-lg">🏠 Highrise.pk</p>
              <p className="text-white/80 text-xs mt-1">Pakistan&apos;s Premier Real Estate Platform</p>
            </div>
            {/* HTML content */}
            <div
              className="p-6 prose prose-sm max-w-none bg-white"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(String(content || ''), {
                  USE_PROFILES: { html: true },
                  ADD_ATTR: [
                    'target',
                    'rel',
                    'style',
                    'class',
                    'id',
                    'role',
                    'aria-label',
                    'aria-hidden',
                    'align',
                    'valign',
                    'bgcolor',
                    'border',
                    'cellpadding',
                    'cellspacing',
                    'width',
                    'height',
                  ],
                }),
              }}
            />
            {/* Email footer simulation */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 text-center">
              <p className="text-xs text-gray-400">
                © {new Date().getFullYear()} Highrise.pk ·{' '}
                <span className="text-[#029bba]">Unsubscribe</span>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────

interface EditModalProps {
  template:  TemplateItem;
  onClose:   () => void;
  onUpdated: (updated: Partial<TemplateItem>) => void;
}

function EditModal({ template, onClose, onUpdated }: EditModalProps) {
  const [form, setForm] = useState<EditForm>({
    name:        template.name,
    description: template.description,
    category:    template.category,
    subject:     template.subject,
    previewText: template.previewText,
    tags:        template.tags.join(', '),
  });
  const [isSaving,    setIsSaving]    = useState(false);
  const [error,       setError]       = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handler);
    };
  }, [isSaving, onClose]);

  const handleSave = async () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 3) {
      errors.name = 'Name must be at least 3 characters';
    }
    if (!form.description.trim() || form.description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters';
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const res = await fetch(
        `/api/admin/campaign-templates/${template._id}`,
        {
          method:      'PUT',
          credentials: 'include',
          headers:     { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name:        form.name.trim(),
            description: form.description.trim(),
            category:    form.category,
            subject:     form.subject.trim(),
            previewText: form.previewText.trim(),
            tags:        parseTags(form.tags),
          }),
        }
      );

      const data = await res.json();

      if (data.success) {
        onUpdated({
          name:        form.name.trim(),
          description: form.description.trim(),
          category:    form.category,
          subject:     form.subject.trim(),
          previewText: form.previewText.trim(),
          tags:        parseTags(form.tags),
        });
        onClose();
      } else {
        if (res.status === 409) {
          setFieldErrors({ name: data.message || 'Name already exists' });
        } else {
          setError(data.message || 'Failed to update template');
        }
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h3 className="text-lg font-black text-[#004063]">Edit Template</h3>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value.slice(0, 100) }))}
              disabled={isSaving}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#029bba]/30 focus:border-[#029bba] transition-all disabled:opacity-50 ${fieldErrors.name ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
            />
            {fieldErrors.name && <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value.slice(0, 300) }))}
              rows={3}
              disabled={isSaving}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#029bba]/30 focus:border-[#029bba] transition-all disabled:opacity-50 ${fieldErrors.description ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
            />
            {fieldErrors.description && <p className="text-xs text-red-500 mt-1">{fieldErrors.description}</p>}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as TemplateCategory }))}
              disabled={isSaving}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#029bba]/30 focus:border-[#029bba] transition-all disabled:opacity-50"
            >
              {ALLOWED_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {getCategoryMeta(cat).label}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Default Subject</label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value.slice(0, 200) }))}
              disabled={isSaving}
              placeholder="Default subject line when template is applied"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#029bba]/30 focus:border-[#029bba] transition-all disabled:opacity-50"
            />
          </div>

          {/* Preview Text */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Default Preview Text</label>
            <input
              type="text"
              value={form.previewText}
              onChange={(e) => setForm((p) => ({ ...p, previewText: e.target.value.slice(0, 300) }))}
              disabled={isSaving}
              placeholder="Inbox preview snippet"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#029bba]/30 focus:border-[#029bba] transition-all disabled:opacity-50"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Tags</label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
              disabled={isSaving}
              placeholder="tag1, tag2, tag3"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#029bba]/30 focus:border-[#029bba] transition-all disabled:opacity-50"
            />
            <p className="text-xs text-gray-400 mt-1">Comma separated, max 10 tags</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-[#029bba] hover:bg-[#0289a5] transition-colors disabled:opacity-50"
          >
            {isSaving
              ? <><RefreshCw className="w-4 h-4 animate-spin" />Saving...</>
              : 'Save Changes'
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Template Card ────────────────────────────────────────────

interface TemplateCardProps {
  template:  TemplateItem;
  onPreview: (t: TemplateItem) => void;
  onEdit:    (t: TemplateItem) => void;
  onDelete:  (t: TemplateItem) => void;
}

function TemplateCard({ template, onPreview, onEdit, onDelete }: TemplateCardProps) {
  const meta = getCategoryMeta(template.category);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">

      {/* Gradient header */}
      <div className={`h-2 w-full bg-gradient-to-r ${meta.gradient}`} />

      <div className="p-5 flex flex-col flex-1">

        {/* Category badge + usage */}
        <div className="flex items-center justify-between mb-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${meta.color}`}>
            {meta.icon}
            {meta.label}
          </span>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <BarChart3 className="w-3.5 h-3.5" />
            {template.usageCount} use{template.usageCount !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Name */}
        <h3 className="text-base font-black text-[#004063] mb-1 line-clamp-1">
          {template.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-500 mb-3 line-clamp-2 flex-1">
          {template.description}
        </p>

        {/* Subject */}
        {template.subject && (
          <div className="bg-gray-50 rounded-lg px-3 py-2 mb-3 border border-gray-100">
            <p className="text-xs text-gray-400 mb-0.5">Subject:</p>
            <p className="text-xs font-semibold text-gray-700 truncate">
              {template.subject}
            </p>
          </div>
        )}

        {/* Tags */}
        {template.tags && template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {template.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#029bba]/10 text-[#029bba]"
              >
                <Tag className="w-2.5 h-2.5" />
                {tag}
              </span>
            ))}
            {template.tags.length > 3 && (
              <span className="text-xs text-gray-400 self-center">
                +{template.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Dates */}
        <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDate(template.createdAt)}
          </div>
          {template.lastUsedAt && (
            <div className="flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              Used {formatDate(template.lastUsedAt)}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-auto">
          <button
            onClick={() => onPreview(template)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>
          <button
            onClick={() => onEdit(template)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#029bba] border border-[#029bba]/30 hover:bg-[#029bba]/5 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit
          </button>
          <button
            onClick={() => onDelete(template)}
            className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 border border-gray-200 transition-colors"
            title="Delete template"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function CampaignTemplatesPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  // ─── Auth guard ───────────────────────────────────────────
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (!session || (session.user as any)?.role !== 'admin') {
      router.replace('/login');
    }
  }, [session, authStatus, router]);

  // ─── State ────────────────────────────────────────────────
  const [templates,      setTemplates]      = useState<TemplateItem[]>([]);
  const [pagination,     setPagination]     = useState<Pagination>({
    page: 1, limit: PAGE_LIMIT, total: 0, totalPages: 0,
  });
  const [categoryCounts, setCategoryCounts] = useState<CategoryCounts>({});
  const [isLoading,      setIsLoading]      = useState(true);

  // Filters
  const [searchInput,  setSearchInput]  = useState('');
  const [searchQuery,  setSearchQuery]  = useState('');
  const [category,     setCategory]     = useState('all');
  const [sortBy,       setSortBy]       = useState<SortOption>('newest');

  // Modals
  const [previewTemplate, setPreviewTemplate] = useState<TemplateItem | null>(null);
  const [previewContent,  setPreviewContent]  = useState('');
  const [editTemplate,    setEditTemplate]    = useState<TemplateItem | null>(null);
  const [deleteTarget,    setDeleteTarget]    = useState<TemplateItem | null>(null);
  const [isDeleting,      setIsDeleting]      = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  // Banner
  const [banner, setBanner] = useState<{
    type: 'success' | 'error' | 'info'; message: string;
  } | null>(null);

  const searchTimer  = useRef<NodeJS.Timeout | null>(null);
  const bannerTimer  = useRef<NodeJS.Timeout | null>(null);

  // ─── Show banner ──────────────────────────────────────────
  const showBanner = useCallback((
    type: 'success' | 'error' | 'info',
    message: string
  ) => {
    setBanner({ type, message });
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), 4500);
  }, []);

  // ─── Fetch templates ──────────────────────────────────────
  const fetchTemplates = useCallback(async (
    page     = 1,
    search   = searchQuery,
    cat      = category,
    sort     = sortBy,
  ) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page:     String(page),
        limit:    String(PAGE_LIMIT),
        search,
        category: cat,
        sort,
      });

      const res  = await fetch(
        `/api/admin/campaign-templates?${params}`,
        { credentials: 'include' }
      );
      const data = await res.json();

      if (data.success) {
        setTemplates(data.templates || []);
        setPagination(data.pagination || {
          page: 1, limit: PAGE_LIMIT, total: 0, totalPages: 0,
        });
        setCategoryCounts(data.categoryCounts || {});
      } else {
        showBanner('error', data.message || 'Failed to load templates');
      }
    } catch {
      showBanner('error', 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, category, sortBy, showBanner]);

  // ─── Initial load ─────────────────────────────────────────
  useEffect(() => {
    if (authStatus === 'authenticated' && (session?.user as any)?.role === 'admin') {
      fetchTemplates();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, session]);

  // ─── Search debounce ──────────────────────────────────────
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearchQuery(value);
      fetchTemplates(1, value, category, sortBy);
    }, 400);
  };

  // ─── Category change ──────────────────────────────────────
  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    fetchTemplates(1, searchQuery, cat, sortBy);
  };

  // ─── Sort change ──────────────────────────────────────────
  const handleSortChange = (sort: SortOption) => {
    setSortBy(sort);
    fetchTemplates(1, searchQuery, category, sort);
  };

  // ─── Preview (fetch full content) ─────────────────────────
  const handlePreview = async (template: TemplateItem) => {
    setPreviewTemplate(template);
    setPreviewContent('');
    setIsLoadingContent(true);

    try {
      const res  = await fetch(
        `/api/admin/campaign-templates/${template._id}`,
        { credentials: 'include' }
      );
      const data = await res.json();
      if (data.success) {
        setPreviewContent(data.template.content || '');
      } else {
        setPreviewContent('<p>Failed to load content.</p>');
      }
    } catch {
      setPreviewContent('<p>Network error loading content.</p>');
    } finally {
      setIsLoadingContent(false);
    }
  };

  // ─── Delete ───────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res  = await fetch(
        `/api/admin/campaign-templates/${deleteTarget._id}`,
        { method: 'DELETE', credentials: 'include' }
      );
      const data = await res.json();

      if (data.success) {
        showBanner('success', `"${deleteTarget.name}" deleted successfully.`);
        setDeleteTarget(null);
        fetchTemplates(pagination.page, searchQuery, category, sortBy);
      } else {
        showBanner('error', data.message || 'Failed to delete template.');
      }
    } catch {
      showBanner('error', 'Network error. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Edit updated ─────────────────────────────────────────
  const handleEditUpdated = (updated: Partial<TemplateItem>) => {
    setTemplates((prev) =>
      prev.map((t) =>
        t._id === editTemplate?._id ? { ...t, ...updated } : t
      )
    );
    showBanner('success', 'Template updated successfully.');
  };

  // ─── Auth loading ─────────────────────────────────────────
  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <RefreshCw className="w-8 h-8 text-[#029bba] animate-spin" />
      </div>
    );
  }

  if (!session || (session.user as any)?.role !== 'admin') return null;

  // ═════════════════════════════════════════════════════════
  // 🎨 RENDER
  // ═════════════════════════════════════════════════════════

  return (
    <>
      <Head>
        <title>Campaign Templates — Highrise.pk Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      {/* Banner */}
      {banner && (
        <Banner
          type={banner.type}
          message={banner.message}
          onDismiss={() => setBanner(null)}
        />
      )}

      {/* Modals */}
      {previewTemplate && (
        <PreviewModal
          template={previewTemplate}
          content={isLoadingContent ? '<p>Loading preview...</p>' : previewContent}
          onClose={() => { setPreviewTemplate(null); setPreviewContent(''); }}
        />
      )}

      {editTemplate && (
        <EditModal
          template={editTemplate}
          onClose={() => setEditTemplate(null)}
          onUpdated={handleEditUpdated}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          templateName={deleteTarget.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={isDeleting}
        />
      )}

      <AdminLayout>
        <div className="space-y-6">

          {/* ── Page Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-[#004063]">
                Campaign Templates
              </h1>
              <p className="text-gray-500 mt-1 text-sm">
                {categoryCounts.all || 0} saved template{(categoryCounts.all || 0) !== 1 ? 's' : ''} in your library
              </p>
            </div>

            <Link
              href="/admin/campaigns/new"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-[#029bba] hover:bg-[#0289a5] transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Campaign
            </Link>
          </div>

          {/* ── Info box (how to save templates) ── */}
          {(categoryCounts.all || 0) === 0 && !isLoading && (
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
              <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-bold mb-1">How to save templates</p>
                <p className="text-blue-700">
                  Open any campaign in Mission Control, write your content, then click{' '}
                  <strong>&ldquo;Save as Template&rdquo;</strong> to add it to this library.
                  Templates can then be applied to new campaigns with one click.
                </p>
              </div>
            </div>
          )}

          {/* ── Filters Bar ── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-4">

            {/* Search + Sort row */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search templates by name, description, or tag..."
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#029bba]/30 focus:border-[#029bba] transition-all"
                />
                {searchInput && (
                  <button
                    onClick={() => { setSearchInput(''); handleSearchChange(''); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2 shrink-0">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value as SortOption)}
                  className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#029bba]/30 focus:border-[#029bba] transition-all"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category filter tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => handleCategoryChange('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  category === 'all'
                    ? 'bg-[#029bba] text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                All ({categoryCounts.all || 0})
              </button>
              {ALLOWED_CATEGORIES.map((cat) => {
                const meta  = getCategoryMeta(cat);
                const count = categoryCounts[cat] || 0;
                if (count === 0 && category !== cat) return null;
                return (
                  <button
                    key={cat}
                    onClick={() => handleCategoryChange(cat)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      category === cat
                        ? 'bg-[#029bba] text-white'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {meta.icon}
                    {meta.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Template Grid ── */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 text-[#029bba] animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-400 font-semibold">Loading templates...</p>
              </div>
            </div>

          ) : templates.length === 0 ? (

            /* Empty state */
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-200">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <BookTemplate className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-black text-gray-700 mb-2">
                {searchQuery
                  ? 'No templates match your search'
                  : category !== 'all'
                  ? `No ${getCategoryMeta(category).label} templates yet`
                  : 'No templates saved yet'
                }
              </h3>
              <p className="text-sm text-gray-400 text-center max-w-sm mb-6">
                {searchQuery
                  ? `Try a different search term or clear the filter.`
                  : 'Create a campaign, write your content, then use "Save as Template" to build your library.'
                }
              </p>
              <Link
                href="/admin/campaigns/new"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#029bba] hover:bg-[#0289a5] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create New Campaign
              </Link>
            </div>

          ) : (

            /* Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {templates.map((template) => (
                <TemplateCard
                  key={template._id}
                  template={template}
                  onPreview={handlePreview}
                  onEdit={setEditTemplate}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          )}

          {/* ── Pagination ── */}
          {!isLoading && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 px-6 py-4">
              <p className="text-sm text-gray-500">
                Showing{' '}
                <span className="font-bold text-gray-700">
                  {((pagination.page - 1) * PAGE_LIMIT) + 1}–{Math.min(pagination.page * PAGE_LIMIT, pagination.total)}
                </span>
                {' '}of{' '}
                <span className="font-bold text-gray-700">{pagination.total}</span> templates
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchTemplates(pagination.page - 1)}
                  disabled={pagination.page <= 1 || isLoading}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </button>

                <span className="text-sm text-gray-500 font-semibold px-2">
                  {pagination.page} / {pagination.totalPages}
                </span>

                <button
                  onClick={() => fetchTemplates(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages || isLoading}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      </AdminLayout>
    </>
  );
}