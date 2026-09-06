// components/admin/DocumentsSection.tsx

import React from 'react';
import { FileText, Info, Layers, Plus, X, Search } from 'lucide-react';
import FileUploader from './FileUploader';

// Type for a single document
interface DocumentFile {
  url: string;
  publicId: string;
}

// Floor-wise price list image
export interface FloorWisePriceImage {
  url:     string;
  caption: string; // floor label (dropdown)
}

// Type for all project documents
export interface ProjectDocuments {
  brochureUrl?: string;
  brochurePublicId?: string;
  priceListUrl?: string;
  priceListPublicId?: string;
  paymentPlanUrl?: string;
  paymentPlanPublicId?: string;
  masterPlanUrl?: string;
  masterPlanPublicId?: string;
  nocDocumentUrl?: string;
  nocDocumentPublicId?: string;
  // NEW: Floor-wise price list images (frontend consistent)
  floorWisePriceImages?: FloorWisePriceImage[];
}

// Floor labels — SAME list as PaymentPlanImagesEditor (frontend consistency)
const FLOOR_PRICE_LABELS = [
  'Lower Ground — Parking & Storage Prices',
  'Ground Floor — Shops Prices',
  'Ground Floor — Apartments Prices',
  'Mezzanine Floor — Shops Prices',
  '1st to 5th Floors — Apartments Prices',
  '6th to 15th Floors (Typical) — Apartments Prices',
  '16th to 25th Floors (Typical) — Apartments Prices',
  'Penthouse Floor Prices',
  'Complete Price List — All Floors',
  'Booking & Installment Schedule',
] as const;

const FLOOR_LABEL_CUSTOM = '__custom__';

interface DocumentsSectionProps {
  documents: ProjectDocuments;
  onChange: (documents: ProjectDocuments) => void;
  projectSlug?: string;
  disabled?: boolean;
}

