// pages/developer/projects/[id]/units/[unitId]/edit.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  FileText,
  RefreshCw,
} from 'lucide-react';
import DeveloperLayout from '@/components/developer/DeveloperLayout';
import { useDeveloperContext } from '@/components/developer/DeveloperContext';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type UnitCategory = 'residential' | 'commercial';
type UnitStatus   = 'available' | 'reserved' | 'sold' | 'on_hold' | 'cancelled';
type ListingType  = 'both' | 'installment' | 'full_payment';
type AreaUnit     = 'Sq.Ft' | 'Sq.Yd' | 'Sq.M';

interface ProjectInfo {
  _id:         string;
  projectName: string;
  city:        string;
  area:        string;
}

interface ImageRef {
  url:      string;
  publicId: string;
}

interface ExistingImage {
  url:       string;
  publicId:  string;
  _id?:      string;
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
  estimatedMonthlyRent?: number;
  expectedRentalYield?:  number;
  capitalAppreciation?:  string;
  investmentScore?:      string;
}

interface UnitDetail {
  _id:               string;
  unitNumber:        string;
  category:          UnitCategory;
  unitType:          string;
  status:            UnitStatus;
  floorNumber?:      number;
  floorName?:        string;
  tower?:            string;
  wing?:             string;
  area?:             number;
  areaUnit?:         AreaUnit;
  coveredArea?:      number;
  balconyArea?:      number;
  frontWidth?:       number;
  depth?:            number;
  price?:            number;
  priceNegotiable?:  boolean;
  listingType?:      ListingType;
  installmentPlan?:  InstallmentPlan;
  charges?:          Charges;
  investorIntelligence?: InvestorIntelligence;
  bedrooms?:         number;
  bathrooms?:        number;
  balconies?:        number;
  servantQuarter?:   boolean;
  storeRoom?:        boolean;
  laundryArea?:      boolean;
  finishingLevel?:   string;
  washroom?:         string;
  hasMezzanine?:     boolean;
  mezzanineArea?:    number;
  isCorner?:         boolean;
  facing?:           string;
  view?:             string;
  isParkFacing?:     boolean;
  isRoadFacing?:     boolean;
  parkingIncluded?:  boolean;
  parkingSpaces?:    number;
  parkingType?:      string;
  features?:         string[];
  images?:           ExistingImage[];
  floorPlan?:        ExistingImage | null;
  imageUrl?:         string; // The explicit unit layout thumbnail for the frontend inventory table
  virtualTourUrl?:   string;
  videoUrl?:         string;
  shortDescription?: string;
  description?:      string;
}

interface UnitApiResponse {
  success:  boolean;
  message?: string;
  unit?:    UnitDetail;
  project?: ProjectInfo;
}

// ─────────────────────────────────────────────
// Constants — identical to new.tsx
// ─────────────────────────────────────────────

const MAX_IMAGES      = 15;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

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

const STEP_LABELS = [
  'Basic Info', 'Size & Price', 'Features', 'Media & Save',
] as const;

const STATUS_COLORS: Record<UnitStatus, string> = {
  available: 'text-green-700 bg-green-50 border-green-200',
  reserved:  'text-yellow-700 bg-yellow-50 border-yellow-200',
  sold:      'text-red-700 bg-red-50 border-red-200',
  on_hold:   'text-gray-700 bg-gray-50 border-gray-200',
  cancelled: 'text-gray-500 bg-gray-50 border-gray-200',
};

// ─────────────────────────────────────────────
// Tailwind class strings
// ─────────────────────────────────────────────

const INPUT = 'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 placeholder:text-gray-400';
const LABEL = 'block text-sm font-semibold text-[#004063] mb-1.5';

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
// Shared UI Components
// ─────────────────────────────────────────────

function StepIndicator({
  current,
}: {
  current: number;
}): React.ReactElement {
  return (
    <div className="mb-10">
      <div className="relative flex items-center justify-between">
        <div className="absolute left-0 right-0 top-5 h-0.5 bg-gray-100" />
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
          <div className="rounded-lg bg-teal-50 p-2 text-[#029bba]">{icon}</div>
        )}
        <div>
          <h3 className="text-base font-bold text-[#004063]">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
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
      {active && <Check className="mr-1 inline h-3 w-3" />}
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
    <label
      htmlFor={id}
      className="flex cursor-pointer select-none items-center gap-2"
    >
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

