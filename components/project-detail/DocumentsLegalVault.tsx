// components/project-detail/DocumentsLegalVault.tsx
// ============================================================================
// HIGHRISE.PK — DOCUMENTS & LEGAL VAULT (Priority 3 Enterprise Upgrade)
// Bifurcated Statutory vs Collateral Vault · Inline PDF Lightbox · Lead Inquiries
// ============================================================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  FileText,
  ShieldCheck,
  Eye,
  X,
  MessageCircle,
  BadgeCheck,
  FileSpreadsheet,
  Map,
  Award,
  BookOpen,
} from 'lucide-react';
import type { ProjectDetailData } from '@/types/projectDetail';

interface DocumentsLegalVaultProps {
  project: ProjectDetailData;
  onInquire?: (docName: string) => void;
}

interface DocItem {
  id: string;
  name: string;
  category: 'legal' | 'collateral';
  url: string;
  suffix: string;
  badge?: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
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

  const transform = 'f_jpg,pg_1,w_1600,c_limit,q_auto';
  return `${baseUrl}${transform}/${path}`;
}

function getEmbeddableDocumentUrl(url: string): { embedUrl: string; isImage: boolean } {
  if (!url) return { embedUrl: '', isImage: false };
  const clean = cleanCloudinaryUrl(url);

  // If already an image
  if (/\.(png|jpe?g|webp|gif|avif|bmp)(\?.*)?$/i.test(clean)) {
    return { embedUrl: clean, isImage: true };
  }

  // Cloudinary PDF -> High-res JPG Page 1 (100% immune to download prompts)
  if (clean.includes('cloudinary.com')) {
    const jpgUrl = buildCloudinaryJpg(clean, true);
    if (jpgUrl) {
      return { embedUrl: jpgUrl, isImage: true };
    }
  }

  // Universal Fallback for external PDFs: Google Docs Viewer iframe
  return {
    embedUrl: `https://docs.google.com/gview?url=${encodeURIComponent(clean)}&embedded=true`,
    isImage: false,
  };
}

