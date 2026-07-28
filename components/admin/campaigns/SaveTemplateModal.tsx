// components/admin/campaigns/SaveTemplateModal.tsx
// 🏗️ SAVE AS TEMPLATE MODAL — HIGHRISE.PK
// ═══════════════════════════════════════════════════════════════
// PURPOSE:
//   Modal that lets admin save current campaign content
//   as a reusable template for future campaigns.
//
// FEATURES:
//   ✅ Name + description + category + tags input
//   ✅ Subject + previewText pre-filled from campaign
//   ✅ Category picker with visual icons
//   ✅ Tag input (comma separated, max 10)
//   ✅ Content size preview
//   ✅ Duplicate name warning
//   ✅ Loading state during save
//   ✅ Inline validation (no external libs)
//   ✅ Body scroll lock
//   ✅ Backdrop blur
//   ✅ Escape key closes
//   ✅ Mobile responsive
//   ✅ No react-hot-toast — inline Banner
//   ✅ Tailwind CSS only
//   ✅ Lucide React icons only
// ═══════════════════════════════════════════════════════════════

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  X,
  BookTemplate,
  Sparkles,
  Newspaper,
  Bell,
  TrendingUp,
  Megaphone,
  FileText,
  Tag,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Info,
} from 'lucide-react';
import type { TemplateCategory } from '@/models/CampaignTemplate';

// ═══════════════════════════════════════════════════════════════
// 🔐 TYPES
// ═══════════════════════════════════════════════════════════════

interface SaveTemplateModalProps {
  isOpen:      boolean;
  onClose:     () => void;
  onSaved:     (templateId: string, templateName: string) => void;
  // Pre-filled from current campaign
  subject:     string;
  previewText: string;
  content:     string;
}

interface CategoryOption {
  value:       TemplateCategory;
  label:       string;
  description: string;
  icon:        React.ReactNode;
  gradient:    string;
}

// ═══════════════════════════════════════════════════════════════
// 🔐 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_NAME_LENGTH        = 100;
const MAX_DESCRIPTION_LENGTH = 300;
const MAX_TAG_LENGTH         = 50;
const MAX_TAGS_COUNT         = 10;

const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    value:       'welcome',
    label:       'Welcome',
    description: 'Onboarding new subscribers',
    icon:        <Sparkles  className="w-4 h-4" />,
    gradient:    'from-emerald-500 to-teal-500',
  },
  {
    value:       'newsletter',
    label:       'Newsletter',
    description: 'Weekly / monthly updates',
    icon:        <Newspaper className="w-4 h-4" />,
    gradient:    'from-blue-500 to-cyan-500',
  },
  {
    value:       'property_alert',
    label:       'Property Alert',
    description: 'New listing notifications',
    icon:        <Bell      className="w-4 h-4" />,
    gradient:    'from-amber-500 to-orange-500',
  },
  {
    value:       'market_insights',
    label:       'Market Insights',
    description: 'Analysis & price trends',
    icon:        <TrendingUp className="w-4 h-4" />,
    gradient:    'from-purple-500 to-pink-500',
  },
  {
    value:       'promotion',
    label:       'Promotion',
    description: 'Offers & special deals',
    icon:        <Megaphone className="w-4 h-4" />,
    gradient:    'from-rose-500 to-red-500',
  },
  {
    value:       'announcement',
    label:       'Announcement',
    description: 'News & platform updates',
    icon:        <Megaphone className="w-4 h-4" />,
    gradient:    'from-[#029bba] to-[#004063]',
  },
  {
    value:       'custom',
    label:       'Custom',
    description: 'General purpose template',
    icon:        <FileText  className="w-4 h-4" />,
    gradient:    'from-gray-500 to-slate-600',
  },
];

// ═══════════════════════════════════════════════════════════════
// 🛠️ HELPERS
// ═══════════════════════════════════════════════════════════════

