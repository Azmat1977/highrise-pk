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
  Building2, Home, DollarSign, FileText, X,
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
  { id: 3, label: 'Pricing', icon: DollarSign },
  { id: 4, label: 'Legal & Media', icon: FileText },
] as const;

export default function PropertyListingForm(): React.ReactElement {
  const router = useRouter();

  const [form, setForm] = useState<ListingFormState>(INITIAL_STATE);
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
        if (form.images.length === 0) {
          newErrors.images = 'At least 1 property image is required.';
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

    // Final validation (step 4 + re-check step 3)
    if (!validateStep(3) || !validateStep(4)) {
      setSubmitError('Please fix the errors before submitting.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      // Build API payload (pages/api/properties/index.ts POST contract)
      const body: Record<string, unknown> = {
        // Type
        propertyType: form.propertyType,
        listingType: form.listingType,
        title: form.title.trim(),

        // Location
        city: form.city,
        society: form.society.trim(),
        phase: form.phase.trim() || undefined,
        block: form.block.trim() || undefined,

        // Size (owner endpoint contract: area + unit)
        area: Number(form.area) || 0,
        unit: form.areaUnit,
        frontSize: Number(form.frontSize) || undefined,
        depthSize: Number(form.depthSize) || undefined,
        coveredArea: Number(form.coveredArea) || undefined,

        // Details
        bedrooms: Number(form.bedrooms) || undefined,
        bathrooms: Number(form.bathrooms) || undefined,
        servantQuarters: Number(form.servantQuarters) || undefined,
        parkings: Number(form.parkings) || undefined,
        floors: Number(form.floors) || undefined,
        floorNumber: Number(form.floorNumber) || undefined,
        propertyAge: Number(form.propertyAge) || undefined,
        facing: form.facing || undefined,
        cornerPlot: form.isCorner || undefined,
        boundaryWall: form.boundaryWall || undefined,
        furnishingStatus: form.furnishingStatus || undefined,
        possessionStatus: form.possessionStatus,

        // Pricing (listing-type conditional)
        ...(form.listingType === 'full_payment' || form.listingType === 'pre_launch'
          ? {
              price: Number(form.price) || 0,
              priceNegotiable: form.priceNegotiable,
            }
          : {}),
        ...(form.listingType === 'rent'
          ? {
              monthlyRent: Number(form.monthlyRent) || 0,
              securityDeposit: Number(form.securityDeposit) || undefined,
              advanceMonths: Number(form.advanceMonths) || undefined,
              utilitiesIncluded: form.utilitiesIncluded,
            }
          : {}),
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

        // Utilities
        electricityStatus: form.electricityStatus || undefined,
        suiGasStatus: form.suiGasStatus || undefined,
        waterStatus: form.waterStatus || undefined,
        sewerageStatus: form.sewerageStatus || undefined,
        internetReady: form.internetReady,
        cctvCoverage: form.cctvCoverage,
        streetLights: form.streetLights,
        roadCondition: form.roadCondition || undefined,
        gatedCommunity: form.gatedCommunity,

        // Legal
        ownershipType: form.ownershipType,
        fileType: form.fileType || undefined,
        documentsAvailable: form.documentsAvailable,
        hasDispute: form.hasDispute,
        disputeDetails: form.disputeDetails || undefined,
        taxPaidUpToDate: form.taxPaidUpToDate,
        societyMembershipRequired: form.societyMembershipRequired,

        // Media
        images: form.images,
        videoUrl: form.videoUrl || undefined,
        virtualTourUrl: form.virtualTourUrl || undefined,
        droneVideoUrl: form.droneVideoUrl || undefined,

        // Contact
        contactPerson: form.contactPerson.trim() || undefined,
        primaryPhone: form.contactPhone.trim() || undefined,
        whatsappNumber: form.contactWhatsapp.trim() || undefined,
        showPhoneOnListing: form.showPhoneOnListing,

        // Description
        description: form.description.trim(),
      };

      // Owner-specific endpoint (draft + limit + approval flow)
      const res = await fetch('/api/owner/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as {
        success: boolean;
        message?: string;
        data?: { _id?: string; slug?: string };
      };

      if (!res.ok || !data.success) {
        setSubmitError(data.message ?? 'Failed to create listing. Please try again.');
        return;
      }

      // Success → redirect to my listings
      router.push('/owner/listings?created=success');
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
          Create Property Listing
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          List any property type — houses, plots, shops, offices, farmland, rentals
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
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Submit Listing
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}