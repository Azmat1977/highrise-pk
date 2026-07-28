// ========== FILE: components/admin/campaigns/MergeTagPicker.tsx ==========
// 🏷️ ENTERPRISE MERGE TAG PICKER — HIGHRISE.PK
// Beautiful dropdown to insert personalization tags into content
// ═══════════════════════════════════════════════════════════════
// FEATURES:
//   ✅ 16 merge tags across 6 categories
//   ✅ Search functionality
//   ✅ Category tabs with icons
//   ✅ Live preview of tag values (sample data)
//   ✅ One-click insert
//   ✅ Copy tag to clipboard
//   ✅ Tag description tooltips
//   ✅ Click outside to close
//   ✅ Keyboard support (Esc closes)
//   ✅ Anchor-relative positioning
//   ✅ Mobile responsive
//   ✅ Empty state messages
// ═══════════════════════════════════════════════════════════════

'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Tag,
  User,
  MapPin,
  Home,
  DollarSign,
  Target,
  Settings,
  Search,
  X,
  Copy,
  Check,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  SUPPORTED_TAGS,
  getTagsByCategory,
  getSampleTagData,
  type MergeTagInfo,
} from '@/lib/mergeTags';

// ═══════════════════════════════════════════════════════════════
// 🎨 TYPES
// ═══════════════════════════════════════════════════════════════