export default function DocumentsLegalVault({
  project,
  onInquire,
}: DocumentsLegalVaultProps): React.ReactElement | null {
  const [activeTab, setActiveTab] = useState<'all' | 'legal' | 'collateral'>('all');
  const [previewDoc, setPreviewDoc] = useState<DocItem | null>(null);

  const legalDocs = project.legalDocs;
  const projectDocs = project.projectDocuments;

  // Build documents list
  const allDocs = useMemo(() => {
    const list: DocItem[] = [];

    // Legal / Statutory Docs
    if (legalDocs?.nocUrl) {
      list.push({
        id: 'noc',
        name: 'NOC Approval Certificate',
        category: 'legal',
        url: cleanCloudinaryUrl(legalDocs.nocUrl),
        suffix: '-noc.pdf',
        badge: project.nocStatus === 'approved' ? 'Verified Approved' : 'NOC Document',
        description: 'Official No Objection Certificate issued by housing authority.',
        icon: ShieldCheck,
      });
    }
    if (legalDocs?.secpCertUrl) {
      list.push({
        id: 'secp',
        name: 'SECP Registration Cert',
        category: 'legal',
        url: cleanCloudinaryUrl(legalDocs.secpCertUrl),
        suffix: '-secp.pdf',
        badge: 'SECP Registered',
        description: 'Corporate registration & incorporation credentials with SECP.',
        icon: BadgeCheck,
      });
    }
    if (legalDocs?.layoutMapUrl) {
      list.push({
        id: 'layout',
        name: 'Approved Layout Map',
        category: 'legal',
        url: cleanCloudinaryUrl(legalDocs.layoutMapUrl),
        suffix: '-layout-map.pdf',
        badge: 'Sanctioned Map',
        description: 'Sanctioned master layout plan verified by local authority.',
        icon: Map,
      });
    }
    if (legalDocs?.environmentCertUrl) {
      list.push({
        id: 'env',
        name: 'Environmental Clearance',
        category: 'legal',
        url: cleanCloudinaryUrl(legalDocs.environmentCertUrl),
        suffix: '-env-cert.pdf',
        badge: 'EPA Cleared',
        description: 'Environmental Impact Assessment clearance certificate.',
        icon: Award,
      });
    }
    if (legalDocs?.authorityLicenseUrl) {
      list.push({
        id: 'license',
        name: 'Developer Authority License',
        category: 'legal',
        url: cleanCloudinaryUrl(legalDocs.authorityLicenseUrl),
        suffix: '-license.pdf',
        badge: 'Licensed Builder',
        description: 'Official developer license to construct & sell real estate.',
        icon: BadgeCheck,
      });
    }

    // Collateral / Marketing Docs
    if (projectDocs?.brochureUrl) {
      list.push({
        id: 'brochure',
        name: 'Official Project Brochure',
        category: 'collateral',
        url: cleanCloudinaryUrl(projectDocs.brochureUrl),
        suffix: '-brochure.pdf',
        badge: 'E-Brochure',
        description: 'High-res presentation of amenities, finishes & specs.',
        icon: BookOpen,
      });
    }
    if (projectDocs?.priceListUrl) {
      list.push({
        id: 'pricelist',
        name: 'Master Price List',
        category: 'collateral',
        url: cleanCloudinaryUrl(projectDocs.priceListUrl),
        suffix: '-price-list.pdf',
        badge: 'Current Prices',
        description: 'Official unit tier pricing and schedule matrix.',
        icon: FileSpreadsheet,
      });
    }
    if (projectDocs?.masterPlanUrl) {
      list.push({
        id: 'masterplan',
        name: 'Site Master Plan',
        category: 'collateral',
        url: cleanCloudinaryUrl(projectDocs.masterPlanUrl),
        suffix: '-master-plan.pdf',
        badge: 'Architectural',
        description: 'Site plan showing tower placements, roads & green zones.',
        icon: Map,
      });
    }
    if (projectDocs?.paymentPlanUrl) {
      list.push({
        id: 'paymentplan',
        name: 'Detailed Payment Schedule',
        category: 'collateral',
        url: cleanCloudinaryUrl(projectDocs.paymentPlanUrl),
        suffix: '-payment-plan.pdf',
        badge: 'Installment Terms',
        description: 'Complete breakdown of down payment & quarterly installments.',
        icon: FileText,
      });
    }

    return list;
  }, [legalDocs, projectDocs, project.nocStatus]);

  const filteredDocs = useMemo(() => {
    if (activeTab === 'all') return allDocs;
    return allDocs.filter((d) => d.category === activeTab);
  }, [allDocs, activeTab]);

  const legalCount = allDocs.filter((d) => d.category === 'legal').length;
  const collateralCount = allDocs.filter((d) => d.category === 'collateral').length;

  if (allDocs.length === 0) return null;

  return (
    <section
      id="legal"
      className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden scroll-mt-24 font-sans"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#f8fcfd]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#029bba]/10 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-[#029bba]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 leading-tight">
              Documents &amp; Legal Vault
            </h2>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Verified statutory approvals and official project collateral
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-[#029bba] text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            All ({allDocs.length})
          </button>
          {legalCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('legal')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                activeTab === 'legal'
                  ? 'bg-[#029bba] text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Legal &amp; NOC ({legalCount})
            </button>
          )}
          {collateralCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('collateral')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                activeTab === 'collateral'
                  ? 'bg-[#029bba] text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Collateral ({collateralCount})
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocs.map((doc) => {
            const Icon = doc.icon;
            return (
              <div
                key={doc.id}
                className="group p-4 rounded-xl border border-gray-200 bg-white hover:border-[#029bba]/40 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#f4f9fb] border border-gray-100 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-[#029bba]" />
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm truncate group-hover:text-[#029bba] transition-colors">
                        {doc.name}
                      </h3>
                    </div>
                    {doc.badge && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 shrink-0">
                        {doc.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                    {doc.description}
                  </p>
                </div>

                {/* Actions — Strictly View Only */}
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(doc)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#029bba]/10 hover:bg-[#029bba] text-[#029bba] hover:text-white text-xs font-bold transition-all shadow-sm"
                  >
                    <Eye className="w-4 h-4" />
                    View Document
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Preview Lightbox Modal */}
      {previewDoc && (
        <DocumentPreviewModal
          doc={previewDoc}
          project={project}
          onClose={() => setPreviewDoc(null)}
          onInquire={onInquire}
        />
      )}
    </section>
  );
}

// ============================================
// INLINE DOCUMENT PREVIEW LIGHTBOX
// ============================================

interface DocumentPreviewModalProps {
  doc: DocItem;
  project: ProjectDetailData;
  onClose: () => void;
  onInquire?: (docName: string) => void;
}

function DocumentPreviewModal({
  doc,
  project,
  onClose,
  onInquire,
}: DocumentPreviewModalProps) {
  const backdropPointerDown = useRef(false);

  const { embedUrl, isImage } = useMemo(() => {
    return getEmbeddableDocumentUrl(doc.url);
  }, [doc.url]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handler);
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 font-sans animate-fadeIn">
      {/* Backdrop Layer — Strict origin check */}
      <div
        className="absolute inset-0 z-0 cursor-pointer"
        onPointerDown={() => {
          backdropPointerDown.current = true;
        }}
        onPointerUp={() => {
          if (backdropPointerDown.current) onClose();
          backdropPointerDown.current = false;
        }}
      />

      {/* Content Layer */}
      <div
        role="dialog"
        onPointerDown={(e) => e.stopPropagation()}
        className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden cursor-default"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-[#f8fcfd] flex items-center justify-between shrink-0">
          <div className="min-w-0 pr-4">
            <h3 className="text-lg font-black text-[#001f2b] flex items-center gap-2 truncate">
              {doc.name}
              {doc.badge && (
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20">
                  {doc.badge}
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5 truncate">
              {project.projectName} · Official Document Verification
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onInquire && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onInquire(doc.name);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#029bba] hover:bg-[#017a94] text-white text-xs font-black uppercase tracking-wider transition-colors shadow-sm flex items-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Inquire
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
              title="Close Viewer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PDF / Document Frame */}
        <div className="flex-1 bg-gray-100 overflow-auto p-4 flex items-center justify-center relative">
          {isImage ? (
            <img
              src={embedUrl}
              alt={doc.name}
              className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-md mx-auto"
            />
          ) : (
            <iframe
              src={embedUrl}
              className="w-full h-full border-0 rounded-lg shadow-md"
              title={doc.name}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}