export default function DocumentsSection({
  documents,
  onChange,
  projectSlug = 'general',
  disabled = false,
}: DocumentsSectionProps) {

  const updateDocument = (
    urlKey: keyof ProjectDocuments,
    publicIdKey: keyof ProjectDocuments,
    file: { url: string; publicId: string } | null
  ) => {
    onChange({
      ...documents,
      [urlKey]: file?.url || '',
      [publicIdKey]: file?.publicId || '',
    });
  };

  const getDocumentValue = (
    urlKey: keyof ProjectDocuments,
    publicIdKey: keyof ProjectDocuments
  ): { url: string; publicId: string } | null => {
    const url = documents[urlKey];
    const publicId = documents[publicIdKey];
    if (url && publicId) {
      return { url: url as string, publicId: publicId as string };
    }
    return null;
  };

  // ── Floor-wise price images handlers ──
  const addFloorImage = (img: FloorWisePriceImage) => {
    const existing = documents.floorWisePriceImages ?? [];
    onChange({
      ...documents,
      floorWisePriceImages: [...existing, img],
    });
  };

  const updateFloorImage = (index: number, updates: Partial<FloorWisePriceImage>) => {
    const existing = documents.floorWisePriceImages ?? [];
    const updated = existing.map((img, i) =>
      i === index ? { ...img, ...updates } : img
    );
    onChange({ ...documents, floorWisePriceImages: updated });
  };

  const removeFloorImage = (index: number) => {
    const existing = documents.floorWisePriceImages ?? [];
    onChange({
      ...documents,
      floorWisePriceImages: existing.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-[#029bba]/10 to-transparent border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#029bba] flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Project Documents
            </h3>
            <p className="text-sm text-gray-500">
              Upload brochures, price lists, and floor-wise pricing documents
            </p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mx-6 mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <p className="font-medium">Tip: Upload PDF files for best results</p>
          <p className="text-blue-600 mt-0.5">
            These documents will be available for download on the project page.
            Maximum file size: 10MB per file.
          </p>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* ═══ SECTION A: Standard Documents (PDFs) ═══ */}
        <div>
          <h4 className="text-sm font-bold text-[#004063] uppercase tracking-wide mb-4">
            Standard Documents
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FileUploader
              label="Project Brochure"
              accept="pdf"
              folder={`projects/${projectSlug}/documents`}
              value={getDocumentValue('brochureUrl', 'brochurePublicId')}
              onChange={(file) =>
                updateDocument('brochureUrl', 'brochurePublicId', file)
              }
              helpText="Main project brochure with all details"
              disabled={disabled}
            />

            <FileUploader
              label="Master Plan / Layout"
              accept="pdf"
              folder={`projects/${projectSlug}/documents`}
              value={getDocumentValue('masterPlanUrl', 'masterPlanPublicId')}
              onChange={(file) =>
                updateDocument('masterPlanUrl', 'masterPlanPublicId', file)
              }
              helpText="Project layout and master plan"
              disabled={disabled}
            />

            <FileUploader
              label="NOC / Approval Document"
              accept="pdf"
              folder={`projects/${projectSlug}/documents`}
              value={getDocumentValue('nocDocumentUrl', 'nocDocumentPublicId')}
              onChange={(file) =>
                updateDocument('nocDocumentUrl', 'nocDocumentPublicId', file)
              }
              helpText="NOC or approval letter from authority"
              disabled={disabled}
            />

            <FileUploader
              label="Payment Plan (Overall)"
              accept="pdf"
              folder={`projects/${projectSlug}/documents`}
              value={getDocumentValue('paymentPlanUrl', 'paymentPlanPublicId')}
              onChange={(file) =>
                updateDocument('paymentPlanUrl', 'paymentPlanPublicId', file)
              }
              helpText="Overall installment and payment schedule"
              disabled={disabled}
            />
          </div>
        </div>

        {/* ═══ SECTION B: Floor-Wise Price Lists (images) ═══ */}
        <div className="border-t border-gray-100 pt-6">
          <h4 className="text-sm font-bold text-[#004063] uppercase tracking-wide mb-2 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#029bba]" />
            Floor-Wise Price Lists
          </h4>
          <p className="text-xs text-gray-500 mb-4">
            Upload price list images per floor — buyers see these on the project page with clear labels.
          </p>

          {(documents.floorWisePriceImages ?? []).map((img, index) => (
            <div key={index} className="relative rounded-xl border border-gray-200 bg-white p-4 mb-3">
              <button
                type="button"
                onClick={() => removeFloorImage(index)}
                disabled={disabled}
                className="absolute top-3 right-3 p-1.5 text-[#ef4444] hover:bg-[#fef2f2] rounded-lg transition-colors"
                aria-label="Remove"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative w-full md:w-56 h-32 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 shrink-0">
                  <img src={img.url} alt={img.caption || 'Floor price list'} className="w-full h-full object-contain" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[#333333] mb-1.5">Floor Label</label>
                  <select
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-[#333333]
                               focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none"
                    value={
                      (FLOOR_PRICE_LABELS as readonly string[]).includes(img.caption)
                        ? img.caption
                        : img.caption
                          ? FLOOR_LABEL_CUSTOM
                          : ''
                    }
                    onChange={(e) =>
                      updateFloorImage(index, {
                        caption: e.target.value === FLOOR_LABEL_CUSTOM ? '' : e.target.value,
                      })
                    }
                    disabled={disabled}
                  >
                    <option value="">Select floor label</option>
                    {FLOOR_PRICE_LABELS.map((label) => (
                      <option key={label} value={label}>{label}</option>
                    ))}
                    <option value={FLOOR_LABEL_CUSTOM}>Custom Label...</option>
                  </select>

                  {(img.caption === '' || !(FLOOR_PRICE_LABELS as readonly string[]).includes(img.caption)) && (
                    <input
                      type="text"
                      className="w-full mt-2 px-4 py-3 rounded-xl border border-gray-200 text-sm text-[#333333]
                                 focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none"
                      placeholder="e.g. Lower Ground Price List"
                      value={img.caption}
                      onChange={(e) => updateFloorImage(index, { caption: e.target.value })}
                      disabled={disabled}
                      maxLength={150}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Add floor price image — FileUploader */}
          <FileUploader
            label="Add Floor Price List Image"
            accept="image"
            folder={`projects/${projectSlug}/floor-prices`}
            value={null}
            onChange={(file) => {
              if (file) addFloorImage({ url: file.url, caption: '' });
            }}
            helpText="Upload floor price image — label selected after upload"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Footer Summary */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-sm">
        <span className="text-gray-500">
          Documents uploaded:{' '}
          <span className="font-medium text-gray-700">
            {[documents.brochureUrl, documents.priceListUrl, documents.paymentPlanUrl, documents.masterPlanUrl, documents.nocDocumentUrl]
              .filter(Boolean).length}
          </span>
        </span>
        <span className="text-gray-400">
          Floor price images:{' '}
          <span className="font-medium text-gray-700">
            {(documents.floorWisePriceImages ?? []).length}
          </span>
        </span>
      </div>
    </div>
  );
}