function formatBytes(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function parseTags(input: string): string[] {
  return input
    .split(/[,،\n]/)  // comma, Arabic comma, newline
    .map((t) => t.trim().slice(0, MAX_TAG_LENGTH))
    .filter((t) => t.length > 0)
    .slice(0, MAX_TAGS_COUNT);
}

// ═══════════════════════════════════════════════════════════════
// 🎨 SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

// ─── Inline Banner ────────────────────────────────────────────

interface InlineBannerProps {
  type:    'error' | 'success' | 'info';
  message: string;
}

function InlineBanner({ type, message }: InlineBannerProps) {
  const styles = {
    error:   'bg-red-50     border-red-200     text-red-800',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    info:    'bg-blue-50    border-blue-200    text-blue-800',
  };
  const icons = {
    error:   <AlertCircle  className="w-4 h-4 shrink-0 mt-0.5" />,
    success: <CheckCircle  className="w-4 h-4 shrink-0 mt-0.5" />,
    info:    <Info         className="w-4 h-4 shrink-0 mt-0.5" />,
  };
  return (
    <div className={`flex items-start gap-2 px-4 py-3 rounded-xl border text-sm ${styles[type]}`}>
      {icons[type]}
      <span>{message}</span>
    </div>
  );
}

// ─── Category Picker ──────────────────────────────────────────

interface CategoryPickerProps {
  selected: TemplateCategory;
  onChange: (cat: TemplateCategory) => void;
}

function CategoryPicker({ selected, onChange }: CategoryPickerProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {CATEGORY_OPTIONS.map((cat) => {
        const isSelected = cat.value === selected;
        return (
          <button
            key={cat.value}
            type="button"
            onClick={() => onChange(cat.value)}
            className={`
              flex flex-col items-center gap-2 p-3 rounded-xl border-2
              transition-all text-center
              ${isSelected
                ? 'border-[#029bba] bg-[#029bba]/5 shadow-sm'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }
            `}
          >
            {/* Category icon with gradient bg */}
            <div className={`
              w-8 h-8 rounded-lg bg-gradient-to-br ${cat.gradient}
              flex items-center justify-center text-white
              ${isSelected ? 'shadow-md' : ''}
            `}>
              {cat.icon}
            </div>
            <div>
              <p className={`text-xs font-bold leading-tight ${
                isSelected ? 'text-[#029bba]' : 'text-gray-700'
              }`}>
                {cat.label}
              </p>
              <p className="text-[10px] text-gray-400 leading-tight mt-0.5 hidden sm:block">
                {cat.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function SaveTemplateModal({
  isOpen,
  onClose,
  onSaved,
  subject,
  previewText,
  content,
}: SaveTemplateModalProps) {

  // ─── Form state ───────────────────────────────────────────
  const [name,        setName]        = useState('');
  const [description, setDescription] = useState('');
  const [category,    setCategory]    = useState<TemplateCategory>('custom');
  const [tagInput,    setTagInput]    = useState('');
  const [isSaving,    setIsSaving]    = useState(false);
  const [error,       setError]       = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const nameInputRef = useRef<HTMLInputElement>(null);

  // ─── Content size ──────────────────────────────────────────
  const contentSizeBytes = Buffer.byteLength(content, 'utf8');
  const contentSizeLabel = formatBytes(contentSizeBytes);
  const isContentTooLarge = contentSizeBytes > 500_000;

  // ─── Body scroll lock ─────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';

    // Auto-focus name input
    setTimeout(() => nameInputRef.current?.focus(), 100);

    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // ─── Escape key ───────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, isSaving, onClose]);

  // ─── Reset form on open ───────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setCategory('custom');
      setTagInput('');
      setError('');
      setFieldErrors({});
    }
  }, [isOpen]);

  // ─── Validate ─────────────────────────────────────────────
  const validate = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = 'Template name is required';
    } else if (name.trim().length < 3) {
      errors.name = 'Name must be at least 3 characters';
    } else if (name.trim().length > MAX_NAME_LENGTH) {
      errors.name = `Name cannot exceed ${MAX_NAME_LENGTH} characters`;
    }

    if (!description.trim()) {
      errors.description = 'Description is required';
    } else if (description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters';
    }

    if (!content.trim()) {
      errors.content = 'Cannot save a template with empty content';
    }

    if (isContentTooLarge) {
      errors.content = 'Content exceeds 500KB limit';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [name, description, content, isContentTooLarge]);

  // ─── Save handler ─────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setError('');
    if (!validate()) return;

    setIsSaving(true);

    try {
      const tags = parseTags(tagInput);

      const res = await fetch('/api/admin/campaign-templates', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:        name.trim(),
          description: description.trim(),
          category,
          subject,
          previewText,
          content,
          tags,
        }),
      });

      const data = await res.json();

      if (data.success) {
        onSaved(data.template._id, data.template.name);
        onClose();
      } else {
        // Handle duplicate name (409)
        if (res.status === 409) {
          setFieldErrors((prev) => ({
            ...prev,
            name: data.message || 'A template with this name already exists',
          }));
        } else {
          setError(data.message || 'Failed to save template. Please try again.');
        }
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  }, [
    validate, name, description, category,
    subject, previewText, content, tagInput,
    onSaved, onClose,
  ]);

  if (!isOpen) return null;

  // ═════════════════════════════════════════════════════════
  // 🎨 RENDER
  // ═════════════════════════════════════════════════════════

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center">
              <BookTemplate className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#004063]">
                Save as Template
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Reuse this campaign content in future campaigns
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body (scrollable) ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Global error */}
          {error && <InlineBanner type="error" message={error} />}

          {/* Content too large warning */}
          {isContentTooLarge && (
            <InlineBanner
              type="error"
              message={`Content is too large (${contentSizeLabel}). Maximum is 500KB. Please reduce the email content before saving as template.`}
            />
          )}

          {/* Content size info */}
          {!isContentTooLarge && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
              <Info className="w-4 h-4 text-gray-400 shrink-0" />
              <p className="text-xs text-gray-500">
                Template content size: <strong className="text-gray-700">{contentSizeLabel}</strong>
                {' '}· Subject and preview text from current campaign will be pre-filled.
              </p>
            </div>
          )}

          {/* ── Template Name ── */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value.slice(0, MAX_NAME_LENGTH));
                if (fieldErrors.name) {
                  setFieldErrors((prev) => ({ ...prev, name: '' }));
                }
              }}
              placeholder="e.g., Weekly Property Alert — Karachi"
              disabled={isSaving}
              className={`
                w-full px-4 py-2.5 rounded-xl border text-sm
                focus:outline-none focus:ring-2 focus:ring-[#029bba]/30
                focus:border-[#029bba] transition-all disabled:opacity-50
                ${fieldErrors.name
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-200'
                }
              `}
            />
            <div className="flex items-center justify-between mt-1">
              {fieldErrors.name
                ? <p className="text-xs text-red-500">{fieldErrors.name}</p>
                : <p className="text-xs text-gray-400">Give it a descriptive name you'll recognize later</p>
              }
              <p className="text-xs text-gray-400 shrink-0 ml-2">
                {name.length}/{MAX_NAME_LENGTH}
              </p>
            </div>
          </div>

          {/* ── Description ── */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH));
                if (fieldErrors.description) {
                  setFieldErrors((prev) => ({ ...prev, description: '' }));
                }
              }}
              placeholder="e.g., Weekly newsletter template with property listings and market insights for Karachi subscribers"
              rows={3}
              disabled={isSaving}
              className={`
                w-full px-4 py-2.5 rounded-xl border text-sm resize-none
                focus:outline-none focus:ring-2 focus:ring-[#029bba]/30
                focus:border-[#029bba] transition-all disabled:opacity-50
                ${fieldErrors.description
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-200'
                }
              `}
            />
            <div className="flex items-center justify-between mt-1">
              {fieldErrors.description
                ? <p className="text-xs text-red-500">{fieldErrors.description}</p>
                : <p className="text-xs text-gray-400">Describe what this template is for</p>
              }
              <p className="text-xs text-gray-400 shrink-0 ml-2">
                {description.length}/{MAX_DESCRIPTION_LENGTH}
              </p>
            </div>
          </div>

          {/* ── Category ── */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Category
            </label>
            <CategoryPicker
              selected={category}
              onChange={setCategory}
            />
            <p className="text-xs text-gray-400 mt-2">
              Categories help you find templates faster in the gallery
            </p>
          </div>

          {/* ── Tags ── */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              <div className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-gray-500" />
                Tags
                <span className="font-normal text-gray-400">(optional)</span>
              </div>
            </label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="karachi, weekly, property-alert  (comma separated)"
              disabled={isSaving}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#029bba]/30 focus:border-[#029bba] transition-all disabled:opacity-50"
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-gray-400">
                Separate tags with commas — max {MAX_TAGS_COUNT} tags
              </p>
              {tagInput && (
                <p className="text-xs text-gray-400 shrink-0 ml-2">
                  {parseTags(tagInput).length}/{MAX_TAGS_COUNT} tags
                </p>
              )}
            </div>

            {/* Tag preview pills */}
            {tagInput && parseTags(tagInput).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {parseTags(tagInput).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#029bba]/10 text-[#029bba]"
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── What gets saved info box ── */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs font-bold text-blue-800 mb-2">
              📦 What gets saved in this template:
            </p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li className="flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3 text-blue-500 shrink-0" />
                Full email content (HTML from editor)
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3 text-blue-500 shrink-0" />
                Subject line: {subject
                  ? <em className="font-semibold">"{subject.slice(0, 40)}{subject.length > 40 ? '...' : ''}"</em>
                  : <span className="text-blue-400">none</span>
                }
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3 text-blue-500 shrink-0" />
                Preview text: {previewText
                  ? <em className="font-semibold">"{previewText.slice(0, 40)}{previewText.length > 40 ? '...' : ''}"</em>
                  : <span className="text-blue-400">none</span>
                }
              </li>
            </ul>
          </div>

          {/* Content error */}
          {fieldErrors.content && (
            <InlineBanner type="error" message={fieldErrors.content} />
          )}

        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving || isContentTooLarge || !name.trim() || !description.trim()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-[#029bba] hover:bg-[#0289a5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving
              ? <><RefreshCw className="w-4 h-4 animate-spin" />Saving...</>
              : <><BookTemplate className="w-4 h-4" />Save Template</>
            }
          </button>
        </div>

      </div>
    </div>
  );
}