// components/admin/campaigns/PropertyInsertWidget.tsx
// Property/Project card insertion widget for campaign editor
// Searches verified listings and inserts table-based HTML cards
// at TipTap cursor position via editorRef.insertAtCursor()

'use client';

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  X,
  Search,
  Building2,
  MapPin,
  DollarSign,
  Home,
  Loader2,
  ImageOff,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────

type TabType = 'properties' | 'projects';

interface PropertyResult {
  id:           string;
  title:        string;
  city:         string;
  society:      string;
  propertyType: string;
  listingType:  string;
  price:        number;
  area:         number;
  unit:         string;
  imageUrl:     string | null;
  slug:         string | null;
}

interface ProjectResult {
  id:              string;
  projectName:     string;
  city:            string;
  area:            string;
  projectCategory: string;
  projectNature:   string;
  minPrice:        number | null;
  maxPrice:        number | null;
  imageUrl:        string | null;
  slug:            string | null;
}

interface PropertyInsertWidgetProps {
  isOpen:   boolean;
  onClose:  () => void;
  onInsert: (html: string) => void;
}

// ─── Price formatter (Pakistani convention) ───────────────────

function formatPKR(amount: number | null | undefined): string {
  if (!amount || amount <= 0) return 'Price on Request';

  if (amount >= 10_000_000) {
    const crore = amount / 10_000_000;
    return `PKR ${crore % 1 === 0 ? crore.toFixed(0) : crore.toFixed(1)} Crore`;
  }
  if (amount >= 100_000) {
    const lakh = amount / 100_000;
    return `PKR ${lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(1)} Lakh`;
  }
  if (amount >= 1_000) {
    const thousand = amount / 1_000;
    return `PKR ${thousand.toFixed(0)}K`;
  }
  return `PKR ${amount.toLocaleString()}`;
}

function formatPriceRange(min: number | null, max: number | null): string {
  if (!min && !max) return 'Price on Request';
  if (min && max && min !== max) {
    return `${formatPKR(min)} – ${formatPKR(max)}`;
  }
  return formatPKR(min ?? max);
}

// ─── Card HTML generator — Property ──────────────────────────
// Uses table layout for Outlook compatibility
// Inline styles only (email clients strip <style> tags)

function generatePropertyCardHtml(
  property: PropertyResult,
  siteUrl = 'https://highrise.pk'
): string {
  const url         = property.slug ? `${siteUrl}/property/${property.slug}` : siteUrl;
  const price       = formatPKR(property.price);
  const location    = [property.society, property.city].filter(Boolean).join(', ');
  const size        = property.area && property.unit
    ? `${property.area} ${property.unit}`
    : '';
  const typeLabel   = property.propertyType
    ? property.propertyType.replace(/_/g, ' ')
    : '';
  const listingLabel = property.listingType === 'rent'
    ? 'For Rent'
    : property.listingType === 'installment'
      ? 'Installment'
      : 'For Sale';

  // Image row — only if imageUrl exists
  const imageRow = property.imageUrl
    ? `
      <tr>
        <td style="padding:0;">
          <a href="${url}" target="_blank" style="display:block;text-decoration:none;">
            <img
              src="${property.imageUrl}"
              alt="${property.title.replace(/"/g, '&quot;')}"
              width="520"
              style="width:100%;max-width:520px;height:220px;object-fit:cover;display:block;border:0;"
            />
          </a>
        </td>
      </tr>`
    : `
      <tr>
        <td style="padding:0;">
          <div style="width:100%;height:140px;background:linear-gradient(135deg,#004063 0%,#029bba 100%);display:flex;align-items:center;justify-content:center;">
            <p style="color:#ffffff;font-size:28px;margin:0;font-family:Arial,sans-serif;">🏠</p>
          </div>
        </td>
      </tr>`;

  return `
<!--[if mso]><table width="100%" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
<table width="100%" cellpadding="0" cellspacing="0" border="0"
  style="max-width:560px;width:100%;margin:16px auto;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;font-family:Arial,Helvetica,sans-serif;background-color:#ffffff;">
  ${imageRow}
  <tr>
    <td style="padding:16px 20px 4px 20px;">
      <span style="display:inline-block;background-color:#029bba;color:#ffffff;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">
        ${listingLabel}${typeLabel ? ` · ${typeLabel}` : ''}
      </span>
    </td>
  </tr>
  <tr>
    <td style="padding:8px 20px 4px 20px;">
      <a href="${url}" target="_blank"
        style="font-size:17px;font-weight:700;color:#004063;text-decoration:none;display:block;line-height:1.3;">
        ${property.title}
      </a>
    </td>
  </tr>
  <tr>
    <td style="padding:4px 20px;">
      <p style="margin:0;font-size:13px;color:#6b7280;">
        📍 ${location}${size ? `&nbsp;&nbsp;·&nbsp;&nbsp;📐 ${size}` : ''}
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:8px 20px 4px 20px;">
      <p style="margin:0;font-size:20px;font-weight:700;color:#029bba;">
        ${price}
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:12px 20px 20px 20px;">
      <a href="${url}" target="_blank"
        style="display:inline-block;background-color:#029bba;color:#ffffff;font-size:13px;font-weight:700;padding:10px 24px;border-radius:8px;text-decoration:none;">
        View Property →
      </a>
    </td>
  </tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
`.trim();
}

