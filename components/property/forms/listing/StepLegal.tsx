// components/property/forms/listing/StepLegal.tsx
//
// Step 4: Legal + Media + Contact + Declaration (FINAL)
// Legal: ownership type, file type, documents, disputes, tax, society
// Media: images (multi-upload + room labels), video URLs
// Contact: person, phone, whatsapp, show phone
// Declaration: checkbox → submit

'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  FileText, Upload, Loader2, X, Camera, Video,
  User, Phone, MessageCircle, Shield, CheckCircle,
} from 'lucide-react';

import type { ListingFormState } from './types';
import { ROOM_TYPE_LABELS } from '@/components/admin/ProjectGallerySection';

interface StepLegalProps {
  form: ListingFormState;
  setField: <K extends keyof ListingFormState>(key: K, value: ListingFormState[K]) => void;
  errors: Record<string, string>;
}

const inputCls = 'w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none';
const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5';

const OWNERSHIP_OPTIONS = [
  { value: 'freehold', label: 'Freehold' },
  { value: 'leasehold', label: 'Leasehold' },
  { value: 'power_of_attorney', label: 'Power of Attorney' },
] as const;

const FILE_TYPE_OPTIONS = [
  { value: '', label: 'Select file type' },
  { value: 'open_file', label: 'Open File' },
  { value: 'allocation', label: 'Allocation Letter' },
  { value: 'affidavit', label: 'Affidavit' },
  { value: 'registry', label: 'Registry' },
  { value: 'lease', label: 'Lease Agreement' },
] as const;

const DOC_CHECKLIST = [
  'Registry / Sale Deed',
  'Allotment Letter',
  'NOC from Society',
  'Transfer Letter',
  'Possession Letter',
  'Site Plan Approved',
] as const;

// Feature image uploader — single file (separate from gallery)
function FeatureImageUpload({ onUploaded }: {
  onUploaded: (img: { url: string; public_id: string }) => void;
}): React.ReactElement {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File): Promise<void> => {
    if (file.size > 10 * 1024 * 1024) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file, file.name);
      const res = await fetch('/api/upload?folder=properties', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = (await res.json()) as {
        success: boolean;
        data?: { url: string; publicId: string };
      };
      if (data.success && data.data) {
        onUploaded({ url: data.data.url, public_id: data.data.publicId });
      }
    } catch {
      // silent
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full border-2 border-dashed border-gray-300 rounded-xl py-5 text-center
                   hover:border-[#029bba] transition-colors disabled:opacity-50"
      >
        {uploading ? (
          <Loader2 className="w-6 h-6 text-[#029bba] animate-spin mx-auto" />
        ) : (
          <>
            <Upload className="w-6 h-6 text-gray-300 mx-auto mb-1" />
            <p className="text-xs text-gray-500 font-medium">Upload cover photo</p>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) void upload(e.target.files[0]); }}
      />
    </>
  );
}