interface MergeTagPickerProps {
  isOpen:   boolean;
  onClose:  () => void;
  onInsert: (tag: string) => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

type CategoryKey = 'all' | 'basic' | 'location' | 'property' | 'budget' | 'lead' | 'system';

// ═══════════════════════════════════════════════════════════════
// 🎨 CATEGORY META
// ═══════════════════════════════════════════════════════════════

const CATEGORIES: Array<{
  id:    CategoryKey;
  label: string;
  icon:  React.ReactNode;
  color: string;
}> = [
  { id: 'all',      label: 'All',      icon: <Tag       className="w-4 h-4" />, color: 'text-[#029bba]' },
  { id: 'basic',    label: 'Basic',    icon: <User      className="w-4 h-4" />, color: 'text-blue-600' },
  { id: 'location', label: 'Location', icon: <MapPin    className="w-4 h-4" />, color: 'text-emerald-600' },
  { id: 'property', label: 'Property', icon: <Home      className="w-4 h-4" />, color: 'text-purple-600' },
  { id: 'budget',   label: 'Budget',   icon: <DollarSign className="w-4 h-4" />, color: 'text-amber-600' },
  { id: 'lead',     label: 'Lead',     icon: <Target    className="w-4 h-4" />, color: 'text-red-600' },
  { id: 'system',   label: 'System',   icon: <Settings  className="w-4 h-4" />, color: 'text-gray-600' },
];

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const MergeTagPicker: React.FC<MergeTagPickerProps> = ({
  isOpen,
  onClose,
  onInsert,
  anchorRef,
}) => {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('all');
  const [searchQuery,    setSearchQuery]    = useState('');
  const [copiedTag,      setCopiedTag]      = useState<string | null>(null);

  const pickerRef = useRef<HTMLDivElement>(null);
  const sampleData = useMemo(() => getSampleTagData(), []);
  const tagsByCategory = useMemo(() => getTagsByCategory(), []);

  // ─────────────────────────────────────────────
  // Click outside + Escape key handler
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (pickerRef.current && !pickerRef.current.contains(target)) {
        if (anchorRef?.current && anchorRef.current.contains(target)) return;
        onClose();
      }
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose, anchorRef]);

  // ─────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────

  const handleTagInsert = (tag: string) => {
    onInsert(tag);
    // Keep picker open for multiple insertions
  };

  const handleTagCopy = async (tag: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(tag);
      setCopiedTag(tag);
      setTimeout(() => setCopiedTag(null), 2000);
    } catch {
      // Clipboard not available — silent fail
    }
  };

  // ─────────────────────────────────────────────
  // Filter tags
  // ─────────────────────────────────────────────

  const filteredTags = useMemo((): MergeTagInfo[] => {
    let tags: MergeTagInfo[] = [];

    if (activeCategory === 'all') {
      tags = [...SUPPORTED_TAGS];
    } else {
      tags = tagsByCategory[activeCategory] || [];
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      tags = tags.filter((t) =>
        t.tag.toLowerCase().includes(q) ||
        t.label.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    }

    return tags;
  }, [activeCategory, searchQuery, tagsByCategory]);

  /**
   * Get sample value for a tag (for preview)
   */
  const getSampleValue = (tag: string): string => {
    const key = tag.replace(/[{}]/g, '');
    const value = (sampleData as any)[key];

    if (value === undefined || value === null) {
      // Try transformed keys
      if (key === 'firstName' && sampleData.name) {
        return sampleData.name.split(' ')[0];
      }
      const info = SUPPORTED_TAGS.find((t) => t.tag === tag);
      return info?.fallback || '';
    }

    if (typeof value === 'number') {
      // Prices
      if (key === 'price' || key === 'budgetMin' || key === 'budgetMax') {
        return value >= 10000000
          ? `PKR ${(value / 10000000).toFixed(1)} Crore`
          : `PKR ${(value / 100000).toFixed(1)} Lakh`;
      }
      return String(value);
    }

    if (value instanceof Date) {
      return value.toLocaleDateString('en-PK', {
        year:  'numeric',
        month: 'long',
        day:   'numeric',
      });
    }

    return String(value);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={pickerRef}
      className="absolute z-50 mt-2 w-96 max-w-[calc(100vw-2rem)] 
                 bg-white rounded-2xl shadow-2xl border border-gray-200 
                 overflow-hidden"
    >
      {/* ═══════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════ */}
      <div className="border-b border-gray-200 p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-[#004063] 
                         flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#029bba]" />
            Insert Personalization
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 
                             w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tags... (name, city, budget)"
            autoFocus
            className="w-full pl-9 pr-3 py-2 rounded-xl border 
                       border-gray-200 focus:ring-2 
                       focus:ring-[#029bba]/20 focus:border-[#029bba] 
                       outline-none text-sm bg-gray-50"
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          CATEGORY TABS (hidden when searching)
          ═══════════════════════════════════════════ */}
      {!searchQuery.trim() && (
        <div className="flex items-center border-b border-gray-200 
                        bg-gray-50 overflow-x-auto scrollbar-none">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveCategory(category.id)}
              className={`
                flex-shrink-0 flex items-center gap-1.5 py-2 px-3 
                text-xs font-bold transition-all whitespace-nowrap
                ${activeCategory === category.id
                  ? 'text-[#029bba] border-b-2 border-[#029bba] bg-white'
                  : 'text-gray-500 hover:text-gray-700'
                }
              `}
            >
              <span className={activeCategory === category.id ? 'text-[#029bba]' : category.color}>
                {category.icon}
              </span>
              <span>{category.label}</span>
              {activeCategory === category.id && (
                <span className="text-[10px] text-gray-400 font-normal ml-0.5">
                  ({activeCategory === 'all' ? SUPPORTED_TAGS.length : tagsByCategory[activeCategory]?.length || 0})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          TAGS LIST
          ═══════════════════════════════════════════ */}
      <div className="overflow-y-auto p-2" style={{ maxHeight: '340px' }}>
        {filteredTags.length === 0 ? (
          <div className="text-center py-8">
            <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">
              No tags found for "{searchQuery}"
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredTags.map((tag) => {
              const sampleValue = getSampleValue(tag.tag);
              const category = CATEGORIES.find((c) => c.id === tag.category);
              const isCopied = copiedTag === tag.tag;

              return (
                <div
                  key={tag.tag}
                  onClick={() => handleTagInsert(tag.tag)}
                  className="group cursor-pointer p-2.5 rounded-xl 
                             border border-transparent 
                             hover:border-[#029bba]/30 hover:bg-[#029bba]/5 
                             transition-all"
                >
                  <div className="flex items-start gap-2.5">
                    {/* Category Icon */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg 
                                     bg-gray-100 group-hover:bg-[#029bba]/10 
                                     flex items-center justify-center 
                                     ${category?.color || 'text-gray-500'}`}>
                      {category?.icon || <Tag className="w-4 h-4" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-gray-900 truncate">
                            {tag.label}
                          </p>
                          <code className="text-xs text-[#029bba] font-mono">
                            {tag.tag}
                          </code>
                        </div>

                        {/* Copy Button */}
                        <button
                          type="button"
                          onClick={(e) => handleTagCopy(tag.tag, e)}
                          className="flex-shrink-0 p-1.5 rounded-lg 
                                     text-gray-400 hover:text-[#029bba] 
                                     hover:bg-white opacity-0 group-hover:opacity-100 
                                     transition-all"
                          title="Copy to clipboard"
                        >
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-gray-500 truncate">
                        {tag.description}
                      </p>

                      {/* Sample Preview */}
                      {sampleValue && (
                        <div className="mt-1.5 flex items-center gap-1">
                          <span className="text-[10px] text-gray-400 font-semibold uppercase">
                            Example:
                          </span>
                          <span className="text-xs text-gray-700 font-medium truncate">
                            {sampleValue}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════
          FOOTER — Help Text
          ═══════════════════════════════════════════ */}
      <div className="border-t border-gray-100 px-3 py-2.5 bg-gray-50">
        <div className="flex items-start gap-1.5">
          <Info className="w-3 h-3 text-[#029bba] flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-gray-600 leading-relaxed">
            <strong>Click any tag to insert.</strong> Each recipient will see 
            their own data. Preview shows sample values.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MergeTagPicker;
// ========== END OF FILE ==========