// ─── Card HTML generator — Project ───────────────────────────

function generateProjectCardHtml(
  project: ProjectResult,
  siteUrl = 'https://highrise.pk'
): string {
  const url      = project.slug ? `${siteUrl}/projects/${project.slug}` : siteUrl;
  const price    = formatPriceRange(project.minPrice, project.maxPrice);
  const location = [project.area, project.city].filter(Boolean).join(', ');
  const catLabel = project.projectCategory
    ? project.projectCategory.replace(/_/g, ' ')
    : '';
  const natureLabel = project.projectNature
    ? project.projectNature.charAt(0).toUpperCase() + project.projectNature.slice(1)
    : '';

  const imageRow = project.imageUrl
    ? `
      <tr>
        <td style="padding:0;">
          <a href="${url}" target="_blank" style="display:block;text-decoration:none;">
            <img
              src="${project.imageUrl}"
              alt="${project.projectName.replace(/"/g, '&quot;')}"
              width="520"
              style="width:100%;max-width:520px;height:220px;object-fit:cover;display:block;border:0;"
            />
          </a>
        </td>
      </tr>`
    : `
      <tr>
        <td style="padding:0;">
          <div style="width:100%;height:140px;background:linear-gradient(135deg,#004063 0%,#029bba 100%);">
            <p style="color:#ffffff;font-size:28px;margin:0;padding:50px 20px;font-family:Arial,sans-serif;text-align:center;">🏗️</p>
          </div>
        </td>
      </tr>`;

  return `
<!--[if mso]><table width="100%" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
<table width="100%" cellpadding="0" cellspacing="0" border="0"
  style="max-width:560px;width:100%;margin:16px auto;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;font-family:Arial,Helvetica,sans-serif;background-color:#ffffff;">
  ${imageRow}
  <tr>
    <td style="padding:16px 20px 4px 20px;">
      <span style="display:inline-block;background-color:#004063;color:#ffffff;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">
        ${catLabel}${natureLabel ? ` · ${natureLabel}` : ''}
      </span>
    </td>
  </tr>
  <tr>
    <td style="padding:8px 20px 4px 20px;">
      <a href="${url}" target="_blank"
        style="font-size:17px;font-weight:700;color:#004063;text-decoration:none;display:block;line-height:1.3;">
        ${project.projectName}
      </a>
    </td>
  </tr>
  <tr>
    <td style="padding:4px 20px;">
      <p style="margin:0;font-size:13px;color:#6b7280;">
        📍 ${location}
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:8px 20px 4px 20px;">
      <p style="margin:0;font-size:20px;font-weight:700;color:#029bba;">
        ${price}
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:12px 20px 20px 20px;">
      <a href="${url}" target="_blank"
        style="display:inline-block;background-color:#029bba;color:#ffffff;font-size:13px;font-weight:700;padding:10px 24px;border-radius:8px;text-decoration:none;">
        View Project →
      </a>
    </td>
  </tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
`.trim();
}

