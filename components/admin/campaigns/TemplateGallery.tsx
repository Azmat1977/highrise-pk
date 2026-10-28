// ========== FILE: components/admin/campaigns/TemplateGallery.tsx ==========
// 🎨 ENTERPRISE TEMPLATE GALLERY — HIGHRISE.PK
// Visual template picker with real estate-focused starter layouts
// ═══════════════════════════════════════════════════════════════
// FEATURES:
//   ✅ Beautiful visual cards (not a dropdown)
//   ✅ 5 pre-built enterprise templates
//   ✅ Each template has thumbnail preview
//   ✅ HTML starter content for TipTap editor
//   ✅ Real estate-specific templates
//   ✅ One-click template selection
//   ✅ Modal overlay with backdrop blur
//   ✅ Body scroll lock when open
//   ✅ Keyboard escape support
//   ✅ Mobile responsive grid
//   ✅ Selected indicator on active template
// ═══════════════════════════════════════════════════════════════

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  X,
  Sparkles,
  Newspaper,
  Bell,
  TrendingUp,
  FileText,
  Check,
  BookTemplate,
  RefreshCw,
  Tag,
  BarChart3,
  Megaphone,
  AlertCircle,
  Plus,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// 🎨 TYPES
// ═══════════════════════════════════════════════════════════════

export interface TemplateOption {
  id:          string;
  name:        string;
  description: string;
  subject:     string;
  previewText: string;
  icon:        React.ReactNode;
  gradient:    string;
  html:        string;  // Starter HTML content for TipTap
}

// DB template shape (from API)
interface DbTemplate {
  _id:         string;
  name:        string;
  description: string;
  category:    string;
  subject:     string;
  previewText: string;
  tags:        string[];
  usageCount:  number;
  createdAt:   string;
}

interface TemplateGalleryProps {
  isOpen:            boolean;
  onClose:           () => void;
  onSelect:          (template: TemplateOption) => void;
  currentTemplateId?: string;
}

// ─── Category → visual meta mapping ──────────────────────────
// Maps DB category string to gradient + icon
// (DB cannot store React nodes — resolved on client)
const DB_CATEGORY_META: Record<string, {
  gradient: string;
  icon:     React.ReactNode;
}> = {
  welcome: {
    gradient: 'from-emerald-500 to-teal-600',
    icon:     <Sparkles   className="w-6 h-6" />,
  },
  newsletter: {
    gradient: 'from-blue-500 to-cyan-600',
    icon:     <Newspaper  className="w-6 h-6" />,
  },
  property_alert: {
    gradient: 'from-amber-500 to-orange-600',
    icon:     <Bell       className="w-6 h-6" />,
  },
  market_insights: {
    gradient: 'from-purple-500 to-pink-600',
    icon:     <TrendingUp className="w-6 h-6" />,
  },
  promotion: {
    gradient: 'from-rose-500 to-red-600',
    icon:     <Megaphone  className="w-6 h-6" />,
  },
  announcement: {
    gradient: 'from-[#029bba] to-[#004063]',
    icon:     <Megaphone  className="w-6 h-6" />,
  },
  custom: {
    gradient: 'from-gray-500 to-slate-600',
    icon:     <FileText   className="w-6 h-6" />,
  },
};

/**
 * Convert a DB template into a TemplateOption
 * so it works with existing onSelect + handleTemplateSelect
 * in MissionControl without any changes there.
 */
function dbTemplateToOption(
  db: DbTemplate,
  html: string
): TemplateOption {
  const meta = DB_CATEGORY_META[db.category] || DB_CATEGORY_META.custom;
  return {
    id:          `db_${db._id}`,   // prefix prevents collision with system IDs
    name:        db.name,
    description: db.description,
    subject:     db.subject     || '',
    previewText: db.previewText || '',
    icon:        meta.icon,
    gradient:    meta.gradient,
    html,
  };
}

// ═══════════════════════════════════════════════════════════════
// 🎨 TEMPLATE DEFINITIONS
// Each template = visual card + starter HTML content
// ═══════════════════════════════════════════════════════════════

