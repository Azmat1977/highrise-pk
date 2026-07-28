// pages/owner/listings/new.tsx
// Owner: Create new property listing (2-step form)
// Only approved owners can access this page.
// Creates property with verification.status = 'draft'.

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import {
  Home, Building2, MapPin, DollarSign, FileText, Camera,
  Phone, User, CheckCircle, AlertCircle, ArrowLeft, ArrowRight,
  Loader2, Upload, X, Plus, Shield, Info,
} from "lucide-react";
import OwnerLayout from "@/components/owner/OwnerLayout";

// ─── Types ────────────────────────────────────────────────────────────────────

type PropertyCategory = "residential" | "commercial";
type ResidentialType  = "plot" | "house" | "apartment";
type CommercialType   = "shop" | "office" | "warehouse" | "building" | "food_court" | "other";
type ListingType      = "full_payment" | "installment" | "rent";
type AreaUnit         = "Marla" | "Kanal" | "Sq. Yd." | "Sq. Ft." | "Sq. M.";

interface UploadedImage {
  url:       string;
  public_id: string;
}

interface FormData {
  // Step 1 — Basics + Location
  propertyCategory: PropertyCategory;
  residentialType:  ResidentialType | "";
  commercialType:   CommercialType | "";
  propertyType:     string;
  listingType:      ListingType;
  title:            string;
  city:             string;
  society:          string;
  phase:            string;
  block:            string;

  // Step 2 — Details + Media + Contact
  area:             string;
  unit:             AreaUnit;
  price:            string;
  priceNegotiable:  boolean;
  bedrooms:         string;
  bathrooms:        string;
  description:      string;
  images:           UploadedImage[];
  contactName:      string;
  contactPhone:     string;
  contactWhatsapp:  string;
  declaration:      boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAKISTAN_CITIES = [
  "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad",
  "Peshawar", "Multan", "Hyderabad", "Quetta", "Sialkot",
  "Gujranwala", "Bahawalpur", "Sargodha", "Sukkur", "Larkana",
  "Sheikhupura", "Rahim Yar Khan", "Jhang", "Dera Ghazi Khan",
  "Gujrat", "Sahiwal", "Wah Cantonment", "Mardan", "Kasur",
  "Okara", "Mingora", "Nawabshah", "Chiniot", "Kotri",
];

const AREA_UNITS: AreaUnit[] = ["Marla", "Kanal", "Sq. Yd.", "Sq. Ft.", "Sq. M."];

const MAX_IMAGES = 10;
const MIN_TITLE_LENGTH = 10;
const MIN_DESC_LENGTH = 50;
const MAX_DESC_LENGTH = 5000;

const INITIAL_FORM: FormData = {
  propertyCategory: "residential",
  residentialType:  "house",
  commercialType:   "",
  propertyType:     "",
  listingType:      "full_payment",
  title:            "",
  city:             "",
  society:          "",
  phase:            "",
  block:            "",
  area:             "",
  unit:             "Marla",
  price:            "",
  priceNegotiable:  false,
  bedrooms:         "",
  bathrooms:        "",
  description:      "",
  images:           [],
  contactName:      "",
  contactPhone:     "",
  contactWhatsapp:  "",
  declaration:      false,
};

// ─── Content ──────────────────────────────────────────────────────────────────

function NewListingContent(): React.ReactElement {
  const router = useRouter();

  const [step, setStep]           = useState<1 | 2>(1);
  const [form, setForm]           = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors]       = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [uploadingImg, setUploadingImg] = useState(false);
  const [approved, setApproved]   = useState<boolean | null>(null);
  const [checking, setChecking]   = useState(true);
  const [listingCount, setListingCount] = useState(0);
  const [listingLimit, setListingLimit] = useState(10);