// ─── Main Component ───────────────────────────────────────────

const PropertyInsertWidget: React.FC<PropertyInsertWidgetProps> = ({
  isOpen,
  onClose,
  onInsert,
}) => {
  const [activeTab,        setActiveTab]        = useState<TabType>('properties');
  const [searchQuery,      setSearchQuery]      = useState('');
  const [isSearching,      setIsSearching]      = useState(false);
  const [propertyResults,  setPropertyResults]  = useState<PropertyResult[]>([]);
  const [projectResults,   setProjectResults]   = useState<ProjectResult[]>([]);
  const [searchError,      setSearchError]      = useState<string | null>(null);
  const [insertedId,       setInsertedId]       = useState<string | null>(null);

  const searchInputRef  = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Body scroll lock ────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Auto-focus search input
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // ── Reset on tab switch ─────────────────────────────────────
  useEffect(() => {
    setSearchQuery('');
    setPropertyResults([]);
    setProjectResults([]);
    setSearchError(null);
    setInsertedId(null);
  }, [activeTab]);

  // ── Reset on close ──────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setPropertyResults([]);
      setProjectResults([]);
      setSearchError(null);
      setInsertedId(null);
      setActiveTab('properties');
    }
  }, [isOpen]);

  // ── Debounced search ─────────────────────────────────────────
  const performSearch = useCallback(async (query: string, tab: TabType) => {
    if (query.length < 2) {
      setPropertyResults([]);
      setProjectResults([]);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const endpoint =
        tab === 'properties'
          ? `/api/admin/content/search-properties?q=${encodeURIComponent(query)}`
          : `/api/admin/content/search-projects?q=${encodeURIComponent(query)}`;

      const res = await fetch(endpoint, { credentials: 'include' });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setSearchError(data.message || 'Search failed');
        return;
      }

      if (tab === 'properties') {
        setPropertyResults(data.results || []);
      } else {
        setProjectResults(data.results || []);
      }
    } catch {
      setSearchError('Network error — please try again');
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(query, activeTab);
    }, 400);
  }, [activeTab, performSearch]);

  // ── Keyboard escape ─────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // ── Insert handlers ──────────────────────────────────────────
  const handleInsertProperty = useCallback((property: PropertyResult) => {
    const html = generatePropertyCardHtml(property);
    onInsert(html);
    setInsertedId(property.id);
    setTimeout(() => {
      setInsertedId(null);
      onClose();
    }, 800);
  }, [onInsert, onClose]);

  const handleInsertProject = useCallback((project: ProjectResult) => {
    const html = generateProjectCardHtml(project);
    onInsert(html);
    setInsertedId(project.id);
    setTimeout(() => {
      setInsertedId(null);
      onClose();
    }, 800);
  }, [onInsert, onClose]);

  if (!isOpen) return null;

  const currentResults =
    activeTab === 'properties' ? propertyResults : projectResults;
  const hasResults = currentResults.length > 0;
  const isEmpty    = searchQuery.length >= 2 && !isSearching && !hasResults && !searchError;

  // ── Render ───────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center
                 bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl
                      flex flex-col max-h-[85vh] overflow-hidden">

        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4
                        border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-base font-black text-[#004063]">
              Insert Listing Card
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Search and insert a property or project card into your email
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors
                       text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Tabs ───────────────────────────────────────── */}
        <div className="flex border-b border-gray-200 flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('properties')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-bold
                        border-b-2 transition-colors
                        ${activeTab === 'properties'
                          ? 'border-[#029bba] text-[#029bba]'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
          >
            <Home className="w-4 h-4" />
            Properties
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('projects')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-bold
                        border-b-2 transition-colors
                        ${activeTab === 'projects'
                          ? 'border-[#029bba] text-[#029bba]'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
          >
            <Building2 className="w-4 h-4" />
            Projects
          </button>
        </div>

        {/* ── Search Bar ─────────────────────────────────── */}
        <div className="px-6 py-4 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2
                              w-4 h-4 text-gray-400 pointer-events-none" />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2
                                  w-4 h-4 text-[#029bba] animate-spin" />
            )}
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder={
                activeTab === 'properties'
                  ? 'Search by title, city, or society...'
                  : 'Search by project name, city, or area...'
              }
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border
                         border-gray-300 focus:ring-2 focus:ring-[#029bba]/20
                         focus:border-[#029bba] outline-none text-sm"
            />
          </div>
          {searchQuery.length > 0 && searchQuery.length < 2 && (
            <p className="text-xs text-gray-400 mt-1.5 pl-1">
              Type at least 2 characters to search
            </p>
          )}
        </div>

        {/* ── Results ────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">

          {/* Error state */}
          {searchError && (
            <div className="flex items-center gap-3 p-4 bg-red-50
                            rounded-xl border border-red-200">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center
                              justify-center flex-shrink-0">
                <X className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-sm text-red-700">{searchError}</p>
            </div>
          )}

          {/* Empty state — no query */}
          {!searchQuery && !searchError && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-[#029bba]/10 rounded-2xl
                              flex items-center justify-center mx-auto mb-4">
                {activeTab === 'properties'
                  ? <Home className="w-8 h-8 text-[#029bba]" />
                  : <Building2 className="w-8 h-8 text-[#029bba]" />
                }
              </div>
              <p className="text-sm font-bold text-gray-700 mb-1">
                Search for a {activeTab === 'properties' ? 'Property' : 'Project'}
              </p>
              <p className="text-xs text-gray-500">
                {activeTab === 'properties'
                  ? 'Search by property title, city, or society name'
                  : 'Search by project name, city, or developer name'
                }
              </p>
            </div>
          )}

          {/* Empty results state */}
          {isEmpty && (
            <div className="text-center py-10">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl
                              flex items-center justify-center mx-auto mb-3">
                <Search className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-sm font-bold text-gray-700 mb-1">
                No {activeTab === 'properties' ? 'properties' : 'projects'} found
              </p>
              <p className="text-xs text-gray-500">
                Try a different search term or city name
              </p>
            </div>
          )}

          {/* Results grid */}
          {hasResults && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 font-semibold mb-2">
                {currentResults.length} result{currentResults.length !== 1 ? 's' : ''} found
              </p>

              {activeTab === 'properties'
                ? propertyResults.map((property) => (
                    <PropertyResultCard
                      key={property.id}
                      property={property}
                      isInserted={insertedId === property.id}
                      onInsert={handleInsertProperty}
                    />
                  ))
                : projectResults.map((project) => (
                    <ProjectResultCard
                      key={project.id}
                      project={project}
                      isInserted={insertedId === project.id}
                      onInsert={handleInsertProject}
                    />
                  ))
              }
            </div>
          )}
        </div>

        {/* ── Footer hint ────────────────────────────────── */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50
                        flex-shrink-0 rounded-b-2xl">
          <p className="text-xs text-gray-500 text-center">
            💡 Only verified listings are shown. Card will be inserted at your cursor position.
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Property Result Card ─────────────────────────────────────

interface PropertyResultCardProps {
  property:   PropertyResult;
  isInserted: boolean;
  onInsert:   (p: PropertyResult) => void;
}

const PropertyResultCard: React.FC<PropertyResultCardProps> = ({
  property,
  isInserted,
  onInsert,
}) => {
  const [imgError, setImgError] = useState(false);
  const location = [property.society, property.city].filter(Boolean).join(', ');
  const size     = property.area && property.unit
    ? `${property.area} ${property.unit}`
    : null;
  const listingLabel = property.listingType === 'rent'
    ? 'For Rent'
    : property.listingType === 'installment'
      ? 'Installment'
      : 'For Sale';

  return (
    <div className={`
      flex gap-3 p-3 rounded-xl border transition-all cursor-pointer
      ${isInserted
        ? 'border-emerald-300 bg-emerald-50'
        : 'border-gray-200 hover:border-[#029bba]/40 hover:bg-[#029bba]/5'
      }
    `}
    onClick={() => !isInserted && onInsert(property)}
    >
      {/* Thumbnail */}
      <div className="w-20 h-16 rounded-lg overflow-hidden flex-shrink-0
                      bg-gradient-to-br from-[#004063] to-[#029bba]
                      flex items-center justify-center">
        {property.imageUrl && !imgError ? (
          <img
            src={property.imageUrl}
            alt={property.title}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <Home className="w-6 h-6 text-white/70" />
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-bold text-gray-900 leading-tight
                        line-clamp-1 flex-1">
            {property.title}
          </p>
          {isInserted ? (
            <span className="flex items-center gap-1 text-xs font-bold
                             text-emerald-600 flex-shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Inserted
            </span>
          ) : (
            <span className="text-xs font-semibold text-[#029bba] flex-shrink-0
                             bg-[#029bba]/10 px-2 py-0.5 rounded-lg">
              Insert
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 mt-0.5">
          <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <p className="text-xs text-gray-500 line-clamp-1">{location}</p>
        </div>

        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="text-xs font-bold text-[#029bba]">
            {formatPKR(property.price)}
          </span>
          {size && (
            <span className="text-xs text-gray-500">
              📐 {size}
            </span>
          )}
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5
                           rounded-full">
            {listingLabel}
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── Project Result Card ──────────────────────────────────────

interface ProjectResultCardProps {
  project:    ProjectResult;
  isInserted: boolean;
  onInsert:   (p: ProjectResult) => void;
}

const ProjectResultCard: React.FC<ProjectResultCardProps> = ({
  project,
  isInserted,
  onInsert,
}) => {
  const [imgError, setImgError] = useState(false);
  const location  = [project.area, project.city].filter(Boolean).join(', ');
  const catLabel  = project.projectCategory
    ? project.projectCategory.replace(/_/g, ' ')
    : '';

  return (
    <div className={`
      flex gap-3 p-3 rounded-xl border transition-all cursor-pointer
      ${isInserted
        ? 'border-emerald-300 bg-emerald-50'
        : 'border-gray-200 hover:border-[#029bba]/40 hover:bg-[#029bba]/5'
      }
    `}
    onClick={() => !isInserted && onInsert(project)}
    >
      {/* Thumbnail */}
      <div className="w-20 h-16 rounded-lg overflow-hidden flex-shrink-0
                      bg-gradient-to-br from-[#004063] to-[#029bba]
                      flex items-center justify-center">
        {project.imageUrl && !imgError ? (
          <img
            src={project.imageUrl}
            alt={project.projectName}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <Building2 className="w-6 h-6 text-white/70" />
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-bold text-gray-900 leading-tight
                        line-clamp-1 flex-1">
            {project.projectName}
          </p>
          {isInserted ? (
            <span className="flex items-center gap-1 text-xs font-bold
                             text-emerald-600 flex-shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Inserted
            </span>
          ) : (
            <span className="text-xs font-semibold text-[#029bba] flex-shrink-0
                             bg-[#029bba]/10 px-2 py-0.5 rounded-lg">
              Insert
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 mt-0.5">
          <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <p className="text-xs text-gray-500 line-clamp-1">{location}</p>
        </div>

        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="text-xs font-bold text-[#029bba]">
            {formatPriceRange(project.minPrice, project.maxPrice)}
          </span>
          {catLabel && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5
                             rounded-full capitalize">
              {catLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PropertyInsertWidget;