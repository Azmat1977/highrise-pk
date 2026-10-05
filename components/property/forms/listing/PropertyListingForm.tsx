// components/property/forms/listing/PropertyListingForm.tsx
//
// Highrise.pk — Unified Property Listing Form (MAIN WIZARD)
// 4 steps: Type → Details → Pricing → Legal/Media/Contact
// Ek form — sab property types (13) + listing types (4)
// Replaces: DynamicPropertyForm, FullPaymentForm, InstallmentPropertyForm,
//           RentPropertyForm, UnifiedPropertyForm (delete after verification)

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  ChevronLeft, ChevronRight, Loader2, CheckCircle,
  Building2, Home, CreditCard, FileText, X,
} from 'lucide-react';

import type { ListingFormState, PropertyType, ListingType } from './types';
import { INITIAL_STATE } from './types';
import StepType from './StepType';
import StepDetails from './StepDetails';
import StepPricing from './StepPricing';
import StepLegal from './StepLegal';

// ─── Steps config ───
const STEPS = [
  { id: 1, label: 'Type & Location', icon: Building2 },
  { id: 2, label: 'Details', icon: Home },
  { id: 3, label: 'Pricing', icon: CreditCard },
  { id: 4, label: 'Legal & Media', icon: FileText },
] as const;

interface PropertyListingFormProps {
  editId?: string;
  initialState?: ListingFormState | null;
}

