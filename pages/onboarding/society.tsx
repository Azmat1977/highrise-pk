// pages/onboarding/society.tsx
// Highrise.pk — Society Onboarding Form
// 8-section multi-step form for society registration
// Mirrors developer.tsx architecture exactly
// NO framer-motion | NO axios | NO react-hot-toast | NO 'use client'
// NO role from URL | fetch() only | inline banners | lucide-react only

import React, { useState, useCallback, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import {
  Building2,
  User,
  Phone,
  FileText,
  MapPin,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Upload,
  X,
  Plus,
  Loader2,
  Shield,
  Clock,
  Home,
  Layers,
  LayoutGrid,
  Banknote,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type SocietyAuthority =
  | 'LDA' | 'CDA' | 'RDA' | 'KDA' | 'FDA'
  | 'MDA' | 'DHA' | 'PHATA' | 'Other';

type PlotSize =
  | '3_marla' | '4_marla' | '5_marla' | '6_marla' | '7_marla'
  | '8_marla' | '10_marla' | '12_marla' | '1_kanal' | '1_kanal_4_marla'
  | '2_kanal' | 'commercial' | 'other';

type PossessionStatus = 'announced' | 'under_development' | 'ready';

type DocumentType =
  | 'noc_certificate' | 'layout_plan' | 'master_plan'
  | 'secp_certificate' | 'ntn_certificate' | 'authority_approval'
  | 'land_acquisition' | 'environmental_noc' | 'other';

type AmenityKey =
  | 'mosque' | 'school' | 'hospital' | 'park' | 'community_center'
  | 'commercial_area' | 'security_gate' | 'cctv'
  | 'underground_electricity' | 'gas' | 'water_supply' | 'sewerage'
  | 'gymnasium' | 'swimming_pool' | 'sports_complex' | 'cinema'
  | 'food_court' | 'playground' | 'jogging_track' | 'library'
  | 'graveyard' | 'car_parking' | 'visitor_parking'
  | 'fire_station' | 'police_post';

interface BlockEntry {
  id: string;
  name: string;
  totalPlots: string;
  availablePlots: string;
  plotSizes: PlotSize[];
  possessionStatus: PossessionStatus;
  launchYear: string;
  completionYear: string;
}

interface PlotInventoryEntry {
  id: string;
  size: PlotSize;
  totalPlots: string;
  availablePlots: string;
  pricePerMarla: string;
  pricePerSqFt: string;
}

interface InstallmentPlanEntry {
  id: string;
  planName: string;
  durationMonths: string;
  downPaymentPercent: string;
  monthlyInstallmentPercent: string;
  quarterlyInstallmentPercent: string;
  halfYearlyInstallmentPercent: string;
  balloonPaymentPercent: string;
  isInterestFree: boolean;
  notes: string;
}

interface UploadedDocument {
  id: string;
  type: DocumentType;
  title: string;
  url: string;
  uploading: boolean;
  error: string;
}

interface FormData {
  // Section 1 — Society Identity
  societyName: string;
  registeredName: string;
  city: string;
  areaName: string;
  fullAddress: string;
  authority: SocietyAuthority | '';
  nocNumber: string;
  nocIssuanceDate: string;
  nocExpiryDate: string;
  totalAreaAcres: string;
  launchYear: string;

  // Section 2 — Authorized Person
  authorizedPersonName: string;
  authorizedPersonDesignation: string;
  authorizedPersonCnic: string;
  authorizedPersonPhone: string;
  authorizedPersonEmail: string;

  // Section 3 — Contact & Location
  officePhone: string;
  officeEmail: string;
  websiteUrl: string;

  // Section 4 — Compliance & Legal
  ntcNumber: string;
  fbrNtn: string;
  strn: string;
  bankAccountTitle: string;
  bankName: string;
  bankIban: string;

  // Section 5 — Blocks & Phases (dynamic)
  blocks: BlockEntry[];

  // Section 6 — Plot Inventory (dynamic)
  plotInventory: PlotInventoryEntry[];

  // Section 7 — Amenities
  amenities: AmenityKey[];

  // Section 8 — Installment Plans (dynamic, optional)
  installmentPlans: InstallmentPlanEntry[];

  // Documents (handled separately)
  kycDocuments: UploadedDocument[];

  // Consent
  consentGiven: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AUTHORITIES: { value: SocietyAuthority; label: string }[] = [
  { value: 'LDA', label: 'LDA — Lahore Development Authority' },
  { value: 'CDA', label: 'CDA — Capital Development Authority (Islamabad)' },
  { value: 'RDA', label: 'RDA — Rawalpindi Development Authority' },
  { value: 'KDA', label: 'KDA — Karachi Development Authority' },
  { value: 'FDA', label: 'FDA — Faisalabad Development Authority' },
  { value: 'MDA', label: 'MDA — Multan Development Authority' },
  { value: 'DHA', label: 'DHA — Defence Housing Authority' },
  { value: 'PHATA', label: 'PHATA — Punjab Housing & Town Planning Agency' },
  { value: 'Other', label: 'Other Authority' },
];

const PLOT_SIZES: { value: PlotSize; label: string }[] = [
  { value: '3_marla', label: '3 Marla' },
  { value: '4_marla', label: '4 Marla' },
  { value: '5_marla', label: '5 Marla' },
  { value: '6_marla', label: '6 Marla' },
  { value: '7_marla', label: '7 Marla' },
  { value: '8_marla', label: '8 Marla' },
  { value: '10_marla', label: '10 Marla' },
  { value: '12_marla', label: '12 Marla' },
  { value: '1_kanal', label: '1 Kanal' },
  { value: '1_kanal_4_marla', label: '1 Kanal 4 Marla' },
  { value: '2_kanal', label: '2 Kanal' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'other', label: 'Other' },
];

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'noc_certificate', label: 'NOC Certificate' },
  { value: 'layout_plan', label: 'Layout Plan' },
  { value: 'master_plan', label: 'Master Plan' },
  { value: 'secp_certificate', label: 'SECP Certificate' },
  { value: 'ntn_certificate', label: 'NTN Certificate' },
  { value: 'authority_approval', label: 'Authority Approval Letter' },
  { value: 'land_acquisition', label: 'Land Acquisition Document' },
  { value: 'environmental_noc', label: 'Environmental NOC' },
  { value: 'other', label: 'Other Document' },
];

const AMENITIES: { key: AmenityKey; label: string; emoji: string }[] = [
  { key: 'mosque', label: 'Mosque', emoji: '🕌' },
  { key: 'school', label: 'School', emoji: '🏫' },
  { key: 'hospital', label: 'Hospital / Clinic', emoji: '🏥' },
  { key: 'park', label: 'Parks & Gardens', emoji: '🌳' },
  { key: 'community_center', label: 'Community Center', emoji: '🏛️' },
  { key: 'commercial_area', label: 'Commercial Area', emoji: '🏪' },
  { key: 'security_gate', label: 'Security Gate', emoji: '🚪' },
  { key: 'cctv', label: 'CCTV Surveillance', emoji: '📷' },
  { key: 'underground_electricity', label: 'Underground Electricity', emoji: '⚡' },
  { key: 'gas', label: 'Gas Supply', emoji: '🔥' },
  { key: 'water_supply', label: 'Water Supply', emoji: '💧' },
  { key: 'sewerage', label: 'Sewerage System', emoji: '🚰' },
  { key: 'gymnasium', label: 'Gymnasium', emoji: '💪' },
  { key: 'swimming_pool', label: 'Swimming Pool', emoji: '🏊' },
  { key: 'sports_complex', label: 'Sports Complex', emoji: '🏟️' },
  { key: 'cinema', label: 'Cinema', emoji: '🎬' },
  { key: 'food_court', label: 'Food Court', emoji: '🍽️' },
  { key: 'playground', label: 'Playground', emoji: '🛝' },
  { key: 'jogging_track', label: 'Jogging Track', emoji: '🏃' },
  { key: 'library', label: 'Library', emoji: '📚' },
  { key: 'graveyard', label: 'Graveyard', emoji: '🪦' },
  { key: 'car_parking', label: 'Car Parking', emoji: '🅿️' },
  { key: 'visitor_parking', label: 'Visitor Parking', emoji: '🚗' },
  { key: 'fire_station', label: 'Fire Station', emoji: '🚒' },
  { key: 'police_post', label: 'Police Post', emoji: '👮' },
];

const PAKISTAN_CITIES = [
  'Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad',
  'Multan', 'Peshawar', 'Quetta', 'Gujranwala', 'Sialkot',
  'Bahawalpur', 'Sargodha', 'Hyderabad', 'Abbottabad', 'Murree',
  'Chiniot', 'Sheikhupura', 'Gujrat', 'Rahim Yar Khan', 'Sahiwal',
];

const STEPS = [
  { id: 1, label: 'Society Identity', icon: Building2 },
  { id: 2, label: 'Authorized Person', icon: User },
  { id: 3, label: 'Contact & Location', icon: Phone },
  { id: 4, label: 'Compliance & Legal', icon: FileText },
  { id: 5, label: 'Blocks & Phases', icon: Layers },
  { id: 6, label: 'Plot Inventory', icon: LayoutGrid },
  { id: 7, label: 'Amenities & Plans', icon: Home },
  { id: 8, label: 'Documents & Consent', icon: Shield },
];

// ─── Empty entry factories ────────────────────────────────────────────────────

const newBlock = (): BlockEntry => ({
  id: crypto.randomUUID(),
  name: '',
  totalPlots: '',
  availablePlots: '',
  plotSizes: [],
  possessionStatus: 'announced',
  launchYear: '',
  completionYear: '',
});

const newPlotInventory = (): PlotInventoryEntry => ({
  id: crypto.randomUUID(),
  size: '5_marla',
  totalPlots: '',
  availablePlots: '',
  pricePerMarla: '',
  pricePerSqFt: '',
});

const newInstallmentPlan = (): InstallmentPlanEntry => ({
  id: crypto.randomUUID(),
  planName: '',
  durationMonths: '',
  downPaymentPercent: '',
  monthlyInstallmentPercent: '',
  quarterlyInstallmentPercent: '',
  halfYearlyInstallmentPercent: '',
  balloonPaymentPercent: '',
  isInterestFree: true,
  notes: '',
});

const newDocument = (): UploadedDocument => ({
  id: crypto.randomUUID(),
  type: 'noc_certificate',
  title: '',
  url: '',
  uploading: false,
  error: '',
});

// ─── Initial form state ───────────────────────────────────────────────────────

const INITIAL_FORM: FormData = {
  societyName: '',
  registeredName: '',
  city: '',
  areaName: '',
  fullAddress: '',
  authority: '',
  nocNumber: '',
  nocIssuanceDate: '',
  nocExpiryDate: '',
  totalAreaAcres: '',
  launchYear: '',
  authorizedPersonName: '',
  authorizedPersonDesignation: '',
  authorizedPersonCnic: '',
  authorizedPersonPhone: '',
  authorizedPersonEmail: '',
  officePhone: '',
  officeEmail: '',
  websiteUrl: '',
  ntcNumber: '',
  fbrNtn: '',
  strn: '',
  bankAccountTitle: '',
  bankName: '',
  bankIban: '',
  blocks: [newBlock()],
  plotInventory: [newPlotInventory()],
  amenities: [],
  installmentPlans: [],
  kycDocuments: [newDocument()],
  consentGiven: false,
};

// ─── Shared input classes ─────────────────────────────────────────────────────

const inputCls =
  'w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-[#029bba] focus:border-transparent ' +
  'placeholder:text-gray-400 transition-colors';

const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5';
const optionalBadge = (
  <span className="ml-1 text-xs font-normal text-gray-400">(optional)</span>
);

// ─── Component ────────────────────────────────────────────────────────────────

export default function SocietyOnboardingPage(): React.ReactElement {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // ── Auth guard ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!session) {
      void router.replace('/login?callbackUrl=/onboarding/society');
      return;
    }
    const role = session.user?.role;
    if (role && role !== 'user') {
      void router.replace('/dashboard');
    }
  }, [session, sessionStatus, router]);

  // ── Field updater ──────────────────────────────────────────────────────────

  const setField = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    []
  );

  // ── Amenity toggle ─────────────────────────────────────────────────────────

  const toggleAmenity = useCallback((key: AmenityKey) => {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(key)
        ? prev.amenities.filter((a) => a !== key)
        : [...prev.amenities, key],
    }));
  }, []);

  // ── Block helpers ──────────────────────────────────────────────────────────

  const updateBlock = useCallback(
    (id: string, field: keyof BlockEntry, value: string | PlotSize[] | PossessionStatus) => {
      setForm((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) =>
          b.id === id ? { ...b, [field]: value } : b
        ),
      }));
    },
    []
  );

  const toggleBlockPlotSize = useCallback(
    (blockId: string, size: PlotSize) => {
      setForm((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) => {
          if (b.id !== blockId) return b;
          const has = b.plotSizes.includes(size);
          return {
            ...b,
            plotSizes: has
              ? b.plotSizes.filter((s) => s !== size)
              : [...b.plotSizes, size],
          };
        }),
      }));
    },
    []
  );

  const addBlock = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      blocks: [...prev.blocks, newBlock()],
    }));
  }, []);

  const removeBlock = useCallback((id: string) => {
    setForm((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((b) => b.id !== id),
    }));
  }, []);

  // ── Plot inventory helpers ─────────────────────────────────────────────────

  const updatePlotInventory = useCallback(
    (id: string, field: keyof PlotInventoryEntry, value: string | PlotSize) => {
      setForm((prev) => ({
        ...prev,
        plotInventory: prev.plotInventory.map((p) =>
          p.id === id ? { ...p, [field]: value } : p
        ),
      }));
    },
    []
  );

  const addPlotInventory = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      plotInventory: [...prev.plotInventory, newPlotInventory()],
    }));
  }, []);

  const removePlotInventory = useCallback((id: string) => {
    setForm((prev) => ({
      ...prev,
      plotInventory: prev.plotInventory.filter((p) => p.id !== id),
    }));
  }, []);

  // ── Installment plan helpers ───────────────────────────────────────────────

  const updatePlan = useCallback(
    (id: string, field: keyof InstallmentPlanEntry, value: string | boolean) => {
      setForm((prev) => ({
        ...prev,
        installmentPlans: prev.installmentPlans.map((p) =>
          p.id === id ? { ...p, [field]: value } : p
        ),
      }));
    },
    []
  );

  const addPlan = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      installmentPlans: [...prev.installmentPlans, newInstallmentPlan()],
    }));
  }, []);

  const removePlan = useCallback((id: string) => {
    setForm((prev) => ({
      ...prev,
      installmentPlans: prev.installmentPlans.filter((p) => p.id !== id),
    }));
  }, []);

  // ── Document helpers ───────────────────────────────────────────────────────

  const updateDocument = useCallback(
    (id: string, field: keyof UploadedDocument, value: string | DocumentType | boolean) => {
      setForm((prev) => ({
        ...prev,
        kycDocuments: prev.kycDocuments.map((d) =>
          d.id === id ? { ...d, [field]: value } : d
        ),
      }));
    },
    []
  );

  const addDocument = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      kycDocuments: [...prev.kycDocuments, newDocument()],
    }));
  }, []);

  const removeDocument = useCallback((id: string) => {
    setForm((prev) => ({
      ...prev,
      kycDocuments: prev.kycDocuments.filter((d) => d.id !== id),
    }));
  }, []);

  const uploadDocument = useCallback(
    async (id: string, file: File) => {
      updateDocument(id, 'uploading', true);
      updateDocument(id, 'error', '');

      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', 'kyc/society');

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: fd,
          credentials: 'include',
        });

        const json: { success: boolean; url?: string; error?: string } =
          await res.json();

        if (!res.ok || !json.success || !json.url) {
          updateDocument(id, 'error', json.error ?? 'Upload failed. Please try again.');
          updateDocument(id, 'uploading', false);
          return;
        }

        updateDocument(id, 'url', json.url);
        // Derive a title from the filename if not already set
        setForm((prev) => ({
          ...prev,
          kycDocuments: prev.kycDocuments.map((d) =>
            d.id === id
              ? {
                  ...d,
                  url: json.url ?? '',
                  uploading: false,
                  error: '',
                  title: d.title || file.name.replace(/\.[^/.]+$/, ''),
                }
              : d
          ),
        }));
      } catch {
        updateDocument(id, 'error', 'Upload failed. Check your connection and try again.');
        updateDocument(id, 'uploading', false);
      }
    },
    [updateDocument]
  );

  // ── Step validation ────────────────────────────────────────────────────────

  const validateStep = useCallback(
    (s: number): boolean => {
      const errs: Record<string, string> = {};

      if (s === 1) {
        if (!form.societyName.trim())
          errs.societyName = 'Society name is required';
        if (!form.registeredName.trim())
          errs.registeredName = 'Registered legal name is required';
        if (!form.city) errs.city = 'City is required';
        if (!form.areaName.trim()) errs.areaName = 'Area / locality is required';
        if (!form.fullAddress.trim() || form.fullAddress.trim().length < 10)
          errs.fullAddress = 'Full address must be at least 10 characters';
        if (!form.authority) errs.authority = 'Approving authority is required';
        if (!form.nocNumber.trim()) errs.nocNumber = 'NOC number is required';
      }

      if (s === 2) {
        if (!form.authorizedPersonName.trim())
          errs.authorizedPersonName = 'Name is required';
        if (!form.authorizedPersonDesignation.trim())
          errs.authorizedPersonDesignation = 'Designation is required';
        const cnicRe = /^\d{5}-\d{7}-\d{1}$/;
        if (!cnicRe.test(form.authorizedPersonCnic))
          errs.authorizedPersonCnic = 'Format: #####-#######-#';
        const phoneRe = /^(\+92|0)3[0-9]{2}[-\s]?[0-9]{7}$/;
        if (!phoneRe.test(form.authorizedPersonPhone))
          errs.authorizedPersonPhone = 'Enter a valid Pakistani mobile number';
        if (!form.authorizedPersonEmail.trim())
          errs.authorizedPersonEmail = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.authorizedPersonEmail))
          errs.authorizedPersonEmail = 'Enter a valid email address';
      }

      if (s === 3) {
        const phoneRe = /^(\+92|0)3[0-9]{2}[-\s]?[0-9]{7}$/;
        if (!phoneRe.test(form.officePhone))
          errs.officePhone = 'Enter a valid Pakistani phone number';
        if (!form.officeEmail.trim())
          errs.officeEmail = 'Office email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.officeEmail))
          errs.officeEmail = 'Enter a valid email address';
        if (
          form.websiteUrl &&
          !/^https?:\/\/.+/.test(form.websiteUrl)
        )
          errs.websiteUrl = 'URL must start with https://';
      }

      if (s === 4) {
        if (form.bankIban) {
          const ibanRe = /^PK\d{2}[A-Z]{4}\d{16}$/;
          if (!ibanRe.test(form.bankIban.replace(/\s/g, '')))
            errs.bankIban = 'Format: PK + 2 digits + 4 letters + 16 digits';
        }
      }

      if (s === 5) {
        if (form.blocks.length === 0)
          errs.blocks = 'At least one block or phase is required';
        form.blocks.forEach((b, i) => {
          if (!b.name.trim())
            errs[`block_${i}_name`] = 'Block name is required';
          if (b.plotSizes.length === 0)
            errs[`block_${i}_plotSizes`] = 'Select at least one plot size';
          if (!b.totalPlots)
            errs[`block_${i}_totalPlots`] = 'Total plots is required';
        });
      }

      if (s === 6) {
        if (form.plotInventory.length === 0)
          errs.plotInventory = 'At least one plot size entry is required';
        form.plotInventory.forEach((p, i) => {
          if (!p.totalPlots)
            errs[`plot_${i}_totalPlots`] = 'Total plots is required';
          if (!p.availablePlots)
            errs[`plot_${i}_availablePlots`] = 'Available plots is required';
        });
      }

      if (s === 8) {
        const validDocs = form.kycDocuments.filter(
          (d) => d.url && d.title && !d.uploading
        );
        if (validDocs.length === 0)
          errs.kycDocuments =
            'At least one document (NOC certificate) must be uploaded';
        if (!form.consentGiven)
          errs.consentGiven =
            'You must accept the terms to submit your application';
      }

      setErrors(errs);
      return Object.keys(errs).length === 0;
    },
    [form]
  );

  // ── Navigation ─────────────────────────────────────────────────────────────

  const goNext = useCallback(() => {
    if (validateStep(step)) {
      setStep((s) => Math.min(s + 1, STEPS.length));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [step, validateStep]);

  const goBack = useCallback(() => {
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!validateStep(8)) return;

    setSubmitting(true);
    setSubmitError('');

    try {
      const payload = {
        // Identity
        societyName: form.societyName.trim(),
        registeredName: form.registeredName.trim(),
        city: form.city,
        areaName: form.areaName.trim(),
        fullAddress: form.fullAddress.trim(),
        authority: form.authority,
        nocNumber: form.nocNumber.trim(),
        nocIssuanceDate: form.nocIssuanceDate || undefined,
        nocExpiryDate: form.nocExpiryDate || undefined,
        totalAreaAcres: form.totalAreaAcres
          ? parseFloat(form.totalAreaAcres)
          : undefined,
        launchYear: form.launchYear
          ? parseInt(form.launchYear, 10)
          : undefined,

        // Authorized person
        authorizedPersonName: form.authorizedPersonName.trim(),
        authorizedPersonDesignation: form.authorizedPersonDesignation.trim(),
        authorizedPersonCnic: form.authorizedPersonCnic.trim(),
        authorizedPersonPhone: form.authorizedPersonPhone.trim(),
        authorizedPersonEmail: form.authorizedPersonEmail.trim().toLowerCase(),

        // Contact
        officePhone: form.officePhone.trim(),
        officeEmail: form.officeEmail.trim().toLowerCase(),
        websiteUrl: form.websiteUrl.trim() || undefined,

        // Compliance
        ntcNumber: form.ntcNumber.trim() || undefined,
        fbrNtn: form.fbrNtn.trim() || undefined,
        strn: form.strn.trim() || undefined,
        bankAccountTitle: form.bankAccountTitle.trim() || undefined,
        bankName: form.bankName.trim() || undefined,
        bankIban: form.bankIban.trim() || undefined,

        // Blocks
        blocks: form.blocks.map((b) => ({
          name: b.name.trim(),
          totalPlots: parseInt(b.totalPlots, 10) || 0,
          availablePlots: parseInt(b.availablePlots, 10) || 0,
          plotSizes: b.plotSizes,
          possessionStatus: b.possessionStatus,
          launchYear: b.launchYear ? parseInt(b.launchYear, 10) : undefined,
          completionYear: b.completionYear
            ? parseInt(b.completionYear, 10)
            : undefined,
        })),

        // Plot inventory
        plotInventory: form.plotInventory.map((p) => ({
          size: p.size,
          totalPlots: parseInt(p.totalPlots, 10) || 0,
          availablePlots: parseInt(p.availablePlots, 10) || 0,
          pricePerMarla: p.pricePerMarla
            ? parseFloat(p.pricePerMarla)
            : undefined,
          pricePerSqFt: p.pricePerSqFt
            ? parseFloat(p.pricePerSqFt)
            : undefined,
        })),

        // Amenities
        amenities: form.amenities,

        // Installment plans
        installmentPlans: form.installmentPlans.map((p) => ({
          planName: p.planName.trim(),
          durationMonths: parseInt(p.durationMonths, 10) || 0,
          downPaymentPercent: parseFloat(p.downPaymentPercent) || 0,
          monthlyInstallmentPercent: p.monthlyInstallmentPercent
            ? parseFloat(p.monthlyInstallmentPercent)
            : undefined,
          quarterlyInstallmentPercent: p.quarterlyInstallmentPercent
            ? parseFloat(p.quarterlyInstallmentPercent)
            : undefined,
          halfYearlyInstallmentPercent: p.halfYearlyInstallmentPercent
            ? parseFloat(p.halfYearlyInstallmentPercent)
            : undefined,
          balloonPaymentPercent: p.balloonPaymentPercent
            ? parseFloat(p.balloonPaymentPercent)
            : undefined,
          isInterestFree: p.isInterestFree,
          notes: p.notes.trim() || undefined,
        })),

        // KYC documents
        kycDocuments: form.kycDocuments
          .filter((d) => d.url && d.title && !d.uploading)
          .map((d) => ({
            type: d.type,
            title: d.title.trim(),
            url: d.url,
          })),

        // Consent
        consentGiven: true,
      };

      const res = await fetch('/api/onboarding/society', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const json: {
        success: boolean;
        message?: string;
        error?: string;
        fieldErrors?: Record<string, string[]>;
      } = await res.json();

      if (!res.ok || !json.success) {
        if (json.fieldErrors) {
          const mapped: Record<string, string> = {};
          Object.entries(json.fieldErrors).forEach(([k, v]) => {
            mapped[k] = Array.isArray(v) ? v[0] : String(v);
          });
          setErrors(mapped);
        }
        setSubmitError(
          json.error ?? 'Submission failed. Please check your details and try again.'
        );
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setSubmitError(
        'A network error occurred. Please check your connection and try again.'
      );
      setSubmitting(false);
    }
  }, [form, validateStep]);

  // ─── Pending / success screen ──────────────────────────────────────────────

  if (submitted) {
    return (
      <>
        <Head>
          <title>Application Submitted — Highrise.pk</title>
          <meta name="robots" content="noindex" />
        </Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
            <div className="w-20 h-20 rounded-full bg-[#029bba]/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-[#029bba]" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Application Submitted!
            </h1>
            <p className="text-gray-600 mb-2">
              Thank you for registering{' '}
              <span className="font-semibold text-[#004063]">
                {form.societyName}
              </span>{' '}
              with Highrise.pk.
            </p>
            <p className="text-gray-500 text-sm mb-6">
              Our compliance team will review your application and NOC
              documents within{' '}
              <span className="font-semibold text-gray-700">
                2–3 business days
              </span>
              . You will receive an email update at{' '}
              <span className="font-semibold">{session?.user?.email}</span>.
            </p>

            <div className="bg-[#f0fdf4] border border-[#10b981]/20 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm font-semibold text-[#10b981] mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> What happens next?
              </p>
              <ul className="text-sm text-gray-600 space-y-1.5 list-disc list-inside">
                <li>Confirmation email sent to your inbox</li>
                <li>NOC and documents verified by our legal team</li>
                <li>Admin review of society details</li>
                <li>Account upgraded to Society role on approval</li>
                <li>Access to Society Dashboard and Plot management</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => void router.push('/dashboard')}
                className="flex-1 px-6 py-3 rounded-xl bg-[#029bba] text-white font-semibold text-sm hover:bg-[#027a94] transition-colors"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => void router.push('/')}
                className="flex-1 px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#029bba] animate-spin" />
      </div>
    );
  }

  // ─── Main form ─────────────────────────────────────────────────────────────

  return (
    <>
      <Head>
        <title>Register Your Society — Highrise.pk</title>
        <meta
          name="description"
          content="Register your housing society with Highrise.pk. Verified listings, NOC-checked, trust-first platform."
        />
        <meta name="robots" content="noindex" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* ── Header ── */}
        <div
          className="py-10 px-4 text-center"
          style={{
            background: 'linear-gradient(135deg, #004063 0%, #001f2b 100%)',
          }}
        >
          <div className="inline-flex items-center gap-2 bg-white/10 text-white text-xs font-medium px-3 py-1.5 rounded-full mb-4">
            <Shield className="w-3.5 h-3.5" />
            Society Registration — Highrise.pk
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Register Your Housing Society
          </h1>
          <p className="text-white/70 text-sm max-w-xl mx-auto">
            Join Pakistan&apos;s first verified society platform. Get a
            dedicated dashboard, plot management tools, and verified badge
            for your NOC-approved society.
          </p>
        </div>

        {/* ── Progress stepper ── */}
        <div className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
          <div className="max-w-5xl mx-auto px-4 py-3 overflow-x-auto">
            <div className="flex items-center gap-1 min-w-max">
              {STEPS.map((s, idx) => {
                const Icon = s.icon;
                const isActive = s.id === step;
                const isDone = s.id < step;
                return (
                  <React.Fragment key={s.id}>
                    <button
                      onClick={() => {
                        if (isDone) {
                          setStep(s.id);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                      disabled={!isDone && !isActive}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                        isActive
                          ? 'bg-[#029bba] text-white shadow-sm'
                          : isDone
                          ? 'bg-[#029bba]/10 text-[#029bba] cursor-pointer hover:bg-[#029bba]/20'
                          : 'text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle className="w-3.5 h-3.5" />
                      ) : (
                        <Icon className="w-3.5 h-3.5" />
                      )}
                      <span className="hidden sm:inline">{s.label}</span>
                      <span className="sm:hidden">{s.id}</span>
                    </button>
                    {idx < STEPS.length - 1 && (
                      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Form body ── */}
        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* Submit error banner */}
          {submitError && (
            <div className="mb-6 bg-[#fef2f2] border-l-4 border-[#ef4444] p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#ef4444] shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}

          {/* ── STEP 1 — Society Identity ── */}
          {step === 1 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 border-b border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-[#029bba]/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-[#029bba]" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-sm">
                    Society Identity
                  </h2>
                  <p className="text-xs text-gray-500">
                    Official name, location, and NOC details
                  </p>
                </div>
              </div>
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelCls}>Society Name *</label>
                    <input
                      type="text"
                      value={form.societyName}
                      onChange={(e) => setField('societyName', e.target.value)}
                      placeholder="e.g. Bahria Town Phase 8"
                      className={inputCls}
                    />
                    {errors.societyName && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.societyName}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>
                      Registered Legal Name *
                    </label>
                    <input
                      type="text"
                      value={form.registeredName}
                      onChange={(e) =>
                        setField('registeredName', e.target.value)
                      }
                      placeholder="Name as on NOC / SECP certificate"
                      className={inputCls}
                    />
                    {errors.registeredName && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.registeredName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelCls}>City *</label>
                    <select
                      value={form.city}
                      onChange={(e) => setField('city', e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Select city</option>
                      {PAKISTAN_CITIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    {errors.city && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.city}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Area / Locality *</label>
                    <input
                      type="text"
                      value={form.areaName}
                      onChange={(e) => setField('areaName', e.target.value)}
                      placeholder="e.g. Raiwind Road, Murree Expressway"
                      className={inputCls}
                    />
                    {errors.areaName && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.areaName}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Full Address *</label>
                  <textarea
                    value={form.fullAddress}
                    onChange={(e) => setField('fullAddress', e.target.value)}
                    rows={2}
                    placeholder="Complete office or project address"
                    className={inputCls}
                  />
                  {errors.fullAddress && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.fullAddress}
                    </p>
                  )}
                </div>

                <div>
                  <label className={labelCls}>Approving Authority *</label>
                  <select
                    value={form.authority}
                    onChange={(e) =>
                      setField('authority', e.target.value as SocietyAuthority)
                    }
                    className={inputCls}
                  >
                    <option value="">Select authority</option>
                    {AUTHORITIES.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                  {errors.authority && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.authority}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className={labelCls}>NOC Number *</label>
                    <input
                      type="text"
                      value={form.nocNumber}
                      onChange={(e) => setField('nocNumber', e.target.value)}
                      placeholder="e.g. LDA/NOC/2019/1234"
                      className={inputCls}
                    />
                    {errors.nocNumber && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.nocNumber}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>
                      NOC Issuance Date {optionalBadge}
                    </label>
                    <input
                      type="date"
                      value={form.nocIssuanceDate}
                      onChange={(e) =>
                        setField('nocIssuanceDate', e.target.value)
                      }
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>
                      NOC Expiry Date {optionalBadge}
                    </label>
                    <input
                      type="date"
                      value={form.nocExpiryDate}
                      onChange={(e) =>
                        setField('nocExpiryDate', e.target.value)
                      }
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelCls}>
                      Total Area (Acres) {optionalBadge}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.totalAreaAcres}
                      onChange={(e) =>
                        setField('totalAreaAcres', e.target.value)
                      }
                      placeholder="e.g. 500"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>
                      Launch Year {optionalBadge}
                    </label>
                    <input
                      type="number"
                      min="1950"
                      max="2100"
                      value={form.launchYear}
                      onChange={(e) => setField('launchYear', e.target.value)}
                      placeholder="e.g. 2018"
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2 — Authorized Person ── */}
          {step === 2 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 border-b border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-[#029bba]/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-[#029bba]" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-sm">
                    Authorized Person
                  </h2>
                  <p className="text-xs text-gray-500">
                    KYC details of the authorized representative — encrypted
                    &amp; never shown publicly
                  </p>
                </div>
              </div>
              <div className="p-6 space-y-5">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    The authorized person&apos;s CNIC is encrypted using
                    AES-256-GCM and stored securely. It is only accessible to
                    Highrise compliance officers during verification and is
                    never shared publicly.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelCls}>Full Name *</label>
                    <input
                      type="text"
                      value={form.authorizedPersonName}
                      onChange={(e) =>
                        setField('authorizedPersonName', e.target.value)
                      }
                      placeholder="As on CNIC"
                      className={inputCls}
                    />
                    {errors.authorizedPersonName && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.authorizedPersonName}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Designation *</label>
                    <input
                      type="text"
                      value={form.authorizedPersonDesignation}
                      onChange={(e) =>
                        setField(
                          'authorizedPersonDesignation',
                          e.target.value
                        )
                      }
                      placeholder="e.g. Chairman, CEO, Director"
                      className={inputCls}
                    />
                    {errors.authorizedPersonDesignation && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.authorizedPersonDesignation}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className={labelCls}>CNIC Number *</label>
                  <input
                    type="text"
                    value={form.authorizedPersonCnic}
                    onChange={(e) =>
                      setField('authorizedPersonCnic', e.target.value)
                    }
                    placeholder="42101-1234567-1"
                    maxLength={15}
                    className={inputCls}
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Format: 42101-1234567-1
                  </p>
                  {errors.authorizedPersonCnic && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.authorizedPersonCnic}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelCls}>Mobile Number *</label>
                    <input
                      type="tel"
                      value={form.authorizedPersonPhone}
                      onChange={(e) =>
                        setField('authorizedPersonPhone', e.target.value)
                      }
                      placeholder="03XX-XXXXXXX"
                      className={inputCls}
                    />
                    {errors.authorizedPersonPhone && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.authorizedPersonPhone}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Email Address *</label>
                    <input
                      type="email"
                      value={form.authorizedPersonEmail}
                      onChange={(e) =>
                        setField('authorizedPersonEmail', e.target.value)
                      }
                      placeholder="authorized@society.com"
                      className={inputCls}
                    />
                    {errors.authorizedPersonEmail && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.authorizedPersonEmail}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3 — Contact & Location ── */}
          {step === 3 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 border-b border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-[#029bba]/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-[#029bba]" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-sm">
                    Contact &amp; Office Details
                  </h2>
                  <p className="text-xs text-gray-500">
                    Office contact — used internally by Highrise team only
                  </p>
                </div>
              </div>
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelCls}>Office Phone *</label>
                    <input
                      type="tel"
                      value={form.officePhone}
                      onChange={(e) =>
                        setField('officePhone', e.target.value)
                      }
                      placeholder="03XX-XXXXXXX"
                      className={inputCls}
                    />
                    {errors.officePhone && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.officePhone}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Office Email *</label>
                    <input
                      type="email"
                      value={form.officeEmail}
                      onChange={(e) =>
                        setField('officeEmail', e.target.value)
                      }
                      placeholder="info@society.com"
                      className={inputCls}
                    />
                    {errors.officeEmail && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.officeEmail}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>
                    Website URL {optionalBadge}
                  </label>
                  <input
                    type="url"
                    value={form.websiteUrl}
                    onChange={(e) => setField('websiteUrl', e.target.value)}
                    placeholder="https://www.yoursociety.com"
                    className={inputCls}
                  />
                  {errors.websiteUrl && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.websiteUrl}
                    </p>
                  )}
                </div>

                <div className="bg-[#eff6ff] border border-[#029bba]/20 rounded-xl p-4">
                  <p className="text-xs text-[#004063] flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#029bba]" />
                    <span>
                      <strong>Privacy Notice:</strong> Contact details are
                      never shown publicly. All buyer/investor inquiries go
                      through the Highrise.pk platform only.
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4 — Compliance & Legal ── */}
          {step === 4 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 border-b border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-[#029bba]/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#029bba]" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-sm">
                    Compliance &amp; Legal
                  </h2>
                  <p className="text-xs text-gray-500">
                    Tax, registration numbers, and banking details (all
                    optional but strengthen trust score)
                  </p>
                </div>
              </div>
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelCls}>
                      FBR NTN {optionalBadge}
                    </label>
                    <input
                      type="text"
                      value={form.fbrNtn}
                      onChange={(e) => setField('fbrNtn', e.target.value)}
                      placeholder="e.g. 1234567-8"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>
                      STRN (Sales Tax) {optionalBadge}
                    </label>
                    <input
                      type="text"
                      value={form.strn}
                      onChange={(e) => setField('strn', e.target.value)}
                      placeholder="Sales Tax Registration Number"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>
                    NTC Number {optionalBadge}
                  </label>
                  <input
                    type="text"
                    value={form.ntcNumber}
                    onChange={(e) => setField('ntcNumber', e.target.value)}
                    placeholder="National Telecommunication Corporation number"
                    className={inputCls}
                  />
                </div>

                <div className="border-t border-gray-100 pt-5">
                  <p className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-gray-500" />
                    Banking Details {optionalBadge}
                  </p>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className={labelCls}>Bank Name</label>
                        <input
                          type="text"
                          value={form.bankName}
                          onChange={(e) =>
                            setField('bankName', e.target.value)
                          }
                          placeholder="e.g. HBL, MCB, Meezan Bank"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Account Title</label>
                        <input
                          type="text"
                          value={form.bankAccountTitle}
                          onChange={(e) =>
                            setField('bankAccountTitle', e.target.value)
                          }
                          placeholder="Account holder name"
                          className={inputCls}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>
                        IBAN {optionalBadge}
                      </label>
                      <input
                        type="text"
                        value={form.bankIban}
                        onChange={(e) =>
                          setField('bankIban', e.target.value)
                        }
                        placeholder="PK36SCBL0000001123456702"
                        maxLength={24}
                        className={inputCls}
                      />
                      <p className="mt-1 text-xs text-gray-400">
                        Format: PK + 2 digits + 4 letters + 16 digits
                      </p>
                      {errors.bankIban && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.bankIban}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 5 — Blocks & Phases ── */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#029bba]/10 flex items-center justify-center">
                      <Layers className="w-5 h-5 text-[#029bba]" />
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-900 text-sm">
                        Blocks &amp; Phases
                      </h2>
                      <p className="text-xs text-gray-500">
                        Define your society&apos;s block / phase structure
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={addBlock}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#029bba] text-white text-xs font-semibold hover:bg-[#027a94] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Block
                  </button>
                </div>

                {errors.blocks && (
                  <div className="mx-6 mt-4">
                    <p className="text-xs text-red-600">{errors.blocks}</p>
                  </div>
                )}

                <div className="p-6 space-y-6">
                  {form.blocks.map((block, idx) => (
                    <div
                      key={block.id}
                      className="border border-gray-200 rounded-xl p-5 relative"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-semibold text-gray-700">
                          Block / Phase {idx + 1}
                        </span>
                        {form.blocks.length > 1 && (
                          <button
                            onClick={() => removeBlock(block.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-1">
                            <label className={labelCls}>Block Name *</label>
                            <input
                              type="text"
                              value={block.name}
                              onChange={(e) =>
                                updateBlock(block.id, 'name', e.target.value)
                              }
                              placeholder="e.g. Block A, Overseas Block"
                              className={inputCls}
                            />
                            {errors[`block_${idx}_name`] && (
                              <p className="mt-1 text-xs text-red-600">
                                {errors[`block_${idx}_name`]}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className={labelCls}>Total Plots *</label>
                            <input
                              type="number"
                              min="0"
                              value={block.totalPlots}
                              onChange={(e) =>
                                updateBlock(
                                  block.id,
                                  'totalPlots',
                                  e.target.value
                                )
                              }
                              placeholder="e.g. 500"
                              className={inputCls}
                            />
                            {errors[`block_${idx}_totalPlots`] && (
                              <p className="mt-1 text-xs text-red-600">
                                {errors[`block_${idx}_totalPlots`]}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className={labelCls}>
                              Available Plots
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={block.availablePlots}
                              onChange={(e) =>
                                updateBlock(
                                  block.id,
                                  'availablePlots',
                                  e.target.value
                                )
                              }
                              placeholder="e.g. 120"
                              className={inputCls}
                            />
                          </div>
                        </div>

                        <div>
                          <label className={labelCls}>
                            Plot Sizes Offered *
                          </label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {PLOT_SIZES.map((ps) => {
                              const active = block.plotSizes.includes(ps.value);
                              return (
                                <button
                                  key={ps.value}
                                  type="button"
                                  onClick={() =>
                                    toggleBlockPlotSize(block.id, ps.value)
                                  }
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                                    active
                                      ? 'bg-[#029bba] text-white border-[#029bba]'
                                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#029bba] hover:text-[#029bba]'
                                  }`}
                                >
                                  {ps.label}
                                </button>
                              );
                            })}
                          </div>
                          {errors[`block_${idx}_plotSizes`] && (
                            <p className="mt-1 text-xs text-red-600">
                              {errors[`block_${idx}_plotSizes`]}
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className={labelCls}>
                              Possession Status
                            </label>
                            <select
                              value={block.possessionStatus}
                              onChange={(e) =>
                                updateBlock(
                                  block.id,
                                  'possessionStatus',
                                  e.target.value as PossessionStatus
                                )
                              }
                              className={inputCls}
                            >
                              <option value="announced">Announced</option>
                              <option value="under_development">
                                Under Development
                              </option>
                              <option value="ready">Ready</option>
                            </select>
                          </div>
                          <div>
                            <label className={labelCls}>
                              Launch Year {optionalBadge}
                            </label>
                            <input
                              type="number"
                              min="1990"
                              max="2100"
                              value={block.launchYear}
                              onChange={(e) =>
                                updateBlock(
                                  block.id,
                                  'launchYear',
                                  e.target.value
                                )
                              }
                              placeholder="e.g. 2020"
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>
                              Completion Year {optionalBadge}
                            </label>
                            <input
                              type="number"
                              min="1990"
                              max="2100"
                              value={block.completionYear}
                              onChange={(e) =>
                                updateBlock(
                                  block.id,
                                  'completionYear',
                                  e.target.value
                                )
                              }
                              placeholder="e.g. 2025"
                              className={inputCls}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 6 — Plot Inventory ── */}
          {step === 6 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#029bba]/10 flex items-center justify-center">
                    <LayoutGrid className="w-5 h-5 text-[#029bba]" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900 text-sm">
                      Plot Inventory &amp; Pricing
                    </h2>
                    <p className="text-xs text-gray-500">
                      Overall inventory count and pricing per size
                    </p>
                  </div>
                </div>
                <button
                  onClick={addPlotInventory}
                  disabled={form.plotInventory.length >= 20}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#029bba] text-white text-xs font-semibold hover:bg-[#027a94] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Size
                </button>
              </div>

              {errors.plotInventory && (
                <div className="mx-6 mt-4">
                  <p className="text-xs text-red-600">{errors.plotInventory}</p>
                </div>
              )}

              <div className="p-6 space-y-4">
                {form.plotInventory.map((inv, idx) => (
                  <div
                    key={inv.id}
                    className="border border-gray-200 rounded-xl p-4 relative"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-700">
                        Plot Size {idx + 1}
                      </span>
                      {form.plotInventory.length > 1 && (
                        <button
                          onClick={() => removePlotInventory(inv.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="col-span-2 md:col-span-1">
                        <label className={labelCls}>Size *</label>
                        <select
                          value={inv.size}
                          onChange={(e) =>
                            updatePlotInventory(
                              inv.id,
                              'size',
                              e.target.value as PlotSize
                            )
                          }
                          className={inputCls}
                        >
                          {PLOT_SIZES.map((ps) => (
                            <option key={ps.value} value={ps.value}>
                              {ps.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Total *</label>
                        <input
                          type="number"
                          min="0"
                          value={inv.totalPlots}
                          onChange={(e) =>
                            updatePlotInventory(
                              inv.id,
                              'totalPlots',
                              e.target.value
                            )
                          }
                          placeholder="500"
                          className={inputCls}
                        />
                        {errors[`plot_${idx}_totalPlots`] && (
                          <p className="mt-1 text-xs text-red-600">
                            {errors[`plot_${idx}_totalPlots`]}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className={labelCls}>Available *</label>
                        <input
                          type="number"
                          min="0"
                          value={inv.availablePlots}
                          onChange={(e) =>
                            updatePlotInventory(
                              inv.id,
                              'availablePlots',
                              e.target.value
                            )
                          }
                          placeholder="120"
                          className={inputCls}
                        />
                        {errors[`plot_${idx}_availablePlots`] && (
                          <p className="mt-1 text-xs text-red-600">
                            {errors[`plot_${idx}_availablePlots`]}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className={labelCls}>
                          Price/Marla {optionalBadge}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={inv.pricePerMarla}
                          onChange={(e) =>
                            updatePlotInventory(
                              inv.id,
                              'pricePerMarla',
                              e.target.value
                            )
                          }
                          placeholder="PKR"
                          className={inputCls}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 7 — Amenities & Installment Plans ── */}
          {step === 7 && (
            <div className="space-y-6">
              {/* Amenities */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <div className="w-9 h-9 rounded-xl bg-[#029bba]/10 flex items-center justify-center">
                    <Home className="w-5 h-5 text-[#029bba]" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900 text-sm">
                      Amenities
                    </h2>
                    <p className="text-xs text-gray-500">
                      Select all facilities available in your society
                    </p>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {AMENITIES.map((a) => {
                      const active = form.amenities.includes(a.key);
                      return (
                        <button
                          key={a.key}
                          type="button"
                          onClick={() => toggleAmenity(a.key)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all border text-left ${
                            active
                              ? 'bg-[#029bba]/10 border-[#029bba] text-[#029bba]'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          <span className="text-base leading-none">
                            {a.emoji}
                          </span>
                          <span>{a.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {form.amenities.length > 0 && (
                    <p className="mt-3 text-xs text-gray-500">
                      {form.amenities.length} amenit
                      {form.amenities.length === 1 ? 'y' : 'ies'} selected
                    </p>
                  )}
                </div>
              </div>

              {/* Installment Plans */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#029bba]/10 flex items-center justify-center">
                      <Banknote className="w-5 h-5 text-[#029bba]" />
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-900 text-sm">
                        Installment Plans {optionalBadge}
                      </h2>
                      <p className="text-xs text-gray-500">
                        Add payment plans offered to buyers
                      </p>
                    </div>
                  </div>
                  {form.installmentPlans.length < 10 && (
                    <button
                      onClick={addPlan}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#029bba] text-white text-xs font-semibold hover:bg-[#027a94] transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Plan
                    </button>
                  )}
                </div>

                <div className="p-6">
                  {form.installmentPlans.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Banknote className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">
                        No installment plans added yet
                      </p>
                      <p className="text-xs mt-1">
                        Optional — add plans if your society offers
                        installment payment options
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {form.installmentPlans.map((plan, idx) => (
                        <div
                          key={plan.id}
                          className="border border-gray-200 rounded-xl p-5"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-semibold text-gray-700">
                              Plan {idx + 1}
                            </span>
                            <button
                              onClick={() => removePlan(plan.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="md:col-span-1">
                                <label className={labelCls}>Plan Name *</label>
                                <input
                                  type="text"
                                  value={plan.planName}
                                  onChange={(e) =>
                                    updatePlan(
                                      plan.id,
                                      'planName',
                                      e.target.value
                                    )
                                  }
                                  placeholder="e.g. 3-Year Easy Plan"
                                  className={inputCls}
                                />
                              </div>
                              <div>
                                <label className={labelCls}>
                                  Duration (months) *
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  max="360"
                                  value={plan.durationMonths}
                                  onChange={(e) =>
                                    updatePlan(
                                      plan.id,
                                      'durationMonths',
                                      e.target.value
                                    )
                                  }
                                  placeholder="36"
                                  className={inputCls}
                                />
                              </div>
                              <div>
                                <label className={labelCls}>
                                  Down Payment % *
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.5"
                                  value={plan.downPaymentPercent}
                                  onChange={(e) =>
                                    updatePlan(
                                      plan.id,
                                      'downPaymentPercent',
                                      e.target.value
                                    )
                                  }
                                  placeholder="25"
                                  className={inputCls}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <label className={labelCls}>Monthly %</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.5"
                                  value={plan.monthlyInstallmentPercent}
                                  onChange={(e) =>
                                    updatePlan(
                                      plan.id,
                                      'monthlyInstallmentPercent',
                                      e.target.value
                                    )
                                  }
                                  placeholder="5"
                                  className={inputCls}
                                />
                              </div>
                              <div>
                                <label className={labelCls}>Quarterly %</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.5"
                                  value={plan.quarterlyInstallmentPercent}
                                  onChange={(e) =>
                                    updatePlan(
                                      plan.id,
                                      'quarterlyInstallmentPercent',
                                      e.target.value
                                    )
                                  }
                                  placeholder="15"
                                  className={inputCls}
                                />
                              </div>
                              <div>
                                <label className={labelCls}>
                                  Half-Yearly %
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.5"
                                  value={plan.halfYearlyInstallmentPercent}
                                  onChange={(e) =>
                                    updatePlan(
                                      plan.id,
                                      'halfYearlyInstallmentPercent',
                                      e.target.value
                                    )
                                  }
                                  placeholder="30"
                                  className={inputCls}
                                />
                              </div>
                              <div>
                                <label className={labelCls}>Balloon %</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.5"
                                  value={plan.balloonPaymentPercent}
                                  onChange={(e) =>
                                    updatePlan(
                                      plan.id,
                                      'balloonPaymentPercent',
                                      e.target.value
                                    )
                                  }
                                  placeholder="10"
                                  className={inputCls}
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                id={`interestFree_${plan.id}`}
                                checked={plan.isInterestFree}
                                onChange={(e) =>
                                  updatePlan(
                                    plan.id,
                                    'isInterestFree',
                                    e.target.checked
                                  )
                                }
                                className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                              />
                              <label
                                htmlFor={`interestFree_${plan.id}`}
                                className="text-sm text-gray-700"
                              >
                                Interest-free / Shari&apos;ah-compliant plan
                              </label>
                            </div>
                            <div>
                              <label className={labelCls}>
                                Additional Notes {optionalBadge}
                              </label>
                              <textarea
                                value={plan.notes}
                                onChange={(e) =>
                                  updatePlan(plan.id, 'notes', e.target.value)
                                }
                                rows={2}
                                placeholder="Any terms, conditions, or notes about this plan"
                                className={inputCls}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 8 — Documents & Consent ── */}
          {step === 8 && (
            <div className="space-y-6">
              {/* Document uploads */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#029bba]/10 flex items-center justify-center">
                      <Upload className="w-5 h-5 text-[#029bba]" />
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-900 text-sm">
                        KYC Documents
                      </h2>
                      <p className="text-xs text-gray-500">
                        Upload NOC certificate, layout plan, and other
                        compliance documents
                      </p>
                    </div>
                  </div>
                  {form.kycDocuments.length < 20 && (
                    <button
                      onClick={addDocument}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#029bba] text-white text-xs font-semibold hover:bg-[#027a94] transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Document
                    </button>
                  )}
                </div>

                <div className="p-6 space-y-5">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-800 space-y-1">
                      <p className="font-semibold">Required Documents:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        <li>NOC Certificate (mandatory)</li>
                        <li>Layout Plan approved by authority</li>
                        <li>Master Plan (if available)</li>
                        <li>Authority approval letter</li>
                      </ul>
                      <p className="mt-2">
                        Documents are stored in Cloudinary private storage
                        and are only accessible to Highrise compliance team.
                      </p>
                    </div>
                  </div>

                  {errors.kycDocuments && (
                    <p className="text-xs text-red-600">
                      {errors.kycDocuments}
                    </p>
                  )}

                  {form.kycDocuments.map((doc, idx) => (
                    <div
                      key={doc.id}
                      className="border border-gray-200 rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-gray-700">
                          Document {idx + 1}
                        </span>
                        {form.kycDocuments.length > 1 && (
                          <button
                            onClick={() => removeDocument(doc.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className={labelCls}>Document Type *</label>
                            <select
                              value={doc.type}
                              onChange={(e) =>
                                updateDocument(
                                  doc.id,
                                  'type',
                                  e.target.value as DocumentType
                                )
                              }
                              className={inputCls}
                            >
                              {DOCUMENT_TYPES.map((dt) => (
                                <option key={dt.value} value={dt.value}>
                                  {dt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className={labelCls}>Document Title *</label>
                            <input
                              type="text"
                              value={doc.title}
                              onChange={(e) =>
                                updateDocument(doc.id, 'title', e.target.value)
                              }
                              placeholder="e.g. LDA NOC Certificate 2019"
                              className={inputCls}
                            />
                          </div>
                        </div>

                        {doc.url ? (
                          <div className="flex items-center gap-3 p-3 bg-[#f0fdf4] border border-[#10b981]/20 rounded-xl">
                            <CheckCircle className="w-4 h-4 text-[#10b981] shrink-0" />
                            <span className="text-xs text-gray-700 flex-1 truncate">
                              Document uploaded successfully
                            </span>
                            <button
                              onClick={() => {
                                updateDocument(doc.id, 'url', '');
                                updateDocument(doc.id, 'title', '');
                              }}
                              className="text-xs text-red-500 hover:text-red-700 transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <div>
                            <label className="flex items-center justify-center gap-2 w-full px-4 py-6 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[#029bba] hover:bg-[#029bba]/5 transition-all group">
                              {doc.uploading ? (
                                <Loader2 className="w-5 h-5 text-[#029bba] animate-spin" />
                              ) : (
                                <Upload className="w-5 h-5 text-gray-400 group-hover:text-[#029bba] transition-colors" />
                              )}
                              <span className="text-sm text-gray-500 group-hover:text-[#029bba] transition-colors">
                                {doc.uploading
                                  ? 'Uploading...'
                                  : 'Click to upload PDF or image'}
                              </span>
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png,.webp"
                                disabled={doc.uploading}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) void uploadDocument(doc.id, file);
                                }}
                              />
                            </label>
                            {doc.error && (
                              <p className="mt-1 text-xs text-red-600">
                                {doc.error}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Consent */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <div className="w-9 h-9 rounded-xl bg-[#029bba]/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-[#029bba]" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900 text-sm">
                      Declaration &amp; Consent
                    </h2>
                  </div>
                </div>
                <div className="p-6 space-y-5">
                  <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600 space-y-2 leading-relaxed">
                    <p className="font-semibold text-gray-800">
                      By submitting this application, I declare that:
                    </p>
                    <ul className="list-disc list-inside space-y-1.5">
                      <li>
                        All information provided is accurate and truthful to
                        the best of my knowledge
                      </li>
                      <li>
                        The society holds a valid NOC from the stated
                        authority
                      </li>
                      <li>
                        I am an authorized representative of the society with
                        legal capacity to submit this application
                      </li>
                      <li>
                        I consent to Highrise.pk verifying the provided
                        documents with relevant authorities
                      </li>
                      <li>
                        I understand that providing false information may
                        result in permanent account suspension and legal
                        action
                      </li>
                      <li>
                        I agree to Highrise.pk&apos;s{' '}
                        <a
                          href="/terms"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#029bba] underline"
                        >
                          Terms of Service
                        </a>{' '}
                        and{' '}
                        <a
                          href="/privacy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#029bba] underline"
                        >
                          Privacy Policy
                        </a>
                      </li>
                    </ul>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={form.consentGiven}
                      onChange={(e) =>
                        setField('consentGiven', e.target.checked)
                      }
                      className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                      I confirm that all information is accurate and I accept
                      the terms of service and privacy policy of Highrise.pk.
                    </span>
                  </label>
                  {errors.consentGiven && (
                    <p className="text-xs text-red-600">
                      {errors.consentGiven}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>
                      Review time: <strong>2–3 business days</strong>. You
                      will receive an email at{' '}
                      <strong>{session?.user?.email}</strong> once reviewed.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Navigation buttons ── */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={goBack}
              disabled={step === 1}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>
                Step {step} of {STEPS.length}
              </span>
            </div>

            {step < STEPS.length ? (
              <button
                onClick={goNext}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#029bba] text-white text-sm font-semibold hover:bg-[#027a94] transition-colors shadow-sm"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => void handleSubmit()}
                disabled={submitting || !form.consentGiven}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#029bba] text-white text-sm font-semibold hover:bg-[#027a94] transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Submit Application
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}