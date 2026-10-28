// components/project-detail/FloorPlansGrid.tsx
// ============================================================================
// HIGHRISE.PK — ENHANCED FLOOR PLANS GRID & LIGHTBOX (Wave 5)
// Responsive multi-column layout with high-res previews, unit spec badges,
// Cloudinary PDF-to-image preview transforms, and interactive zoom lightbox.
// ============================================================================

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Layers,
  Maximize2,
  Download,
  ExternalLink,
  FileText,
  ZoomIn,
  ZoomOut,
  X,
  MessageCircle,
  Building2,
  Car,
  Home,
  Sparkles,
} from 'lucide-react';
import type { ProjectDetailData, FloorPlan } from '@/types/projectDetail';

interface FloorPlansGridProps {
  project: ProjectDetailData;
  onInquire?: (planTitle: string) => void;
}

type PlanMediaKind = 'pdf' | 'image' | 'tiff' | 'unknown';
type SmartCategory = 'commercial' | 'residential' | 'parking' | 'other';

function classifyFloor(fp: FloorPlan): SmartCategory {
  const text = `${fp.floorType || ''} ${fp.floorName || ''}`.toLowerCase();
  
  if (/park|basement|b1|b2|b3|car|vehicle/.test(text)) return 'parking';
  if (/commercial|shop|retail|food|mezzanine|lower ground|lg|plaza|office|mall/.test(text)) return 'commercial';
  if (/residential|apartment|flat|penthouse|studio|bed/.test(text)) return 'residential';
  
  return 'other';
}

function detectPlanMediaKind(url: string): PlanMediaKind {
  if (!url) return 'unknown';
  const clean = url.split('?')[0].toLowerCase();
  if (clean.endsWith('.pdf')) return 'pdf';
  if (/\.(png|jpe?g|webp|gif|avif|bmp)$/.test(clean)) return 'image';
  if (/\.(tiff|tif)$/.test(clean)) return 'tiff';
  return 'unknown';
}