  // ── Check owner approval + listing limit ────────────────────────────────
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/owner/dashboard", {
          credentials: "include",
        });

        if (!res.ok) {
          setApproved(false);
          return;
        }

        const data = (await res.json()) as {
          success:  boolean;
          owner?:   { status?: string };
          stats?:   { listingsUsed?: number; listingLimit?: number };
        };

        const isApproved = data.owner?.status === "approved";
        setApproved(isApproved);
        setListingCount(data.stats?.listingsUsed ?? 0);
        setListingLimit(data.stats?.listingLimit ?? 10);
      } catch {
        setApproved(false);
      } finally {
        setChecking(false);
      }
    };
    void check();
  }, []);

  // ── Field setter ─────────────────────────────────────────────────────────
  const setField = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
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

  // ── Image upload ─────────────────────────────────────────────────────────
  const handleImageUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      if (form.images.length >= MAX_IMAGES) {
        setSubmitError(`Maximum ${MAX_IMAGES} images allowed`);
        return;
      }

      const remaining = MAX_IMAGES - form.images.length;
      const toUpload  = Array.from(files).slice(0, remaining);

      setUploadingImg(true);
      setSubmitError("");

      try {
        const uploaded: UploadedImage[] = [];

        for (const file of toUpload) {
          if (!file.type.startsWith("image/")) continue;
          if (file.size > 10 * 1024 * 1024) {
            setSubmitError(`Image "${file.name}" exceeds 10MB limit`);
            continue;
          }

          const fd = new FormData();
          fd.append("file", file);
          fd.append("folder", "highrise/properties");

          const res = await fetch("/api/upload", {
            method:      "POST",
            credentials: "include",
            body:        fd,
          });

          if (!res.ok) {
            setSubmitError(`Failed to upload "${file.name}"`);
            continue;
          }

          const data = (await res.json()) as {
            success:    boolean;
            url?:       string;
            public_id?: string;
          };

          if (data.success && data.url && data.public_id) {
            uploaded.push({ url: data.url, public_id: data.public_id });
          }
        }

        if (uploaded.length > 0) {
          setForm((prev) => ({
            ...prev,
            images: [...prev.images, ...uploaded].slice(0, MAX_IMAGES),
          }));
        }
      } catch {
        setSubmitError("Upload failed. Please try again.");
      } finally {
        setUploadingImg(false);
      }
    },
    [form.images.length]
  );

  const removeImage = useCallback((idx: number) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== idx),
    }));
  }, []);

  // ── Validation ──────────────────────────────────────────────────────────
  const validateStep1 = useCallback((): boolean => {
    const e: Record<string, string> = {};

    if (!form.propertyType.trim()) {
      e.propertyType = "Property type is required";
    }
    if (form.title.trim().length < MIN_TITLE_LENGTH) {
      e.title = `Title must be at least ${MIN_TITLE_LENGTH} characters`;
    }
    if (!form.city) {
      e.city = "City is required";
    }
    if (!form.society.trim()) {
      e.society = "Society/Area is required";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form]);

  const validateStep2 = useCallback((): boolean => {
    const e: Record<string, string> = {};

    if (!form.area || Number(form.area) <= 0) {
      e.area = "Valid area is required";
    }
    if (!form.price || Number(form.price) <= 0) {
      e.price = "Valid price is required";
    }
    if (form.description.trim().length < MIN_DESC_LENGTH) {
      e.description = `Description must be at least ${MIN_DESC_LENGTH} characters`;
    }
    if (form.description.length > MAX_DESC_LENGTH) {
      e.description = `Description exceeds ${MAX_DESC_LENGTH} characters`;
    }
    if (!form.contactName.trim()) {
      e.contactName = "Contact name is required";
    }
    if (!form.contactPhone.trim() || form.contactPhone.trim().length < 10) {
      e.contactPhone = "Valid phone number is required";
    }
    if (!form.declaration) {
      e.declaration = "You must confirm ownership to list this property";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form]);

  // ── Navigation ──────────────────────────────────────────────────────────
  const goToStep2 = useCallback(() => {
    if (validateStep1()) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [validateStep1]);

  const goToStep1 = useCallback(() => {
    setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!validateStep2()) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      const payload = {
        title:            form.title.trim(),
        propertyType:     form.propertyType.trim(),
        propertyCategory: form.propertyCategory,
        residentialType:  form.propertyCategory === "residential" ? form.residentialType : undefined,
        commercialType:   form.propertyCategory === "commercial"  ? form.commercialType  : undefined,
        listingType:      form.listingType,
        price:            Number(form.price),
        priceNegotiable:  form.priceNegotiable,
        area:             Number(form.area),
        unit:             form.unit,
        city:             form.city,
        society:          form.society.trim(),
        phase:            form.phase.trim() || undefined,
        block:            form.block.trim() || undefined,
        bedrooms:         form.bedrooms ? Number(form.bedrooms) : undefined,
        bathrooms:        form.bathrooms ? Number(form.bathrooms) : undefined,
        description:      form.description.trim(),
        images:           form.images,
        contactDetails: {
          personName:     form.contactName.trim(),
          primaryPhone:   form.contactPhone.trim(),
          whatsappNumber: form.contactWhatsapp.trim() || form.contactPhone.trim(),
        },
      };

      const res = await fetch("/api/owner/listings", {
        method:      "POST",
        credentials: "include",
        headers:     { "Content-Type": "application/json" },
        body:        JSON.stringify(payload),
      });

      const data = (await res.json()) as {
        success?: boolean;
        error?:   string;
        details?: string[];
        property?: { _id: string; slug?: string };
      };

      if (!res.ok || !data.success) {
        const msg = data.details?.join(", ") ?? data.error ?? "Failed to create listing";
        setSubmitError(msg);
        setSubmitting(false);
        return;
      }

      // Success → redirect to listings page
      void router.push("/owner/listings?created=1");
    } catch {
      setSubmitError("Network error. Please try again.");
      setSubmitting(false);
    }
  }, [form, router, validateStep2]);

  // ── Loading state ────────────────────────────────────────────────────────
  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#029bba] animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Checking owner status...</p>
        </div>
      </div>
    );
  }

  // ── Not approved ────────────────────────────────────────────────────────
  if (approved === false) {
    return (
      <div className="max-w-2xl mx-auto p-6 md:p-10">
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-black text-[#004063] mb-2">
            Owner Verification Required
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            You must complete owner verification before creating listings.
            This helps us protect buyers and ensure listing quality.
          </p>
          <Link
            href="/owner/verify"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#029bba] text-white rounded-xl text-sm font-bold hover:bg-[#027a94] transition-colors shadow-md shadow-[#029bba]/20"
          >
            <Shield className="w-4 h-4" />
            Complete Verification
          </Link>
        </div>
      </div>
    );
  }

  // ── Listing limit reached ───────────────────────────────────────────────
  if (listingCount >= listingLimit) {
    return (
      <div className="max-w-2xl mx-auto p-6 md:p-10">
        <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-black text-[#004063] mb-2">
            Listing Limit Reached
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            You have reached the maximum of {listingLimit} listings.
            Delete an existing listing to add a new one, or contact support
            to request a higher limit.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/owner/listings"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#029bba] text-white rounded-xl text-sm font-bold hover:bg-[#027a94] transition-colors"
            >
              Manage Listings
            </Link>
            <a
              href="mailto:support@highrise.pk?subject=Request%20higher%20listing%20limit"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Main form ───────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 pb-16 max-w-4xl mx-auto">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <Link
          href="/owner/listings"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#029bba] transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Listings
        </Link>
        <h1 className="text-2xl font-black text-[#004063] tracking-tight flex items-center gap-2">
          <Plus className="w-6 h-6 text-[#029bba]" />
          Create New Listing
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {listingCount} of {listingLimit} listings used ·{" "}
          <span className="text-[#029bba] font-semibold">
            {listingLimit - listingCount} remaining
          </span>
        </p>
      </div>

      {/* ── Step Indicator ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2 flex-1">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            step >= 1 ? "bg-[#029bba] text-white" : "bg-gray-200 text-gray-500"
          }`}>
            1
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-bold text-[#004063]">Basics</p>
            <p className="text-xs text-gray-500">Property & Location</p>
          </div>
        </div>
        <div className={`h-0.5 flex-1 ${step >= 2 ? "bg-[#029bba]" : "bg-gray-200"}`} />
        <div className="flex items-center gap-2 flex-1">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            step >= 2 ? "bg-[#029bba] text-white" : "bg-gray-200 text-gray-500"
          }`}>
            2
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-bold text-[#004063]">Details</p>
            <p className="text-xs text-gray-500">Photos & Contact</p>
          </div>
        </div>
      </div>

      {/* ── Submit Error Banner ────────────────────────────────────────── */}
      {submitError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">{submitError}</div>
          <button
            type="button"
            onClick={() => setSubmitError("")}
            className="text-red-500 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── STEP 1 — Basics & Location ─────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4">

          {/* Property Category */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-[#004063] mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#029bba]" />
              Property Category
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {(["residential", "commercial"] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setField("propertyCategory", cat)}
                  className={`px-4 py-3 rounded-xl border-2 text-sm font-bold capitalize transition-all ${
                    form.propertyCategory === cat
                      ? "border-[#029bba] bg-[#029bba]/5 text-[#029bba]"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Property Type (Residential) */}
          {form.propertyCategory === "residential" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <label className="text-sm font-bold text-[#004063] block mb-3">
                Residential Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(["plot", "house", "apartment"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setField("residentialType", t)}
                    className={`px-4 py-3 rounded-xl border-2 text-sm font-bold capitalize transition-all ${
                      form.residentialType === t
                        ? "border-[#029bba] bg-[#029bba]/5 text-[#029bba]"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Property Type (Commercial) */}
          {form.propertyCategory === "commercial" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <label className="text-sm font-bold text-[#004063] block mb-3">
                Commercial Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(["shop", "office", "warehouse"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setField("commercialType", t)}
                    className={`px-4 py-3 rounded-xl border-2 text-sm font-bold capitalize transition-all ${
                      form.commercialType === t
                        ? "border-[#029bba] bg-[#029bba]/5 text-[#029bba]"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Property Type & Listing Type */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div>
              <label className="text-sm font-bold text-[#004063] block mb-2">
                Property Type <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.propertyType}
                onChange={(e) => setField("propertyType", e.target.value)}
                placeholder='e.g. "3 Marla House", "5 Marla Plot"'
                className={`w-full px-4 py-2.5 border rounded-xl outline-none text-sm transition-colors ${
                  errors.propertyType
                    ? "border-red-300 focus:ring-2 focus:ring-red-200"
                    : "border-gray-200 focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba]"
                }`}
              />
              {errors.propertyType && (
                <p className="text-xs text-red-600 mt-1">{errors.propertyType}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-bold text-[#004063] block mb-2">
                Listing Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "full_payment", label: "For Sale" },
                  { value: "installment",  label: "Installment" },
                  { value: "rent",         label: "For Rent" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setField("listingType", opt.value as ListingType)}
                    className={`px-4 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                      form.listingType === opt.value
                        ? "border-[#029bba] bg-[#029bba]/5 text-[#029bba]"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-[#004063] block mb-2">
                Listing Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder="e.g. Beautiful 5 Marla House in Bahria Town"
                maxLength={150}
                className={`w-full px-4 py-2.5 border rounded-xl outline-none text-sm transition-colors ${
                  errors.title
                    ? "border-red-300 focus:ring-2 focus:ring-red-200"
                    : "border-gray-200 focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba]"
                }`}
              />
              <div className="flex items-center justify-between mt-1">
                {errors.title ? (
                  <p className="text-xs text-red-600">{errors.title}</p>
                ) : (
                  <p className="text-xs text-gray-500">
                    Minimum {MIN_TITLE_LENGTH} characters
                  </p>
                )}
                <p className="text-xs text-gray-400">{form.title.length}/150</p>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#004063] mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#029bba]" />
              Location
            </h3>

            <div>
              <label className="text-sm font-bold text-[#004063] block mb-2">
                City <span className="text-red-500">*</span>
              </label>
              <select
                value={form.city}
                onChange={(e) => setField("city", e.target.value)}
                className={`w-full px-4 py-2.5 border rounded-xl outline-none text-sm bg-white transition-colors ${
                  errors.city
                    ? "border-red-300 focus:ring-2 focus:ring-red-200"
                    : "border-gray-200 focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba]"
                }`}
              >
                <option value="">Select City</option>
                {PAKISTAN_CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {errors.city && (
                <p className="text-xs text-red-600 mt-1">{errors.city}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-bold text-[#004063] block mb-2">
                Society / Area <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.society}
                onChange={(e) => setField("society", e.target.value)}
                placeholder="e.g. Bahria Town, DHA, Gulberg"
                className={`w-full px-4 py-2.5 border rounded-xl outline-none text-sm transition-colors ${
                  errors.society
                    ? "border-red-300 focus:ring-2 focus:ring-red-200"
                    : "border-gray-200 focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba]"
                }`}
              />
              {errors.society && (
                <p className="text-xs text-red-600 mt-1">{errors.society}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-bold text-[#004063] block mb-2">
                  Phase <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.phase}
                  onChange={(e) => setField("phase", e.target.value)}
                  placeholder="e.g. Phase 5"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba]"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-[#004063] block mb-2">
                  Block <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.block}
                  onChange={(e) => setField("block", e.target.value)}
                  placeholder="e.g. Block A"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba]"
                />
              </div>
            </div>
          </div>

          {/* Step 1 Nav */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={goToStep2}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#029bba] text-white rounded-xl text-sm font-bold hover:bg-[#027a94] transition-colors shadow-md shadow-[#029bba]/20"
            >
              Continue to Details
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2 — Details, Photos, Contact ──────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">

          {/* Size & Price */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#004063] mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#029bba]" />
              Size & Price
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-bold text-[#004063] block mb-2">
                  Area <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={form.area}
                  onChange={(e) => setField("area", e.target.value)}
                  placeholder="0"
                  min="0"
                  className={`w-full px-4 py-2.5 border rounded-xl outline-none text-sm transition-colors ${
                    errors.area
                      ? "border-red-300 focus:ring-2 focus:ring-red-200"
                      : "border-gray-200 focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba]"
                  }`}
                />
                {errors.area && (
                  <p className="text-xs text-red-600 mt-1">{errors.area}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-bold text-[#004063] block mb-2">
                  Unit <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.unit}
                  onChange={(e) => setField("unit", e.target.value as AreaUnit)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none text-sm bg-white focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba]"
                >
                  {AREA_UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-[#004063] block mb-2">
                Price (PKR) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setField("price", e.target.value)}
                placeholder="0"
                min="0"
                className={`w-full px-4 py-2.5 border rounded-xl outline-none text-sm transition-colors ${
                  errors.price
                    ? "border-red-300 focus:ring-2 focus:ring-red-200"
                    : "border-gray-200 focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba]"
                }`}
              />
              {errors.price && (
                <p className="text-xs text-red-600 mt-1">{errors.price}</p>
              )}
              {form.price && Number(form.price) > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  PKR {Number(form.price).toLocaleString()}
                </p>
              )}
              <label className="flex items-center gap-2 mt-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.priceNegotiable}
                  onChange={(e) => setField("priceNegotiable", e.target.checked)}
                  className="w-4 h-4 accent-[#029bba]"
                />
                <span className="text-sm text-gray-700">Price is negotiable</span>
              </label>
            </div>
          </div>

          {/* Rooms (only for house/apartment) */}
          {form.propertyCategory === "residential" &&
            (form.residentialType === "house" || form.residentialType === "apartment") && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-bold text-[#004063] mb-3 flex items-center gap-2">
                <Home className="w-4 h-4 text-[#029bba]" />
                Rooms
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-bold text-[#004063] block mb-2">Bedrooms</label>
                  <input
                    type="number"
                    value={form.bedrooms}
                    onChange={(e) => setField("bedrooms", e.target.value)}
                    placeholder="0"
                    min="0"
                    max="50"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba]"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-[#004063] block mb-2">Bathrooms</label>
                  <input
                    type="number"
                    value={form.bathrooms}
                    onChange={(e) => setField("bathrooms", e.target.value)}
                    placeholder="0"
                    min="0"
                    max="30"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-[#004063] mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#029bba]" />
              Description
            </h3>
            <textarea
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Describe your property: features, condition, nearby facilities, etc."
              rows={6}
              maxLength={MAX_DESC_LENGTH}
              className={`w-full px-4 py-3 border rounded-xl outline-none text-sm resize-y transition-colors ${
                errors.description
                  ? "border-red-300 focus:ring-2 focus:ring-red-200"
                  : "border-gray-200 focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba]"
              }`}
            />
            <div className="flex items-center justify-between mt-1">
              {errors.description ? (
                <p className="text-xs text-red-600">{errors.description}</p>
              ) : (
                <p className="text-xs text-gray-500">
                  Minimum {MIN_DESC_LENGTH} characters
                </p>
              )}
              <p className="text-xs text-gray-400">
                {form.description.length}/{MAX_DESC_LENGTH}
              </p>
            </div>
          </div>

          {/* Images */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-[#004063] mb-3 flex items-center gap-2">
              <Camera className="w-4 h-4 text-[#029bba]" />
              Photos <span className="text-gray-500 font-normal">({form.images.length}/{MAX_IMAGES})</span>
            </h3>

            {form.images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                {form.images.map((img, idx) => (
                  <div key={img.public_id} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group">
                    <Image
                      src={img.url}
                      alt={`Property ${idx + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, 25vw"
                    />
                    {idx === 0 && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 bg-[#029bba] text-white text-[10px] font-bold rounded-full">
                        PRIMARY
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {form.images.length < MAX_IMAGES && (
              <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-8 cursor-pointer transition-colors ${
                uploadingImg
                  ? "border-gray-200 bg-gray-50 cursor-not-allowed"
                  : "border-gray-300 hover:border-[#029bba] hover:bg-[#029bba]/5"
              }`}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploadingImg}
                  onChange={(e) => handleImageUpload(e.target.files)}
                  className="hidden"
                />
                {uploadingImg ? (
                  <>
                    <Loader2 className="w-8 h-8 text-[#029bba] animate-spin mb-2" />
                    <p className="text-sm text-gray-600 font-semibold">Uploading...</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 font-semibold">
                      Click to upload photos
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      JPG, PNG, WEBP · Max 10MB each · First photo is primary
                    </p>
                  </>
                )}
              </label>
            )}
          </div>

          {/* Contact */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#004063] mb-3 flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#029bba]" />
              Contact Information
            </h3>

            <div>
              <label className="text-sm font-bold text-[#004063] block mb-2">
                Contact Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={form.contactName}
                  onChange={(e) => setField("contactName", e.target.value)}
                  placeholder="Your full name"
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-xl outline-none text-sm transition-colors ${
                    errors.contactName
                      ? "border-red-300 focus:ring-2 focus:ring-red-200"
                      : "border-gray-200 focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba]"
                  }`}
                />
              </div>
              {errors.contactName && (
                <p className="text-xs text-red-600 mt-1">{errors.contactName}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-bold text-[#004063] block mb-2">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={form.contactPhone}
                  onChange={(e) => setField("contactPhone", e.target.value)}
                  placeholder="+92 300 1234567"
                  className={`w-full px-4 py-2.5 border rounded-xl outline-none text-sm transition-colors ${
                    errors.contactPhone
                      ? "border-red-300 focus:ring-2 focus:ring-red-200"
                      : "border-gray-200 focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba]"
                  }`}
                />
                {errors.contactPhone && (
                  <p className="text-xs text-red-600 mt-1">{errors.contactPhone}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-bold text-[#004063] block mb-2">
                  WhatsApp <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="tel"
                  value={form.contactWhatsapp}
                  onChange={(e) => setField("contactWhatsapp", e.target.value)}
                  placeholder="Same as phone"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba]"
                />
              </div>
            </div>
          </div>

          {/* Declaration */}
          <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-[#004063] mb-2">
                  Ownership Declaration
                </h3>
                <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                  Highrise.pk verifies all listings. False ownership claims
                  will result in permanent account suspension and legal action.
                  Your CNIC is on record.
                </p>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.declaration}
                    onChange={(e) => setField("declaration", e.target.checked)}
                    className="w-4 h-4 accent-[#029bba] mt-0.5"
                  />
                  <span className="text-sm text-gray-800 font-semibold">
                    I confirm that I am the legal owner of this property and
                    have the authority to list it on Highrise.pk.
                  </span>
                </label>
                {errors.declaration && (
                  <p className="text-xs text-red-600 mt-2 ml-6">{errors.declaration}</p>
                )}
              </div>
            </div>
          </div>

          {/* Step 2 Nav */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goToStep1}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#029bba] text-white rounded-xl text-sm font-bold hover:bg-[#027a94] transition-colors shadow-md shadow-[#029bba]/20 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Listing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Create Listing (Draft)
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Your listing will be saved as a draft. You can review it and
            submit for admin approval from the listings page.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Page Export ──────────────────────────────────────────────────────────────

export default function NewOwnerListingPage(): React.ReactElement {
  return (
    <>
      <Head>
        <title>New Listing | Highrise.pk</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <OwnerLayout>
        <NewListingContent />
      </OwnerLayout>
    </>
  );
}