export default function EditUnitPage(): React.ReactElement {
  const router      = useRouter();
  const { profile } = useDeveloperContext();

  const projectId = toStr(router.query.id);
  const unitId    = toStr(router.query.unitId);

  // ── Page state ──
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError,   setPageError]   = useState<string | null>(null);
  const [project,     setProject]     = useState<ProjectInfo | null>(null);

  // ── Approved status guard ──────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    if (profile.status !== 'approved') {
      void router.replace('/developer/dashboard');
    }
  }, [profile, router]);

  // ── Form navigation ──
  const [currentStep,  setCurrentStep]  = useState(0);
  const [stepError,    setStepError]    = useState<string | null>(null);
  const [formError,    setFormError]    = useState<string | null>(null);
  const [saveSuccess,  setSaveSuccess]  = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  // ── STEP 1 — Basic ──
  const [unitNumber,  setUnitNumber]  = useState('');
  const [category,    setCategory]    = useState<UnitCategory>('residential');
  const [unitType,    setUnitType]    = useState('');
  const [status,      setStatus]      = useState<UnitStatus>('available');
  const [floorNumber, setFloorNumber] = useState('');
  const [floorName,   setFloorName]   = useState('');
  const [tower,       setTower]       = useState('');
  const [wing,        setWing]        = useState('');

  // ── STEP 2 — Size ──
  const [area,        setArea]        = useState('');
  const [areaUnit,    setAreaUnit]    = useState<AreaUnit>('Sq.Ft');
  const [coveredArea, setCoveredArea] = useState('');
  const [balconyArea, setBalconyArea] = useState('');
  const [frontWidth,  setFrontWidth]  = useState('');
  const [depth,       setDepth]       = useState('');

  // ── STEP 2 — Price ──
  const [price,           setPrice]           = useState('');
  const [priceNegotiable, setPriceNegotiable] = useState(false);
  const [listingType,     setListingType]     = useState<ListingType>('both');
  const [installmentPlan, setInstallmentPlan] = useState<InstallmentPlan>({});
  const [charges,         setCharges]         = useState<Charges>({});

  // ── STEP 3 — Residential ──
  const [bedrooms,       setBedrooms]       = useState('');
  const [bathrooms,      setBathrooms]      = useState('');
  const [balconies,      setBalconies]      = useState('');
  const [servantQuarter, setServantQuarter] = useState(false);
  const [storeRoom,      setStoreRoom]      = useState(false);
  const [laundryArea,    setLaundryArea]    = useState(false);
  const [finishingLevel, setFinishingLevel] = useState('');

  // ── STEP 3 — Commercial ──
  const [washroom,      setWashroom]      = useState('');
  const [hasMezzanine,  setHasMezzanine]  = useState(false);
  const [mezzanineArea, setMezzanineArea] = useState('');

  // ── STEP 3 — Position & Parking ──
  const [isCorner,        setIsCorner]        = useState(false);
  const [facing,          setFacing]          = useState('');
  const [view,            setView]            = useState('');
  const [isParkFacing,    setIsParkFacing]    = useState(false);
  const [isRoadFacing,    setIsRoadFacing]    = useState(false);
  const [parkingIncluded, setParkingIncluded] = useState(false);
  const [parkingSpaces,   setParkingSpaces]   = useState('');
  const [parkingType,     setParkingType]     = useState('');

  // ── STEP 3 — Features & Investor ──
  const [features,             setFeatures]             = useState<string[]>([]);
  const [investorIntelligence, setInvestorIntelligence] = useState<InvestorIntelligence>({});

  // ── STEP 4 — Media ──
  const [existingImages,   setExistingImages]   = useState<ExistingImage[]>([]);
  const [removedImageIds,  setRemovedImageIds]  = useState<string[]>([]);
  const [newImageFiles,    setNewImageFiles]     = useState<File[]>([]);
  const [existingFloorPlan, setExistingFloorPlan] = useState<ExistingImage | null>(null);
  const [newFloorPlanFile,  setNewFloorPlanFile]  = useState<File | null>(null);
  const [replaceFloorPlan,  setReplaceFloorPlan]  = useState(false);
  
  // Specific Thumbnail for Unit Row
  const [existingImageUrl, setExistingImageUrl] = useState('');
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  
  const [virtualTourUrl,   setVirtualTourUrl]   = useState('');
  const [videoUrl,         setVideoUrl]         = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description,      setDescription]      = useState('');

  const abortRef = useRef<AbortController | null>(null);
  const reqSeq   = useRef(0);

  // ─────────────────────────────────────────
  // Derived
  // ─────────────────────────────────────────

  const unitTypeOptions = useMemo(
    () =>
      category === 'residential'
        ? RESIDENTIAL_UNIT_TYPES
        : COMMERCIAL_UNIT_TYPES,
    [category]
  );

  const pricePerUnit = useMemo(() => {
    const p = Number(price);
    const a = Number(area);
    if (!p || !a || a <= 0) return 0;
    return Math.round(p / a);
  }, [price, area]);

  const autoRentalYield = useMemo(() => {
    const rent = investorIntelligence.estimatedMonthlyRent;
    const p    = Number(price);
    if (!rent || !p) return null;
    return ((rent * 12) / p * 100).toFixed(2);
  }, [investorIntelligence.estimatedMonthlyRent, price]);

  // ─────────────────────────────────────────
  // Fetch unit
  // ─────────────────────────────────────────

  const fetchUnit = useCallback(async (): Promise<void> => {
    if (!projectId || !unitId) return;

    const seq = ++reqSeq.current;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setPageLoading(true);
    setPageError(null);

    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/units/${encodeURIComponent(unitId)}`,
        { method: 'GET', credentials: 'include', signal: ac.signal }
      );
      const data: UnitApiResponse =
        await res.json().catch(() => ({ success: false }));

      if (seq !== reqSeq.current) return;

      if (!res.ok || !data.success || !data.unit) {
        if (res.status === 403 || res.status === 404) {
          void router.push('/developer/projects');
          return;
        }
        setPageError(data.message ?? 'Failed to load unit.');
        return;
      }

      setProject(data.project ?? null);

      // ── Hydrate ALL 52 fields ──
      const u = data.unit;

      // Step 1
      setUnitNumber(u.unitNumber ?? '');
      setCategory(u.category ?? 'residential');
      setUnitType(u.unitType ?? '');
      setStatus(u.status ?? 'available');
      setFloorNumber(u.floorNumber != null ? String(u.floorNumber) : '');
      setFloorName(u.floorName ?? '');
      setTower(u.tower ?? '');
      setWing(u.wing ?? '');

      // Step 2 — Size
      setArea(u.area != null ? String(u.area) : '');
      setAreaUnit(u.areaUnit ?? 'Sq.Ft');
      setCoveredArea(u.coveredArea != null ? String(u.coveredArea) : '');
      setBalconyArea(u.balconyArea != null ? String(u.balconyArea) : '');
      setFrontWidth(u.frontWidth != null ? String(u.frontWidth) : '');
      setDepth(u.depth != null ? String(u.depth) : '');

      // Step 2 — Price
      setPrice(u.price != null ? String(u.price) : '');
      setPriceNegotiable(Boolean(u.priceNegotiable));
      setListingType(u.listingType ?? 'both');
      setInstallmentPlan(u.installmentPlan ?? {});
      setCharges(u.charges ?? {});

      // Step 3 — Residential
      setBedrooms(u.bedrooms != null ? String(u.bedrooms) : '');
      setBathrooms(u.bathrooms != null ? String(u.bathrooms) : '');
      setBalconies(u.balconies != null ? String(u.balconies) : '');
      setServantQuarter(Boolean(u.servantQuarter));
      setStoreRoom(Boolean(u.storeRoom));
      setLaundryArea(Boolean(u.laundryArea));
      setFinishingLevel(u.finishingLevel ?? '');

      // Step 3 — Commercial
      setWashroom(u.washroom ?? '');
      setHasMezzanine(Boolean(u.hasMezzanine));
      setMezzanineArea(u.mezzanineArea != null ? String(u.mezzanineArea) : '');

      // Step 3 — Position & Parking
      setIsCorner(Boolean(u.isCorner));
      setFacing(u.facing ?? '');
      setView(u.view ?? '');
      setIsParkFacing(Boolean(u.isParkFacing));
      setIsRoadFacing(Boolean(u.isRoadFacing));
      setParkingIncluded(Boolean(u.parkingIncluded));
      setParkingSpaces(u.parkingSpaces != null ? String(u.parkingSpaces) : '');
      setParkingType(u.parkingType ?? '');

      // Step 3 — Features & Investor
      setFeatures(Array.isArray(u.features) ? u.features : []);
      setInvestorIntelligence(u.investorIntelligence ?? {});

      // Step 4 — Media
      setExistingImages(Array.isArray(u.images) ? u.images : []);
      setExistingFloorPlan(u.floorPlan ?? null);
      setExistingImageUrl(u.imageUrl ?? '');
      setVirtualTourUrl(u.virtualTourUrl ?? '');
      setVideoUrl(u.videoUrl ?? '');
      setShortDescription(u.shortDescription ?? '');
      setDescription(u.description ?? '');

    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      if (seq !== reqSeq.current) return;
      setPageError('Network error. Please check your connection.');
    } finally {
      if (seq === reqSeq.current) setPageLoading(false);
    }
  }, [projectId, unitId, router]);

  useEffect(() => {
    void fetchUnit();
    return () => abortRef.current?.abort();
  }, [fetchUnit]);

  // ─────────────────────────────────────────
  // Step validation
  // ─────────────────────────────────────────

  const validateStep = (step: number): string | null => {
    if (step === 0) {
      if (!unitNumber.trim()) return 'Unit Number is required.';
      if (!unitType)          return 'Unit Type is required.';
    }
    if (step === 1) {
      if (!area  || Number(area)  <= 0) return 'Area is required.';
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

  // ─────────────────────────────────────────
  // Feature toggle
  // ─────────────────────────────────────────

  const toggleFeature = useCallback((f: string): void => {
    setFeatures((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );
  }, []);

  // ─────────────────────────────────────────
  // Image handlers
  // ─────────────────────────────────────────

  const handleNewImages = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const files = Array.from(e.target.files ?? []);
    const slots = MAX_IMAGES - existingImages.length;
    const valid = files
      .filter((f) => f.size <= MAX_IMAGE_BYTES)
      .slice(0, slots);
    setNewImageFiles((prev) => [...prev, ...valid].slice(0, MAX_IMAGES));
    e.target.value = '';
  };

  const removeExistingImage = (img: ExistingImage): void => {
    setExistingImages((prev) => prev.filter((i) => i.url !== img.url));
    if (img.publicId) {
      setRemovedImageIds((prev) => [...prev, img.publicId]);
    }
  };

  const removeNewImage = (index: number): void => {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ─────────────────────────────────────────
  // Upload helper
  // ─────────────────────────────────────────

  const uploadFile = async (
    file: File,
    folder: string
  ): Promise<ImageRef | null> => {
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
  // Submit — two-phase PATCH
  // ─────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (isSubmitting) return;

    const err = validateStep(0) ?? validateStep(1);
    if (err) { setFormError(err); return; }

    setFormError(null);
    setSaveSuccess(false);
    setIsSubmitting(true);

    try {
      // Phase 1 — upload new images
      const uploadedImages: ImageRef[] = [];
      for (let i = 0; i < newImageFiles.length; i++) {
        setUploadProgress(
          `Uploading image ${i + 1} of ${newImageFiles.length}...`
        );
        const ref = await uploadFile(newImageFiles[i], 'projects');
        if (ref) uploadedImages.push(ref);
      }

      // Phase 1b — upload floor plan replacement
      let newFloorPlanRef: ImageRef | null = null;
      if (replaceFloorPlan && newFloorPlanFile) {
        setUploadProgress('Uploading floor plan...');
        newFloorPlanRef = await uploadFile(newFloorPlanFile, 'projects');
      }

      // Phase 1c — upload explicit unit thumbnail
      let newImageUrlRef: ImageRef | null = null;
      if (newImageFile) {
        setUploadProgress('Uploading unit thumbnail...');
        newImageUrlRef = await uploadFile(newImageFile, 'projects');
      }

      // Phase 2 — PATCH JSON
      setUploadProgress('Saving changes...');

      const payload: Record<string, unknown> = {
        // Basic
        unitNumber:  clamp(unitNumber, 40),
        category,
        unitType:    clamp(unitType, 40),
        status,
        floorNumber: safeNum(floorNumber),
        floorName:   floorName   ? clamp(floorName, 60)   : undefined,
        tower:       tower       ? clamp(tower, 40)        : undefined,
        wing:        wing        ? clamp(wing, 40)         : undefined,

        // Size
        area:        Number(area),
        areaUnit,
        coveredArea: coveredArea ? Number(coveredArea)     : undefined,
        balconyArea: balconyArea ? Number(balconyArea)     : undefined,

        // Price
        price:           Number(price),
        priceNegotiable,
        listingType,
        installmentPlan,
        charges,

        // Residential
        ...(category === 'residential' ? {
          bedrooms:       bedrooms  ? Number(bedrooms)  : undefined,
          bathrooms:      bathrooms ? Number(bathrooms) : undefined,
          balconies:      balconies ? Number(balconies) : undefined,
          servantQuarter,
          storeRoom,
          laundryArea,
        } : {}),

        // Commercial
        ...(category === 'commercial' ? {
          washroom:      washroom      || undefined,
          frontWidth:    frontWidth    ? Number(frontWidth)    : undefined,
          depth:         depth         ? Number(depth)         : undefined,
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

        // Investor
        investorIntelligence,

        // Image diff
        newImages:      uploadedImages,
        removedImageIds,

        // Floor plan
        ...(replaceFloorPlan && newFloorPlanRef
          ? { floorPlan: newFloorPlanRef }
          : {}),

        // Unit Inventory Thumbnail (Row Image)
        ...(newImageUrlRef ? { imageUrl: newImageUrlRef.url } : {}),

        // Media links
        virtualTourUrl: virtualTourUrl ? virtualTourUrl.trim() : undefined,
        videoUrl:       videoUrl       ? videoUrl.trim()       : undefined,

        // Descriptions
        shortDescription: shortDescription
          ? clamp(shortDescription, 200) : undefined,
        description: description
          ? clamp(description, 5000)     : undefined,
      };

      const res  = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/units/${encodeURIComponent(unitId)}`,
        {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        }
      );
      const data: { success: boolean; message?: string } =
        await res.json().catch(() => ({ success: false }));

      if (!res.ok || !data.success) {
        setFormError(data.message ?? 'Failed to save changes. Please try again.');
        return;
      }

      setSaveSuccess(true);
      setTimeout(() => {
        void router.push(
          `/developer/projects/${encodeURIComponent(projectId)}/units`
        );
      }, 1500);

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
  // Loading state
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
          <title>Edit Unit | Developer Dashboard</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#029bba]" />
        </div>
      </DeveloperLayout>
    );
  }

  // ─────────────────────────────────────────
  // Error state
  // ─────────────────────────────────────────

  if (pageError) {
    return (
      <DeveloperLayout>
        <Head>
          <title>Edit Unit | Developer Dashboard</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <div className="mx-auto mt-20 max-w-md rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-400" />
          <h2 className="text-xl font-bold text-[#004063]">Could Not Load Unit</h2>
          <p className="mt-2 text-sm text-gray-500">{pageError}</p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => void fetchUnit()}
              className="flex items-center gap-2 rounded-xl bg-[#029bba] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#027a94] transition-colors"
            >
              <RefreshCw className="h-4 w-4" /> Retry
            </button>
            <button
              type="button"
              onClick={() => void router.push('/developer/projects')}
              className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Back to Projects
            </button>
          </div>
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
        <title>
          Edit {unitNumber ? `Unit ${unitNumber}` : 'Unit'} —{' '}
          {project?.projectName ?? 'Project'} | Highrise.pk
        </title>
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
          <span className="max-w-[140px] truncate text-gray-400">
            {project?.projectName}
          </span>
          <span>/</span>
          <span className="font-semibold text-gray-700">
            Edit Unit {unitNumber}
          </span>
        </nav>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#004063]">
            Edit Unit {unitNumber}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {project?.projectName}
            {project?.city && ` · ${project.city}`}
            {profile?.companyName && (
              <span className="ml-2 text-gray-400">
                · {profile.companyName}
              </span>
            )}
          </p>
        </div>

        {/* Step indicator */}
        <StepIndicator current={currentStep} />

        {/* Success banner */}
        {saveSuccess && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border-l-4 border-[#10b981] bg-[#f0fdf4] p-4">
            <Check className="h-5 w-5 shrink-0 text-[#10b981]" />
            <p className="text-sm font-semibold text-green-800">
              Unit updated successfully. Redirecting...
            </p>
          </div>
        )}

        {/* Step error */}
        {stepError && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border-l-4 border-[#f59e0b] bg-[#fef3c7] p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-[#f59e0b]" />
            <p className="text-sm font-medium text-amber-800">{stepError}</p>
          </div>
        )}

        {/* Form error */}
        {formError && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border-l-4 border-[#ef4444] bg-[#fef2f2] p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#ef4444]" />
            <p className="flex-1 text-sm font-medium text-red-800">
              {formError}
            </p>
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

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="space-y-6"
        >

          {/* ════════════════════════════════
              STEP 1 — Basic Info
          ════════════════════════════════ */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <SectionCard
                title="Unit Status"
                subtitle="Current availability status"
                icon={<Check className="h-4 w-4" />}
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className={LABEL}>Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as UnitStatus)}
                      className={`${INPUT} font-semibold border ${STATUS_COLORS[status]}`}
                    >
                      <option value="available">Available</option>
                      <option value="reserved">Reserved</option>
                      <option value="sold">Sold</option>
                      <option value="on_hold">On Hold</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className={LABEL}>
                      Unit Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={unitNumber}
                      onChange={(e) =>
                        setUnitNumber(clamp(e.target.value, 40))
                      }
                      className={INPUT}
                      placeholder="e.g. A-301"
                    />
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Classification"
                subtitle="Unit type and location within the building"
                icon={<Building2 className="h-4 w-4" />}
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className={LABEL}>Category</label>
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
                      <option value="">Select type</option>
                      {unitTypeOptions.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
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
                  <div>
                    <label className={LABEL}>Floor Name</label>
                    <input
                      type="text"
                      value={floorName}
                      onChange={(e) =>
                        setFloorName(clamp(e.target.value, 60))
                      }
                      className={INPUT}
                      placeholder="e.g. Ground Floor"
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Tower / Block</label>
                    <input
                      type="text"
                      value={tower}
                      onChange={(e) => setTower(clamp(e.target.value, 40))}
                      className={INPUT}
                      placeholder="e.g. Tower A"
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Wing</label>
                    <input
                      type="text"
                      value={wing}
                      onChange={(e) => setWing(clamp(e.target.value, 40))}
                      className={INPUT}
                      placeholder="e.g. East Wing"
                    />
                  </div>
                </div>
              </SectionCard>
            </div>
          )}

          {/* ════════════════════════════════
              STEP 2 — Size & Price
          ════════════════════════════════ */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <SectionCard
                title="Dimensions"
                subtitle="Unit measurements and area breakdown"
                icon={<Home className="h-4 w-4" />}
              >
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
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
                        onChange={(e) =>
                          setAreaUnit(e.target.value as AreaUnit)
                        }
                        className="w-24 rounded-xl border border-gray-200 bg-white px-2 py-3 text-sm outline-none focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10"
                      >
                        {AREA_UNITS.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                  </div>
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

              <SectionCard
                title="Pricing"
                subtitle="Price, payment options and installment plan"
                icon={<DollarSign className="h-4 w-4" />}
              >
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
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
                  <div>
                    <label className={LABEL}>
                      Price per {areaUnit}
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={
                        pricePerUnit
                          ? `Rs. ${pricePerUnit.toLocaleString('en-PK')}`
                          : 'Auto-calculated'
                      }
                      className={`${INPUT} cursor-not-allowed bg-gray-50 text-gray-500`}
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Payment Option</label>
                    <select
                      value={listingType}
                      onChange={(e) =>
                        setListingType(e.target.value as ListingType)
                      }
                      className={INPUT}
                    >
                      <option value="both">Both (Installment & Cash)</option>
                      <option value="installment">Installment Only</option>
                      <option value="full_payment">Cash Only</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <CheckField
                    id="negotiable"
                    label="Price is negotiable"
                    checked={priceNegotiable}
                    onChange={setPriceNegotiable}
                  />
                </div>

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
                        ] as Array<{
                          key: keyof InstallmentPlan;
                          label: string;
                        }>
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

                <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50 p-5">
                  <h4 className="mb-4 text-sm font-bold text-gray-700">
                    Additional Charges (True Cost Calculator)
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

          {/* ════════════════════════════════
              STEP 3 — Features
          ════════════════════════════════ */}
          {currentStep === 2 && (
            <div className="space-y-6">

              {category === 'residential' && (
                <SectionCard
                  title="Residential Features"
                  subtitle="Rooms, amenities and finishing level"
                  icon={<Home className="h-4 w-4" />}
                >
                  <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
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

              {category === 'commercial' && (
                <SectionCard
                  title="Commercial Features"
                  subtitle="Shop / Office specifications"
                  icon={<Building2 className="h-4 w-4" />}
                >
                  <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
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

                  <div className="mt-5 flex flex-wrap items-center gap-6">
                    <CheckField
                      id="mezzanine"
                      label="Has Mezzanine"
                      checked={hasMezzanine}
                      onChange={setHasMezzanine}
                    />
                    {hasMezzanine && (
                      <div className="flex items-center gap-2">
                        <label className="whitespace-nowrap text-sm text-gray-600">
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

              <SectionCard
                title="Position & View"
                subtitle="Unit location within the building"
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
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
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
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
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

              <SectionCard
                title="Investor Intelligence"
                subtitle="Help investors make data-driven decisions"
                icon={<BarChart3 className="h-4 w-4" />}
              >
                <div className="rounded-xl border border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 p-5">
                  <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <label className={LABEL}>
                        Est. Monthly Rent (PKR)
                      </label>
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
                    <div>
                      <label className={LABEL}>Rental Yield (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={
                          investorIntelligence.expectedRentalYield ?? ''
                        }
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
                        <p className="mt-1 text-xs font-medium text-green-700">
                          Auto-calc: {autoRentalYield}%
                        </p>
                      )}
                    </div>
                    <div>
                      <label className={LABEL}>Capital Appreciation</label>
                      <input
                        type="text"
                        value={
                          investorIntelligence.capitalAppreciation ?? ''
                        }
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

          {/* ════════════════════════════════
              STEP 4 — Media & Save
          ════════════════════════════════ */}
          {currentStep === 3 && (
            <div className="space-y-6">

              <SectionCard
                title="Unit Photos"
                subtitle={`Manage existing photos and upload new ones · Max ${MAX_IMAGES} total`}
                icon={<Camera className="h-4 w-4" />}
              >
                {/* Existing images */}
                {existingImages.length > 0 && (
                  <div className="mb-6">
                    <p className="mb-3 text-sm font-semibold text-gray-600">
                      Current Photos
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {existingImages.map((img, idx) => (
                        <div
                          key={`${img.url}-${idx}`}
                          className="group relative"
                        >
                          <img
                            src={img.url}
                            alt={`Unit photo ${idx + 1}`}
                            className="h-20 w-20 rounded-xl border border-gray-200 object-cover"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={() => removeExistingImage(img)}
                            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 shadow transition-opacity group-hover:opacity-100"
                            aria-label="Remove photo"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    {removedImageIds.length > 0 && (
                      <p className="mt-2 text-xs font-medium text-amber-700">
                        {removedImageIds.length} photo(s) marked for removal on save.
                      </p>
                    )}
                  </div>
                )}

                {/* New images */}
                <div>
                  <p className="mb-3 text-sm font-semibold text-gray-600">
                    Add New Photos
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {newImageFiles.map((f, idx) => {
                      const previewUrl = URL.createObjectURL(f);
                      return (
                        <div key={idx} className="group relative">
                          <img
                            src={previewUrl}
                            alt={`New photo ${idx + 1}`}
                            className="h-20 w-20 rounded-xl border border-gray-200 object-cover"
                            loading="lazy"
                            onLoad={() => URL.revokeObjectURL(previewUrl)}
                          />
                          <button
                            type="button"
                            onClick={() => removeNewImage(idx)}
                            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 shadow transition-opacity group-hover:opacity-100"
                            aria-label="Remove"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}

                    {(existingImages.length + newImageFiles.length) <
                      MAX_IMAGES && (
                      <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 transition-all hover:border-[#029bba] hover:bg-teal-50">
                        <Plus className="h-6 w-6 text-gray-400" />
                        <span className="mt-1 text-[10px] font-bold uppercase text-gray-400">
                          Add
                        </span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={handleNewImages}
                        />
                      </label>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-gray-400">
                    {existingImages.length + newImageFiles.length} /{' '}
                    {MAX_IMAGES} photos total · 5MB each
                  </p>
                </div>
              </SectionCard>

              {/* Unit Inventory Thumbnail */}
              <SectionCard
                title="Unit Thumbnail (Required for Grid)"
                subtitle="This 1:1 image displays directly on the frontend unit availability table."
                icon={<Camera className="h-4 w-4" />}
              >
                {existingImageUrl && !newImageFile ? (
                  <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <img src={existingImageUrl} alt="Unit Thumbnail" className="w-16 h-16 rounded-xl object-cover border border-gray-200" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-700">Current Thumbnail</p>
                      <p className="text-xs text-gray-500 mt-0.5">Displayed on the public unit grid.</p>
                    </div>
                    <label className="cursor-pointer text-xs font-bold text-[#029bba] bg-[#029bba]/10 hover:bg-[#029bba]/20 px-4 py-2 rounded-lg transition-colors">
                      Replace Image
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => setNewImageFile(e.target.files?.[0] ?? null)} />
                    </label>
                  </div>
                ) : (
                  <div>
                    <label className="flex h-24 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-200 transition-all hover:border-[#029bba] hover:bg-teal-50">
                      <Camera className="h-6 w-6 text-gray-400" />
                      <span className="text-sm font-bold text-gray-600">
                        {newImageFile ? newImageFile.name : 'Upload unit thumbnail (1:1 aspect ratio recommended)'}
                      </span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => setNewImageFile(e.target.files?.[0] ?? null)} />
                    </label>
                    {newImageFile && existingImageUrl && (
                      <button type="button" onClick={() => setNewImageFile(null)} className="mt-2 text-xs font-bold text-red-500 hover:underline">
                        Cancel replace
                      </button>
                    )}
                  </div>
                )}
              </SectionCard>

              {/* Floor plan */}
              <SectionCard
                title="Floor Plan Document"
                subtitle="Replace the existing floor plan if needed"
                icon={<FileText className="h-4 w-4" />}
              >
                {existingFloorPlan && !replaceFloorPlan ? (
                  <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <span className="flex-1 text-sm text-gray-600">
                      Current floor plan on file
                    </span>
                    <button
                      type="button"
                      onClick={() => setReplaceFloorPlan(true)}
                      className="text-xs font-semibold text-[#029bba] hover:underline"
                    >
                      Replace
                    </button>
                  </div>
                ) : (
                  <div>
                    <label className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 transition-all hover:border-[#029bba] hover:bg-teal-50">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <span className="text-sm text-gray-500">
                        {newFloorPlanFile
                          ? newFloorPlanFile.name
                          : 'Upload floor plan image'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          setNewFloorPlanFile(e.target.files?.[0] ?? null)
                        }
                      />
                    </label>
                    {replaceFloorPlan && (
                      <button
                        type="button"
                        onClick={() => {
                          setReplaceFloorPlan(false);
                          setNewFloorPlanFile(null);
                        }}
                        className="mt-2 text-xs text-gray-400 hover:text-gray-600"
                      >
                        Cancel replace
                      </button>
                    )}
                  </div>
                )}
              </SectionCard>

              {/* Media links */}
              <SectionCard
                title="Media Links"
                subtitle="Virtual tour and video walkthrough"
                icon={<Camera className="h-4 w-4" />}
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className={LABEL}>Virtual Tour URL</label>
                    <input
                      type="url"
                      value={virtualTourUrl}
                      onChange={(e) =>
                        setVirtualTourUrl(clamp(e.target.value, 400))
                      }
                      className={INPUT}
                      placeholder="Matterport / YouTube link"
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Video URL</label>
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={(e) =>
                        setVideoUrl(clamp(e.target.value, 400))
                      }
                      className={INPUT}
                      placeholder="YouTube / Vimeo link"
                    />
                  </div>
                </div>
              </SectionCard>

              {/* Descriptions */}
              <SectionCard
                title="Description"
                subtitle="Describe this unit for buyers"
                icon={<FileText className="h-4 w-4" />}
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
                      {shortDescription.length} / 200
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
                      {description.length} / 5000
                    </p>
                  </div>
                </div>
              </SectionCard>
            </div>
          )}

          {/* ════════════════════════════════
              Navigation
          ════════════════════════════════ */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-6">
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
                    {uploadProgress ?? 'Saving...'}
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Save Changes
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