export default function PropertyListingForm({
  editId,
  initialState,
}: PropertyListingFormProps): React.ReactElement {
  const router = useRouter();

  const [form, setForm] = useState<ListingFormState>(initialState || INITIAL_STATE);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Field setter ──
  const setField = useCallback(
    <K extends keyof ListingFormState>(key: K, value: ListingFormState[K]): void => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        if (!prev[key as string]) return prev;
        const next = { ...prev };
        delete next[key as string];
        return next;
      });
    },
    []
  );

  // ── Validation per step ──
  const validateStep = useCallback(
    (stepNum: number): boolean => {
      const newErrors: Record<string, string> = {};

      if (stepNum === 1) {
        if (!form.propertyType) newErrors.propertyType = 'Select a property type.';
        if (!form.listingType) newErrors.listingType = 'Select a listing type.';
        if (!form.title || form.title.length < 10) {
          newErrors.title = 'Title must be at least 10 characters.';
        }
        if (!form.city) newErrors.city = 'City is required.';
        if (!form.society) newErrors.society = 'Society / Area is required.';
      }

      if (stepNum === 2) {
        if (!form.area || Number(form.area) <= 0) {
          newErrors.area = 'Area is required.';
        }
        if (!form.possessionStatus) {
          newErrors.possessionStatus = 'Possession status is required.';
        }
      }

      if (stepNum === 3) {
        const lt = form.listingType;
        if (lt === 'full_payment' || lt === 'pre_launch') {
          if (!form.price || Number(form.price) <= 0) {
            newErrors.price = 'Price is required.';
          }
        }
        if (lt === 'rent') {
          if (!form.monthlyRent || Number(form.monthlyRent) <= 0) {
            newErrors.monthlyRent = 'Monthly rent is required.';
          }
        }
        if (lt === 'installment') {
          if (!form.instTotalPrice || Number(form.instTotalPrice) <= 0) {
            newErrors.instTotalPrice = 'Total price is required.';
          }
        }
      }

      if (stepNum === 4) {
        if (!form.description || form.description.length < 50) {
          newErrors.description = 'Description must be at least 50 characters.';
        }
        if (!form.featureImage) {
          newErrors.featureImage = 'Feature image (cover photo) is required.';
        }
        if (form.images.length === 0) {
          newErrors.images = 'At least 1 property picture is required.';
        }
        if (!form.declaration) {
          newErrors.declaration = 'Please accept the declaration.';
        }
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [form]
  );

  // ── Navigation ──
  const next = useCallback((): void => {
    if (validateStep(step)) {
      setStep((s) => Math.min(s + 1, 4) as 1 | 2 | 3 | 4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [step, validateStep]);

  const prev = useCallback((): void => {
    setStep((s) => Math.max(s - 1, 1) as 1 | 2 | 3 | 4);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // ── Submit ──
  const handleSubmit = useCallback(async (): Promise<void> => {
    if (submitting) return;

    // Re-check Step 3 — if invalid, auto-jump to Step 3 so user can fix it
    if (!validateStep(3)) {
      setStep(3);
      setSubmitError('Please complete the required pricing details in Step 3.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Check Step 4
    if (!validateStep(4)) {
      setSubmitError('Please fix the required legal, description, or image details in Step 4.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      // Map furnishing state back to schema enum
      let mappedFurnishing = "unfurnished";
      if (form.furnishingStatus === "semi-furnished" || form.furnishingStatus === "semi_furnished") {
        mappedFurnishing = "semi_furnished";
      } else if (form.furnishingStatus === "furnished" || form.furnishingStatus === "fully_furnished" || form.furnishingStatus === "fully-furnished") {
        mappedFurnishing = "fully_furnished";
      }

      // Prepend featureImage to gallery images array for full parity in HeroGallery
      let finalImages = [...form.images];
      if (form.featureImage?.url) {
        const hasFeatureInGallery = finalImages.some(img => img.url === form.featureImage?.url);
        if (!hasFeatureInGallery) {
          finalImages = [
            { url: form.featureImage.url, public_id: form.featureImage.public_id, caption: "Feature Cover Image" },
            ...finalImages
          ];
        }
      }

      // Ensure first image is explicitly marked primary
      if (finalImages.length > 0) {
        finalImages = finalImages.map((img, idx) => ({
          ...img,
          isPrimary: idx === 0
        }));
      }

      // Build API payload aligned with Mongoose schema
      const body: Record<string, unknown> = {
        // Type
        propertyType: form.propertyType,
        listingType: form.listingType,
        title: form.title.trim(),

        // Location & Map Parity
        city: form.city,
        society: form.society.trim(),
        phase: form.phase.trim() || undefined,
        block: form.block.trim() || undefined,
        coordinatesRaw: form.coordinatesRaw.trim() || undefined,
        coordinates: form.lat && form.lng ? {
          lat: Number(form.lat),
          lng: Number(form.lng)
        } : undefined,

        // Size
        area: Number(form.area) || 0,
        unit: form.areaUnit,
        plotWidth: Number(form.frontSize) || undefined,
        plotDepth: Number(form.depthSize) || undefined,
        coveredArea: Number(form.coveredArea) || undefined,

        // Details
        bedrooms: Number(form.bedrooms) || undefined,
        bathrooms: Number(form.bathrooms) || undefined,
        servantQuarterRooms: Number(form.servantQuarters) || undefined,
        parking: form.parkings || "0",
        floors: Number(form.floors) || undefined,
        floorNumber: Number(form.floorNumber) || undefined,
        propertyAge: Number(form.propertyAge) || undefined,
        facing: form.facing || undefined,
        isCornerPlot: form.isCorner || undefined,
        hasBoundaryWall: form.boundaryWall || undefined,
        furnished: mappedFurnishing,
        possessionStatus: form.possessionStatus,
        amenities: form.amenities,
        nearbyFacilities: form.nearbyFacilities
          .filter((n) => n.name.trim())
          .map((n) => ({
            name: n.name.trim().slice(0, 100),
            category: n.category || 'other',
            distance: n.distance.trim() || "",
          })),
        isFeaturedRequested: form.isFeaturedRequested === true,

        // Pricing & Rent Parity
        price: form.listingType === 'rent' ? (Number(form.monthlyRent) || 0) : (Number(form.price) || 0),
        priceNegotiable: form.priceNegotiable,
        rentalDetails: form.listingType === 'rent' ? {
          monthlyRent: Number(form.monthlyRent) || 0,
          securityDeposit: Number(form.securityDeposit) || undefined,
          advanceMonths: Number(form.advanceMonths) || undefined,
          utilitiesIncluded: form.utilitiesIncluded,
        } : undefined,

        // Installment Breakdown
        ...(form.listingType === 'installment'
          ? {
              installmentPlan: {
                totalPrice: Number(form.instTotalPrice) || 0,
                bookingPercent: Number(form.bookingPercent) || 0,
                downPaymentPercent: Number(form.downPercent) || 0,
                possessionPercent: Number(form.possessionPercent) || 0,
                installmentCount: Number(form.installmentCount) || 0,
                frequency: form.frequency,
              },
            }
          : {}),

        // Infrastructure Utilities
        infrastructure: {
          electricityStatus: form.electricityStatus || undefined,
          gasStatus: form.suiGasStatus || undefined,
          waterStatus: form.waterStatus || undefined,
          sewerageStatus: form.sewerageStatus || undefined,
          internetReady: form.internetReady,
          cctvCoverage: form.cctvCoverage,
          streetLights: form.streetLights,
          roadCondition: form.roadCondition || undefined,
          gatedCommunity: form.gatedCommunity,
        },

        // Legal Schema Alignment
        legal: {
          ownershipType: form.ownershipType,
          fileType: form.fileType || undefined,
          documentationAvailable: form.documentsAvailable,
          hasDispute: form.hasDispute,
          disputeDetails: form.disputeDetails || undefined,
          taxPaidUpToDate: form.taxPaidUpToDate,
          societyMembershipRequired: form.societyMembershipRequired,
        },

        // Media & Images
        featureImageUrl: form.featureImage?.url || undefined,
        featureImagePublicId: form.featureImage?.public_id || undefined,
        images: finalImages,
        videoUrl: form.videoUrl || undefined,
        virtualTourUrl: form.virtualTourUrl || undefined,
        droneVideoUrl: form.droneVideoUrl || undefined,

        // Secured Nested Contact Details
        contactDetails: {
          personName: form.contactPerson.trim() || undefined,
          primaryPhone: form.contactPhone.trim() || undefined,
          whatsappNumber: form.contactWhatsapp.trim() || undefined,
          showPhoneOnListing: form.showPhoneOnListing,
        },

        // Description
        description: form.description.trim(),
      };

      // Determine endpoint and method (POST vs PATCH edit mode)
      const url = editId
        ? `/api/owner/listings/${encodeURIComponent(editId)}`
        : "/api/owner/listings";

      const method = editId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as {
        success?: boolean;
        message?: string;
        error?: string;
        details?: string[];
        data?: { _id?: string; slug?: string };
      };

      if (!res.ok || data.success === false) {
        let errMessage = data.message || data.error || "Failed to save listing. Please try again.";
        if (Array.isArray(data.details) && data.details.length > 0) {
          errMessage += ` (${data.details.join(" | ")})`;
        }
        setSubmitError(errMessage);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      // Success -> redirect with correct query token
      const queryParam = editId ? "updated=success" : "created=success";
      router.push(`/owner/listings?${queryParam}`);
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [form, submitting, validateStep, router]);

  // ── Current step component ──
  const renderStep = (): React.ReactNode => {
    switch (step) {
      case 1:
        return <StepType form={form} setField={setField} errors={errors} />;
      case 2:
        return <StepDetails form={form} setField={setField} errors={errors} />;
      case 3:
        return <StepPricing form={form} setField={setField} errors={errors} />;
      case 4:
        return <StepLegal form={form} setField={setField} errors={errors} />;
    }
  };

  // ── Progress ──
  const progress = useMemo(() => `${((step - 1) / (STEPS.length - 1)) * 100}%`, [step]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-[#004063]">
          {editId ? "Edit Property Listing" : "Create Property Listing"}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          {editId 
            ? "Modify your property listing specs, pricing details, and media files."
            : "List any property type — houses, plots, shops, offices, farmland, rentals"}
        </p>

        {/* Progress bar */}
        <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#029bba] to-[#017a94] rounded-full
                       transition-all duration-500"
            style={{ width: progress }}
          />
        </div>

        {/* Step indicators */}
        <div className="mt-3 flex items-center justify-between">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <div key={s.id} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center
                              transition-all ${
                    isDone
                      ? 'bg-[#029bba] text-white'
                      : isActive
                        ? 'bg-[#029bba] text-white ring-4 ring-[#029bba]/20'
                        : 'bg-gray-200 text-gray-400'
                      }`}
                >
                  {isDone ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className={`hidden sm:block text-xs font-semibold ${
                  isActive ? 'text-[#029bba]' : isDone ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Submit error */}
      {submitError && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-xl p-4
                        flex items-center justify-between gap-4">
          <p className="text-sm text-red-700 font-medium">{submitError}</p>
          <button
            type="button"
            onClick={() => setSubmitError(null)}
            className="text-red-400 hover:text-red-600"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step content */}
      <form onSubmit={(e) => { e.preventDefault(); if (step === 4) void handleSubmit(); else next(); }}>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={prev}
            disabled={step === 1 || submitting}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border
                       border-gray-200 text-gray-600 font-semibold text-sm
                       hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          {step < 4 ? (
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl
                         bg-gradient-to-r from-[#029bba] to-[#017a94]
                         hover:from-[#02a8c9] hover:to-[#018a9a]
                         text-white font-bold text-sm shadow-lg
                         shadow-[#029bba]/20 transition-all"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl
                         bg-gradient-to-r from-[#029bba] to-[#017a94]
                         hover:from-[#02a8c9] hover:to-[#018a9a]
                         text-white font-bold text-sm shadow-lg
                         shadow-[#029bba]/20 transition-all
                         disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving changes...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  {editId ? "Update Listing" : "Submit Listing"}
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}