export default function StepLegal({ form, setField, errors }: StepLegalProps): React.ReactElement {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Image upload handler ──
  const handleUpload = async (files: FileList): Promise<void> => {
    const fileArray = Array.from(files).slice(0, 10);
    if (fileArray.length === 0) return;
    setUploading(true);
    setUploadError(null);

    try {
      const uploaded: Array<{ url: string; public_id: string; caption: string }> = [];
      for (const file of fileArray) {
        if (file.size > 10 * 1024 * 1024) {
          setUploadError(`"${file.name}" is too large — max 10MB.`);
          continue;
        }
        const formData = new FormData();
        formData.append('file', file, file.name);
        const res = await fetch('/api/upload?folder=properties', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
        const data = (await res.json()) as {
          success: boolean;
          data?: { url: string; publicId: string };
          message?: string;
        };
        if (data.success && data.data) {
          uploaded.push({ url: data.data.url, public_id: data.data.publicId, caption: '' });
        } else {
          setUploadError(data.message ?? `Failed to upload "${file.name}".`);
        }
      }
      if (uploaded.length > 0) {
        setField('images', [...form.images, ...uploaded].slice(0, 15));
      }
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  // ── Caption update ──
  const updateCaption = (index: number, caption: string): void => {
    const updated = form.images.map((img, i) => (i === index ? { ...img, caption } : img));
    setField('images', updated);
  };

  // ── Remove image ──
  const removeImage = (index: number): void => {
    setField('images', form.images.filter((_, i) => i !== index));
  };

  // ── Toggle document ──
  const toggleDoc = (doc: string): void => {
    const current = form.documentsAvailable;
    setField('documentsAvailable', current.includes(doc)
      ? current.filter((d) => d !== doc)
      : [...current, doc]
    );
  };

  return (
    <div className="space-y-8">
      {/* ═══ LEGAL ═══ */}
      <div className="rounded-xl border border-gray-200 p-5">
        <h4 className="font-semibold text-[#004063] mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#029bba]" />
          Legal & Ownership
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelCls}>Ownership Type</label>
            <select
              value={form.ownershipType}
              onChange={(e) => setField('ownershipType', e.target.value)}
              className={inputCls}
            >
              {OWNERSHIP_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>File Type</label>
            <select
              value={form.fileType}
              onChange={(e) => setField('fileType', e.target.value)}
              className={inputCls}
            >
              {FILE_TYPE_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Documents checklist */}
        <div className="mb-4">
          <label className={labelCls}>Available Documents</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {DOC_CHECKLIST.map((doc) => (
              <button
                key={doc}
                type="button"
                onClick={() => toggleDoc(doc)}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
                  form.documentsAvailable.includes(doc)
                    ? 'border-[#029bba] bg-[#029bba]/5'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <span className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                  form.documentsAvailable.includes(doc)
                    ? 'border-[#029bba] bg-[#029bba]'
                    : 'border-gray-300'
                }`}>
                  {form.documentsAvailable.includes(doc) && (
                    <CheckCircle className="w-3 h-3 text-white" />
                  )}
                </span>
                <span className="text-xs font-medium text-gray-700">{doc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-700">Any Dispute?</p>
              <button
                type="button"
                onClick={() => setField('hasDispute', !form.hasDispute)}
                className={`mt-1 px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  form.hasDispute ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {form.hasDispute ? 'Yes — has dispute' : 'No dispute'}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-700">Property Tax Paid</p>
              <button
                type="button"
                onClick={() => setField('taxPaidUpToDate', !form.taxPaidUpToDate)}
                className={`mt-1 px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  form.taxPaidUpToDate ? 'bg-[#029bba] text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {form.taxPaidUpToDate ? 'Up to date' : 'Not paid'}
              </button>
            </div>
          </div>
        </div>

        {form.hasDispute && (
          <div className="mt-3">
            <label className={labelCls}>Dispute Details</label>
            <textarea
              value={form.disputeDetails}
              onChange={(e) => setField('disputeDetails', e.target.value)}
              placeholder="Nature of dispute (court case, society dispute, etc.)"
              rows={2}
              maxLength={500}
              className={inputCls}
            />
          </div>
        )}
      </div>

      {/* ═══ MEDIA ═══ */}
      <div className="rounded-xl border border-gray-200 p-5">
        <h4 className="font-semibold text-[#004063] mb-4 flex items-center gap-2">
          <Camera className="w-5 h-5 text-[#029bba]" />
          Property Media
        </h4>

        {/* Feature Image (cover) — hero on listing cards */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Feature Image (Cover Photo) <span className="text-red-500">*</span>
          </label>
          <div className="max-w-md">
            {form.featureImage ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-200 group">
                <img
                  src={form.featureImage.url}
                  alt="Feature cover"
                  className="w-full h-36 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setField('featureImage', null)}
                  className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full
                             opacity-0 group-hover:opacity-100 transition-opacity z-20"
                  aria-label="Remove feature image"
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-[#029bba] text-white text-[9px] font-bold rounded">
                  COVER
                </div>
              </div>
            ) : (
              <FeatureImageUpload
                onUploaded={(img) => setField('featureImage', img)}
              />
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            Hero image on search cards — first impression for buyers
          </p>
          {errors.featureImage && <p className="text-xs text-red-500 mt-1">{errors.featureImage}</p>}
        </div>

        {/* Gallery Images — room labels per image */}
        <p className="text-xs text-gray-500 font-semibold mb-2">
          Property Pictures ({form.images.length}/15) — room labels on each
        </p>

        {/* Upload button */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || form.images.length >= 15}
          className="w-full border-2 border-dashed border-gray-300 rounded-xl py-6 text-center
                     hover:border-[#029bba] transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="w-8 h-8 text-[#029bba] animate-spin mx-auto" />
          ) : (
            <>
              <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500 font-medium">
                Click to upload property images
              </p>
              <p className="text-xs text-gray-400 mt-1">
                JPG, PNG, WebP — max 10MB each, 15 total
              </p>
            </>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files) void handleUpload(e.target.files); }}
        />

        {uploadError && (
          <p className="text-xs text-red-500 mt-2">{uploadError}</p>
        )}

        {/* Image grid with room labels */}
        {form.images.length > 0 && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {form.images.map((img, idx) => (
              <div key={idx} className="relative group rounded-xl overflow-hidden border border-gray-200">
                <img
                  src={img.url}
                  alt={img.caption || `Property image ${idx + 1}`}
                  className="w-full h-24 object-cover"
                />

                {/* Room label dropdown */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm
                                p-1 z-20">
                  <select
                    value={img.caption || ''}
                    onChange={(e) => updateCaption(idx, e.target.value)}
                    className="w-full text-[10px] font-bold text-white bg-transparent
                               border-none outline-none cursor-pointer
                               [&>option]:text-gray-800 [&>option]:bg-white"
                    aria-label={`Room type for image ${idx + 1}`}
                  >
                    <option value="">Label...</option>
                    {ROOM_TYPE_LABELS.map((label) => (
                      <option key={label} value={label}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full
                             opacity-0 group-hover:opacity-100 transition-opacity z-20"
                  aria-label="Remove image"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Video URLs */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>
              <Video className="w-4 h-4 inline mr-1" />
              Video URL
            </label>
            <input
              type="url"
              value={form.videoUrl}
              onChange={(e) => setField('videoUrl', e.target.value)}
              placeholder="YouTube / Vimeo"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Virtual Tour URL</label>
            <input
              type="url"
              value={form.virtualTourUrl}
              onChange={(e) => setField('virtualTourUrl', e.target.value)}
              placeholder="Matterport link"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Drone Video URL</label>
            <input
              type="url"
              value={form.droneVideoUrl}
              onChange={(e) => setField('droneVideoUrl', e.target.value)}
              placeholder="YouTube link"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* ═══ DESCRIPTION ═══ */}
      <div>
        <label className={labelCls}>
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={form.description}
          onChange={(e) => setField('description', e.target.value)}
          placeholder="Describe your property — location benefits, features, nearby landmarks..."
          rows={5}
          minLength={50}
          maxLength={5000}
          className={inputCls}
        />
        <p className="text-[11px] text-gray-400 mt-1">
          {form.description.length}/5000 — minimum 50 characters
        </p>
        {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
      </div>

      {/* ═══ CONTACT ═══ */}
      <div className="rounded-xl border border-gray-200 p-5">
        <h4 className="font-semibold text-[#004063] mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-[#029bba]" />
          Contact Details
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>
              <User className="w-4 h-4 inline mr-1" />
              Contact Person
            </label>
            <input
              type="text"
              value={form.contactPerson}
              onChange={(e) => setField('contactPerson', e.target.value)}
              placeholder="Your name"
              maxLength={120}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>
              <Phone className="w-4 h-4 inline mr-1" />
              Phone
            </label>
            <input
              type="tel"
              value={form.contactPhone}
              onChange={(e) => setField('contactPhone', e.target.value)}
              placeholder="e.g. 03001234567"
              maxLength={30}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>
              <MessageCircle className="w-4 h-4 inline mr-1" />
              WhatsApp
            </label>
            <input
              type="tel"
              value={form.contactWhatsapp}
              onChange={(e) => setField('contactWhatsapp', e.target.value)}
              placeholder="Same as phone if empty"
              maxLength={30}
              className={inputCls}
            />
          </div>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => setField('showPhoneOnListing', !form.showPhoneOnListing)}
            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
              form.showPhoneOnListing
                ? 'border-[#029bba] bg-[#029bba]/5'
                : 'border-gray-200 bg-white'
            }`}
          >
            <span className={form.showPhoneOnListing ? 'text-[#029bba]' : 'text-gray-400'}>
              <Phone className="w-5 h-5" />
            </span>
            <div className="flex-1 text-left">
              <p className={`text-sm font-semibold ${
                form.showPhoneOnListing ? 'text-[#029bba]' : 'text-gray-600'
              }`}>
                Show phone on listing
              </p>
              <p className="text-xs text-gray-400">
                {form.showPhoneOnListing
                  ? 'Buyers can call you directly'
                  : 'Inquiries routed through Highrise only'}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* --- FEATURED REQUEST (user request only; admin approves) --- */}
      <div className="rounded-xl border border-[#029bba]/20 bg-[#029bba]/5 p-4">
        <button
          type="button"
          onClick={() => setField('isFeaturedRequested', !form.isFeaturedRequested)}
          className="flex items-start gap-3 w-full text-left"
        >
          <span className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${
            form.isFeaturedRequested ? 'border-[#029bba] bg-[#029bba]' : 'border-gray-300 bg-white'
          }`}>
            {form.isFeaturedRequested && <CheckCircle className="w-3 h-3 text-white" />}
          </span>
          <div>
            <p className="text-sm font-semibold text-[#004063]">
              Request Featured Placement
            </p>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              Featured listings get higher visibility on Highrise.pk. This is a request only.
              Our admin team reviews quality and may approve featured placement.
              You cannot self-feature a listing.
            </p>
          </div>
        </button>
      </div>

      {/* --- DECLARATION --- */}
      <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
        <button
          type="button"
          onClick={() => setField('declaration', !form.declaration)}
          className="flex items-start gap-3 w-full text-left"
        >
          <span className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${
            form.declaration ? 'border-[#029bba] bg-[#029bba]' : 'border-gray-300 bg-white'
          }`}>
            {form.declaration && <CheckCircle className="w-3 h-3 text-white" />}
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-800">
              Declaration
            </p>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              I declare that I am the rightful owner/authorized person for this property,
              all information provided is accurate, and all documents are genuine.
              I understand that false information may result in listing removal and
              account suspension.
            </p>
          </div>
        </button>
        {errors.declaration && (
          <p className="text-xs text-red-500 mt-2">{errors.declaration}</p>
        )}
      </div>
    </div>
  );
}