function cleanCloudinaryUrl(url: string): string {
  if (!url) return '';
  return url
    .replace(/\/fl_attachment,/g, '/')
    .replace(/,fl_attachment/g, '')
    .replace(/\/fl_attachment\//g, '/');
}

function buildCloudinaryJpg(url: string, isPdf: boolean): string | null {
  if (!url || !url.startsWith('https://res.cloudinary.com')) return null;
  const clean = cleanCloudinaryUrl(url);

  const marker = clean.includes('/image/upload/')
    ? '/image/upload/'
    : clean.includes('/raw/upload/')
    ? '/raw/upload/'
    : null;

  if (!marker) return null;

  const uIdx = clean.indexOf(marker);
  const baseUrl = clean.slice(0, uIdx) + '/image/upload/';
  let path = clean.slice(uIdx + marker.length);

  const vIdx = path.search(/\/v\d+\//);
  if (vIdx > 0) {
    path = path.slice(vIdx + 1);
  }

  if (isPdf) {
    const lastDot = path.lastIndexOf('.');
    if (lastDot > 0) {
      path = path.slice(0, lastDot) + '.jpg';
    } else {
      path = path + '.jpg';
    }
  }

  const transform = isPdf ? 'f_jpg,pg_1' : 'f_jpg';
  return `${baseUrl}${transform}/${path}`;
}

function getPlanPreviewUrl(url: string, kind: PlanMediaKind): string | null {
  if (!url) return null;
  const clean = cleanCloudinaryUrl(url);
  if (kind === 'image' && !/\.svg$/i.test(clean.split('?')[0])) {
    return clean;
  }
  const jpg = buildCloudinaryJpg(clean, kind === 'pdf');
  if (jpg) return jpg;
  if (kind === 'image') return clean;
  return null;
}

export default function FloorPlansGrid({
  project,
  onInquire,
}: FloorPlansGridProps): React.ReactElement | null {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedViewerPlan, setSelectedViewerPlan] = useState<{
    title: string;
    imageUrl?: string;
    pdfUrl?: string;
    description?: string;
  } | null>(null);

  const floorPlans = project.buildingFloorPlans ?? [];

  // Smart Bucketing
  const { tabs, filteredPlans } = useMemo(() => {
    const buckets: Record<SmartCategory, FloorPlan[]> = {
      commercial: [],
      residential: [],
      parking: [],
      other: [],
    };

    floorPlans.forEach(fp => buckets[classifyFloor(fp)].push(fp));

    const generatedTabs = [{ key: 'all', label: `All Plans`, count: floorPlans.length, icon: Layers }];
    
    if (buckets.commercial.length > 0) generatedTabs.push({ key: 'commercial', label: 'Commercial', count: buckets.commercial.length, icon: Building2 });
    if (buckets.residential.length > 0) generatedTabs.push({ key: 'residential', label: 'Residential', count: buckets.residential.length, icon: Home });
    if (buckets.parking.length > 0) generatedTabs.push({ key: 'parking', label: 'Parking', count: buckets.parking.length, icon: Car });
    if (buckets.other.length > 0) generatedTabs.push({ key: 'other', label: 'Amenities & Other', count: buckets.other.length, icon: Sparkles });

    const filtered = activeFilter === 'all' 
      ? floorPlans 
      : buckets[activeFilter as SmartCategory] || floorPlans;

    return { tabs: generatedTabs, filteredPlans: filtered };
  }, [floorPlans, activeFilter]);

  const downloadFile = async (url: string, filename: string) => {
    if (typeof window === 'undefined' || !url) return;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('download_failed');
      const blob = await res.blob();
      const objUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(objUrl);
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  if (floorPlans.length === 0) return null;

  return (
    <section id="features" className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden scroll-mt-24">
      {/* SECTION HEADER */}
      <div className="px-6 py-5 border-b border-gray-100 bg-[#f4f9fb] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-[#029bba]/10 text-[#029bba] rounded-full">
              Architectural Layouts
            </span>
            <span className="text-xs text-gray-400 font-bold font-mono">
              {floorPlans.length} {floorPlans.length === 1 ? 'Plan' : 'Plans'} Configured
            </span>
          </div>
          <h2 className="text-2xl font-black text-[#001f2b] tracking-tight mt-1.5 flex items-center gap-2">
            <Layers className="w-6 h-6 text-[#029bba]" />
            Floor & Building Plans
          </h2>
        </div>

        {/* Filter Pills */}
        {tabs.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveFilter(tab.key)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                    activeFilter === tab.key
                      ? 'bg-[#029bba] text-white shadow-sm'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label} ({tab.count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* GRID DISPLAY */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((fp, idx) => {
            const planTitle = fp.floorName || `Floor Plan ${idx + 1}`;
            const primaryUrl = fp.imageUrl ?? fp.pdfUrl ?? '';
            const kind = primaryUrl ? detectPlanMediaKind(primaryUrl) : 'unknown';
            const previewUrl = primaryUrl ? getPlanPreviewUrl(primaryUrl, kind) : null;
            const pdfUrl = fp.pdfUrl;

            return (
              <div
                key={idx}
                className="group rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-xl hover:border-[#029bba]/30 transition-all duration-300 flex flex-col"
              >
                {/* Image Preview Container */}
                <div className="relative h-60 bg-[#f8fcfd] border-b border-gray-100 flex items-center justify-center p-4 overflow-hidden">
                  {previewUrl ? (
                    <button
                      type="button"
                      onClick={() => setSelectedViewerPlan({
                        title: planTitle,
                        imageUrl: previewUrl ?? (fp.imageUrl ? cleanCloudinaryUrl(fp.imageUrl) : undefined),
                        pdfUrl: pdfUrl ? cleanCloudinaryUrl(pdfUrl) : undefined,
                        description: fp.description,
                      })}
                      className="w-full h-full relative block"
                      aria-label={`Expand ${planTitle}`}
                    >
                      <img
                        src={previewUrl}
                        alt={planTitle}
                        className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md text-[#001f2b] text-xs font-black uppercase tracking-wider shadow-lg">
                          <Maximize2 className="w-3.5 h-3.5 text-[#029bba]" />
                          Fullscreen View
                        </span>
                      </div>
                    </button>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-6">
                      <div className="w-14 h-16 rounded-xl bg-white border-2 border-dashed border-[#029bba]/30 flex flex-col items-center justify-center shadow-sm mb-3">
                        <FileText className="w-7 h-7 text-[#029bba]" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-[#029bba] mt-0.5">PDF</span>
                      </div>
                      <p className="text-xs font-bold text-gray-700">{planTitle}</p>
                      <p className="text-[10px] text-gray-400 mt-1">Official Document</p>
                    </div>
                  )}

                  {/* Floor number / Type Badge */}
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    {fp.floorType && (
                      <span className="px-2.5 py-1 rounded-lg bg-white/95 backdrop-blur-sm border border-gray-200 text-[10px] font-black uppercase tracking-wider text-gray-700 shadow-sm">
                        {fp.floorType}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Content Footer */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base group-hover:text-[#029bba] transition-colors leading-tight">
                      {planTitle}
                    </h3>
                    {fp.description && (
                      <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
                        {fp.description}
                      </p>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedViewerPlan({
                        title: planTitle,
                        imageUrl: previewUrl ?? (fp.imageUrl ? cleanCloudinaryUrl(fp.imageUrl) : undefined),
                        pdfUrl: pdfUrl ? cleanCloudinaryUrl(pdfUrl) : undefined,
                        description: fp.description,
                      })}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#029bba] hover:text-[#027a94] transition-colors"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      Expand
                    </button>

                    {pdfUrl && (
                      <button
                        onClick={() => downloadFile(pdfUrl, `${project.slug}-${planTitle.toLowerCase().replace(/\s+/g, '-')}.pdf`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-[#029bba]/10 text-gray-700 hover:text-[#029bba] text-xs font-bold border border-gray-200 transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                        PDF
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FULLSCREEN LIGHTBOX MODAL */}
      {selectedViewerPlan && (
        <FloorPlanLightboxModal
          plan={selectedViewerPlan}
          onClose={() => setSelectedViewerPlan(null)}
          onInquire={onInquire}
        />
      )}
    </section>
  );
}

// ============================================================================
// INNER LIGHTBOX MODAL (ZOOM CONTROLS)
// ============================================================================

interface FloorPlanLightboxModalProps {
  plan: {
    title: string;
    imageUrl?: string;
    pdfUrl?: string;
    description?: string;
  };
  onClose: () => void;
  onInquire?: (title: string) => void;
}

function FloorPlanLightboxModal({ plan, onClose, onInquire }: FloorPlanLightboxModalProps) {
  const [zoom, setZoom] = useState(1);
  const backdropPointerDown = useRef(false);
  
  // Pan & Zoom States
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handler);
    };
  }, [onClose]);

  const handlePointerDown = (e: React.PointerEvent<HTMLImageElement>) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLImageElement>) => {
    if (!isDragging || zoom <= 1) return;
    setPan({
      x: dragStart.current.panX + (e.clientX - dragStart.current.x) / zoom,
      y: dragStart.current.panY + (e.clientY - dragStart.current.y) / zoom
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLImageElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      className="fixed inset-0 z-[140] bg-[#001f2b]/95 backdrop-blur-md flex flex-col animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      {/* Strict Origin Backdrop Guard */}
      <div 
        className="absolute inset-0 z-0 cursor-pointer"
        onPointerDown={() => { backdropPointerDown.current = true; }}
        onPointerUp={() => {
          if (backdropPointerDown.current) onClose();
          backdropPointerDown.current = false;
        }}
      />
      {/* Lightbox Topbar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-white/10 bg-black/30">
        <div className="min-w-0 pr-4">
          <h3 className="text-white font-black text-base md:text-lg truncate">
            {plan.title}
          </h3>
          {plan.description && (
            <p className="text-xs text-white/60 line-clamp-1 max-w-xl mt-0.5">
              {plan.description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {plan.imageUrl && (
            <div className="flex items-center bg-white/10 rounded-xl p-1 border border-white/10 mr-2">
              <button
                onClick={() => {
                  setZoom(z => {
                    const newZ = Math.max(1, +(z - 0.5).toFixed(1));
                    if (newZ === 1) setPan({ x: 0, y: 0 });
                    return newZ;
                  });
                }}
                aria-label="Zoom out"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-bold text-white px-2 tabular-nums">
                {zoom}x
              </span>
              <button
                onClick={() => setZoom(z => Math.min(4, +(z + 0.5).toFixed(1)))}
                aria-label="Zoom in"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          )}

          {onInquire && (
            <button
              onClick={() => { onClose(); onInquire(plan.title); }}
              className="px-4 py-2 rounded-xl bg-[#029bba] hover:bg-[#017a94] text-white text-xs font-black uppercase tracking-wider transition-colors shadow-lg flex items-center gap-2"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Inquire
            </button>
          )}

          {plan.pdfUrl && (
            <a
              href={plan.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Open Original PDF</span>
            </a>
          )}

          <button
            onClick={onClose}
            aria-label="Close viewer"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Lightbox Viewer Frame */}
      <div 
        className="relative z-10 flex-1 overflow-hidden p-4 flex items-center justify-center"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {plan.imageUrl ? (
          <img
            src={plan.imageUrl}
            alt={plan.title}
            draggable={false}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ 
              transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
              transition: isDragging ? 'none' : 'transform 0.2s ease-in-out',
              cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
              touchAction: 'none'
            }}
            className={`object-contain rounded-lg shadow-2xl ${
              zoom > 1 ? 'max-w-none' : 'max-w-full max-h-[80vh]'
            }`}
          />
        ) : plan.pdfUrl ? (
          <iframe
            src={plan.pdfUrl}
            className="w-full h-full max-w-5xl rounded-2xl bg-white border-0 shadow-2xl"
            title={plan.title}
          />
        ) : null}
      </div>
    </div>
  );
}