const TEMPLATES: TemplateOption[] = [
  // ─────────────────────────────────────────────
  // 1. WELCOME EMAIL
  // ─────────────────────────────────────────────
  {
    id:          'welcome',
    name:        'Welcome Email',
    description: 'Perfect for onboarding new subscribers',
    subject:     'Welcome to Highrise.pk! 🏠',
    previewText: 'Thank you for joining Pakistan\'s premier real estate platform.',
    icon:        <Sparkles className="w-6 h-6" />,
    gradient:    'from-emerald-500 to-teal-600',
    html: `
<h1 style="text-align:center;">Welcome to Highrise.pk! 🏠</h1>
<p style="text-align:center;color:#6b7280;">Pakistan's Premier Real Estate Platform</p>
<hr />
<p>Assalam-o-Alaikum,</p>
<p>Thank you for joining <strong>Highrise.pk</strong> — your trusted partner for finding your dream property in Pakistan.</p>
<h2>What You Get</h2>
<ul>
  <li>🏢 Access to <strong>verified properties</strong> across major cities</li>
  <li>📊 Weekly <strong>market insights</strong> and price trends</li>
  <li>🔔 Instant alerts for properties matching your criteria</li>
  <li>💬 Direct chat with <strong>trusted developers &amp; agents</strong></li>
</ul>
<h2>Get Started</h2>
<p>Browse thousands of properties in Karachi, Lahore, Islamabad, and beyond. Whether you're looking to buy, rent, or invest — we've got you covered.</p>
<p style="text-align:center;"><a href="https://highrise.pk/properties" target="_blank" rel="noopener noreferrer">Browse Properties →</a></p>
<hr />
<p style="text-align:center;color:#9ca3af;font-size:14px;">Need help? Reply to this email — our team responds within 24 hours.</p>
`.trim(),
  },

  // ─────────────────────────────────────────────
  // 2. WEEKLY UPDATE
  // ─────────────────────────────────────────────
  {
    id:          'weekly_update',
    name:        'Weekly Newsletter',
    description: 'Market updates, featured properties & news',
    subject:     'This Week in Pakistani Real Estate 📈',
    previewText: 'Market trends, new listings, and expert insights.',
    icon:        <Newspaper className="w-6 h-6" />,
    gradient:    'from-blue-500 to-cyan-600',
    html: `
<h1>Weekly Real Estate Update 📈</h1>
<p><em>Your weekly digest of Pakistan's property market</em></p>
<hr />
<h2>📊 This Week's Market Snapshot</h2>
<ul>
  <li><strong>Average Price:</strong> PKR 2.5Cr (▲ 3.2%)</li>
  <li><strong>New Listings:</strong> 245 properties</li>
  <li><strong>Hot Area:</strong> DHA Phase 5, Lahore</li>
  <li><strong>Trending:</strong> Commercial plots in Islamabad</li>
</ul>
<h2>🏢 Featured Properties</h2>
<p>Add your featured properties here — replace this with property cards, images, and details.</p>
<h2>💡 Market Insights</h2>
<ol>
  <li>Property prices increased by 3.2% this week across major cities</li>
  <li>DHA Phase 5 shows highest demand with 40+ new inquiries</li>
  <li>Commercial properties gaining traction in Islamabad blue area</li>
</ol>
<h2>🎯 Expert Tip of the Week</h2>
<blockquote>Always verify property documents through the local revenue office before making any payment. Highrise.pk-verified properties come with pre-checked documentation.</blockquote>
<hr />
<p style="text-align:center;"><a href="https://highrise.pk" target="_blank" rel="noopener noreferrer">Visit Highrise.pk →</a></p>
`.trim(),
  },

  // ─────────────────────────────────────────────
  // 3. PROPERTY ALERT
  // ─────────────────────────────────────────────
  {
    id:          'property_alert',
    name:        'Property Alert',
    description: 'Notify subscribers about matching properties',
    subject:     'New Properties Matching Your Search! 🔔',
    previewText: 'Fresh listings that match your saved criteria.',
    icon:        <Bell className="w-6 h-6" />,
    gradient:    'from-amber-500 to-orange-600',
    html: `
<h1>🔔 New Properties Just For You</h1>
<p>Hi there,</p>
<p>We found <strong>new properties</strong> matching your saved search criteria. Don't miss out — these listings are highly competitive!</p>
<hr />
<h2>🏡 Property #1</h2>
<ul>
  <li><strong>Location:</strong> DHA Phase 5, Lahore</li>
  <li><strong>Size:</strong> 10 Marla</li>
  <li><strong>Price:</strong> PKR 3.2 Cr</li>
  <li><strong>Bedrooms:</strong> 4</li>
  <li><strong>Bathrooms:</strong> 5</li>
</ul>
<p><a href="https://highrise.pk/properties/property-1" target="_blank" rel="noopener noreferrer">View Property Details →</a></p>
<hr />
<h2>🏡 Property #2</h2>
<ul>
  <li><strong>Location:</strong> Bahria Town, Karachi</li>
  <li><strong>Size:</strong> 500 sq yards</li>
  <li><strong>Price:</strong> PKR 4.5 Cr</li>
  <li><strong>Bedrooms:</strong> 5</li>
  <li><strong>Bathrooms:</strong> 6</li>
</ul>
<p><a href="https://highrise.pk/properties/property-2" target="_blank" rel="noopener noreferrer">View Property Details →</a></p>
<hr />
<p style="text-align:center;color:#6b7280;"><em>Update your search preferences anytime from your dashboard.</em></p>
<p style="text-align:center;"><a href="https://highrise.pk/dashboard" target="_blank" rel="noopener noreferrer">Manage Preferences →</a></p>
`.trim(),
  },

  // ─────────────────────────────────────────────
  // 4. MARKET INSIGHTS
  // ─────────────────────────────────────────────
  {
    id:          'market_insights',
    name:        'Market Insights',
    description: 'Deep analysis and market trends report',
    subject:     'Market Insights: Deep Dive into Pakistan Real Estate 📊',
    previewText: 'Expert analysis, price trends, and investment opportunities.',
    icon:        <TrendingUp className="w-6 h-6" />,
    gradient:    'from-purple-500 to-pink-600',
    html: `
<h1>📊 Market Insights Report</h1>
<p><em>Deep dive into Pakistan's real estate market</em></p>
<hr />
<h2>Executive Summary</h2>
<p>Pakistan's real estate market continues to show strong momentum in Q1 2025, with major cities seeing average price increases of <strong>3-5%</strong> quarter-over-quarter.</p>
<h2>🏙️ City-Wise Performance</h2>
<h3>Karachi</h3>
<ul>
  <li>Average price growth: <strong>+4.2%</strong></li>
  <li>Top area: Bahria Town, DHA</li>
  <li>Inventory: <strong>2,340 active listings</strong></li>
</ul>
<h3>Lahore</h3>
<ul>
  <li>Average price growth: <strong>+3.8%</strong></li>
  <li>Top area: DHA Phase 5, Model Town</li>
  <li>Inventory: <strong>1,890 active listings</strong></li>
</ul>
<h3>Islamabad</h3>
<ul>
  <li>Average price growth: <strong>+5.1%</strong></li>
  <li>Top area: F-6, F-7, Bahria Enclave</li>
  <li>Inventory: <strong>1,120 active listings</strong></li>
</ul>
<h2>💰 Investment Recommendations</h2>
<blockquote>Commercial properties in Islamabad Blue Area and Karachi Clifton show the highest ROI potential for 2025, with expected yields of 8-12% annually.</blockquote>
<h2>🎯 Key Takeaways</h2>
<ol>
  <li>Prime residential areas continue to appreciate steadily</li>
  <li>Commercial demand is rising sharply in metropolitan hubs</li>
  <li>New housing schemes offer entry-level investment opportunities</li>
  <li>Interest in vertical developments is at an all-time high</li>
</ol>
<hr />
<p style="text-align:center;"><a href="https://highrise.pk/insights" target="_blank" rel="noopener noreferrer">Read Full Report →</a></p>
`.trim(),
  },

  // ─────────────────────────────────────────────
  // 5. CUSTOM / BLANK
  // ─────────────────────────────────────────────
  {
    id:          'custom',
    name:        'Blank Template',
    description: 'Start from scratch — full creative control',
    subject:     '',
    previewText: '',
    icon:        <FileText className="w-6 h-6" />,
    gradient:    'from-gray-500 to-slate-600',
    html: `
<h1>Your Headline Here</h1>
<p>Start writing your custom email content...</p>
`.trim(),
  },
];

