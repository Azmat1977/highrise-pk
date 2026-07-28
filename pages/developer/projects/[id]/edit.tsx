// FILE: pages/developer/projects/[id]/edit.tsx

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import {
  Loader2,
  Plus,
  X,
  ChevronLeft,
  Save,
  AlertTriangle,
} from 'lucide-react';
import DeveloperLayout from '@/components/developer/DeveloperLayout';
import { useDeveloperContext } from '@/components/developer/DeveloperContext';
import RichTextEditor from '@/components/admin/RichTextEditor';
import DocumentsSection, { ProjectDocuments } from '@/components/admin/DocumentsSection';
import FileUploader from '@/components/admin/FileUploader';
import BuildingFloorPlansSection, { BuildingFloorPlan } from '@/components/admin/BuildingFloorPlansSection';
import UnitPlansSection, { UnitPlan } from '@/components/admin/UnitPlansSection';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompletedProject {
  name: string;
  type: string;
  location: string;
  year: string;
}

interface CompletedProjectPayload {
  name: string;
  type: string | null;
  location: string | null;
  year: number | null;
}

interface DevelopmentUpdate {
  date: string;
  progressPercent: string;
  title: string;
  description: string;
  videoUrl: string;
  imageUrl: string;
}

interface DevelopmentUpdatePayload {
  date: string | null;
  progressPercent: number | null;
  title: string | null;
  description: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
}

interface CustomOffer {
  id: string;
  title: string;
  discountType: 'percent' | 'fixed';
  discountValue: string;
  description: string;
  validFrom: string;
  validTill: string;
  isActive: boolean;
}

interface FeatureImageRef {
  url: string;
  publicId: string;
}

interface FileUploaderValue {
  url: string;
  publicId?: string;
  public_id?: string;
}

// ── Raw API response shapes (from fetch — typed, not any) ──────────────────

interface RawInstallmentPlan {
  totalPrice?: unknown;
  bookingPercent?: unknown;
  downPaymentPercent?: unknown;
  possessionPercent?: unknown;
  planDurationYears?: unknown;
  installmentFrequency?: unknown;
  monthlyDuration?: unknown;
  quarterlyDuration?: unknown;
  halfYearlyDuration?: unknown;
  yearlyDuration?: unknown;
  notes?: unknown;
}

interface RawFullPaymentInfo {
  basePrice?: unknown;
  finalPrice?: unknown;
  fullPrice?: unknown;
  discountPercent?: unknown;
  areaSize?: unknown;
  areaUnit?: unknown;
  notes?: unknown;
}

interface RawDiscountOffers {
  advanceInstallmentDiscount?: {
    enabled?: unknown;
    advanceMonths?: unknown;
    discountPercent?: unknown;
    description?: unknown;
  };
  downPaymentBonus?: {
    enabled?: unknown;
    minDownPercent?: unknown;
    discountPercent?: unknown;
    description?: unknown;
  };
  earlyBirdOffer?: {
    enabled?: unknown;
    discountPercent?: unknown;
    description?: unknown;
    validFrom?: unknown;
    validTill?: unknown;
  };
  customOffers?: unknown[];
}

interface RawCustomOffer {
  title?: unknown;
  discountType?: unknown;
  discountValue?: unknown;
  description?: unknown;
  validFrom?: unknown;
  validTill?: unknown;
  isActive?: unknown;
}

interface RawConstructionUpdate {
  date?: unknown;
  progressPercent?: unknown;
  title?: unknown;
  description?: unknown;
  videoUrl?: unknown;
  imageUrl?: unknown;
}

interface RawCompletedProject {
  name?: unknown;
  type?: unknown;
  location?: unknown;
  year?: unknown;
}

interface RawProject {
  projectCategory?: unknown;
  projectNature?: unknown;
  projectType?: unknown;
  projectName?: unknown;
  title?: unknown;
  tagline?: unknown;
  shortDescription?: unknown;
  description?: unknown;
  city?: unknown;
  area?: unknown;
  areaName?: unknown;
  location?: unknown;
  projectStatus?: unknown;
  status?: unknown;
  launchDate?: unknown;
  developmentProgress?: unknown;
  expectedCompletionDate?: unknown;
  possessionStartDate?: unknown;
  approvalAuthority?: unknown;
  isApproved?: unknown;
  nocStatus?: unknown;
  nocNumber?: unknown;
  societyRegistrationNumber?: unknown;
  environmentClearance?: unknown;
  buildingPlanApproved?: unknown;
  totalArea?: unknown;
  totalBlocks?: unknown;
  totalUnits?: unknown;
  unitsSold?: unknown;
  unitsAvailable?: unknown;
  totalFloors?: unknown;
  parkingFloors?: unknown;
  commercialFloors?: unknown;
  residentialFloors?: unknown;
  totalLandArea?: unknown;
  totalResidentialPlots?: unknown;
  totalCommercialPlots?: unknown;
  plotSizesOffered?: unknown;
  developmentStatus?: unknown;
  societyFacilities?: unknown;
  saleMode?: unknown;
  paymentMeta?: { representativeUnitType?: unknown; priceDisclaimer?: unknown };
  fullPaymentInfo?: RawFullPaymentInfo;
  fullPaymentInfoExtra?: RawFullPaymentInfo;
  installmentPlan?: RawInstallmentPlan;
  discountOffers?: RawDiscountOffers;
  featureImageUrl?: unknown;
  featureImagePublicId?: unknown;
  droneVideoUrl?: unknown;
  virtualTourUrl?: unknown;
  googleMapLink?: unknown;
  coordinatesRaw?: unknown;
  constructionUpdates?: unknown[];
  completedProjects?: unknown[];
  projectDocuments?: ProjectDocuments;
  buildingFloorPlans?: unknown[];
  unitPlans?: unknown[];
  unitTypeBreakdown?: unknown[];
}

interface ProjectApiResponse {
  success?: boolean;
  message?: string;
  project?: RawProject;
}

// ── Submit payload ─────────────────────────────────────────────────────────

