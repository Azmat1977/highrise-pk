// pages/developer/projects/[id]/units/new.tsx

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertTriangle,
  Loader2,
  Plus,
  X,
  DollarSign,
  Home,
  Camera,
  BarChart3,
} from 'lucide-react';
import DeveloperLayout from '@/components/developer/DeveloperLayout';
import { useDeveloperContext } from '@/components/developer/DeveloperContext';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type UnitCategory = 'residential' | 'commercial';
type ListingType  = 'both' | 'installment' | 'full_payment';
type AreaUnit     = 'Sq.Ft' | 'Sq.Yd' | 'Sq.M';

interface ProjectInfo {
  _id:             string;
  projectName:     string;
  projectCategory: string;
  city:            string;
  area:            string;
}

interface ImageRef {
  url:      string;
  publicId: string;
}

interface InstallmentPlan {
  bookingAmount?:    number;
  downPayment?:      number;
  monthlyAmount?:    number;
  monthlyCount?:     number;
  possessionAmount?: number;
}

interface Charges {
  cornerCharges?:      number;
  floorPremium?:       number;
  parkingCharges?:     number;
  maintenanceAdvance?: number;
}

interface InvestorIntelligence {
  estimatedMonthlyRent?:  number;
  expectedRentalYield?:   number;
  capitalAppreciation?:   string;
  investmentScore?:       string;
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const MAX_IMAGES      = 15;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB each

const AREA_UNITS: readonly AreaUnit[] = ['Sq.Ft', 'Sq.Yd', 'Sq.M'];

const RESIDENTIAL_UNIT_TYPES = [
  { value: 'studio',         label: 'Studio Apartment'    },
  { value: 'apartment_1bed', label: '1 Bedroom Apartment' },
  { value: 'apartment_2bed', label: '2 Bedroom Apartment' },
  { value: 'apartment_3bed', label: '3 Bedroom Apartment' },
  { value: 'apartment_4bed', label: '4 Bedroom Apartment' },
  { value: 'penthouse',      label: 'Penthouse'           },
  { value: 'duplex',         label: 'Duplex'              },
] as const;

const COMMERCIAL_UNIT_TYPES = [
  { value: 'shop',       label: 'Shop'       },
  { value: 'office',     label: 'Office'     },
  { value: 'food_court', label: 'Food Court' },
  { value: 'showroom',   label: 'Showroom'   },
  { value: 'warehouse',  label: 'Warehouse'  },
  { value: 'kiosk',      label: 'Kiosk'      },
] as const;

const FACING_OPTIONS = [
  { value: 'north',      label: 'North'      },
  { value: 'south',      label: 'South'      },
  { value: 'east',       label: 'East'       },
  { value: 'west',       label: 'West'       },
  { value: 'north_east', label: 'North-East' },
  { value: 'north_west', label: 'North-West' },
  { value: 'south_east', label: 'South-East' },
  { value: 'south_west', label: 'South-West' },
] as const;

const VIEW_OPTIONS = [
  { value: 'park',     label: 'Park View'     },
  { value: 'road',     label: 'Road View'     },
  { value: 'city',     label: 'City View'     },
  { value: 'garden',   label: 'Garden View'   },
  { value: 'pool',     label: 'Pool View'     },
  { value: 'mosque',   label: 'Mosque View'   },
  { value: 'hills',    label: 'Hills View'    },
  { value: 'open',     label: 'Open View'     },
  { value: 'internal', label: 'Internal View' },
] as const;

const RESIDENTIAL_FEATURES = [
  'Balcony', 'Terrace', 'Walk-in Closet', 'Modular Kitchen',
  'Italian Flooring', 'False Ceiling', 'Smart Home', 'Central AC',
];

const COMMERCIAL_FEATURES = [
  'Display Window', 'Signage Space', 'Storage Room', 'Pantry',
  'Conference Room', 'Reception', 'Washroom', 'Exhaust System',
];

const STEP_LABELS = ['Basic Info', 'Size & Price', 'Features', 'Media & Submit'] as const;

// ─────────────────────────────────────────────
// Tailwind class strings (static — no interpolation)
// ─────────────────────────────────────────────

const INPUT  = 'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 placeholder:text-gray-400';
const LABEL  = 'block text-sm font-semibold text-[#004063] mb-1.5';
const TOGGLE = 'flex items-center gap-2 cursor-pointer select-none';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function toStr(v: unknown): string {
  if (!v) return '';
  return Array.isArray(v) ? String(v[0]) : String(v);
}

function clamp(v: string, max: number): string {
  const s = v.trimStart();
  return s.length > max ? s.slice(0, max) : s;
}

function safeNum(v: string): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) && v.trim() !== '' ? n : undefined;
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function StepIndicator({
  current,
}: {
  current: number;
}): React.ReactElement {
  return (
    <div className="mb-10">
      <div className="relative flex items-center justify-between">
        {/* Track line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-100 z-0" />

        {STEP_LABELS.map((label, i) => (
          <div key={label} className="relative z-10 flex flex-col items-center gap-2">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full font-bold text-sm transition-all duration-300 ${
                i < current
                  ? 'bg-[#10b981] text-white'
                  : i === current
                  ? 'bg-[#029bba] text-white ring-4 ring-[#029bba]/20'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {i < current ? <Check className="h-5 w-5" /> : i + 1}
            </div>
            <span
              className={`hidden md:block text-xs font-semibold uppercase tracking-wide ${
                i <= current ? 'text-gray-700' : 'text-gray-400'
              }`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title:     string;
  subtitle?: string;
  icon?:     React.ReactElement;
  children:  React.ReactNode;
}): React.ReactElement {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50 px-6 py-4">
        {icon && (
          <div className="rounded-lg bg-teal-50 p-2 text-[#029bba]">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-base font-bold text-[#004063]">{title}</h3>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function FeatureToggle({
  label,
  active,
  onToggle,
}: {
  label:    string;
  active:   boolean;
  onToggle: () => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
        active
          ? 'bg-[#029bba] text-white border-[#029bba]'
          : 'bg-white text-gray-600 border-gray-200 hover:border-[#029bba] hover:text-[#029bba]'
      }`}
    >
      {active && <Check className="inline h-3 w-3 mr-1" />}
      {label}
    </button>
  );
}

function CheckField({
  id,
  label,
  checked,
  onChange,
}: {
  id:       string;
  label:    string;
  checked:  boolean;
  onChange: (v: boolean) => void;
}): React.ReactElement {
  return (
    <label htmlFor={id} className={TOGGLE}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
      />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────

export default function AddUnitPage(): React.ReactElement {
  const router    = useRouter();
  const { profile } = useDeveloperContext();
  const projectId = toStr(router.query.id);

  // ── Page state ──
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError,   setPageError]   = useState<string | null>(null);
  const [project,     setProject]     = useState<ProjectInfo | null>(null);

  // ── Approved status guard ─────────────────────────────────
  // Only approved developers can add units
  useEffect(() => {
    if (!profile) return;
    if (profile.status !== 'approved') {
      void router.replace('/developer/dashboard');
    }
  }, [profile, router]);

  // ── Form state ──
  const [currentStep,     setCurrentStep]     = useState(0);
  const [isSubmitting,    setIsSubmitting]     = useState(false);
  const [uploadProgress,  setUploadProgress]   = useState<string | null>(null);
  const [formError,       setFormError]        = useState<string | null>(null);
  const [stepError,       setStepError]        = useState<string | null>(null);

  // STEP 1 — Basic Info
  const [unitNumber,  setUnitNumber]  = useState('');
  const [category,    setCategory]    = useState<UnitCategory>('residential');
  const [unitType,    setUnitType]    = useState('');
  const [floorNumber, setFloorNumber] = useState('');
  const [floorName,   setFloorName]   = useState('');
  const [tower,       setTower]       = useState('');
  const [wing,        setWing]        = useState('');

  // STEP 2 — Size & Price
  const [area,            setArea]            = useState('');
  const [areaUnit,        setAreaUnit]        = useState<AreaUnit>('Sq.Ft');
  const [coveredArea,     setCoveredArea]     = useState('');
  const [balconyArea,     setBalconyArea]     = useState('');
  const [price,           setPrice]           = useState('');
  const [priceNegotiable, setPriceNegotiable] = useState(false);
  const [listingType,     setListingType]     = useState<ListingType>('both');
  const [installmentPlan, setInstallmentPlan] = useState<InstallmentPlan>({});
  const [charges,         setCharges]         = useState<Charges>({});

  // Commercial size
  const [frontWidth,  setFrontWidth]  = useState('');
  const [depth,       setDepth]       = useState('');

  // STEP 3 — Features
  // Residential
  const [bedrooms,       setBedrooms]       = useState('');
  const [bathrooms,      setBathrooms]      = useState('');
  const [balconies,      setBalconies]      = useState('');
  const [servantQuarter, setServantQuarter] = useState(false);
  const [storeRoom,      setStoreRoom]      = useState(false);
  const [laundryArea,    setLaundryArea]    = useState(false);
  const [finishingLevel, setFinishingLevel] = useState('');

  // Commercial
  const [washroom,      setWashroom]      = useState('');
  const [hasMezzanine,  setHasMezzanine]  = useState(false);
  const [mezzanineArea, setMezzanineArea] = useState('');

  // Position & view (shared)
  const [isCorner,     setIsCorner]     = useState(false);
  const [facing,       setFacing]       = useState('');
  const [view,         setView]         = useState('');
  const [isParkFacing, setIsParkFacing] = useState(false);
  const [isRoadFacing, setIsRoadFacing] = useState(false);

  // Parking (shared)
  const [parkingIncluded, setParkingIncluded] = useState(false);
  const [parkingSpaces,   setParkingSpaces]   = useState('');
  const [parkingType,     setParkingType]     = useState('');

  // Feature tags & investor
  const [features,             setFeatures]             = useState<string[]>([]);
  const [investorIntelligence, setInvestorIntelligence] = useState<InvestorIntelligence>({});

  // STEP 4 — Media
  const [localImages,    setLocalImages]    = useState<File[]>([]);
  const [localFloorPlan, setLocalFloorPlan] = useState<File | null>(null);
  const [virtualTourUrl, setVirtualTourUrl] = useState('');
  const [videoUrl,       setVideoUrl]       = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description,      setDescription]      = useState('');

  const abortRef = useRef<AbortController | null>(null);

  // ─────────────────────────────────────────
  // Derived
  // ─────────────────────────────────────────

  const pricePerUnit = useMemo(() => {
    const p = Number(price);
    const a = Number(area);
    if (!p || !a || a <= 0) return 0;
    return Math.round(p / a);
  }, [price, area]);

  const unitTypeOptions = useMemo(
    () => category === 'residential' ? RESIDENTIAL_UNIT_TYPES : COMMERCIAL_UNIT_TYPES,
    [category]
  );

  const autoRentalYield = useMemo(() => {
    const rent  = investorIntelligence.estimatedMonthlyRent;
    const p     = Number(price);
    if (!rent || !p) return null;
    return ((rent * 12) / p * 100).toFixed(2);
  }, [investorIntelligence.estimatedMonthlyRent, price]);

  // ─────────────────────────────────────────
  // Fetch Project Meta
  // ─────────────────────────────────────────

  useEffect(() => {
    if (!projectId) return;

    async function fetchProject(): Promise<void> {
      setPageLoading(true);
      setPageError(null);
      try {
        const res  = await fetch(
          `/api/projects/${encodeURIComponent(projectId)}`,
          { method: 'GET', credentials: 'include' }
        );
        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.success) {
          if (res.status === 403 || res.status === 404) {
            void router.push('/developer/projects');
            return;
          }
          setPageError(data.message ?? 'Could not load project info.');
          return;
        }
        setProject(data.project as ProjectInfo);
      } catch (err: unknown) {
        setPageError(
          err instanceof Error ? err.message : 'Network error. Please retry.'
        );
      } finally {
        setPageLoading(false);
      }
    }

    void fetchProject();
    return () => abortRef.current?.abort();
  }, [projectId, router]);

  // ─────────────────────────────────────────
  // Feature tag toggle
  // ─────────────────────────────────────────

  const toggleFeature = useCallback((f: string): void => {
    setFeatures((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );
  }, []);

  // ─────────────────────────────────────────
  // Step validation
  // ─────────────────────────────────────────

  const validateStep = (step: number): string | null => {
    if (step === 0) {
      if (!unitNumber.trim()) return 'Unit Number is required.';
      if (!unitType)          return 'Unit Type is required.';
    }
    if (step === 1) {
      if (!area || Number(area) <= 0)   return 'Area is required.';
      if (!price || Number(price) <= 0) return 'Price is required.';
    }
    return null;
  };

  const handleNext = (): void => {
    const err = validateStep(currentStep);
    if (err) { setStepError(err); return; }
    setStepError(null);
    setCurrentStep((p) => Math.min(p + 1, STEP_LABELS.length - 1));
  };

  const handlePrev = (): void => {
    setStepError(null);
    setCurrentStep((p) => Math.max(p - 1, 0));
  };

  const goToStep = (step: number): void => {
    if (step >= currentStep) return;
    setStepError(null);
    setCurrentStep(step);
  };

  // ─────────────────────────────────────────
  // Image handlers
  // ─────────────────────────────────────────

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const files = Array.from(e.target.files ?? []);
    const valid = files
      .filter((f) => f.size <= MAX_IMAGE_BYTES)
      .slice(0, MAX_IMAGES - localImages.length);
    setLocalImages((prev) => [...prev, ...valid].slice(0, MAX_IMAGES));
    e.target.value = '';
  };

  const removeImage = (index: number): void => {
    setLocalImages((prev) => prev.filter((_, i) => i !== index));
  };

  // ─────────────────────────────────────────
  // Upload helper
  // ─────────────────────────────────────────

  const uploadFile = async (file: File, folder: string): Promise<ImageRef | null> => {
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res  = await fetch(`/api/upload?folder=${folder}`, {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        return {
          url:      data.data.url      as string,
          publicId: data.data.publicId as string,
        };
      }
      return null;
    } catch {
      return null;
    }
  };

  // ─────────────────────────────────────────
  // Submit — two-phase
  // ─────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (isSubmitting) return;

    const err = validateStep(0) ?? validateStep(1);
    if (err) { setFormError(err); return; }

    setFormError(null);
    setIsSubmitting(true);

    try {
      // Phase 1 — upload images
      const uploadedImages: ImageRef[] = [];
      for (let i = 0; i < localImages.length; i++) {
        setUploadProgress(`Uploading image ${i + 1} of ${localImages.length}...`);
        const ref = await uploadFile(localImages[i], 'projects');
        if (ref) uploadedImages.push(ref);
      }

      // Phase 1b — upload floor plan
      let floorPlanRef: ImageRef | null = null;
      if (localFloorPlan) {
        setUploadProgress('Uploading floor plan...');
        floorPlanRef = await uploadFile(localFloorPlan, 'projects');
      }

      // Phase 2 — POST JSON payload
      setUploadProgress('Creating unit record...');

      const payload: Record<string, unknown> = {
        // Basic
        unitNumber:  clamp(unitNumber, 40),
        category,
        unitType:    clamp(unitType, 40),
        floorNumber: safeNum(floorNumber),
        floorName:   floorName ? clamp(floorName, 60)   : undefined,
        tower:       tower     ? clamp(tower, 40)        : undefined,
        wing:        wing      ? clamp(wing, 40)         : undefined,

        // Size
        area:        Number(area),
        areaUnit,
        coveredArea: coveredArea ? Number(coveredArea)   : undefined,
        balconyArea: balconyArea ? Number(balconyArea)   : undefined,

        // Price
        price:           Number(price),
        priceNegotiable,
        listingType,
        installmentPlan,
        charges,

        // Residential features
        ...(category === 'residential' ? {
          bedrooms:       bedrooms       ? Number(bedrooms)       : undefined,
          bathrooms:      bathrooms      ? Number(bathrooms)      : undefined,
          balconies:      balconies      ? Number(balconies)      : undefined,
          servantQuarter,
          storeRoom,
          laundryArea,
        } : {}),

        // Commercial features
        ...(category === 'commercial' ? {
          washroom:     washroom     || undefined,
          frontWidth:   frontWidth   ? Number(frontWidth)   : undefined,
          depth:        depth        ? Number(depth)        : undefined,
          hasMezzanine,
          mezzanineArea: mezzanineArea ? Number(mezzanineArea) : undefined,
        } : {}),

        // Shared features
        finishingLevel: finishingLevel || undefined,
        isCorner,
        facing:         facing         || undefined,
        view:           view           || undefined,
        isParkFacing,
        isRoadFacing,
        parkingIncluded,
        parkingSpaces:  parkingSpaces  ? Number(parkingSpaces) : undefined,
        parkingType:    parkingType    || undefined,
        features:       features.length > 0 ? features : undefined,

        // Investor intelligence
        investorIntelligence,

        // Media
        images:        uploadedImages,
        floorPlan:     floorPlanRef   ?? undefined,
        virtualTourUrl: virtualTourUrl ? virtualTourUrl.trim() : undefined,
        videoUrl:       videoUrl       ? videoUrl.trim()       : undefined,

        // Descriptions
        shortDescription: shortDescription ? clamp(shortDescription, 200) : undefined,
        description:      description      ? clamp(description, 5000)     : undefined,
      };

      const res  = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/units`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setFormError(data.message ?? 'Failed to create unit. Please try again.');
        return;
      }

      void router.push(
        `/developer/projects/${encodeURIComponent(projectId)}/units`
      );

    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : 'An unexpected error occurred.'
      );
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  // ─────────────────────────────────────────
  // Loading
  // ─────────────────────────────────────────

  // Redirect spinner — non-approved developer
  if (profile && profile.status !== 'approved') {
    return (
      <DeveloperLayout>
        <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#029bba] border-t-transparent rounded-full animate-spin" />
        </div>
      </DeveloperLayout>
    );
  }

  if (pageLoading) {
    return (
      <DeveloperLayout>
        <Head>
          <title>Add Unit | Developer Dashboard</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#029bba]" />
        </div>
      </DeveloperLayout>
    );
  }

  // ─────────────────────────────────────────
  // Page error
  // ─────────────────────────────────────────

  if (pageError || !project) {
    return (
      <DeveloperLayout>
        <Head>
          <title>Add Unit | Developer Dashboard</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <div className="mx-auto mt-20 max-w-md rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-400" />
          <h2 className="text-xl font-bold text-[#004063]">Project Not Found</h2>
          <p className="mt-2 text-sm text-gray-500">
            {pageError ?? 'This project does not exist or access was denied.'}
          </p>
          <button
            type="button"
            onClick={() => void router.push('/developer/projects')}
            className="mt-6 w-full rounded-xl bg-[#029bba] py-2.5 text-sm font-bold text-white hover:bg-[#027a94] transition-colors"
          >
            Back to Projects
          </button>
        </div>
      </DeveloperLayout>
    );
  }

  // ─────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────

  return (
    <DeveloperLayout>
      <Head>
        <title>Add Unit — {project.projectName} | Highrise.pk</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="mx-auto max-w-4xl px-4 py-8 pb-24">

        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
          <button
            type="button"
            onClick={() => void router.back()}
            className="flex items-center gap-1 hover:text-[#029bba] transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <span>/</span>
          <span className="text-gray-400 truncate max-w-[140px]">
            {project.projectName}
          </span>
          <span>/</span>
          <span className="font-semibold text-gray-700">Add Unit</span>
        </nav>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#004063]">Add New Unit</h1>
          <p className="mt-1 text-sm text-gray-500">
            {project.projectName} &middot; {project.city}, {project.area}
            {profile?.companyName && (
              <span className="ml-2 text-gray-400">· {profile.companyName}</span>
            )}
          </p>
        </div>

        {/* Step indicator */}
        <StepIndicator current={currentStep} />

        {/* Step error banner */}
        {stepError && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border-l-4 border-[#f59e0b] bg-[#fef3c7] p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-[#f59e0b]" />
            <p className="text-sm font-medium text-amber-800">{stepError}</p>
          </div>
        )}

        {/* Form error banner */}
        {formError && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border-l-4 border-[#ef4444] bg-[#fef2f2] p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#ef4444]" />
            <p className="flex-1 text-sm font-medium text-red-800">{formError}</p>
            <button
              type="button"
              onClick={() => setFormError(null)}
              aria-label="Dismiss"
              className="text-lg leading-none text-red-300 hover:text-red-500"
            >
              ×
            </button>
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">

          {/* ════════════════════════════════════
              STEP 1 — Basic Information
          ════════════════════════════════════ */}
          {currentStep === 0 && (
            <SectionCard
              title="Basic Information"
              subtitle="Unit identity and classification"
              icon={<Building2 className="h-4 w-4" />}
            >
              <div className="grid gap-5 md:grid-cols-2">

                {/* Unit Number */}
                <div>
                  <label className={LABEL}>
                    Unit Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(clamp(e.target.value, 40))}
                    className={INPUT}
                    placeholder="e.g. A-301, SH-05, OF-12"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Unique identifier for this unit within the project.
                  </p>
                </div>

                {/* Floor Number */}
                <div>
                  <label className={LABEL}>Floor Number</label>
                  <input
                    type="number"
                    value={floorNumber}
                    onChange={(e) => setFloorNumber(e.target.value)}
                    className={INPUT}
                    placeholder="e.g. 3 (0 = Ground)"
                    min="-5"
                    max="200"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className={LABEL}>
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value as UnitCategory);
                      setUnitType('');
                      setFeatures([]);
                    }}
                    className={INPUT}
                  >
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                  </select>
                </div>

                {/* Unit Type */}
                <div>
                  <label className={LABEL}>
                    Unit Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={unitType}
                    onChange={(e) => setUnitType(e.target.value)}
                    className={INPUT}
                  >
                    <option value="">Select unit type</option>
                    {unitTypeOptions.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Floor Name */}
                <div>
                  <label className={LABEL}>Floor Name</label>
                  <input
                    type="text"
                    value={floorName}
                    onChange={(e) => setFloorName(clamp(e.target.value, 60))}
                    className={INPUT}
                    placeholder="e.g. Ground Floor, Mezzanine"
                  />
                </div>

                {/* Tower / Block */}
                <div>
                  <label className={LABEL}>Tower / Block</label>
                  <input
                    type="text"
                    value={tower}
                    onChange={(e) => setTower(clamp(e.target.value, 40))}
                    className={INPUT}
                    placeholder="e.g. Tower A, Block B"
                  />
                </div>

                {/* Wing */}
                <div>
                  <label className={LABEL}>Wing</label>
                  <input
                    type="text"
                    value={wing}
                    onChange={(e) => setWing(clamp(e.target.value, 40))}
                    className={INPUT}
                    placeholder="e.g. East Wing, North Wing"
                  />
                </div>
              </div>
            </SectionCard>
          )}

          {/* ════════════════════════════════════
              STEP 2 — Size & Price
          ════════════════════════════════════ */}
          {currentStep === 1 && (
            <div className="space-y-6">

              {/* Size */}
              <SectionCard
                title="Dimensions"
                subtitle="Define unit measurements"
                icon={<Home className="h-4 w-4" />}
              >
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">

                  {/* Total Area */}
                  <div>
                    <label className={LABEL}>
                      Total Area <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        required
                        min="1"
                        value={area}
                        onChange={(e) => setArea(e.target.value)}
                        className={`${INPUT} flex-1`}
                        placeholder="e.g. 1200"
                      />
                      <select
                        value={areaUnit}
                        onChange={(e) => setAreaUnit(e.target.value as AreaUnit)}
                        className="w-24 rounded-xl border border-gray-200 bg-white px-2 py-3 text-sm outline-none focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10"
                      >
                        {AREA_UNITS.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Covered Area */}
                  <div>
                    <label className={LABEL}>Covered Area</label>
                    <input
                      type="number"
                      value={coveredArea}
                      onChange={(e) => setCoveredArea(e.target.value)}
                      className={INPUT}
                      placeholder="e.g. 1100"
                    />
                  </div>

                  {/* Balcony Area */}
                  <div>
                    <label className={LABEL}>Balcony / Terrace Area</label>
                    <input
                      type="number"
                      value={balconyArea}
                      onChange={(e) => setBalconyArea(e.target.value)}
                      className={INPUT}
                      placeholder="e.g. 100"
                    />
                  </div>

                  {/* Commercial — Front Width & Depth */}
                  {category === 'commercial' && (
                    <>
                      <div>
                        <label className={LABEL}>Front Width (ft)</label>
                        <input
                          type="number"
                          value={frontWidth}
                          onChange={(e) => setFrontWidth(e.target.value)}
                          className={INPUT}
                          placeholder="e.g. 20"
                        />
                      </div>
                      <div>
                        <label className={LABEL}>Depth (ft)</label>
                        <input
                          type="number"
                          value={depth}
                          onChange={(e) => setDepth(e.target.value)}
                          className={INPUT}
                          placeholder="e.g. 40"
                        />
                      </div>
                    </>
                  )}
                </div>
              </SectionCard>

              {/* Pricing */}
              <SectionCard
                title="Pricing"
                subtitle="Price, payment option and installment plan"
                icon={<DollarSign className="h-4 w-4" />}
              >
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">

                  {/* Price */}
                  <div>
                    <label className={LABEL}>
                      Price (PKR) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className={INPUT}
                      placeholder="e.g. 8500000"
                    />
                  </div>

                  {/* Price per unit */}
                  <div>
                    <label className={LABEL}>Price per {areaUnit}</label>
                    <input
                      type="text"
                      readOnly
                      value={
                        pricePerUnit
                          ? `Rs. ${pricePerUnit.toLocaleString('en-PK')}`
                          : 'Auto-calculated'
                      }
                      className={`${INPUT} bg-gray-50 text-gray-500 cursor-not-allowed`}
                    />
                  </div>

                  {/* Payment option */}
                  <div>
                    <label className={LABEL}>Payment Option</label>
                    <select
                      value={listingType}
                      onChange={(e) => setListingType(e.target.value as ListingType)}
                      className={INPUT}
                    >
                      <option value="both">Both (Installment & Cash)</option>
                      <option value="installment">Installment Only</option>
                      <option value="full_payment">Cash Only</option>
                    </select>
                  </div>
                </div>

                {/* Negotiable toggle */}
                <div className="mt-4">
                  <CheckField
                    id="negotiable"
                    label="Price is negotiable"
                    checked={priceNegotiable}
                    onChange={setPriceNegotiable}
                  />
                </div>

                {/* Installment plan */}
                {(listingType === 'installment' || listingType === 'both') && (
                  <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-5">
                    <h4 className="mb-4 text-sm font-bold text-blue-900">
                      Installment Plan
                    </h4>
                    <div className="grid gap-4 md:grid-cols-3">
                      {(
                        [
                          { key: 'bookingAmount',    label: 'Booking Amount'   },
                          { key: 'downPayment',      label: 'Down Payment'     },
                          { key: 'monthlyAmount',    label: 'Monthly Amount'   },
                          { key: 'monthlyCount',     label: 'No. of Months'    },
                          { key: 'possessionAmount', label: 'On Possession'    },
                        ] as Array<{ key: keyof InstallmentPlan; label: string }>
                      ).map(({ key, label }) => (
                        <div key={key}>
                          <label className={LABEL}>{label}</label>
                          <input
                            type="number"
                            value={installmentPlan[key] ?? ''}
                            onChange={(e) =>
                              setInstallmentPlan((p) => ({
                                ...p,
                                [key]: Number(e.target.value) || 0,
                              }))
                            }
                            className={INPUT}
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional charges */}
                <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50 p-5">
                  <h4 className="mb-4 text-sm font-bold text-gray-700">
                    Additional Charges (for True Cost Calculator)
                  </h4>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {(
                      [
                        { key: 'cornerCharges',      label: 'Corner Charges'      },
                        { key: 'floorPremium',       label: 'Floor Premium'       },
                        { key: 'parkingCharges',     label: 'Parking Charges'     },
                        { key: 'maintenanceAdvance', label: 'Maintenance Advance' },
                      ] as Array<{ key: keyof Charges; label: string }>
                    ).map(({ key, label }) => (
                      <div key={key}>
                        <label className={LABEL}>{label}</label>
                        <input
                          type="number"
                          value={charges[key] ?? ''}
                          onChange={(e) =>
                            setCharges((p) => ({
                              ...p,
                              [key]: Number(e.target.value) || 0,
                            }))
                          }
                          className={INPUT}
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </SectionCard>
            </div>
          )}

          {/* ════════════════════════════════════
              STEP 3 — Features
          ════════════════════════════════════ */}
          {currentStep === 2 && (
            <div className="space-y-6">

              {/* Residential specifics */}
              {category === 'residential' && (
                <SectionCard
                  title="Residential Features"
                  subtitle="Rooms, amenities and finishing"
                  icon={<Home className="h-4 w-4" />}
                >
                  <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                    {/* Bedrooms */}
                    <div>
                      <label className={LABEL}>Bedrooms</label>
                      <select
                        value={bedrooms}
                        onChange={(e) => setBedrooms(e.target.value)}
                        className={INPUT}
                      >
                        <option value="">Select</option>
                        {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>

                    {/* Bathrooms */}
                    <div>
                      <label className={LABEL}>Bathrooms</label>
                      <select
                        value={bathrooms}
                        onChange={(e) => setBathrooms(e.target.value)}
                        className={INPUT}
                      >
                        <option value="">Select</option>
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>

                    {/* Balconies */}
                    <div>
                      <label className={LABEL}>Balconies</label>
                      <select
                        value={balconies}
                        onChange={(e) => setBalconies(e.target.value)}
                        className={INPUT}
                      >
                        <option value="">Select</option>
                        {[0, 1, 2, 3, 4].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>

                    {/* Finishing */}
                    <div>
                      <label className={LABEL}>Finishing Level</label>
                      <select
                        value={finishingLevel}
                        onChange={(e) => setFinishingLevel(e.target.value)}
                        className={INPUT}
                      >
                        <option value="">Select</option>
                        <option value="grey_structure">Grey Structure</option>
                        <option value="standard">Standard</option>
                        <option value="premium">Premium</option>
                        <option value="luxury">Luxury</option>
                      </select>
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="mt-6 flex flex-wrap gap-6">
                    <CheckField
                      id="servant"
                      label="Servant Quarter"
                      checked={servantQuarter}
                      onChange={setServantQuarter}
                    />
                    <CheckField
                      id="store"
                      label="Store Room"
                      checked={storeRoom}
                      onChange={setStoreRoom}
                    />
                    <CheckField
                      id="laundry"
                      label="Laundry Area"
                      checked={laundryArea}
                      onChange={setLaundryArea}
                    />
                  </div>

                  {/* Feature tags */}
                  <div className="mt-6">
                    <label className={LABEL}>Additional Features</label>
                    <div className="flex flex-wrap gap-2">
                      {RESIDENTIAL_FEATURES.map((f) => (
                        <FeatureToggle
                          key={f}
                          label={f}
                          active={features.includes(f)}
                          onToggle={() => toggleFeature(f)}
                        />
                      ))}
                    </div>
                  </div>
                </SectionCard>
              )}

              {/* Commercial specifics */}
              {category === 'commercial' && (
                <SectionCard
                  title="Commercial Features"
                  subtitle="Shop / Office specifications"
                  icon={<Building2 className="h-4 w-4" />}
                >
                  <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">

                    {/* Washroom */}
                    <div>
                      <label className={LABEL}>Washroom</label>
                      <select
                        value={washroom}
                        onChange={(e) => setWashroom(e.target.value)}
                        className={INPUT}
                      >
                        <option value="">Select</option>
                        <option value="none">None</option>
                        <option value="private">Private</option>
                        <option value="shared">Shared</option>
                      </select>
                    </div>

                    {/* Finishing */}
                    <div>
                      <label className={LABEL}>Finishing Level</label>
                      <select
                        value={finishingLevel}
                        onChange={(e) => setFinishingLevel(e.target.value)}
                        className={INPUT}
                      >
                        <option value="">Select</option>
                        <option value="grey_structure">Grey Structure</option>
                        <option value="standard">Standard</option>
                        <option value="premium">Premium</option>
                        <option value="luxury">Luxury</option>
                      </select>
                    </div>
                  </div>

                  {/* Mezzanine */}
                  <div className="mt-5 flex flex-wrap items-center gap-6">
                    <CheckField
                      id="mezzanine"
                      label="Has Mezzanine"
                      checked={hasMezzanine}
                      onChange={setHasMezzanine}
                    />
                    {hasMezzanine && (
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 whitespace-nowrap">
                          Mezzanine Area:
                        </label>
                        <input
                          type="number"
                          value={mezzanineArea}
                          onChange={(e) => setMezzanineArea(e.target.value)}
                          className="w-28 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10"
                          placeholder="Sq.Ft"
                        />
                      </div>
                    )}
                  </div>

                  {/* Feature tags */}
                  <div className="mt-6">
                    <label className={LABEL}>Additional Features</label>
                    <div className="flex flex-wrap gap-2">
                      {COMMERCIAL_FEATURES.map((f) => (
                        <FeatureToggle
                          key={f}
                          label={f}
                          active={features.includes(f)}
                          onToggle={() => toggleFeature(f)}
                        />
                      ))}
                    </div>
                  </div>
                </SectionCard>
              )}

              {/* Position & View */}
              <SectionCard
                title="Position & View"
                subtitle="Unit location attributes within the building"
                icon={<Home className="h-4 w-4" />}
              >
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className={LABEL}>Facing Direction</label>
                    <select
                      value={facing}
                      onChange={(e) => setFacing(e.target.value)}
                      className={INPUT}
                    >
                      <option value="">Select</option>
                      {FACING_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL}>View</label>
                    <select
                      value={view}
                      onChange={(e) => setView(e.target.value)}
                      className={INPUT}
                    >
                      <option value="">Select</option>
                      {VIEW_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-6">
                  <CheckField
                    id="corner"
                    label="Corner Unit"
                    checked={isCorner}
                    onChange={setIsCorner}
                  />
                  <CheckField
                    id="parkfacing"
                    label="Park Facing"
                    checked={isParkFacing}
                    onChange={setIsParkFacing}
                  />
                  <CheckField
                    id="roadfacing"
                    label="Road Facing"
                    checked={isRoadFacing}
                    onChange={setIsRoadFacing}
                  />
                </div>
              </SectionCard>

              {/* Parking */}
              <SectionCard
                title="Parking"
                subtitle="Parking allocation for this unit"
                icon={<Home className="h-4 w-4" />}
              >
                <div className="mb-4">
                  <CheckField
                    id="parking"
                    label="Parking Included"
                    checked={parkingIncluded}
                    onChange={setParkingIncluded}
                  />
                </div>

                {parkingIncluded && (
                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label className={LABEL}>Number of Spaces</label>
                      <select
                        value={parkingSpaces}
                        onChange={(e) => setParkingSpaces(e.target.value)}
                        className={INPUT}
                      >
                        <option value="">Select</option>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={LABEL}>Parking Type</label>
                      <select
                        value={parkingType}
                        onChange={(e) => setParkingType(e.target.value)}
                        className={INPUT}
                      >
                        <option value="">Select</option>
                        <option value="covered">Covered</option>
                        <option value="open">Open</option>
                        <option value="basement">Basement</option>
                      </select>
                    </div>
                  </div>
                )}
              </SectionCard>

              {/* Investor Intelligence */}
              <SectionCard
                title="Investor Intelligence"
                subtitle="Help investors make data-driven decisions"
                icon={<BarChart3 className="h-4 w-4" />}
              >
                <div className="rounded-xl border border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 p-5">
                  <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">

                    {/* Monthly Rent */}
                    <div>
                      <label className={LABEL}>Est. Monthly Rent (PKR)</label>
                      <input
                        type="number"
                        value={investorIntelligence.estimatedMonthlyRent ?? ''}
                        onChange={(e) =>
                          setInvestorIntelligence((p) => ({
                            ...p,
                            estimatedMonthlyRent: Number(e.target.value) || 0,
                          }))
                        }
                        className={INPUT}
                        placeholder="e.g. 45000"
                      />
                    </div>

                    {/* Rental Yield */}
                    <div>
                      <label className={LABEL}>Rental Yield (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={investorIntelligence.expectedRentalYield ?? ''}
                        onChange={(e) =>
                          setInvestorIntelligence((p) => ({
                            ...p,
                            expectedRentalYield: Number(e.target.value) || 0,
                          }))
                        }
                        className={INPUT}
                        placeholder="e.g. 6.5"
                      />
                      {autoRentalYield && (
                        <p className="mt-1 text-xs text-green-700 font-medium">
                          Auto-calc: {autoRentalYield}%
                        </p>
                      )}
                    </div>

                    {/* Capital Appreciation */}
                    <div>
                      <label className={LABEL}>Capital Appreciation</label>
                      <input
                        type="text"
                        value={investorIntelligence.capitalAppreciation ?? ''}
                        onChange={(e) =>
                          setInvestorIntelligence((p) => ({
                            ...p,
                            capitalAppreciation: clamp(e.target.value, 80),
                          }))
                        }
                        className={INPUT}
                        placeholder="e.g. 20-25% in 2 years"
                      />
                    </div>

                    {/* Investment Score */}
                    <div>
                      <label className={LABEL}>Investment Score</label>
                      <select
                        value={investorIntelligence.investmentScore ?? ''}
                        onChange={(e) =>
                          setInvestorIntelligence((p) => ({
                            ...p,
                            investmentScore: e.target.value,
                          }))
                        }
                        className={INPUT}
                      >
                        <option value="">Select</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="excellent">Excellent</option>
                      </select>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>
          )}

          {/* ════════════════════════════════════
              STEP 4 — Media & Submit
          ════════════════════════════════════ */}
          {currentStep === 3 && (
            <div className="space-y-6">

              {/* Images */}
              <SectionCard
                title="Unit Photos"
                subtitle={`Upload up to ${MAX_IMAGES} photos · 5MB each`}
                icon={<Camera className="h-4 w-4" />}
              >
                <div className="flex flex-wrap gap-3 mb-4">
                  {localImages.map((file, idx) => (
                    <div key={idx} className="relative group">
                      <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
                        <Camera className="h-7 w-7 text-gray-300" />
                      </div>
                      <p className="mt-1 w-24 truncate text-center text-[10px] text-gray-400">
                        {file.name}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 shadow transition-opacity group-hover:opacity-100"
                        aria-label="Remove image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}

                  {localImages.length < MAX_IMAGES && (
                    <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 transition-all hover:border-[#029bba] hover:bg-teal-50">
                      <Plus className="h-6 w-6 text-gray-400" />
                      <span className="mt-1 text-[10px] font-bold uppercase text-gray-400">
                        Add Photo
                      </span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageSelect}
                      />
                    </label>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  {localImages.length} / {MAX_IMAGES} photos selected
                </p>
              </SectionCard>

              {/* Floor Plan & URLs */}
              <SectionCard
                title="Floor Plan & Media Links"
                subtitle="Optional but strongly recommended"
                icon={<Camera className="h-4 w-4" />}
              >
                <div className="grid gap-5 md:grid-cols-2">

                  {/* Floor plan */}
                  <div>
                    <label className={LABEL}>Floor Plan Image</label>
                    <label className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 transition-all hover:border-[#029bba] hover:bg-teal-50">
                      <span className="text-sm text-gray-500">
                        {localFloorPlan ? localFloorPlan.name : 'Select floor plan'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          setLocalFloorPlan(e.target.files?.[0] ?? null)
                        }
                      />
                    </label>
                  </div>

                  {/* Virtual tour */}
                  <div>
                    <label className={LABEL}>Virtual Tour URL</label>
                    <input
                      type="url"
                      value={virtualTourUrl}
                      onChange={(e) => setVirtualTourUrl(clamp(e.target.value, 400))}
                      className={INPUT}
                      placeholder="Matterport / YouTube link"
                    />
                  </div>

                  {/* Video */}
                  <div>
                    <label className={LABEL}>Video URL</label>
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(clamp(e.target.value, 400))}
                      className={INPUT}
                      placeholder="YouTube / Vimeo link"
                    />
                  </div>
                </div>
              </SectionCard>

              {/* Descriptions */}
              <SectionCard
                title="Description"
                subtitle="Describe this unit to potential buyers"
                icon={<Home className="h-4 w-4" />}
              >
                <div className="space-y-5">
                  <div>
                    <label className={LABEL}>Short Description</label>
                    <input
                      type="text"
                      value={shortDescription}
                      onChange={(e) =>
                        setShortDescription(clamp(e.target.value, 200))
                      }
                      className={INPUT}
                      placeholder="Brief one-liner shown in search results"
                      maxLength={200}
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      {shortDescription.length} / 200 characters
                    </p>
                  </div>
                  <div>
                    <label className={LABEL}>Full Description</label>
                    <textarea
                      value={description}
                      onChange={(e) =>
                        setDescription(clamp(e.target.value, 5000))
                      }
                      className={`${INPUT} min-h-[160px] resize-y`}
                      placeholder="Detailed description of the unit..."
                      maxLength={5000}
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      {description.length} / 5000 characters
                    </p>
                  </div>
                </div>
              </SectionCard>

              {/* Review Summary */}
              <div className="rounded-2xl border border-[#029bba]/20 bg-gradient-to-br from-[#f0fbff] to-white p-6">
                <h3 className="mb-4 text-base font-bold text-[#004063]">
                  Unit Summary
                </h3>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {[
                    {
                      label: 'Unit Number',
                      value: unitNumber || '—',
                    },
                    {
                      label: 'Type',
                      value:
                        unitTypeOptions.find((t) => t.value === unitType)
                          ?.label ?? '—',
                    },
                    {
                      label: 'Area',
                      value: area ? `${area} ${areaUnit}` : '—',
                    },
                    {
                      label: 'Price',
                      value: price
                        ? `Rs. ${Number(price).toLocaleString('en-PK')}`
                        : '—',
                    },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="rounded-xl border border-gray-100 bg-white p-4"
                    >
                      <p className="text-xs text-gray-400 uppercase font-semibold">
                        {label}
                      </p>
                      <p className="mt-1 font-bold text-[#004063] truncate">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════
              Navigation Buttons
          ════════════════════════════════════ */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-6">

            {/* Previous */}
            {currentStep > 0 ? (
              <button
                type="button"
                onClick={handlePrev}
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void router.back()}
                className="flex items-center gap-2 rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" /> Cancel
              </button>
            )}

            {/* Next / Submit */}
            {currentStep < STEP_LABELS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 rounded-xl bg-[#004063] px-8 py-3 text-sm font-bold text-white hover:bg-[#002d46] transition-colors"
              >
                Next Step <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-xl bg-[#029bba] px-8 py-3 text-sm font-bold text-white shadow-lg shadow-[#029bba]/20 hover:bg-[#027a94] disabled:cursor-not-allowed disabled:opacity-50 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {uploadProgress ?? 'Processing...'}
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Create Unit
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </DeveloperLayout>
  );
}