// Export for use in other components
export { TEMPLATES };

// ═══════════════════════════════════════════════════════════════
// 🎨 TEMPLATE CARD COMPONENT
// ═══════════════════════════════════════════════════════════════

const TemplateCard: React.FC<{
  template:   TemplateOption;
  isSelected: boolean;
  onClick:    () => void;
}> = ({ template, isSelected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`
      group relative flex flex-col text-left rounded-2xl overflow-hidden
      border-2 transition-all duration-200 hover:shadow-xl
      ${isSelected
        ? 'border-[#029bba] shadow-lg shadow-[#029bba]/20 scale-[1.02]'
        : 'border-gray-200 hover:border-gray-300'
      }
    `}
  >
    {/* Selected Checkmark */}
    {isSelected && (
      <div className="absolute top-3 right-3 z-10 w-8 h-8 
                      rounded-full bg-[#029bba] flex items-center justify-center 
                      shadow-md">
        <Check className="w-5 h-5 text-white" strokeWidth={3} />
      </div>
    )}

    {/* Gradient Header with Icon */}
    <div className={`bg-gradient-to-br ${template.gradient} p-6 
                     flex items-center justify-center h-32 text-white`}>
      <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
        {template.icon}
      </div>
    </div>

    {/* Content */}
    <div className="p-4 bg-white flex-1 flex flex-col">
      <h3 className="text-base font-black text-[#004063] mb-1">
        {template.name}
      </h3>
      <p className="text-xs text-gray-600 mb-3 flex-1">
        {template.description}
      </p>

      {/* Subject Preview */}
      {template.subject && (
        <div className="border-t border-gray-100 pt-3 mt-auto">
          <p className="text-xs text-gray-400 mb-0.5">Subject:</p>
          <p className="text-xs font-semibold text-gray-700 truncate">
            {template.subject}
          </p>
        </div>
      )}
    </div>
  </button>
);

// ═══════════════════════════════════════════════════════════════
// 🎨 DB TEMPLATE CARD
// Separate card for saved templates — shows usage + tags
// ═══════════════════════════════════════════════════════════════

const DbTemplateCard: React.FC<{
  template:   DbTemplate;
  isSelected: boolean;
  isLoading:  boolean;
  onClick:    () => void;
}> = ({ template, isSelected, isLoading, onClick }) => {
  const meta = DB_CATEGORY_META[template.category] || DB_CATEGORY_META.custom;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className={`
        group relative flex flex-col text-left rounded-2xl overflow-hidden
        border-2 transition-all duration-200 hover:shadow-xl
        disabled:opacity-60 disabled:cursor-wait
        ${isSelected
          ? 'border-[#029bba] shadow-lg shadow-[#029bba]/20 scale-[1.02]'
          : 'border-gray-200 hover:border-[#029bba]/50'
        }
      `}
    >
      {/* Selected checkmark */}
      {isSelected && (
        <div className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-[#029bba] flex items-center justify-center shadow-md">
          <Check className="w-5 h-5 text-white" strokeWidth={3} />
        </div>
      )}

      {/* Loading spinner overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 rounded-2xl">
          <RefreshCw className="w-6 h-6 text-[#029bba] animate-spin" />
        </div>
      )}

      {/* Gradient header */}
      <div className={`bg-gradient-to-br ${meta.gradient} p-6 flex items-center justify-center h-28 text-white relative`}>
        <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
          {meta.icon}
        </div>
        {/* Usage badge */}
        {template.usageCount > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/20 rounded-full px-2 py-0.5">
            <BarChart3 className="w-2.5 h-2.5 text-white/80" />
            <span className="text-[10px] text-white/90 font-semibold">
              {template.usageCount} use{template.usageCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 bg-white flex-1 flex flex-col">
        <h3 className="text-sm font-black text-[#004063] mb-1 line-clamp-1">
          {template.name}
        </h3>
        <p className="text-xs text-gray-500 mb-3 flex-1 line-clamp-2">
          {template.description}
        </p>

        {/* Subject preview */}
        {template.subject && (
          <div className="border-t border-gray-100 pt-2 mb-2">
            <p className="text-[10px] text-gray-400 mb-0.5">Subject:</p>
            <p className="text-xs font-semibold text-gray-700 truncate">
              {template.subject}
            </p>
          </div>
        )}

        {/* Tags */}
        {template.tags && template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto pt-2 border-t border-gray-100">
            {template.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[#029bba]/10 text-[#029bba]"
              >
                <Tag className="w-2 h-2" />
                {tag}
              </span>
            ))}
            {template.tags.length > 3 && (
              <span className="text-[10px] text-gray-400 self-center">
                +{template.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
};

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN GALLERY COMPONENT
// ═══════════════════════════════════════════════════════════════

const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  isOpen,
  onClose,
  onSelect,
  currentTemplateId,
}) => {

  // ─── DB templates state ───────────────────────────────────
  const [dbTemplates,    setDbTemplates]    = useState<DbTemplate[]>([]);
  const [isLoadingDb,    setIsLoadingDb]    = useState(false);
  const [dbError,        setDbError]        = useState('');
  const [loadingCardId,  setLoadingCardId]  = useState<string | null>(null);
  const [activeTab,      setActiveTab]      = useState<'system' | 'saved'>('system');

  // ─── Fetch saved templates from DB ────────────────────────
  const fetchDbTemplates = useCallback(async () => {
    setIsLoadingDb(true);
    setDbError('');
    try {
      const res  = await fetch(
        '/api/admin/campaign-templates?limit=50&sort=most_used',
        { credentials: 'include' }
      );
      const data = await res.json();
      if (data.success) {
        setDbTemplates(data.templates || []);
      } else {
        setDbError('Failed to load saved templates');
      }
    } catch {
      setDbError('Network error loading saved templates');
    } finally {
      setIsLoadingDb(false);
    }
  }, []);

  // ─── Body scroll lock + escape + fetch on open ────────────
  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';

    // Fetch DB templates when gallery opens
    fetchDbTemplates();

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose, fetchDbTemplates]);

  // ─── Handle DB template select ────────────────────────────
  // Fetch full content (?apply=true increments usageCount)
  // then convert to TemplateOption and call onSelect
  const handleDbTemplateSelect = useCallback(async (db: DbTemplate) => {
    setLoadingCardId(db._id);
    try {
      const res  = await fetch(
        `/api/admin/campaign-templates/${db._id}?apply=true`,
        { credentials: 'include' }
      );
      const data = await res.json();

      if (data.success && data.template?.content) {
        const option = dbTemplateToOption(db, data.template.content);
        onSelect(option);
        onClose();
      } else {
        setDbError('Failed to load template content. Please try again.');
      }
    } catch {
      setDbError('Network error. Please try again.');
    } finally {
      setLoadingCardId(null);
    }
  }, [onSelect, onClose]);

  if (!isOpen) return null;

  const totalCount = TEMPLATES.length + dbTemplates.length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative min-h-screen flex items-start justify-center p-4 py-8">
        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-6xl">

          {/* ── Header ── */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-3xl flex items-center justify-between z-10">
            <div>
              <h2 className="text-xl font-black text-[#004063] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#029bba]" />
                Choose a Template
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Start with a professional layout — customize everything after
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              title="Close (Esc)"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* ── Tab Bar ── */}
          <div className="px-6 pt-4 flex items-center gap-2 border-b border-gray-100">
            <button
              type="button"
              onClick={() => setActiveTab('system')}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-bold
                border-b-2 transition-all -mb-px
                ${activeTab === 'system'
                  ? 'border-[#029bba] text-[#029bba] bg-[#029bba]/5'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                }
              `}
            >
              <Sparkles className="w-4 h-4" />
              System Templates
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'system'
                  ? 'bg-[#029bba] text-white'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {TEMPLATES.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('saved')}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-bold
                border-b-2 transition-all -mb-px
                ${activeTab === 'saved'
                  ? 'border-[#029bba] text-[#029bba] bg-[#029bba]/5'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                }
              `}
            >
              <BookTemplate className="w-4 h-4" />
              Saved Templates
              {isLoadingDb
                ? <RefreshCw className="w-3 h-3 animate-spin text-gray-400" />
                : (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === 'saved'
                      ? 'bg-[#029bba] text-white'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {dbTemplates.length}
                  </span>
                )
              }
            </button>
          </div>

          {/* ── Content ── */}
          <div className="p-6">

            {/* ── SYSTEM TEMPLATES TAB ── */}
            {activeTab === 'system' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {TEMPLATES.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      isSelected={template.id === currentTemplateId}
                      onClick={() => {
                        onSelect(template);
                        onClose();
                      }}
                    />
                  ))}
                </div>

                {/* Pro tip */}
                <div className="mt-6 p-4 bg-[#029bba]/5 border border-[#029bba]/20 rounded-2xl">
                  <p className="text-sm text-[#004063]">
                    <strong>💡 Pro Tip:</strong> Templates are just starting
                    points. Once selected, you can fully customize the content,
                    add images, insert properties, and change the design —
                    all within the editor.
                  </p>
                </div>
              </>
            )}

            {/* ── SAVED TEMPLATES TAB ── */}
            {activeTab === 'saved' && (
              <>
                {/* Error state */}
                {dbError && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-4">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {dbError}
                    <button
                      type="button"
                      onClick={fetchDbTemplates}
                      className="ml-auto text-xs font-bold underline"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {/* Loading state */}
                {isLoadingDb && (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <RefreshCw className="w-8 h-8 text-[#029bba] animate-spin mx-auto mb-3" />
                      <p className="text-sm text-gray-400 font-semibold">
                        Loading saved templates...
                      </p>
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {!isLoadingDb && !dbError && dbTemplates.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                      <BookTemplate className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-black text-gray-700 mb-2">
                      No saved templates yet
                    </h3>
                    <p className="text-sm text-gray-400 max-w-sm mb-4">
                      Write campaign content in the editor, then click{' '}
                      <strong className="text-gray-600">&ldquo;Save Template&rdquo;</strong>{' '}
                      to build your reusable template library.
                    </p>
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-semibold">
                      <Plus className="w-4 h-4" />
                      Use the green &ldquo;Save Template&rdquo; button in the editor
                    </div>
                  </div>
                )}

                {/* DB Templates grid */}
                {!isLoadingDb && dbTemplates.length > 0 && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {dbTemplates.map((db) => (
                        <DbTemplateCard
                          key={db._id}
                          template={db}
                          isSelected={currentTemplateId === `db_${db._id}`}
                          isLoading={loadingCardId === db._id}
                          onClick={() => handleDbTemplateSelect(db)}
                        />
                      ))}
                    </div>

                    {/* Manage link */}
                    <div className="mt-6 flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-2xl">
                      <p className="text-sm text-gray-600">
                        <strong>{dbTemplates.length}</strong> saved template{dbTemplates.length !== 1 ? 's' : ''} in your library
                      </p>
                      <a
                        href="/admin/campaign-templates"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm font-bold text-[#029bba] hover:text-[#004063] transition-colors"
                      >
                        <BookTemplate className="w-4 h-4" />
                        Manage Templates →
                      </a>
                    </div>
                  </>
                )}
              </>
            )}

          </div>

          {/* ── Footer ── */}
          <div className="border-t border-gray-200 px-6 py-4 rounded-b-3xl bg-gray-50 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {totalCount} template{totalCount !== 1 ? 's' : ''} available
              {dbTemplates.length > 0 && (
                <span className="ml-1 text-gray-400">
                  ({TEMPLATES.length} system · {dbTemplates.length} saved)
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-white transition-colors text-sm"
            >
              Cancel
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default TemplateGallery;
// ========== END OF FILE ==========