interface ProjectUpdateBody {
  isFullUpdate: boolean;
  projectCategory: string;
  projectNature: string;
  projectType: string | null;
  projectName: string;
  title: string;
  tagline: string | null;
  shortDescription: string | null;
  description: string | null;
  city: string;
  area?: string;
  areaName: string;
  location?: string;
  projectStatus: string;
  launchDate: string | null;
  developmentProgress: number;
  expectedCompletionDate: string | null;
  possessionStartDate: string | null;
  approvalAuthority: string | null;
  isApproved: string | null;
  nocStatus: string | null;
  nocNumber: string | null;
  societyRegistrationNumber: string | null;
  environmentClearance: boolean;
  buildingPlanApproved: boolean;
  totalArea: string | null;
  totalBlocks: number | null;
  totalUnits: number | null;
  unitsSold: number | null;
  unitsAvailable: number | null;
  totalFloors: number | null;
  parkingFloors: number | null;
  commercialFloors: number | null;
  residentialFloors: number | null;
  totalLandArea: string | null;
  totalResidentialPlots: number | null;
  totalCommercialPlots: number | null;
  plotSizesOffered: string | null;
  developmentStatus: string | null;
  societyFacilities: string[];
  saleMode: string;
  paymentMeta: { representativeUnitType: string | null; priceDisclaimer: string | null };
  fullPaymentInfo: Record<string, unknown> | null;
  installmentPlan: Record<string, unknown> | null;
  discountOffers: Record<string, unknown>;
  featureImageUrl: string | null;
  featureImagePublicId: string | null;
  droneVideoUrl: string | null;
  virtualTourUrl: string | null;
  googleMapLink: string | null;
  coordinatesRaw: string | null;
  developmentUpdates: DevelopmentUpdatePayload[];
  completedProjects: CompletedProjectPayload[];
  projectDocuments: ProjectDocuments;
  buildingFloorPlans: BuildingFloorPlan[];
  unitTypeBreakdown: UnitPlan[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeTrim(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function toNullIfEmpty(v: string): string | null {
  const t = v.trim();
  return t ? t : null;
}

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function safeNum(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function safeIntOrNull(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

async function safeJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { message: text };
  }
}

function isPrivateOrLocalHost(hostname: string): boolean {
  const h = (hostname ?? '').toLowerCase().trim();
  if (!h) return true;
  if (h === 'localhost' || h.endsWith('.local')) return true;
  if (/^127\./.test(h)) return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  const m172 = h.match(/^172\.(\d+)\./);
  if (m172) {
    const second = Number(m172[1]);
    if (Number.isFinite(second) && second >= 16 && second <= 31) return true;
  }
  if (h === '::1') return true;
  return false;
}

function isSafePublicHttpUrl(input?: string): boolean {
  const raw = safeTrim(input ?? '');
  if (!raw) return true;
  let u: URL;
  try { u = new URL(raw); } catch { return false; }
  const protocol = (u.protocol ?? '').toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') return false;
  const host = (u.hostname ?? '').toLowerCase();
  if (!host) return false;
  if (isPrivateOrLocalHost(host)) return false;
  return true;
}

function isAllowedVideoUrl(input?: string): boolean {
  const raw = safeTrim(input ?? '');
  if (!raw) return true;
  if (!isSafePublicHttpUrl(raw)) return false;
  let u: URL;
  try { u = new URL(raw); } catch { return false; }
  const host = (u.hostname ?? '').toLowerCase();
  const allowed = new Set([
    'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be',
    'vimeo.com', 'www.vimeo.com', 'player.vimeo.com',
  ]);
  if (allowed.has(host)) return true;
  if (host.endsWith('.youtube.com')) return true;
  return false;
}

// ─── Style constants ──────────────────────────────────────────────────────────

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 ' +
  'text-sm text-[#333333] shadow-sm outline-none transition ' +
  'focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 ' +
  'placeholder:text-gray-400 disabled:bg-[#f8f9fa] disabled:cursor-not-allowed';

const selectClass = inputClass;
const labelClass  = 'block text-sm font-medium text-[#333333] mb-1.5';

const primaryButtonClass =
  'inline-flex items-center justify-center rounded-xl ' +
  'bg-[#029bba] hover:bg-[#027a94] ' +
  'px-6 py-3 text-sm font-semibold text-white shadow-sm ' +
  'disabled:opacity-60 disabled:cursor-not-allowed ' +
  'focus:outline-none focus:ring-4 focus:ring-[#029bba]/20 ' +
  'transition-all duration-200';

const secondaryButtonClass =
  'inline-flex items-center justify-center rounded-xl ' +
  'border-2 border-[#029bba] text-[#029bba] ' +
  'px-5 py-2.5 text-sm font-semibold ' +
  'hover:bg-[#029bba]/5 ' +
  'focus:outline-none focus:ring-4 focus:ring-[#029bba]/20 ' +
  'transition-all duration-200';

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title, subtitle, icon, children,
}: {
  title: string; subtitle?: string; icon?: string; children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-[#f8f9fa] to-white px-5 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-[#004063]">
          {icon && <span className="mr-2">{icon}</span>}{title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-[#666666]">{subtitle}</p>}
      </div>
      <div className="p-5 md:p-6">{children}</div>
    </div>
  );
}

// ─── Loading state ────────────────────────────────────────────────────────────

function LoadingSpinner({ text = 'Loading...' }: { text?: string }): React.ReactElement {
  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[#029bba] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-[#666666] font-medium">{text}</p>
      </div>
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorState({ message }: { message: string }): React.ReactElement {
  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md text-center">
        <div className="w-16 h-16 bg-[#fef2f2] rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-[#ef4444]" />
        </div>
        <h1 className="text-xl font-bold text-[#004063] mb-2">Error Loading Project</h1>
        <p className="text-[#666666] mb-6 text-sm">{message}</p>
        <Link
          href="/developer/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#029bba] text-white rounded-xl text-sm font-semibold hover:bg-[#027a94] transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

function EditProjectForm({ projectId }: { projectId: string }): React.ReactElement {
  const router = useRouter();
  const { profile, isLoading: profileLoading } = useDeveloperContext();
  const abortRef = useRef<AbortController | null>(null);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [pageLoading, setPageLoading] = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [loadError,   setLoadError]   = useState<string | null>(null);
  const [saveError,   setSaveError]   = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Approved status guard ─────────────────────────────────
  // Only approved developers can edit projects
  useEffect(() => {
    if (profileLoading) return;
    if (!profile) return;
    if (profile.status !== 'approved') {
      void router.replace('/developer/dashboard');
    }
  }, [profile, profileLoading, router]);

  // Show spinner while redirecting
  if (!profileLoading && profile && profile.status !== 'approved') {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#029bba] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Classification ──────────────────────────────────────────────────────────
  const [projectCategory, setProjectCategory] = useState('');
  const [projectNature,   setProjectNature]   = useState('');

  // ── Basic info ──────────────────────────────────────────────────────────────
  const [projectName,            setProjectName]            = useState('');
  const [tagline,                setTagline]                = useState('');
  const [shortDescription,       setShortDescription]       = useState('');
  const [description,            setDescription]            = useState('');
  const [city,                   setCity]                   = useState('');
  const [area,                   setArea]                   = useState('');
  const [projectStatus,          setProjectStatus]          = useState('');
  const [launchDate,             setLaunchDate]             = useState('');
  const [developmentProgress,    setDevelopmentProgress]    = useState(0);
  const [expectedCompletionDate, setExpectedCompletionDate] = useState('');
  const [possessionStartDate,    setPossessionStartDate]    = useState('');

  // ── Legal ───────────────────────────────────────────────────────────────────
  const [approvalAuthority,         setApprovalAuthority]         = useState('');
  const [isApproved,                setIsApproved]                = useState('');
  const [nocStatus,                 setNocStatus]                 = useState('');
  const [nocNumber,                 setNocNumber]                 = useState('');
  const [societyRegistrationNumber, setSocietyRegistrationNumber] = useState('');
  const [environmentClearance,      setEnvironmentClearance]      = useState(false);
  const [buildingPlanApproved,      setBuildingPlanApproved]      = useState(false);

  // ── High-rise scale ─────────────────────────────────────────────────────────
  const [totalArea,         setTotalArea]         = useState('');
  const [totalBlocks,       setTotalBlocks]       = useState('');
  const [totalUnits,        setTotalUnits]        = useState('');
  const [unitsSold,         setUnitsSold]         = useState('');
  const [unitsAvailable,    setUnitsAvailable]    = useState('');
  const [totalFloors,       setTotalFloors]       = useState('');
  const [parkingFloors,     setParkingFloors]     = useState('');
  const [commercialFloors,  setCommercialFloors]  = useState('');
  const [residentialFloors, setResidentialFloors] = useState('');

  // ── Society scale ───────────────────────────────────────────────────────────
  const [totalLandArea,          setTotalLandArea]          = useState('');
  const [totalResidentialPlots,  setTotalResidentialPlots]  = useState('');
  const [totalCommercialPlots,   setTotalCommercialPlots]   = useState('');
  const [plotSizesOffered,       setPlotSizesOffered]       = useState('');
  const [developmentStatus,      setDevelopmentStatus]      = useState('');
  const [societyFacilities,      setSocietyFacilities]      = useState<string[]>([]);

  // ── Payment ─────────────────────────────────────────────────────────────────
  const [saleMode,               setSaleMode]               = useState('');
  const [representativeUnitType, setRepresentativeUnitType] = useState('');
  const [priceDisclaimer,        setPriceDisclaimer]        = useState('');

  // Full payment
  const [fullPaymentEnabled,         setFullPaymentEnabled]         = useState(false);
  const [fullPaymentBasePrice,       setFullPaymentBasePrice]       = useState('');
  const [fullPaymentDiscountPercent, setFullPaymentDiscountPercent] = useState('');
  const [fullPaymentAreaSize,        setFullPaymentAreaSize]        = useState('');
  const [fullPaymentAreaUnit,        setFullPaymentAreaUnit]        = useState('sqft');
  const [fullPaymentNotes,           setFullPaymentNotes]           = useState('');

  // Installment
  const [installmentEnabled,         setInstallmentEnabled]         = useState(false);
  const [installmentTotalUnitPrice,  setInstallmentTotalUnitPrice]  = useState('');
  const [bookingPercent,             setBookingPercent]             = useState('');
  const [downPaymentPercent,         setDownPaymentPercent]         = useState('');
  const [possessionPercent,          setPossessionPercent]          = useState('');
  const [installmentFrequency,       setInstallmentFrequency]       = useState('monthly');
  const [planDurationYears,          setPlanDurationYears]          = useState('');
  const [installmentNotes,           setInstallmentNotes]           = useState('');

  // Discount offers
  const [advanceDiscountEnabled,          setAdvanceDiscountEnabled]          = useState(false);
  const [advanceDiscountMonths,           setAdvanceDiscountMonths]           = useState('');
  const [advanceDiscountPercent,          setAdvanceDiscountPercent]          = useState('');
  const [advanceDiscountDescription,      setAdvanceDiscountDescription]      = useState('');
  const [downPaymentBonusEnabled,         setDownPaymentBonusEnabled]         = useState(false);
  const [downPaymentBonusMinPercent,      setDownPaymentBonusMinPercent]      = useState('');
  const [downPaymentBonusDiscountPercent, setDownPaymentBonusDiscountPercent] = useState('');
  const [downPaymentBonusDescription,     setDownPaymentBonusDescription]     = useState('');
  const [earlyBirdEnabled,                setEarlyBirdEnabled]                = useState(false);
  const [earlyBirdDiscountPercent,        setEarlyBirdDiscountPercent]        = useState('');
  const [earlyBirdDescription,            setEarlyBirdDescription]            = useState('');
  const [earlyBirdValidFrom,              setEarlyBirdValidFrom]              = useState('');
  const [earlyBirdValidTill,              setEarlyBirdValidTill]              = useState('');
  const [customOffers,                    setCustomOffers]                    = useState<CustomOffer[]>([]);

  // ── Media ───────────────────────────────────────────────────────────────────
  const [featureImage,    setFeatureImage]    = useState<FeatureImageRef | null>(null);
  const [droneVideoUrl,   setDroneVideoUrl]   = useState('');
  const [virtualTourUrl,  setVirtualTourUrl]  = useState('');
  const [googleMapLink,   setGoogleMapLink]   = useState('');
  const [coordinatesRaw,  setCoordinatesRaw]  = useState('');
  const [staticMapUrl,    setStaticMapUrl]    = useState<string | null>(null);

  // ── Lists ───────────────────────────────────────────────────────────────────
  const [completedProjects,   setCompletedProjects]   = useState<CompletedProject[]>([{ name: '', type: '', location: '', year: '' }]);
  const [developmentUpdates, setDevelopmentUpdates] = useState<DevelopmentUpdate[]>([]);
  const [projectDocuments,    setProjectDocuments]    = useState<ProjectDocuments>({});
  const [buildingFloorPlans,  setBuildingFloorPlans]  = useState<BuildingFloorPlan[]>([]);
  const [unitPlans,           setUnitPlans]           = useState<UnitPlan[]>([]);

  // ── Computed: installment ───────────────────────────────────────────────────

  const frequencyStepMap = useMemo<Record<string, number>>(() => ({
    monthly: 1, quarterly: 3, halfYearly: 6, yearly: 12,
  }), []);

  const frequencyLabel = useMemo<Record<string, string>>(() => ({
    monthly: 'month', quarterly: 'quarter', halfYearly: '6 months', yearly: 'year',
  }), []);

  const totalPriceNum           = useMemo(() => clamp(safeNum(installmentTotalUnitPrice), 0, 9_999_999_999), [installmentTotalUnitPrice]);
  const bookingPercentNum       = useMemo(() => clamp(safeNum(bookingPercent),            0, 100),            [bookingPercent]);
  const downPaymentPercentNum   = useMemo(() => clamp(safeNum(downPaymentPercent),        0, 100),            [downPaymentPercent]);
  const possessionPercentNum    = useMemo(() => clamp(safeNum(possessionPercent),         0, 100),            [possessionPercent]);
  const planDurationYearsNum    = useMemo(() => clamp(safeNum(planDurationYears),         0, 60),             [planDurationYears]);
  const bookingAmount           = useMemo(() => Math.round((totalPriceNum * bookingPercentNum)     / 100) || 0, [totalPriceNum, bookingPercentNum]);
  const downPaymentAmount       = useMemo(() => Math.round((totalPriceNum * downPaymentPercentNum) / 100) || 0, [totalPriceNum, downPaymentPercentNum]);
  const possessionAmount        = useMemo(() => Math.round((totalPriceNum * possessionPercentNum)  / 100) || 0, [totalPriceNum, possessionPercentNum]);
  const allocatedPercent        = useMemo(() => bookingPercentNum + downPaymentPercentNum + possessionPercentNum, [bookingPercentNum, downPaymentPercentNum, possessionPercentNum]);
  const percentError            = useMemo(() => allocatedPercent > 100 ? 'Total of Booking + Down + Possession % cannot exceed 100%' : '', [allocatedPercent]);
  const allocatedAmount         = useMemo(() => bookingAmount + downPaymentAmount + possessionAmount, [bookingAmount, downPaymentAmount, possessionAmount]);
  const remainingForInstallments = useMemo(() => totalPriceNum > 0 ? Math.max(totalPriceNum - allocatedAmount, 0) : 0, [totalPriceNum, allocatedAmount]);
  const frequencyStep           = useMemo(() => frequencyStepMap[installmentFrequency] ?? 1, [frequencyStepMap, installmentFrequency]);
  const durationInMonths        = useMemo(() => planDurationYearsNum * 12, [planDurationYearsNum]);
  const installmentCountNum     = useMemo(() => durationInMonths > 0 ? Math.floor(durationInMonths / frequencyStep) : 0, [durationInMonths, frequencyStep]);
  const installmentAmount       = useMemo(() => installmentCountNum > 0 ? Math.round(remainingForInstallments / installmentCountNum) : 0, [remainingForInstallments, installmentCountNum]);

  // ── Computed: full payment ──────────────────────────────────────────────────

  const fullPaymentBasePriceNum       = useMemo(() => clamp(safeNum(fullPaymentBasePrice),       0, 9_999_999_999), [fullPaymentBasePrice]);
  const fullPaymentDiscountPercentNum = useMemo(() => clamp(safeNum(fullPaymentDiscountPercent), 0, 80),            [fullPaymentDiscountPercent]);
  const fullPaymentAreaSizeNum        = useMemo(() => clamp(safeNum(fullPaymentAreaSize),        0, 1_000_000),     [fullPaymentAreaSize]);
  const fullPaymentDiscountAmount     = useMemo(() => fullPaymentBasePriceNum && fullPaymentDiscountPercentNum ? Math.round((fullPaymentBasePriceNum * fullPaymentDiscountPercentNum) / 100) : 0, [fullPaymentBasePriceNum, fullPaymentDiscountPercentNum]);
  const fullPaymentFinalPrice         = useMemo(() => fullPaymentBasePriceNum ? Math.max(fullPaymentBasePriceNum - fullPaymentDiscountAmount, 0) : 0, [fullPaymentBasePriceNum, fullPaymentDiscountAmount]);
  const fullPaymentPricePerUnit       = useMemo(() => fullPaymentFinalPrice && fullPaymentAreaSizeNum > 0 ? Math.round(fullPaymentFinalPrice / fullPaymentAreaSizeNum) : 0, [fullPaymentFinalPrice, fullPaymentAreaSizeNum]);
  const savingsOnFullPayment          = useMemo(() => totalPriceNum > 0 && fullPaymentFinalPrice > 0 ? totalPriceNum - fullPaymentFinalPrice : fullPaymentDiscountAmount, [totalPriceNum, fullPaymentFinalPrice, fullPaymentDiscountAmount]);

  // ── apiFetch helper ─────────────────────────────────────────────────────────

  const apiFetch = useCallback(async (
    url: string,
    init?: RequestInit
  ): Promise<{ res: Response; data: Record<string, unknown> }> => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const res = await fetch(url, {
      ...init,
      signal:      controller.signal,
      credentials: 'include',
      headers:     { ...(init?.headers ?? {}) },
    });

    const data = await safeJson(res);

    if (res.status === 401 || res.status === 403) {
      void router.replace('/auth/login');
      throw new Error('Unauthorized');
    }

    return { res, data };
  }, [router]);

  // ── Static map preview ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!coordinatesRaw) { setStaticMapUrl(null); return; }
    const match = coordinatesRaw.match(/^\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*$/);
    if (!match) { setStaticMapUrl(null); return; }
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) { setStaticMapUrl(null); return; }
    const lat = match[1]; const lng = match[3];
    setStaticMapUrl(
      `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}` +
      `&zoom=15&size=600x300&markers=color:red|${lat},${lng}&key=${apiKey}`
    );
  }, [coordinatesRaw]);

  // ── Fetch project data ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!projectId) return;
    let mounted = true;

    const fetchProject = async (): Promise<void> => {
      try {
        setPageLoading(true);
        setLoadError(null);

        const { res, data } = await apiFetch(`/api/projects/${projectId}`);

        if (!res.ok || !data.success) {
          if (mounted) setLoadError(safeTrim(data.message) || 'Failed to load project');
          return;
        }

        const project = (data.project ?? {}) as RawProject;
        if (!mounted) return;

        // Classification
        const effectiveCategory = safeTrim(project.projectCategory);
        let inferredNature = safeTrim(project.projectNature);
        if (!inferredNature) {
          if (project.projectType === 'Residential') inferredNature = 'residential';
          else if (project.projectType === 'Commercial') inferredNature = 'commercial';
          else if (project.projectType === 'Mixed Use') inferredNature = 'mixed';
        }
        const effectiveSaleMode = safeTrim(project.saleMode) || 'Installment';

        setProjectCategory(effectiveCategory);
        setProjectNature(inferredNature);
        setProjectName(safeTrim(project.projectName) || safeTrim(project.title));
        setTagline(safeTrim(project.tagline));
        setShortDescription(safeTrim(project.shortDescription));
        setDescription(safeTrim(project.description));
        setCity(safeTrim(project.city));
        setArea(safeTrim(project.areaName) || safeTrim(project.area) || safeTrim(project.location));
        setProjectStatus(safeTrim(project.projectStatus) || safeTrim(project.status));
        setLaunchDate(project.launchDate ? String(project.launchDate).split('T')[0] : '');
        setDevelopmentProgress(clamp(safeNum(project.developmentProgress), 0, 100));
        setExpectedCompletionDate(project.expectedCompletionDate ? String(project.expectedCompletionDate).split('T')[0] : '');
        setPossessionStartDate(project.possessionStartDate ? String(project.possessionStartDate).split('T')[0] : '');

        // Legal
        setApprovalAuthority(safeTrim(project.approvalAuthority));
        setIsApproved(safeTrim(project.isApproved));
        setNocStatus(safeTrim(project.nocStatus));
        setNocNumber(safeTrim(project.nocNumber));
        setSocietyRegistrationNumber(safeTrim(project.societyRegistrationNumber));
        setEnvironmentClearance(!!project.environmentClearance);
        setBuildingPlanApproved(!!project.buildingPlanApproved);

        // High-rise
        setTotalArea(safeTrim(project.totalArea));
        setTotalBlocks(project.totalBlocks != null ? String(project.totalBlocks) : '');
        setTotalUnits(project.totalUnits != null ? String(project.totalUnits) : '');
        setUnitsSold(project.unitsSold != null ? String(project.unitsSold) : '');
        setUnitsAvailable(project.unitsAvailable != null ? String(project.unitsAvailable) : '');
        setTotalFloors(project.totalFloors != null ? String(project.totalFloors) : '');
        setParkingFloors(project.parkingFloors != null ? String(project.parkingFloors) : '');
        setCommercialFloors(project.commercialFloors != null ? String(project.commercialFloors) : '');
        setResidentialFloors(project.residentialFloors != null ? String(project.residentialFloors) : '');

        // Society
        setTotalLandArea(safeTrim(project.totalLandArea));
        setTotalResidentialPlots(project.totalResidentialPlots != null ? String(project.totalResidentialPlots) : '');
        setTotalCommercialPlots(project.totalCommercialPlots != null ? String(project.totalCommercialPlots) : '');
        setPlotSizesOffered(safeTrim(project.plotSizesOffered));
        setDevelopmentStatus(safeTrim(project.developmentStatus));
        setSocietyFacilities(Array.isArray(project.societyFacilities) ? (project.societyFacilities as string[]) : []);

        // Payment meta
        setSaleMode(effectiveSaleMode);
        setRepresentativeUnitType(safeTrim(project.paymentMeta?.representativeUnitType));
        setPriceDisclaimer(safeTrim(project.paymentMeta?.priceDisclaimer));

        const shouldEnableInstallment = effectiveSaleMode === 'Installment' || effectiveSaleMode === 'Both';
        const shouldEnableFull        = effectiveSaleMode === 'Full Payment' || effectiveSaleMode === 'Both';

        // Full payment
        const fpModel = project.fullPaymentInfo ?? null;
        const fpExtra = project.fullPaymentInfoExtra ?? null;
        if (fpModel || fpExtra) {
          setFullPaymentEnabled(true);
          const basePrice = fpExtra?.basePrice ?? fpExtra?.finalPrice ?? fpModel?.fullPrice ?? null;
          setFullPaymentBasePrice(basePrice != null ? String(basePrice) : '');
          const discPercent = fpExtra?.discountPercent ?? null;
          setFullPaymentDiscountPercent(discPercent != null ? String(discPercent) : '');
          const areaSize = fpModel?.areaSize ?? fpExtra?.areaSize ?? null;
          setFullPaymentAreaSize(areaSize != null ? String(areaSize) : '');
          setFullPaymentAreaUnit(safeTrim(fpModel?.areaUnit ?? fpExtra?.areaUnit) || 'sqft');
          setFullPaymentNotes(safeTrim(fpExtra?.notes));
        } else {
          setFullPaymentEnabled(shouldEnableFull);
        }

        // Installment
        const ip = project.installmentPlan ?? null;
        if (ip) {
          setInstallmentEnabled(true);
          setInstallmentTotalUnitPrice(ip.totalPrice != null ? String(ip.totalPrice) : '');
          setBookingPercent(ip.bookingPercent != null ? String(ip.bookingPercent) : '');
          setDownPaymentPercent(ip.downPaymentPercent != null ? String(ip.downPaymentPercent) : '');
          setPossessionPercent(ip.possessionPercent != null ? String(ip.possessionPercent) : '');

          if (ip.planDurationYears != null) {
            setPlanDurationYears(String(ip.planDurationYears));
            setInstallmentFrequency(safeTrim(ip.installmentFrequency) || 'monthly');
          } else {
            type Freq = 'monthly' | 'quarterly' | 'halfYearly' | 'yearly';
            let detectedFrequency: Freq = 'monthly';
            let detectedCount = 0;
            if (ip.monthlyDuration)    { detectedFrequency = 'monthly';    detectedCount = safeNum(ip.monthlyDuration); }
            else if (ip.quarterlyDuration)  { detectedFrequency = 'quarterly';  detectedCount = safeNum(ip.quarterlyDuration); }
            else if (ip.halfYearlyDuration) { detectedFrequency = 'halfYearly'; detectedCount = safeNum(ip.halfYearlyDuration); }
            else if (ip.yearlyDuration)     { detectedFrequency = 'yearly';     detectedCount = safeNum(ip.yearlyDuration); }
            setInstallmentFrequency(detectedFrequency);
            if (detectedCount > 0) {
              const stepMap: Record<Freq, number> = { monthly: 1, quarterly: 3, halfYearly: 6, yearly: 12 };
              const years = (detectedCount * stepMap[detectedFrequency]) / 12;
              setPlanDurationYears(years % 1 === 0 ? String(years) : years.toFixed(1));
            }
          }
          setInstallmentNotes(safeTrim(ip.notes));
        } else {
          setInstallmentEnabled(shouldEnableInstallment);
        }

        // Discount offers
        const d = project.discountOffers ?? null;
        if (d) {
          setAdvanceDiscountEnabled(!!d.advanceInstallmentDiscount?.enabled);
          setAdvanceDiscountMonths(d.advanceInstallmentDiscount?.advanceMonths != null ? String(d.advanceInstallmentDiscount.advanceMonths) : '');
          setAdvanceDiscountPercent(d.advanceInstallmentDiscount?.discountPercent != null ? String(d.advanceInstallmentDiscount.discountPercent) : '');
          setAdvanceDiscountDescription(safeTrim(d.advanceInstallmentDiscount?.description));
          setDownPaymentBonusEnabled(!!d.downPaymentBonus?.enabled);
          setDownPaymentBonusMinPercent(d.downPaymentBonus?.minDownPercent != null ? String(d.downPaymentBonus.minDownPercent) : '');
          setDownPaymentBonusDiscountPercent(d.downPaymentBonus?.discountPercent != null ? String(d.downPaymentBonus.discountPercent) : '');
          setDownPaymentBonusDescription(safeTrim(d.downPaymentBonus?.description));
          setEarlyBirdEnabled(!!d.earlyBirdOffer?.enabled);
          setEarlyBirdDiscountPercent(d.earlyBirdOffer?.discountPercent != null ? String(d.earlyBirdOffer.discountPercent) : '');
          setEarlyBirdDescription(safeTrim(d.earlyBirdOffer?.description));
          setEarlyBirdValidFrom(d.earlyBirdOffer?.validFrom ? String(d.earlyBirdOffer.validFrom).split('T')[0] : '');
          setEarlyBirdValidTill(d.earlyBirdOffer?.validTill ? String(d.earlyBirdOffer.validTill).split('T')[0] : '');
          setCustomOffers(
            (Array.isArray(d.customOffers) ? d.customOffers : [])
              .map((o: unknown) => {
                const offer = o as RawCustomOffer;
                return {
                  id:            crypto.randomUUID(),
                  title:         safeTrim(offer.title),
                  discountType:  (offer.discountType === 'fixed' ? 'fixed' : 'percent') as 'percent' | 'fixed',
                  discountValue: offer.discountValue != null ? String(offer.discountValue) : '',
                  description:   safeTrim(offer.description),
                  validFrom:     offer.validFrom ? String(offer.validFrom).split('T')[0] : '',
                  validTill:     offer.validTill ? String(offer.validTill).split('T')[0] : '',
                  isActive:      offer.isActive !== false,
                };
              })
          );
        }

        // Media
        if (project.featureImageUrl) {
          setFeatureImage({ url: String(project.featureImageUrl), publicId: safeTrim(project.featureImagePublicId) });
        }
        setDroneVideoUrl(safeTrim(project.droneVideoUrl));
        setVirtualTourUrl(safeTrim(project.virtualTourUrl));
        setGoogleMapLink(safeTrim(project.googleMapLink));
        setCoordinatesRaw(safeTrim(project.coordinatesRaw));

        // Development updates (field name: developmentUpdates in Project model)
        if (Array.isArray(project.constructionUpdates) && project.constructionUpdates.length > 0) {
          setDevelopmentUpdates(
            (project.constructionUpdates as unknown[]).map((u) => {
              const upd = u as RawConstructionUpdate;
              return {
                date:            upd.date ? String(upd.date).split('T')[0] : '',
                progressPercent: upd.progressPercent != null ? String(upd.progressPercent) : '',
                title:           safeTrim(upd.title),
                description:     safeTrim(upd.description),
                videoUrl:        safeTrim(upd.videoUrl),
                imageUrl:        safeTrim(upd.imageUrl),
              };
            })
          );
        }

        // Completed projects
        if (Array.isArray(project.completedProjects) && project.completedProjects.length > 0) {
          setCompletedProjects(
            (project.completedProjects as unknown[]).map((p) => {
              const cp = p as RawCompletedProject;
              return {
                name:     safeTrim(cp.name),
                type:     safeTrim(cp.type),
                location: safeTrim(cp.location),
                year:     cp.year != null ? String(cp.year) : '',
              };
            })
          );
        }

        setProjectDocuments((project.projectDocuments as ProjectDocuments) ?? {});
        setBuildingFloorPlans(Array.isArray(project.buildingFloorPlans) ? (project.buildingFloorPlans as BuildingFloorPlan[]) : []);
        setUnitPlans(
          Array.isArray(project.unitPlans)
            ? (project.unitPlans as UnitPlan[])
            : Array.isArray(project.unitTypeBreakdown)
              ? (project.unitTypeBreakdown as UnitPlan[])
              : []
        );

      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (mounted) setLoadError('Failed to load project data. Please try again.');
      } finally {
        if (mounted) setPageLoading(false);
      }
    };

    void fetchProject();
    return () => {
      mounted = false;
      abortRef.current?.abort();
    };
  }, [projectId, apiFetch]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAddDevelopmentUpdate = useCallback((): void => {
    setDevelopmentUpdates((prev) => [
      ...prev,
      { date: '', progressPercent: '', title: '', description: '', videoUrl: '', imageUrl: '' },
    ]);
  }, []);

  const handleRemoveDevelopmentUpdate = useCallback((index: number): void => {
    setDevelopmentUpdates((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleDevelopmentUpdateChange = useCallback((
    index: number, field: keyof DevelopmentUpdate, value: string
  ): void => {
    setDevelopmentUpdates((prev) => prev.map((u, i) => i === index ? { ...u, [field]: value } : u));
  }, []);

  const handleAddProject = useCallback((): void => {
    setCompletedProjects((prev) => [...prev, { name: '', type: '', location: '', year: '' }]);
  }, []);

  const handleRemoveProject = useCallback((index: number): void => {
    setCompletedProjects((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleProjectChange = useCallback((
    index: number, field: keyof CompletedProject, value: string
  ): void => {
    setCompletedProjects((prev) => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  }, []);

  const handleFacilityToggle = useCallback((facility: string): void => {
    setSocietyFacilities((prev) =>
      prev.includes(facility) ? prev.filter((f) => f !== facility) : [...prev, facility]
    );
  }, []);

  const handleAddCustomOffer = useCallback((): void => {
    setCustomOffers((prev) => [
      ...prev,
      {
        id:            crypto.randomUUID(),
        title:         '',
        discountType:  'percent',
        discountValue: '',
        description:   '',
        validFrom:     '',
        validTill:     '',
        isActive:      true,
      },
    ]);
  }, []);

  const handleRemoveCustomOffer = useCallback((id: string): void => {
    setCustomOffers((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const handleCustomOfferChange = useCallback((
    id: string, field: keyof CustomOffer, value: string | boolean
  ): void => {
    setCustomOffers((prev) => prev.map((o) => o.id === id ? { ...o, [field]: value } : o));
  }, []);

  const handleSaleModeChange = useCallback((mode: string): void => {
    setSaleMode(mode);
    setInstallmentEnabled(mode === 'Installment' || mode === 'Both');
    setFullPaymentEnabled(mode === 'Full Payment' || mode === 'Both');
  }, []);

  const handleFeatureImageChange = useCallback((val: FileUploaderValue | null): void => {
    if (!val) { setFeatureImage(null); return; }
    setFeatureImage({ url: val.url, publicId: val.publicId ?? val.public_id ?? '' });
  }, []);

  // ── Validation ──────────────────────────────────────────────────────────────

  const validateBeforeSubmit = useCallback((): string | null => {
    if (!safeTrim(projectCategory))  return 'Project Category is required.';
    if (!safeTrim(projectNature))    return 'Project Nature is required.';
    if (!safeTrim(projectName))      return 'Project Name is required.';
    if (!safeTrim(city))             return 'City is required.';
    if (!safeTrim(area))             return 'Area / Location is required.';
    if (!safeTrim(projectStatus))    return 'Project Status is required.';
    if (!featureImage?.url)          return 'Feature Image / Hero Cover is required.';
    if (!safeTrim(saleMode))         return 'Sale Mode is required.';

    if (launchDate && expectedCompletionDate && launchDate > expectedCompletionDate)
      return 'Expected Completion Date cannot be before Launch Date.';
    if (launchDate && possessionStartDate && launchDate > possessionStartDate)
      return 'Possession Start Date cannot be before Launch Date.';

    if (!isAllowedVideoUrl(droneVideoUrl))  return 'Drone Video URL: Only YouTube or Vimeo links are allowed.';
    if (!isAllowedVideoUrl(virtualTourUrl)) return 'Virtual Tour URL: Only YouTube or Vimeo links are allowed.';
    if (!isSafePublicHttpUrl(googleMapLink)) return 'Google Maps Link is invalid. Only public https links allowed.';

    for (let i = 0; i < developmentUpdates.length; i++) {
      const u = developmentUpdates[i];
      if (!isAllowedVideoUrl(u?.videoUrl))     return `Development Update #${i + 1}: Video URL must be YouTube or Vimeo.`;
      if (!isSafePublicHttpUrl(u?.imageUrl))   return `Development Update #${i + 1}: Image URL is invalid.`;
    }

    if ((saleMode === 'Installment' || saleMode === 'Both') && installmentEnabled) {
      if (totalPriceNum <= 0)       return 'Installment: Total Unit Price must be greater than 0.';
      if (percentError)             return percentError;
      if (planDurationYearsNum <= 0) return 'Installment: Plan Duration must be greater than 0.';
      if (installmentCountNum <= 0) return 'Installment: Duration/Frequency results in 0 installments.';
    }

    if ((saleMode === 'Full Payment' || saleMode === 'Both') && fullPaymentEnabled) {
      if (fullPaymentBasePriceNum <= 0) return 'Full Payment: Base Price must be greater than 0.';
    }

    return null;
  }, [
    projectCategory, projectNature, projectName, city, area, projectStatus,
    featureImage, saleMode, launchDate, expectedCompletionDate, possessionStartDate,
    droneVideoUrl, virtualTourUrl, googleMapLink, developmentUpdates,
    installmentEnabled, totalPriceNum, percentError, planDurationYearsNum, installmentCountNum,
    fullPaymentEnabled, fullPaymentBasePriceNum,
  ]);

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (saving) return;

    setSaveError(null);
    setSaveSuccess(false);

    const validationError = validateBeforeSubmit();
    if (validationError) { setSaveError(validationError); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }

    setSaving(true);

    try {
      let mappedProjectType: string | null = null;
      if (projectNature === 'residential') mappedProjectType = 'Residential';
      else if (projectNature === 'commercial') mappedProjectType = 'Commercial';
      else if (projectNature === 'mixed') mappedProjectType = 'Mixed Use';

      const developmentUpdatesPayload: DevelopmentUpdatePayload[] = developmentUpdates
        .filter((u) => u.date || u.progressPercent || u.title || u.description || u.videoUrl || u.imageUrl)
        .map((u) => ({
          date:            u.date || null,
          progressPercent: u.progressPercent ? clamp(safeNum(u.progressPercent), 0, 100) : null,
          title:           toNullIfEmpty(u.title),
          description:     toNullIfEmpty(u.description),
          videoUrl:        toNullIfEmpty(u.videoUrl),
          imageUrl:        toNullIfEmpty(u.imageUrl),
        }));

      const completedProjectsPayload: CompletedProjectPayload[] = completedProjects
        .filter((p) => safeTrim(p.name) || safeTrim(p.type) || safeTrim(p.location) || safeTrim(p.year))
        .map((p) => ({
          name:     safeTrim(p.name),
          type:     toNullIfEmpty(p.type),
          location: toNullIfEmpty(p.location),
          year:     p.year ? safeIntOrNull(p.year) : null,
        }));

      const body: ProjectUpdateBody = {
        isFullUpdate:    true,
        projectCategory: safeTrim(projectCategory),
        projectNature:   safeTrim(projectNature),
        projectType:     mappedProjectType,
        projectName:     safeTrim(projectName),
        title:           safeTrim(projectName),
        tagline:         toNullIfEmpty(tagline),
        shortDescription: toNullIfEmpty(shortDescription),
        description:     toNullIfEmpty(description),
        city:            safeTrim(city),
        areaName:        safeTrim(area),
        projectStatus:   safeTrim(projectStatus),
        launchDate:      launchDate || null,
        developmentProgress: clamp(safeNum(developmentProgress), 0, 100),
        expectedCompletionDate: expectedCompletionDate || null,
        possessionStartDate:    possessionStartDate || null,
        approvalAuthority:         toNullIfEmpty(approvalAuthority),
        isApproved:                toNullIfEmpty(isApproved),
        nocStatus:                 toNullIfEmpty(nocStatus),
        nocNumber:                 toNullIfEmpty(nocNumber),
        societyRegistrationNumber: toNullIfEmpty(societyRegistrationNumber),
        environmentClearance:      !!environmentClearance,
        buildingPlanApproved:      !!buildingPlanApproved,
        totalArea:         toNullIfEmpty(totalArea),
        totalBlocks:       safeIntOrNull(totalBlocks),
        totalUnits:        safeIntOrNull(totalUnits),
        unitsSold:         safeIntOrNull(unitsSold),
        unitsAvailable:    safeIntOrNull(unitsAvailable),
        totalFloors:       safeIntOrNull(totalFloors),
        parkingFloors:     safeIntOrNull(parkingFloors),
        commercialFloors:  safeIntOrNull(commercialFloors),
        residentialFloors: safeIntOrNull(residentialFloors),
        totalLandArea:         toNullIfEmpty(totalLandArea),
        totalResidentialPlots: safeIntOrNull(totalResidentialPlots),
        totalCommercialPlots:  safeIntOrNull(totalCommercialPlots),
        plotSizesOffered:      toNullIfEmpty(plotSizesOffered),
        developmentStatus:     toNullIfEmpty(developmentStatus),
        societyFacilities:     Array.isArray(societyFacilities) ? societyFacilities : [],
        saleMode:              safeTrim(saleMode),
        paymentMeta: {
          representativeUnitType: toNullIfEmpty(representativeUnitType),
          priceDisclaimer:        toNullIfEmpty(priceDisclaimer),
        },
        fullPaymentInfo:
          fullPaymentEnabled && (saleMode === 'Full Payment' || saleMode === 'Both')
            ? {
                basePrice:       fullPaymentBasePriceNum,
                discountPercent: fullPaymentDiscountPercentNum,
                discountAmount:  fullPaymentDiscountAmount,
                finalPrice:      fullPaymentFinalPrice,
                areaSize:        fullPaymentAreaSizeNum,
                areaUnit:        safeTrim(fullPaymentAreaUnit) || 'sqft',
                pricePerUnit:    fullPaymentPricePerUnit,
                notes:           toNullIfEmpty(fullPaymentNotes),
              }
            : null,
        installmentPlan:
          installmentEnabled && (saleMode === 'Installment' || saleMode === 'Both') && totalPriceNum > 0
            ? {
                totalPrice:          totalPriceNum,
                bookingPercent:      bookingPercentNum,
                bookingAmount,
                downPaymentPercent:  downPaymentPercentNum,
                downPayment:         downPaymentAmount,
                possessionPercent:   possessionPercentNum,
                possessionAmount,
                planDurationYears:   planDurationYearsNum,
                installmentFrequency: safeTrim(installmentFrequency) || 'monthly',
                totalInstallments:   installmentCountNum,
                installmentAmount,
                monthlyAmount:       installmentFrequency === 'monthly'    ? installmentAmount : undefined,
                monthlyDuration:     installmentFrequency === 'monthly'    ? installmentCountNum : undefined,
                quarterlyAmount:     installmentFrequency === 'quarterly'  ? installmentAmount : undefined,
                quarterlyDuration:   installmentFrequency === 'quarterly'  ? installmentCountNum : undefined,
                halfYearlyAmount:    installmentFrequency === 'halfYearly' ? installmentAmount : undefined,
                halfYearlyDuration:  installmentFrequency === 'halfYearly' ? installmentCountNum : undefined,
                yearlyAmount:        installmentFrequency === 'yearly'     ? installmentAmount : undefined,
                yearlyDuration:      installmentFrequency === 'yearly'     ? installmentCountNum : undefined,
                notes:               toNullIfEmpty(installmentNotes),
              }
            : null,
        discountOffers: {
          fullCashDiscount: fullPaymentEnabled && fullPaymentDiscountPercentNum > 0
            ? { enabled: true, discountPercent: fullPaymentDiscountPercentNum, description: toNullIfEmpty(fullPaymentNotes) || 'Full cash payment discount' }
            : { enabled: false },
          advanceInstallmentDiscount: advanceDiscountEnabled
            ? { enabled: true, advanceMonths: clamp(safeNum(advanceDiscountMonths), 0, 120), discountPercent: clamp(safeNum(advanceDiscountPercent), 0, 80), description: toNullIfEmpty(advanceDiscountDescription) }
            : { enabled: false },
          downPaymentBonus: downPaymentBonusEnabled
            ? { enabled: true, minDownPercent: clamp(safeNum(downPaymentBonusMinPercent), 0, 100), discountPercent: clamp(safeNum(downPaymentBonusDiscountPercent), 0, 80), description: toNullIfEmpty(downPaymentBonusDescription) }
            : { enabled: false },
          earlyBirdOffer: earlyBirdEnabled
            ? { enabled: true, discountPercent: clamp(safeNum(earlyBirdDiscountPercent), 0, 80), description: toNullIfEmpty(earlyBirdDescription), validFrom: earlyBirdValidFrom || null, validTill: earlyBirdValidTill || null }
            : { enabled: false },
          customOffers: customOffers
            .filter((o) => safeTrim(o.title) && safeTrim(o.discountValue))
            .map((o) => ({
              title:         safeTrim(o.title),
              discountType:  o.discountType === 'fixed' ? 'fixed' : 'percent',
              discountValue: clamp(safeNum(o.discountValue), 0, 9_999_999_999),
              description:   toNullIfEmpty(o.description),
              validFrom:     o.validFrom || null,
              validTill:     o.validTill || null,
              isActive:      !!o.isActive,
            })),
        },
        featureImageUrl:    featureImage?.url ?? null,
        featureImagePublicId: featureImage?.publicId ?? null,
        droneVideoUrl:      toNullIfEmpty(droneVideoUrl),
        virtualTourUrl:     toNullIfEmpty(virtualTourUrl),
        googleMapLink:      toNullIfEmpty(googleMapLink),
        coordinatesRaw:     toNullIfEmpty(coordinatesRaw),
        developmentUpdates: developmentUpdatesPayload,
        completedProjects:   completedProjectsPayload,
        projectDocuments,
        buildingFloorPlans,
        unitTypeBreakdown:  unitPlans,
      };

        const { res, data } = await apiFetch(`/api/projects/${projectId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });

      if (!res.ok || !data.success) {
        const msg = safeTrim(data.message) || safeTrim(data.error) || `Update failed (HTTP ${res.status})`;
        setSaveError(msg);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      setSaveSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Network error. Please try again.';
      setSaveError(message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  }, [
    saving, validateBeforeSubmit, projectNature, projectCategory, projectName,
    tagline, shortDescription, description, city, area, projectStatus,
    launchDate, developmentProgress, expectedCompletionDate, possessionStartDate,
    approvalAuthority, isApproved, nocStatus, nocNumber, societyRegistrationNumber,
    environmentClearance, buildingPlanApproved,
    totalArea, totalBlocks, totalUnits, unitsSold, unitsAvailable,
    totalFloors, parkingFloors, commercialFloors, residentialFloors,
    totalLandArea, totalResidentialPlots, totalCommercialPlots,
    plotSizesOffered, developmentStatus, societyFacilities,
    saleMode, representativeUnitType, priceDisclaimer,
    fullPaymentEnabled, fullPaymentBasePriceNum, fullPaymentDiscountPercentNum,
    fullPaymentDiscountAmount, fullPaymentFinalPrice, fullPaymentAreaSizeNum,
    fullPaymentAreaUnit, fullPaymentPricePerUnit, fullPaymentNotes,
    installmentEnabled, totalPriceNum, bookingPercentNum, bookingAmount,
    downPaymentPercentNum, downPaymentAmount, possessionPercentNum, possessionAmount,
    planDurationYearsNum, installmentFrequency, installmentCountNum, installmentAmount,
    installmentNotes, advanceDiscountEnabled, advanceDiscountMonths,
    advanceDiscountPercent, advanceDiscountDescription,
    downPaymentBonusEnabled, downPaymentBonusMinPercent, downPaymentBonusDiscountPercent,
    downPaymentBonusDescription, earlyBirdEnabled, earlyBirdDiscountPercent,
    earlyBirdDescription, earlyBirdValidFrom, earlyBirdValidTill, customOffers,
    featureImage, droneVideoUrl, virtualTourUrl, googleMapLink, coordinatesRaw,
    developmentUpdates, completedProjects, projectDocuments, buildingFloorPlans,
    unitPlans, projectId, apiFetch,
  ]);

  // ── Early returns ───────────────────────────────────────────────────────────

  if (pageLoading) return <LoadingSpinner text="Loading project data..." />;
  if (loadError)   return <ErrorState message={loadError} />;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">

        {/* Back link + page heading */}
        <div className="mb-8">
          <Link
            href="/developer/dashboard"
            className="inline-flex items-center text-sm text-[#029bba] hover:underline mb-4"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#029bba]/10 rounded-xl flex items-center justify-center">
              <Save className="w-6 h-6 text-[#029bba]" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#004063]">Edit Project</h1>
              <p className="mt-1 text-sm text-[#666666]">Update your project details below</p>
            </div>
          </div>
        </div>

        {/* Success banner */}
        {saveSuccess && (
          <div className="mb-6 bg-[#f0fdf4] border-l-4 border-[#10b981] rounded-xl p-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#10b981]">Project updated successfully!</p>
              <p className="text-sm text-[#333333] mt-1">Your changes are saved and under review.</p>
            </div>
            <button onClick={() => void router.push('/developer/dashboard')}
              className="text-sm font-semibold text-[#029bba] hover:underline whitespace-nowrap">
              Go to Dashboard
            </button>
          </div>
        )}

        {/* Error banner */}
        {saveError && (
          <div className="mb-6 bg-[#fef2f2] border-l-4 border-[#ef4444] rounded-xl p-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#ef4444]">Could not save project</p>
              <p className="text-sm text-[#333333] mt-1">{saveError}</p>
            </div>
            <button onClick={() => setSaveError(null)}
              className="text-[#666666] hover:text-[#333333] text-lg leading-none" aria-label="Dismiss">×</button>
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">

          {/* ── Section 1: Classification ─────────────────────────────────── */}
          <Section title="Project Classification" subtitle="Choose the category and nature of your project" icon="🏗️">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Project Category <span className="text-[#ef4444]">*</span></label>
                <select required className={selectClass} value={projectCategory} onChange={(e) => setProjectCategory(e.target.value)} disabled={saving}>
                  <option value="">Select Project Category</option>
                  <option value="highrise">High-Rise Building</option>
                  <option value="society">Housing Society / Master Development</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>
                  {projectCategory === 'society' ? 'Society Nature' : 'Project Nature'}{' '}
                  <span className="text-[#ef4444]">*</span>
                </label>
                <select required className={selectClass} value={projectNature} onChange={(e) => setProjectNature(e.target.value)} disabled={saving}>
                  <option value="">Select Nature</option>
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="mixed">Mixed-Use</option>
                </select>
              </div>
            </div>
          </Section>

          {/* ── Section 2: Basic Info ─────────────────────────────────────── */}
          <Section title="Basic Project Info" subtitle="Essential details about your project" icon="📍">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className={labelClass}>Project Name <span className="text-[#ef4444]">*</span></label>
                <input type="text" required className={inputClass} placeholder="e.g. Blue World City"
                  value={projectName} onChange={(e) => setProjectName(e.target.value)} disabled={saving} maxLength={120} />
              </div>
              <div>
                <label className={labelClass}>City <span className="text-[#ef4444]">*</span></label>
                <select required className={selectClass} value={city} onChange={(e) => setCity(e.target.value)} disabled={saving}>
                  <option value="">Select City</option>
                  {['Islamabad','Rawalpindi','Lahore','Karachi','Peshawar','Faisalabad','Multan'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Area / Location <span className="text-[#ef4444]">*</span></label>
                <input type="text" required className={inputClass} placeholder="e.g. DHA Phase 5"
                  value={area} onChange={(e) => setArea(e.target.value)} disabled={saving} maxLength={80} />
              </div>
              <div>
                <label className={labelClass}>Project Status <span className="text-[#ef4444]">*</span></label>
                <select required className={selectClass} value={projectStatus} onChange={(e) => setProjectStatus(e.target.value)} disabled={saving}>
                  <option value="">Select Status</option>
                  {['Planning','Pre-Launch','Under Development','Launched','Completed'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Launch / Booking Start Date</label>
                <input type="date" className={inputClass} value={launchDate} onChange={(e) => setLaunchDate(e.target.value)} disabled={saving} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Development Progress</label>
                <div className="flex items-center gap-4">
                  <input type="range" min={0} max={100} value={developmentProgress}
                    onChange={(e) => setDevelopmentProgress(Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#029bba]"
                    disabled={saving} />
                  <div className="flex items-center justify-center w-16 h-10 rounded-lg bg-[#029bba]/10 text-[#029bba] font-semibold text-sm">
                    {developmentProgress}%
                  </div>
                </div>
              </div>
              <div>
                <label className={labelClass}>Expected Completion Date</label>
                <input type="date" className={inputClass} value={expectedCompletionDate} onChange={(e) => setExpectedCompletionDate(e.target.value)} disabled={saving} />
              </div>
              <div>
                <label className={labelClass}>Possession Start Date</label>
                <input type="date" className={inputClass} value={possessionStartDate} onChange={(e) => setPossessionStartDate(e.target.value)} disabled={saving} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Project Tagline</label>
                <input type="text" className={inputClass} placeholder="e.g. Luxury Living Redefined"
                  value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={150} disabled={saving} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Short Description (SEO)</label>
                <textarea rows={2} className={inputClass} placeholder="Brief summary for listing cards..."
                  value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} maxLength={300} disabled={saving} />
              </div>
              <div className="md:col-span-2">
                <RichTextEditor label="Detailed Project Description" value={description} onChange={setDescription}
                  placeholder="Describe your project in detail..." />
              </div>
            </div>
          </Section>

          {/* ── Section: Construction Progress ───────────────────────────── */}
          <Section
            title="Construction Progress & Site Updates"
            subtitle="Add dated updates with site activity videos so buyers can see real progress."
            icon="🏗️"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#666666]">
                  Time to time yahan per naya update add karein – date, % progress, aur site ki video link ke sath.
                </p>
                <button type="button" onClick={handleAddDevelopmentUpdate} disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[#029bba] text-white hover:bg-[#027a94] transition-colors shadow-sm disabled:opacity-50">
                  <Plus className="w-4 h-4" />
                  Add Update
                </button>
              </div>

              {developmentUpdates.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-200 bg-[#f8f9fa] px-4 py-6 text-center text-sm text-[#666666]">
                  Abhi koi update nahi hai. Pehla update add karein – e.g. &quot;Grey structure work started&quot; with site video link.
                </div>
              )}

              <div className="space-y-4">
                {developmentUpdates.map((update, index) => (
                  <div key={index} className="relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <button type="button" onClick={() => handleRemoveDevelopmentUpdate(index)} disabled={saving}
                      className="absolute top-3 right-3 p-1.5 text-[#ef4444] hover:bg-[#fef2f2] rounded-lg transition-colors">
                      <X className="w-4 h-4" />
                    </button>

                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[#004063]">Update #{index + 1}</p>
                      {update.progressPercent && (
                        <span className="inline-flex items-center rounded-full bg-[#f0fdf4] px-3 py-1 text-xs font-semibold text-[#10b981]">
                          {update.progressPercent}% complete
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                      <div>
                        <label className={labelClass}>Date</label>
                        <input type="date" className={inputClass} value={update.date}
                          onChange={(e) => handleDevelopmentUpdateChange(index, 'date', e.target.value)} disabled={saving} />
                      </div>
                      <div>
                        <label className={labelClass}>Progress (%)</label>
                        <input type="number" min={0} max={100} className={inputClass} placeholder="e.g. 40"
                          value={update.progressPercent}
                          onChange={(e) => handleDevelopmentUpdateChange(index, 'progressPercent', e.target.value)} disabled={saving} />
                      </div>
                      <div>
                        <label className={labelClass}>Short Title</label>
                        <input type="text" className={inputClass} placeholder="e.g. Block A grey structure completed"
                          value={update.title}
                          onChange={(e) => handleDevelopmentUpdateChange(index, 'title', e.target.value)} disabled={saving} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Description (Optional)</label>
                        <textarea className={`${inputClass} min-h-[90px] resize-y`}
                          placeholder="e.g. Raft + columns complete, brickwork in progress on 3rd floor."
                          value={update.description}
                          onChange={(e) => handleDevelopmentUpdateChange(index, 'description', e.target.value)} disabled={saving} />
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className={labelClass}>Site Activity Video URL</label>
                          <input type="url" className={inputClass} placeholder="YouTube / Vimeo link"
                            value={update.videoUrl}
                            onChange={(e) => handleDevelopmentUpdateChange(index, 'videoUrl', e.target.value)} disabled={saving} />
                        </div>
                        <div>
                          <label className={labelClass}>Image URL (Optional)</label>
                          <input type="url" className={inputClass} placeholder="Direct link to site image"
                            value={update.imageUrl}
                            onChange={(e) => handleDevelopmentUpdateChange(index, 'imageUrl', e.target.value)} disabled={saving} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* ── Legal ─────────────────────────────────────────────────────── */}
          <Section title="Legal Documents & Approvals"
            subtitle="Project-level approvals from development authorities (CDA, LDA, etc.)" icon="🧾">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
              <div>
                <label className={labelClass}>Approval Authority</label>
                <input type="text" className={inputClass} placeholder="e.g. LDA, CDA, RDA"
                  value={approvalAuthority} onChange={(e) => setApprovalAuthority(e.target.value)} disabled={saving} maxLength={50} />
              </div>
              <div>
                <label className={labelClass}>Approval Status</label>
                <select className={selectClass} value={isApproved} onChange={(e) => setIsApproved(e.target.value)} disabled={saving}>
                  <option value="">Select</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                  <option value="not_applied">Not Applied</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>NOC Status</label>
                <select className={selectClass} value={nocStatus} onChange={(e) => setNocStatus(e.target.value)} disabled={saving}>
                  <option value="">Select</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                  <option value="not_applied">Not Applied</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div>
                <label className={labelClass}>NOC Number</label>
                <input type="text" className={inputClass} placeholder="e.g. LDA/NOC/2024/1234"
                  value={nocNumber} onChange={(e) => setNocNumber(e.target.value)} disabled={saving} maxLength={60} />
              </div>
              <div>
                <label className={labelClass}>Society Registration No.</label>
                <input type="text" className={inputClass} placeholder="Registration number"
                  value={societyRegistrationNumber} onChange={(e) => setSocietyRegistrationNumber(e.target.value)} disabled={saving} maxLength={60} />
              </div>
            </div>
            <div className="flex flex-wrap gap-6 mb-6">
              {[
                { state: environmentClearance, setter: setEnvironmentClearance, label: 'Environment Clearance', name: 'environmentClearance' },
                { state: buildingPlanApproved, setter: setBuildingPlanApproved, label: 'Building Plan Approved', name: 'buildingPlanApproved'  },
              ].map((cb) => (
                <label key={cb.name} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={cb.state} onChange={(e) => cb.setter(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]" disabled={saving} />
                  <span className="text-sm text-[#333333]">{cb.label}</span>
                </label>
              ))}
            </div>
            <div className="rounded-xl bg-[#fef3c7] border border-[#f59e0b] p-4">
              <p className="text-sm text-[#333333]">
                <span className="font-semibold">Note:</span> To update document files (NOC, Layout, Brochure), use the Documents section below.
              </p>
            </div>
          </Section>

          {/* Documents */}
          <DocumentsSection documents={projectDocuments} onChange={setProjectDocuments} projectSlug={projectCategory || 'project'} />

          {/* ── Scale ─────────────────────────────────────────────────────── */}
          <Section title="Project Scale & Units" subtitle="Define the size and unit breakdown of your project" icon="📊">
            {!projectCategory && (
              <div className="text-center py-8 text-[#666666] text-sm">
                Please select a Project Category above to see relevant fields.
              </div>
            )}

            {projectCategory === 'highrise' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[
                  { label: 'Total Area',         name: 'totalArea',         type: 'text',   value: totalArea,         setter: setTotalArea         },
                  { label: 'Total Blocks/Towers', name: 'totalBlocks',       type: 'number', value: totalBlocks,       setter: setTotalBlocks       },
                  { label: 'Total Units',         name: 'totalUnits',        type: 'number', value: totalUnits,        setter: setTotalUnits        },
                  { label: 'Units Sold',          name: 'unitsSold',         type: 'number', value: unitsSold,         setter: setUnitsSold         },
                  { label: 'Units Available',     name: 'unitsAvailable',    type: 'number', value: unitsAvailable,    setter: setUnitsAvailable    },
                  { label: 'Total Floors',        name: 'totalFloors',       type: 'number', value: totalFloors,       setter: setTotalFloors       },
                  { label: 'Parking Floors',      name: 'parkingFloors',     type: 'number', value: parkingFloors,     setter: setParkingFloors     },
                  { label: 'Commercial Floors',   name: 'commercialFloors',  type: 'number', value: commercialFloors,  setter: setCommercialFloors  },
                  { label: 'Residential Floors',  name: 'residentialFloors', type: 'number', value: residentialFloors, setter: setResidentialFloors },
                ].map((f) => (
                  <div key={f.name}>
                    <label className={labelClass}>{f.label}</label>
                    <input type={f.type} className={inputClass} value={f.value}
                      onChange={(e) => f.setter(e.target.value)} disabled={saving}
                      {...(f.type === 'number' ? { min: 0 } : { maxLength: 40 })} />
                  </div>
                ))}
              </div>
            )}

            {projectCategory === 'society' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {[
                    { label: 'Total Land Area',    name: 'totalLandArea',         type: 'text',   value: totalLandArea,         setter: setTotalLandArea         },
                    { label: 'Total Blocks/Sectors',name:'totalBlocks',           type: 'number', value: totalBlocks,           setter: setTotalBlocks           },
                    { label: 'Residential Plots',  name: 'totalResidentialPlots', type: 'number', value: totalResidentialPlots, setter: setTotalResidentialPlots },
                    { label: 'Commercial Plots',   name: 'totalCommercialPlots',  type: 'number', value: totalCommercialPlots,  setter: setTotalCommercialPlots  },
                    { label: 'Plot Sizes Offered', name: 'plotSizesOffered',      type: 'text',   value: plotSizesOffered,      setter: setPlotSizesOffered      },
                  ].map((f) => (
                    <div key={f.name}>
                      <label className={labelClass}>{f.label}</label>
                      <input type={f.type} className={inputClass} value={f.value}
                        onChange={(e) => f.setter(e.target.value)} disabled={saving}
                        {...(f.type === 'number' ? { min: 0 } : { maxLength: 80 })} />
                    </div>
                  ))}
                  <div>
                    <label className={labelClass}>Development Status</label>
                    <select className={selectClass} value={developmentStatus} onChange={(e) => setDevelopmentStatus(e.target.value)} disabled={saving}>
                      <option value="">Select Status</option>
                      <option value="launched">Launched</option>
                      <option value="developing">Developing</option>
                      <option value="developed">Developed</option>
                    </select>
                  </div>
                </div>

                <div className="rounded-xl bg-[#f8f9fa] p-5">
                  <h4 className="font-semibold text-[#004063] mb-3">🏞 Society Facilities</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { value: 'parks',          label: 'Parks / Playgrounds' },
                      { value: 'mosques',         label: 'Mosques'             },
                      { value: 'graveyard',       label: 'Graveyard'           },
                      { value: 'schools',         label: 'Schools'             },
                      { value: 'commercialAreas', label: 'Commercial Areas'    },
                      { value: 'hospitals',       label: 'Hospitals'           },
                      { value: 'communityCenter', label: 'Community Center'    },
                    ].map((f) => (
                      <label key={f.value} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={societyFacilities.includes(f.value)}
                          onChange={() => handleFacilityToggle(f.value)}
                          className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]" disabled={saving} />
                        <span className="text-sm text-[#333333]">{f.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Section>

          {/* Floor plans */}
          {projectCategory === 'highrise' && (
            <BuildingFloorPlansSection floorPlans={buildingFloorPlans} onChange={setBuildingFloorPlans} projectSlug={projectCategory} />
          )}

          {/* Unit plans */}
          <UnitPlansSection unitPlans={unitPlans} onChange={setUnitPlans} projectSlug={projectCategory || 'project'} />

          {/* ── Payment ───────────────────────────────────────────────────── */}
          <Section title="Payment Structure" subtitle="Define pricing, payment options, and special discounts" icon="💰">

            {/* Basic settings */}
            <div className="rounded-xl bg-[#f8f9fa] p-5 border border-gray-200 mb-6">
              <h4 className="font-semibold text-[#004063] mb-4 flex items-center gap-2">
                <span>📋</span> Basic Settings
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
                <div>
                  <label className={labelClass}>Sale Mode <span className="text-[#ef4444]">*</span></label>
                  <select required className={selectClass} value={saleMode}
                    onChange={(e) => handleSaleModeChange(e.target.value)} disabled={saving}>
                    <option value="">Select Payment Type</option>
                    <option value="Installment">Installment Only</option>
                    <option value="Full Payment">Full Cash Payment Only</option>
                    <option value="Both">Both (Installment + Full Payment)</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Representative Unit Type</label>
                  <input type="text" className={inputClass} placeholder="e.g. 2 Bed Type A - 950 sqft"
                    value={representativeUnitType} onChange={(e) => setRepresentativeUnitType(e.target.value)} disabled={saving} />
                  <p className="text-xs text-[#666666] mt-1">Ye price kis unit type ke liye hai?</p>
                </div>
              </div>
              <div>
                <label className={labelClass}>Price Disclaimer (Optional)</label>
                <input type="text" className={inputClass} placeholder="e.g. Prices may vary by floor and view"
                  value={priceDisclaimer} onChange={(e) => setPriceDisclaimer(e.target.value)} disabled={saving} />
              </div>
            </div>

            {/* Installment plan */}
            {(saleMode === 'Installment' || saleMode === 'Both') && (
              <div className="rounded-xl bg-[#eff6ff] p-5 border border-[#029bba]/20 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-[#004063] flex items-center gap-2"><span>💳</span> Installment Plan (Smart Mode)</h4>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={installmentEnabled} onChange={(e) => setInstallmentEnabled(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]" disabled={saving} />
                    <span className="text-sm text-[#333333]">Enabled</span>
                  </label>
                </div>

                {installmentEnabled && (
                  <>
                    <p className="text-sm text-[#666666] mb-4">Enter total price and percentages. System will auto-calculate all amounts.</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                      <div>
                        <label className={labelClass}>Total Unit Price (PKR) <span className="text-[#ef4444]">*</span></label>
                        <input type="number" required min={0} className={inputClass} placeholder="e.g. 7500000"
                          value={installmentTotalUnitPrice} onChange={(e) => setInstallmentTotalUnitPrice(e.target.value)} disabled={saving} />
                      </div>
                      {fullPaymentFinalPrice > 0 && (
                        <div className="md:col-span-2 rounded-xl bg-white border border-[#029bba]/20 p-4 flex items-center justify-between">
                          <div>
                            <p className="text-xs text-[#666666]">Comparison</p>
                            <p className="text-sm font-semibold text-[#333333]">
                              Full Cash Price: Rs. {fullPaymentFinalPrice.toLocaleString('en-PK')}
                            </p>
                          </div>
                          <div className="text-sm font-semibold text-[#10b981]">
                            Saves: Rs. {Math.max(savingsOnFullPayment, 0).toLocaleString('en-PK')}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Booking / Down / Possession % rows */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                      {[
                        { label: 'Booking (%)',     value: bookingPercent,     setter: setBookingPercent,     amount: bookingAmount     },
                        { label: 'Down Payment (%)',value: downPaymentPercent, setter: setDownPaymentPercent, amount: downPaymentAmount },
                        { label: 'Possession (%)', value: possessionPercent,  setter: setPossessionPercent,  amount: possessionAmount  },
                      ].map((f) => (
                        <div key={f.label}>
                          <label className={labelClass}>{f.label}</label>
                          <div className="grid grid-cols-2 gap-2">
                            <input type="number" min={0} max={100} step="0.5" className={inputClass}
                              placeholder="e.g. 5" value={f.value} onChange={(e) => f.setter(e.target.value)} disabled={saving} />
                            <input readOnly className={`${inputClass} bg-[#eff6ff] font-medium text-right`}
                              value={totalPriceNum ? `Rs. ${f.amount.toLocaleString('en-PK')}` : ''} placeholder="Auto" />
                          </div>
                        </div>
                      ))}
                    </div>

                    {percentError && (
                      <div className="rounded-lg bg-[#fef2f2] border border-[#ef4444]/20 px-4 py-2 text-xs text-[#ef4444] mb-5">
                        ⚠️ {percentError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
                      <div>
                        <label className={labelClass}>Plan Duration (Years) <span className="text-[#ef4444]">*</span></label>
                        <input type="number" min={1} max={30} step={0.5} className={inputClass} placeholder="e.g. 5"
                          value={planDurationYears} onChange={(e) => setPlanDurationYears(e.target.value)} disabled={saving} />
                        <p className="text-xs text-[#666666] mt-1">Kitne saal ka installment plan?</p>
                      </div>
                      <div>
                        <label className={labelClass}>Installment Frequency</label>
                        <select className={selectClass} value={installmentFrequency} onChange={(e) => setInstallmentFrequency(e.target.value)} disabled={saving}>
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly (Every 3 Months)</option>
                          <option value="halfYearly">Half-Yearly (Every 6 Months)</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
                      <div>
                        <label className={labelClass}>Total Installments (Auto)</label>
                        <input readOnly className={`${inputClass} bg-[#eff6ff] font-semibold`}
                          value={installmentCountNum > 0 ? `${installmentCountNum} ${frequencyLabel[installmentFrequency] ?? 'installments'}` : 'Enter duration above'} />
                        {planDurationYearsNum > 0 && (
                          <p className="text-xs text-[#666666] mt-1">
                            {planDurationYearsNum} yr = {durationInMonths} mo ÷ {frequencyStep} = {installmentCountNum} installments
                          </p>
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>Installment Amount (Auto)</label>
                        <input readOnly className={`${inputClass} bg-[#f0fdf4] border-[#10b981]/30 font-bold text-[#10b981]`}
                          value={installmentAmount > 0 ? `Rs. ${installmentAmount.toLocaleString('en-PK')} / ${frequencyLabel[installmentFrequency] ?? 'installment'}` : 'Will be calculated'} />
                        <p className="text-xs text-[#666666] mt-1">
                          Remaining: Rs. {remainingForInstallments.toLocaleString('en-PK')} ÷ {installmentCountNum || '?'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Notes (Optional)</label>
                      <input type="text" className={inputClass} placeholder="e.g. PDC cheques required"
                        value={installmentNotes} onChange={(e) => setInstallmentNotes(e.target.value)} disabled={saving} />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Full payment */}
            {(saleMode === 'Full Payment' || saleMode === 'Both') && (
              <div className="rounded-xl bg-[#f0fdf4] p-5 border border-[#10b981]/20 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-[#004063] flex items-center gap-2"><span>💵</span> Full Cash Payment</h4>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={fullPaymentEnabled} onChange={(e) => setFullPaymentEnabled(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-[#10b981] focus:ring-[#10b981]" disabled={saving} />
                    <span className="text-sm text-[#333333]">Enabled</span>
                  </label>
                </div>

                {fullPaymentEnabled && (
                  <>
                    <p className="text-sm text-[#666666] mb-4">Cash buyers ke liye special discounted price set karein.</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                      <div>
                        <label className={labelClass}>Base Price (PKR) <span className="text-[#ef4444]">*</span></label>
                        <input type="number" required min={0} className={inputClass} placeholder="e.g. 7500000"
                          value={fullPaymentBasePrice} onChange={(e) => setFullPaymentBasePrice(e.target.value)} disabled={saving} />
                      </div>
                      <div>
                        <label className={labelClass}>Cash Discount (%)</label>
                        <input type="number" min={0} max={50} className={inputClass} placeholder="e.g. 10"
                          value={fullPaymentDiscountPercent} onChange={(e) => setFullPaymentDiscountPercent(e.target.value)} disabled={saving} />
                      </div>
                      <div>
                        <label className={labelClass}>Discount Amount (Auto)</label>
                        <input readOnly className={`${inputClass} bg-[#f0fdf4]`}
                          value={fullPaymentDiscountAmount > 0 ? `- Rs. ${fullPaymentDiscountAmount.toLocaleString('en-PK')}` : 'No discount'} />
                      </div>
                    </div>

                    <div className="rounded-xl bg-[#10b981]/10 border border-[#10b981]/20 p-4 mb-5">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <p className="text-sm text-[#333333] font-medium">Final Cash Price</p>
                          <p className="text-2xl font-bold text-[#004063]">Rs. {fullPaymentFinalPrice.toLocaleString('en-PK')}</p>
                        </div>
                        {fullPaymentDiscountAmount > 0 && (
                          <div className="bg-[#10b981] text-white px-4 py-2 rounded-lg text-sm font-semibold">
                            💰 Customer Saves: Rs. {fullPaymentDiscountAmount.toLocaleString('en-PK')}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
                      <div>
                        <label className={labelClass}>Area Size</label>
                        <input type="number" min={0} className={inputClass} placeholder="e.g. 950"
                          value={fullPaymentAreaSize} onChange={(e) => setFullPaymentAreaSize(e.target.value)} disabled={saving} />
                      </div>
                      <div>
                        <label className={labelClass}>Area Unit</label>
                        <select className={selectClass} value={fullPaymentAreaUnit} onChange={(e) => setFullPaymentAreaUnit(e.target.value)} disabled={saving}>
                          <option value="sqft">Sq. Ft.</option>
                          <option value="marla">Marla</option>
                          <option value="sqyard">Sq. Yard</option>
                          <option value="kanal">Kanal</option>
                        </select>
                      </div>
                    </div>

                    <div className="mb-6">
                      <label className={labelClass}>Price Per {fullPaymentAreaUnit} (Auto)</label>
                      <input readOnly className={`${inputClass} bg-[#f0fdf4] font-semibold`}
                        value={fullPaymentPricePerUnit > 0 ? `Rs. ${fullPaymentPricePerUnit.toLocaleString('en-PK')} per ${fullPaymentAreaUnit}` : 'Enter base price and area above'} />
                    </div>

                    <div>
                      <label className={labelClass}>Notes (Optional)</label>
                      <input type="text" className={inputClass} placeholder="e.g. Excludes parking, registration charges"
                        value={fullPaymentNotes} onChange={(e) => setFullPaymentNotes(e.target.value)} disabled={saving} />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Discount offers */}
            {(saleMode === 'Installment' || saleMode === 'Both') && (
              <div className="rounded-xl bg-[#fef3c7] p-5 border border-[#f59e0b]/30 mb-6">
                <h4 className="font-semibold text-[#004063] mb-4 flex items-center gap-2">
                  <span>🏷️</span> Special Discount Offers
                </h4>
                <p className="text-sm text-[#666666] mb-5">Ye offers installment buyers ke liye hain. Enable karein jo applicable hon.</p>

                {/* Advance installment discount */}
                <div className="bg-white rounded-lg p-4 border border-[#f59e0b]/20 mb-4">
                  <label className="flex items-center gap-3 cursor-pointer mb-3">
                    <input type="checkbox" checked={advanceDiscountEnabled} onChange={(e) => setAdvanceDiscountEnabled(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-[#f59e0b] focus:ring-[#f59e0b]" disabled={saving} />
                    <span className="font-medium text-[#333333]">Advance Installment Discount</span>
                  </label>
                  {advanceDiscountEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-7">
                      <div>
                        <label className={labelClass}>Advance Months</label>
                        <input type="number" min={1} className={inputClass} placeholder="e.g. 6"
                          value={advanceDiscountMonths} onChange={(e) => setAdvanceDiscountMonths(e.target.value)} disabled={saving} />
                      </div>
                      <div>
                        <label className={labelClass}>Discount (%)</label>
                        <input type="number" min={0} max={50} className={inputClass} placeholder="e.g. 3"
                          value={advanceDiscountPercent} onChange={(e) => setAdvanceDiscountPercent(e.target.value)} disabled={saving} />
                      </div>
                      <div>
                        <label className={labelClass}>Description (Optional)</label>
                        <input type="text" className={inputClass} placeholder="e.g. Lump-sum benefit"
                          value={advanceDiscountDescription} onChange={(e) => setAdvanceDiscountDescription(e.target.value)} disabled={saving} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Down payment bonus */}
                <div className="bg-white rounded-lg p-4 border border-[#f59e0b]/20 mb-4">
                  <label className="flex items-center gap-3 cursor-pointer mb-3">
                    <input type="checkbox" checked={downPaymentBonusEnabled} onChange={(e) => setDownPaymentBonusEnabled(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-[#f59e0b] focus:ring-[#f59e0b]" disabled={saving} />
                    <span className="font-medium text-[#333333]">Higher Down Payment Bonus</span>
                  </label>
                  {downPaymentBonusEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-7">
                      <div>
                        <label className={labelClass}>Minimum Down (%)</label>
                        <input type="number" min={0} max={100} className={inputClass} placeholder="e.g. 25"
                          value={downPaymentBonusMinPercent} onChange={(e) => setDownPaymentBonusMinPercent(e.target.value)} disabled={saving} />
                      </div>
                      <div>
                        <label className={labelClass}>Discount (%)</label>
                        <input type="number" min={0} max={50} className={inputClass} placeholder="e.g. 5"
                          value={downPaymentBonusDiscountPercent} onChange={(e) => setDownPaymentBonusDiscountPercent(e.target.value)} disabled={saving} />
                      </div>
                      <div>
                        <label className={labelClass}>Description (Optional)</label>
                        <input type="text" className={inputClass} placeholder="e.g. Higher commitment reward"
                          value={downPaymentBonusDescription} onChange={(e) => setDownPaymentBonusDescription(e.target.value)} disabled={saving} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Early bird */}
                <div className="bg-white rounded-lg p-4 border border-[#f59e0b]/20 mb-4">
                  <label className="flex items-center gap-3 cursor-pointer mb-3">
                    <input type="checkbox" checked={earlyBirdEnabled} onChange={(e) => setEarlyBirdEnabled(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-[#f59e0b] focus:ring-[#f59e0b]" disabled={saving} />
                    <span className="font-medium text-[#333333]">Early Bird / Pre-Launch Offer</span>
                  </label>
                  {earlyBirdEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
                      <div>
                        <label className={labelClass}>Discount (%)</label>
                        <input type="number" min={0} max={50} className={inputClass} placeholder="e.g. 8"
                          value={earlyBirdDiscountPercent} onChange={(e) => setEarlyBirdDiscountPercent(e.target.value)} disabled={saving} />
                      </div>
                      <div>
                        <label className={labelClass}>Description</label>
                        <input type="text" className={inputClass} placeholder="e.g. First 50 bookings get special rate"
                          value={earlyBirdDescription} onChange={(e) => setEarlyBirdDescription(e.target.value)} disabled={saving} />
                      </div>
                      <div>
                        <label className={labelClass}>Valid From</label>
                        <input type="date" className={inputClass} value={earlyBirdValidFrom} onChange={(e) => setEarlyBirdValidFrom(e.target.value)} disabled={saving} />
                      </div>
                      <div>
                        <label className={labelClass}>Valid Till</label>
                        <input type="date" className={inputClass} value={earlyBirdValidTill} onChange={(e) => setEarlyBirdValidTill(e.target.value)} disabled={saving} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Custom offers */}
                <div className="bg-white rounded-xl p-5 border border-[#f59e0b]/20">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-semibold text-[#333333]">Custom Offers</span>
                    <button type="button" onClick={handleAddCustomOffer} disabled={saving}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-[#f59e0b] text-white hover:bg-[#d97706] transition-colors disabled:opacity-50">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                      </svg>
                      Add Custom Offer
                    </button>
                  </div>

                  {customOffers.length === 0 && (
                    <p className="text-sm text-[#666666] italic">No custom offers added yet.</p>
                  )}

                  <div className="space-y-4 mt-3">
                    {customOffers.map((offer, index) => (
                      <div key={offer.id} className="bg-[#fef3c7] rounded-lg p-4 border border-[#f59e0b]/20 relative">
                        <button type="button" onClick={() => handleRemoveCustomOffer(offer.id)} disabled={saving}
                          className="absolute top-2 right-2 p-1.5 text-[#ef4444] hover:bg-[#fef2f2] rounded-md transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        <p className="text-xs text-[#666666] mb-3 font-medium">Custom Offer #{index + 1}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <label className={labelClass}>Offer Title <span className="text-[#ef4444]">*</span></label>
                            <input type="text" className={inputClass} placeholder="e.g. Ramadan Special"
                              value={offer.title} onChange={(e) => handleCustomOfferChange(offer.id, 'title', e.target.value)} disabled={saving} />
                          </div>
                          <div>
                            <label className={labelClass}>Discount Type</label>
                            <select className={selectClass} value={offer.discountType}
                              onChange={(e) => handleCustomOfferChange(offer.id, 'discountType', e.target.value)} disabled={saving}>
                              <option value="percent">Percent (%)</option>
                              <option value="fixed">Fixed Amount (PKR)</option>
                            </select>
                          </div>
                          <div>
                            <label className={labelClass}>Discount Value</label>
                            <input type="number" min={0} step={offer.discountType === 'percent' ? '0.1' : '1000'} className={inputClass}
                              placeholder={offer.discountType === 'percent' ? 'e.g. 5' : 'e.g. 200000'}
                              value={offer.discountValue} onChange={(e) => handleCustomOfferChange(offer.id, 'discountValue', e.target.value)} disabled={saving} />
                          </div>
                          <div className="md:col-span-2">
                            <label className={labelClass}>Description</label>
                            <input type="text" className={inputClass} placeholder="e.g. Extra discount during holy month"
                              value={offer.description} onChange={(e) => handleCustomOfferChange(offer.id, 'description', e.target.value)} disabled={saving} />
                          </div>
                          <div>
                            <label className={labelClass}>Valid From</label>
                            <input type="date" className={inputClass} value={offer.validFrom}
                              onChange={(e) => handleCustomOfferChange(offer.id, 'validFrom', e.target.value)} disabled={saving} />
                          </div>
                          <div>
                            <label className={labelClass}>Valid Till</label>
                            <input type="date" className={inputClass} value={offer.validTill}
                              onChange={(e) => handleCustomOfferChange(offer.id, 'validTill', e.target.value)} disabled={saving} />
                          </div>
                          <div className="md:col-span-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={offer.isActive}
                                onChange={(e) => handleCustomOfferChange(offer.id, 'isActive', e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-[#f59e0b] focus:ring-[#f59e0b]" disabled={saving} />
                              <span className="text-sm text-[#333333]">Active</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Section>

          {/* ── Completed Projects ────────────────────────────────────────── */}
          <Section title="Completed Projects by Developer" subtitle="Showcase your past successful developments" icon="🏗">
            <div className="bg-[#fef3c7] border border-[#f59e0b]/30 rounded-xl p-4 mb-5">
              <p className="text-sm text-[#333333]">
                <span className="font-semibold">Note:</span> Images for completed projects are managed separately via the Documents section.
              </p>
            </div>

            {completedProjects.map((project, index) => (
              <div key={index} className="p-5 bg-[#f8f9fa] rounded-xl border border-gray-200 mb-4 relative">
                {index > 0 && (
                  <button type="button" onClick={() => handleRemoveProject(index)} disabled={saving}
                    className="absolute top-3 right-3 p-1.5 text-[#ef4444] hover:bg-[#fef2f2] rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                <h4 className="font-semibold text-[#004063] mb-4">Project {index + 1}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Project Name <span className="text-[#ef4444]">*</span></label>
                    <input type="text" className={inputClass} value={project.name}
                      onChange={(e) => handleProjectChange(index, 'name', e.target.value)}
                      placeholder="e.g. Skyline Towers" disabled={saving} maxLength={80} />
                  </div>
                  <div>
                    <label className={labelClass}>Project Type <span className="text-[#ef4444]">*</span></label>
                    <select className={selectClass} value={project.type}
                      onChange={(e) => handleProjectChange(index, 'type', e.target.value)} disabled={saving}>
                      <option value="">Select Type</option>
                      <option value="Residential">Residential</option>
                      <option value="Commercial">Commercial</option>
                      <option value="Mixed Use">Mixed Use</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Location</label>
                    <input type="text" className={inputClass} value={project.location}
                      onChange={(e) => handleProjectChange(index, 'location', e.target.value)}
                      placeholder="e.g. DHA Lahore" disabled={saving} maxLength={80} />
                  </div>
                  <div>
                    <label className={labelClass}>Completion Year</label>
                    <input type="text" className={inputClass} value={project.year}
                      onChange={(e) => handleProjectChange(index, 'year', e.target.value)}
                      placeholder="e.g. 2022" disabled={saving} maxLength={4} />
                  </div>
                </div>
              </div>
            ))}

            <button type="button" onClick={handleAddProject} disabled={saving} className={secondaryButtonClass}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Another Project
            </button>
          </Section>

          {/* ── Visuals & Location ────────────────────────────────────────── */}
          <Section title="Visuals & Location" subtitle="Add feature image, videos, and map location" icon="📷">
            <div className="mb-8 border-b border-gray-100 pb-8">
              <label className="block text-base font-semibold text-[#004063] mb-2">
                Feature Image / Hero Cover <span className="text-[#ef4444]">*</span>
              </label>
              <p className="text-sm text-[#666666] mb-4">
                This is the <span className="font-semibold">main image</span> shown at the top of your project page.
                Use a high-quality (1920×1080) exterior shot or render.
              </p>
              <div className="max-w-xl">
                <FileUploader
                  label="Upload Feature Image"
                  value={featureImage}
                  onChange={handleFeatureImageChange}
                  folder="projects"
                  accept="image"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Drone Video URL</label>
                <input type="url" className={inputClass} placeholder="YouTube / Vimeo link"
                  value={droneVideoUrl} onChange={(e) => setDroneVideoUrl(e.target.value)} disabled={saving} />
              </div>
              <div>
                <label className={labelClass}>Virtual Tour URL</label>
                <input type="url" className={inputClass} placeholder="Matterport / YouTube link"
                  value={virtualTourUrl} onChange={(e) => setVirtualTourUrl(e.target.value)} disabled={saving} />
              </div>
              <div>
                <label className={labelClass}>Google Maps Link</label>
                <input type="url" className={inputClass} placeholder="Paste share link from Google Maps"
                  value={googleMapLink} onChange={(e) => setGoogleMapLink(e.target.value)} disabled={saving} />
              </div>
              <div>
                <label className={labelClass}>Coordinates (Optional)</label>
                <input type="text" className={inputClass} placeholder="e.g. 33.6996, 73.0362"
                  value={coordinatesRaw} onChange={(e) => setCoordinatesRaw(e.target.value)} disabled={saving} />
                <p className="text-xs text-[#666666] mt-1.5">Right-click on Google Maps → &quot;What&apos;s here?&quot;</p>
              </div>
              {staticMapUrl && (
                <div className="md:col-span-2">
                  <p className="text-sm text-[#333333] mb-2">📍 Location Preview:</p>
                  <img src={staticMapUrl} alt="Location preview" loading="lazy" referrerPolicy="no-referrer"
                    className="rounded-xl border border-gray-200 w-full max-w-lg" />
                </div>
              )}
            </div>
          </Section>

          {/* ── Submit bar ────────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
            <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
              <p className="text-sm text-[#666666]">Your changes will be saved and the project will be updated.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button type="button" onClick={() => void router.push('/developer/dashboard')} disabled={saving}
                  className="px-6 py-3 rounded-xl border border-gray-200 text-[#333333] font-semibold hover:bg-[#f8f9fa] transition-colors disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className={primaryButtonClass}>
                  {saving ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function EditProjectPage(): React.ReactElement {
  const router = useRouter();
  const { id } = router.query;

  return (
    <DeveloperLayout>
      <Head>
        <title>Edit Project — Developer Portal | Highrise.pk</title>
        <meta name="robots" content="noindex, nofollow, noarchive" />
        <meta name="googlebot" content="noindex, nofollow, noarchive" />
        <meta name="referrer" content="same-origin" />
      </Head>

      {!router.isReady ? (
        <LoadingSpinner text="Preparing editor..." />
      ) : !id || typeof id !== 'string' ? (
        <ErrorState message="Invalid project ID. Please go back and try again." />
      ) : (
        <EditProjectForm projectId={id} />
      )}
    </DeveloperLayout>
  );
}