// components/admin/DocumentsSection.tsx

import React from 'react';
import { FileText, Info } from 'lucide-react';
import FileUploader from './FileUploader';

// Type for a single document
interface DocumentFile {
  url: string;
  publicId: string;
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
}

interface DocumentsSectionProps {
  documents: ProjectDocuments;
  onChange: (documents: ProjectDocuments) => void;
  projectSlug?: string; // For folder organization
  disabled?: boolean;
}

export default function DocumentsSection({
  documents,
  onChange,
  projectSlug = 'general',
  disabled = false,
}: DocumentsSectionProps) {
  
  // Helper to update a specific document
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

  // Helper to get document value for FileUploader
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
              Upload brochures, price lists, and other important documents
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

      {/* Documents Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Brochure */}
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

          {/* Price List */}
          <FileUploader
            label="Price List"
            accept="pdf"
            folder={`projects/${projectSlug}/documents`}
            value={getDocumentValue('priceListUrl', 'priceListPublicId')}
            onChange={(file) =>
              updateDocument('priceListUrl', 'priceListPublicId', file)
            }
            helpText="Current pricing for all unit types"
            disabled={disabled}
          />

          {/* Payment Plan */}
          <FileUploader
            label="Payment Plan"
            accept="pdf"
            folder={`projects/${projectSlug}/documents`}
            value={getDocumentValue('paymentPlanUrl', 'paymentPlanPublicId')}
            onChange={(file) =>
              updateDocument('paymentPlanUrl', 'paymentPlanPublicId', file)
            }
            helpText="Installment and payment schedule details"
            disabled={disabled}
          />

          {/* Master Plan */}
          <FileUploader
            label="Master Plan / Layout"
            accept="pdf"
            folder={`projects/${projectSlug}/documents`}
            value={getDocumentValue('masterPlanUrl', 'masterPlanPublicId')}
            onChange={(file) =>
              updateDocument('masterPlanUrl', 'masterPlanPublicId', file)
            }
            helpText="Overall project layout and master plan"
            disabled={disabled}
          />

          {/* NOC Document */}
          <FileUploader
            label="NOC / Approval Document"
            accept="pdf"
            folder={`projects/${projectSlug}/documents`}
            value={getDocumentValue('nocDocumentUrl', 'nocDocumentPublicId')}
            onChange={(file) =>
              updateDocument('nocDocumentUrl', 'nocDocumentPublicId', file)
            }
            helpText="Official NOC or approval certificate (optional)"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Footer Stats */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Documents uploaded:{' '}
            <span className="font-medium text-gray-700">
              {[
                documents.brochureUrl,
                documents.priceListUrl,
                documents.paymentPlanUrl,
                documents.masterPlanUrl,
                documents.nocDocumentUrl,
              ].filter(Boolean).length}{' '}
              / 5
            </span>
          </span>
          <span className="text-gray-400">PDF format recommended</span>
        </div>
      </div>
    </div>
  );
}
