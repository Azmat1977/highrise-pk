// pages/admin/societies/new.tsx
import React, { useState, useCallback, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import {
  Shield, ArrowLeft, Save, Loader2, X, CheckCircle, XCircle,
  AlertTriangle, Info, Upload, Plus, MapPin,
  Building2, Award, Globe, FileText, Image as ImageIcon,
  Eye, EyeOff, BadgeCheck, Star, ChevronDown, ChevronUp,
  Activity, Lightbulb,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';

// ─── Types ────────────────────────────────────────────────────────────────────

type NOCStatus = 'approved' | 'pending' | 'under_review' | 'illegal' | 'disputed' | 'cancelled' | 'expired';
type Authority = 'LDA' | 'CDA' | 'RDA' | 'KDA' | 'FDA' | 'MDA' | 'GDA' | 'DHA' | 'PHATA' | 'NHA' | 'NADRA' | 'Other';
type Category = 'housing_scheme' | 'gated_community' | 'apartment_complex' | 'commercial_zone' | 'mixed_use' | 'industrial_zone' | 'township';
type LitigationStatus = 'none' | 'active' | 'resolved';

interface FormState {
  // Core
  name: string;
  alternateNames: string[];
  category: Category;
  description: string;

  // Location
  city: string;
  areaName: string;
  fullAddress: string;
  longitude: string;
  latitude: string;

  // Legal
  nocStatus: NOCStatus;
  nocNumber: string;
  nocDate: string;
  nocExpiryDate: string;
  approvalAuthority: Authority;
  developmentAuthority: string;
  registrationNo: string;
  litigationStatus: LitigationStatus;
  litigationNote: string;

  // Developer
  developerName: string;
  developerWebsite: string;

  // Stats
  totalPlots: string;
  totalPhases: string;
  launchYear: string;
  expectedCompletionYear: string;
  possessionPercentage: string;

  // Scores (admin overrides)
  growthScore: string;
  possessionScore: string;

  // Infrastructure (0-100 each)
  infra_electricity: string;
  infra_gas: string;
  infra_water: string;
  infra_sewerage: string;
  infra_internet: string;
  infra_roads: string;

  // Livability (0-100 each)
  liva_schools: string;
  liva_hospitals: string;
  liva_markets: string;
  liva_transport: string;
  liva_security: string;
  liva_parks: string;

  // Media
  featuredImage: string;
  images: string[];

  // Platform
  isVerifiedByHighrise: boolean;
  isPublished: boolean;
  isFeatured: boolean;

  // SEO
  seoTitle: string;
  seoDescription: string;
}

type BannerType = 'success' | 'error' | 'info';

interface Banner {
  type: BannerType;
  message: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CITIES = [
  'Lahore', 'Islamabad', 'Karachi', 'Rawalpindi', 'Faisalabad',
  'Multan', 'Peshawar', 'Quetta', 'Gujranwala', 'Sialkot',
  'Bahawalpur', 'Sargodha', 'Sukkur', 'Larkana', 'Sheikhupura',
  'Mardan', 'Mirpur', 'Hyderabad', 'Gwadar', 'Other',
];

const AUTHORITIES: { id: Authority; label: string; description: string }[] = [
  { id: 'LDA', label: 'LDA', description: 'Lahore Development Authority' },
  { id: 'CDA', label: 'CDA', description: 'Capital Development Authority (Islamabad)' },
  { id: 'RDA', label: 'RDA', description: 'Rawalpindi Development Authority' },
  { id: 'KDA', label: 'KDA', description: 'Karachi Development Authority' },
  { id: 'FDA', label: 'FDA', description: 'Faisalabad Development Authority' },
  { id: 'MDA', label: 'MDA', description: 'Multan Development Authority' },
  { id: 'GDA', label: 'GDA', description: 'Gwadar Development Authority' },
  { id: 'DHA', label: 'DHA', description: 'Defence Housing Authority' },
  { id: 'PHATA', label: 'PHATA', description: 'Punjab Housing & Town Planning Agency' },
  { id: 'NHA', label: 'NHA', description: 'National Highway Authority' },
  { id: 'NADRA', label: 'NADRA', description: 'National Database & Registration Authority' },
  { id: 'Other', label: 'Other', description: 'Specify in dev authority field' },
];

const CATEGORIES: { id: Category; label: string; description: string }[] = [
  { id: 'housing_scheme', label: 'Housing Scheme', description: 'Standard residential scheme' },
  { id: 'gated_community', label: 'Gated Community', description: 'Premium gated society' },
  { id: 'apartment_complex', label: 'Apartment Complex', description: 'High-rise apartments' },
  { id: 'commercial_zone', label: 'Commercial Zone', description: 'Business district' },
  { id: 'mixed_use', label: 'Mixed Use', description: 'Residential + commercial' },
  { id: 'industrial_zone', label: 'Industrial Zone', description: 'Factory/warehouse area' },
  { id: 'township', label: 'Township', description: 'Self-contained mega project' },
];

const INITIAL_FORM: FormState = {
  name: '',
  alternateNames: [],
  category: 'housing_scheme',
  description: '',
  city: '',
  areaName: '',
  fullAddress: '',
  longitude: '',
  latitude: '',
  nocStatus: 'pending',
  nocNumber: '',
  nocDate: '',
  nocExpiryDate: '',
  approvalAuthority: 'LDA',
  developmentAuthority: '',
  registrationNo: '',
  litigationStatus: 'none',
  litigationNote: '',
  developerName: '',
  developerWebsite: '',
  totalPlots: '',
  totalPhases: '',
  launchYear: '',
  expectedCompletionYear: '',
  possessionPercentage: '',
  growthScore: '50',
  possessionScore: '0',
  infra_electricity: '0',
  infra_gas: '0',
  infra_water: '0',
  infra_sewerage: '0',
  infra_internet: '0',
  infra_roads: '0',
  liva_schools: '0',
  liva_hospitals: '0',
  liva_markets: '0',
  liva_transport: '0',
  liva_security: '0',
  liva_parks: '0',
  featuredImage: '',
  images: [],
  isVerifiedByHighrise: false,
  isPublished: false,
  isFeatured: false,
  seoTitle: '',
  seoDescription: '',
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NewSocietyPage(): React.ReactElement {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [altNameInput, setAltNameInput] = useState('');
  const [uploadingFeature, setUploadingFeature] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    core: false,
    location: false,
    legal: false,
    developer: true,
    stats: true,
    scores: true,
    media: false,
    platform: false,
    seo: true,
  });

  const featuredFileRef = useRef<HTMLInputElement>(null);
  const galleryFileRef = useRef<HTMLInputElement>(null);

  // ─── Auth Guard ──────────────────────────────────────────────────────────

  React.useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user) {
      router.replace('/login?redirect=/admin/societies/new');
      return;
    }
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== 'admin') {
      router.replace('/');
    }
  }, [session, status, router]);

  // Auto-clear banner
  React.useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), 5000);
    return () => clearTimeout(timer);
  }, [banner]);

  // ─── Field Updaters ──────────────────────────────────────────────────────

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear field error on change
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field as string];
      return next;
    });
  };

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleAddAltName = () => {
    const name = altNameInput.trim();
    if (!name) return;
    if (form.alternateNames.includes(name)) {
      setBanner({ type: 'error', message: 'Alternate name already added' });
      return;
    }
    if (form.alternateNames.length >= 10) {
      setBanner({ type: 'error', message: 'Maximum 10 alternate names allowed' });
      return;
    }
    updateField('alternateNames', [...form.alternateNames, name]);
    setAltNameInput('');
  };

  const handleRemoveAltName = (idx: number) => {
    updateField('alternateNames', form.alternateNames.filter((_, i) => i !== idx));
  };

  // ─── File Uploads ────────────────────────────────────────────────────────

  const uploadFile = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setBanner({ type: 'error', message: data?.error || 'Upload failed' });
        return null;
      }
      // Try common response shapes
      return data.data?.url || data.url || data.secure_url || null;
    } catch {
      setBanner({ type: 'error', message: 'Upload failed due to network error' });
      return null;
    }
  };

  const handleFeaturedUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setBanner({ type: 'error', message: 'Image size must be under 5MB' });
      return;
    }
    if (!file.type.startsWith('image/')) {
      setBanner({ type: 'error', message: 'Only image files allowed' });
      return;
    }

    setUploadingFeature(true);
    const url = await uploadFile(file);
    setUploadingFeature(false);

    if (url) {
      updateField('featuredImage', url);
      setBanner({ type: 'success', message: 'Featured image uploaded' });
    }

    if (featuredFileRef.current) featuredFileRef.current.value = '';
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (form.images.length + files.length > 20) {
      setBanner({ type: 'error', message: 'Maximum 20 gallery images allowed' });
      return;
    }

    setUploadingGallery(true);
    const uploadedUrls: string[] = [];

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        setBanner({ type: 'error', message: `Skipped ${file.name}: over 5MB` });
        continue;
      }
      if (!file.type.startsWith('image/')) continue;

      const url = await uploadFile(file);
      if (url) uploadedUrls.push(url);
    }

    setUploadingGallery(false);

    if (uploadedUrls.length > 0) {
      updateField('images', [...form.images, ...uploadedUrls]);
      setBanner({ type: 'success', message: `${uploadedUrls.length} image(s) uploaded` });
    }

    if (galleryFileRef.current) galleryFileRef.current.value = '';
  };

  const handleRemoveGalleryImage = (idx: number) => {
    updateField('images', form.images.filter((_, i) => i !== idx));
  };

  // ─── Submit ──────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setBanner(null);
      setFieldErrors({});

      // Client-side basic validation
      if (!form.name.trim() || form.name.trim().length < 2) {
        setBanner({ type: 'error', message: 'Society name is required (min 2 characters)' });
        return;
      }
      if (!form.city.trim()) {
        setBanner({ type: 'error', message: 'City is required' });
        return;
      }
      if (!form.areaName.trim()) {
        setBanner({ type: 'error', message: 'Area name is required' });
        return;
      }

      setSubmitting(true);

      // Build payload — strip empty optional fields
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        category: form.category,
        city: form.city.trim(),
        areaName: form.areaName.trim(),
        nocStatus: form.nocStatus,
        approvalAuthority: form.approvalAuthority,
        litigationStatus: form.litigationStatus,
        isVerifiedByHighrise: form.isVerifiedByHighrise,
        isPublished: form.isPublished,
        isFeatured: form.isFeatured,
      };

      // Optional fields
      if (form.alternateNames.length > 0) payload.alternateNames = form.alternateNames;
      if (form.description.trim()) payload.description = form.description.trim();
      if (form.fullAddress.trim()) payload.fullAddress = form.fullAddress.trim();

      const lng = parseFloat(form.longitude);
      const lat = parseFloat(form.latitude);
      if (!isNaN(lng) && !isNaN(lat)) {
        payload.coordinates = { longitude: lng, latitude: lat };
      }

      if (form.nocNumber.trim()) payload.nocNumber = form.nocNumber.trim();
      if (form.nocDate) payload.nocDate = new Date(form.nocDate).toISOString();
      if (form.nocExpiryDate) payload.nocExpiryDate = new Date(form.nocExpiryDate).toISOString();
      if (form.developmentAuthority.trim()) payload.developmentAuthority = form.developmentAuthority.trim();
      if (form.registrationNo.trim()) payload.registrationNo = form.registrationNo.trim();
      if (form.litigationNote.trim()) payload.litigationNote = form.litigationNote.trim();

      if (form.developerName.trim()) payload.developerName = form.developerName.trim();
      if (form.developerWebsite.trim()) payload.developerWebsite = form.developerWebsite.trim();

      const parseIntSafe = (v: string): number | undefined => {
        const n = parseInt(v, 10);
        return isNaN(n) ? undefined : n;
      };
      const parseFloatSafe = (v: string): number | undefined => {
        const n = parseFloat(v);
        return isNaN(n) ? undefined : n;
      };

      const totalPlots = parseIntSafe(form.totalPlots);
      if (totalPlots !== undefined) payload.totalPlots = totalPlots;
      const totalPhases = parseIntSafe(form.totalPhases);
      if (totalPhases !== undefined) payload.totalPhases = totalPhases;
      const launchYear = parseIntSafe(form.launchYear);
      if (launchYear !== undefined) payload.launchYear = launchYear;
      const expectedCompletionYear = parseIntSafe(form.expectedCompletionYear);
      if (expectedCompletionYear !== undefined) payload.expectedCompletionYear = expectedCompletionYear;
      const possessionPercentage = parseFloatSafe(form.possessionPercentage);
      if (possessionPercentage !== undefined) payload.possessionPercentage = possessionPercentage;

      // Scores
      const growth = parseIntSafe(form.growthScore);
      const possession = parseIntSafe(form.possessionScore);
      if (growth !== undefined || possession !== undefined) {
        payload.scores = {};
        if (growth !== undefined) (payload.scores as Record<string, number>).growth = growth;
        if (possession !== undefined) (payload.scores as Record<string, number>).possession = possession;
      }

      // Infrastructure
      const infrastructureDetails: Record<string, number> = {};
      ['electricity', 'gas', 'water', 'sewerage', 'internet', 'roads'].forEach((key) => {
        const v = parseIntSafe(form[`infra_${key}` as keyof FormState] as string);
        if (v !== undefined) infrastructureDetails[key] = v;
      });
      if (Object.keys(infrastructureDetails).length > 0) {
        payload.infrastructureDetails = infrastructureDetails;
      }

      // Livability
      const livabilityDetails: Record<string, number> = {};
      ['schools', 'hospitals', 'markets', 'transport', 'security', 'parks'].forEach((key) => {
        const v = parseIntSafe(form[`liva_${key}` as keyof FormState] as string);
        if (v !== undefined) livabilityDetails[key] = v;
      });
      if (Object.keys(livabilityDetails).length > 0) {
        payload.livabilityDetails = livabilityDetails;
      }

      // Media
      if (form.featuredImage) payload.featuredImage = form.featuredImage;
      if (form.images.length > 0) payload.images = form.images;

      // SEO
      if (form.seoTitle.trim()) payload.seoTitle = form.seoTitle.trim();
      if (form.seoDescription.trim()) payload.seoDescription = form.seoDescription.trim();

      try {
        const res = await fetch('/api/admin/societies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          if (data.fieldErrors) {
            setFieldErrors(data.fieldErrors);
            setBanner({ type: 'error', message: data.error || 'Please fix the validation errors below' });
          } else {
            setBanner({ type: 'error', message: data.error || 'Failed to create society' });
          }
          return;
        }

        setBanner({ type: 'success', message: `${data.data.society.name} created successfully!` });

        // Redirect to edit page
        setTimeout(() => {
          router.push(`/admin/societies/${data.data.society._id}/edit`);
        }, 1500);
      } catch {
        setBanner({ type: 'error', message: 'Network error. Please try again.' });
      } finally {
        setSubmitting(false);
      }
    },
    [form, router]
  );

  // ─── Auth Loading State ──────────────────────────────────────────────────

  if (status === 'loading' || !session?.user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#029bba] animate-spin" />
      </div>
    );
  }

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-md p-8 max-w-md text-center">
          <Shield className="w-16 h-16 text-[#ef4444] mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">Admin privileges required.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Add New Society | Highrise Admin</title>
      </Head>

      <AdminLayout>
        <div className="p-6 max-w-5xl mx-auto">

          {/* ── HEADER ── */}
          <div className="mb-6">
            <Link href="/admin/societies">
              <button className="text-sm text-gray-600 hover:text-[#029bba] transition-colors inline-flex items-center gap-1 mb-3">
                <ArrowLeft className="w-4 h-4" />
                Back to Societies
              </button>
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Plus className="w-7 h-7 text-[#029bba]" />
              Add New Society
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              Add a new housing scheme, gated community, or commercial zone to the database
            </p>
          </div>

          {/* ── BANNER ── */}
          {banner && (
            <div
              className={`mb-6 rounded-xl border-l-4 p-4 flex items-start gap-3 ${
                banner.type === 'success'
                  ? 'bg-[#f0fdf4] border-[#10b981] text-[#10b981]'
                  : banner.type === 'error'
                  ? 'bg-[#fef2f2] border-[#ef4444] text-red-700'
                  : 'bg-[#eff6ff] border-[#029bba] text-[#004063]'
              }`}
            >
              {banner.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
              {banner.type === 'error' && <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
              {banner.type === 'info' && <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />}
              <span className="flex-1 text-sm font-medium">{banner.message}</span>
              <button
                onClick={() => setBanner(null)}
                className="opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── FORM ── */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* ── SECTION: Core Identity ── */}
            <FormSection
              title="Core Identity"
              icon={<Building2 className="w-5 h-5" />}
              description="Basic society information"
              isCollapsed={collapsedSections.core}
              onToggle={() => toggleSection('core')}
              required
            >
              <div className="space-y-4">
                <FormField label="Society Name" required error={fieldErrors.name}>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="e.g. DHA Phase 5"
                    maxLength={200}
                    className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none"
                  />
                  <FieldHint>Official name as registered with the authority</FieldHint>
                </FormField>

                <FormField label="Category" required error={fieldErrors.category}>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => updateField('category', c.id)}
                        className={`text-left p-3 rounded-xl border-2 transition-all ${
                          form.category === c.id
                            ? 'border-[#029bba] bg-[#029bba]/5'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="font-semibold text-gray-900 text-sm">{c.label}</div>
                        <div className="text-[11px] text-gray-500">{c.description}</div>
                      </button>
                    ))}
                  </div>
                </FormField>

                <FormField label="Alternate Names" optional>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={altNameInput}
                        onChange={(e) => setAltNameInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddAltName();
                          }
                        }}
                        placeholder="e.g. Urdu name, abbreviation"
                        className="flex-1 h-10 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddAltName}
                        disabled={!altNameInput.trim()}
                        className="px-4 h-10 rounded-xl bg-[#029bba] text-white text-sm font-semibold hover:bg-[#027a94] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" /> Add
                      </button>
                    </div>
                    {form.alternateNames.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {form.alternateNames.map((name, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm"
                          >
                            {name}
                            <button
                              type="button"
                              onClick={() => handleRemoveAltName(i)}
                              className="hover:text-[#ef4444]"
                              aria-label={`Remove ${name}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <FieldHint>Press Enter or Add. Max 10. Useful for search variations.</FieldHint>
                  </div>
                </FormField>

                <FormField label="Description" optional error={fieldErrors.description}>
                  <textarea
                    value={form.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="Brief description of the society — location, features, target market..."
                    rows={4}
                    maxLength={5000}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none resize-y"
                  />
                  <FieldHint>{form.description.length}/5000 characters</FieldHint>
                </FormField>
              </div>
            </FormSection>

            {/* ── SECTION: Location ── */}
            <FormSection
              title="Location"
              icon={<MapPin className="w-5 h-5" />}
              description="Where is this society located"
              isCollapsed={collapsedSections.location}
              onToggle={() => toggleSection('location')}
              required
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField label="City" required error={fieldErrors.city}>
                  <select
                    value={form.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none cursor-pointer bg-white"
                  >
                    <option value="">Select city...</option>
                    {CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Area / Locality" required error={fieldErrors.areaName}>
                  <input
                    type="text"
                    value={form.areaName}
                    onChange={(e) => updateField('areaName', e.target.value)}
                    placeholder="e.g. Raiwind Road"
                    maxLength={200}
                    className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none"
                  />
                </FormField>

                <div className="sm:col-span-2">
                  <FormField label="Full Address" optional>
                    <input
                      type="text"
                      value={form.fullAddress}
                      onChange={(e) => updateField('fullAddress', e.target.value)}
                      placeholder="e.g. Main Boulevard, Block A, Sector 7..."
                      maxLength={500}
                      className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none"
                    />
                  </FormField>
                </div>

                <FormField label="Longitude" optional>
                  <input
                    type="number"
                    step="any"
                    value={form.longitude}
                    onChange={(e) => updateField('longitude', e.target.value)}
                    placeholder="e.g. 74.3587"
                    className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none"
                  />
                  <FieldHint>From Google Maps URL (lng)</FieldHint>
                </FormField>

                <FormField label="Latitude" optional>
                  <input
                    type="number"
                    step="any"
                    value={form.latitude}
                    onChange={(e) => updateField('latitude', e.target.value)}
                    placeholder="e.g. 31.5204"
                    className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none"
                  />
                  <FieldHint>From Google Maps URL (lat)</FieldHint>
                </FormField>
              </div>
            </FormSection>

            {/* ── SECTION: Legal & NOC ── */}
            <FormSection
              title="Legal & NOC Information"
              icon={<Shield className="w-5 h-5" />}
              description="Approval authority and NOC status"
              isCollapsed={collapsedSections.legal}
              onToggle={() => toggleSection('legal')}
              required
            >
              <div className="space-y-4">
                <FormField label="NOC Status" required error={fieldErrors.nocStatus}>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['approved', 'pending', 'under_review', 'expired', 'illegal', 'disputed', 'cancelled'] as NOCStatus[]).map((s) => {
                      const isDanger = ['illegal', 'disputed', 'cancelled'].includes(s);
                      const isWarning = ['pending', 'under_review', 'expired'].includes(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => updateField('nocStatus', s)}
                          className={`px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all capitalize ${
                            form.nocStatus === s
                              ? s === 'approved'
                                ? 'border-[#10b981] bg-[#10b981]/10 text-[#10b981]'
                                : isDanger
                                ? 'border-[#ef4444] bg-[#ef4444]/10 text-[#ef4444]'
                                : 'border-[#f59e0b] bg-[#f59e0b]/10 text-[#92400e]'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {s.replace('_', ' ')}
                        </button>
                      );
                    })}
                  </div>
                </FormField>

                <FormField label="Approval Authority" required error={fieldErrors.approvalAuthority}>
                  <select
                    value={form.approvalAuthority}
                    onChange={(e) => updateField('approvalAuthority', e.target.value as Authority)}
                    className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none cursor-pointer bg-white"
                  >
                    {AUTHORITIES.map((a) => (
                      <option key={a.id} value={a.id}>{a.label} — {a.description}</option>
                    ))}
                  </select>
                </FormField>

                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField label="NOC Number" optional>
                    <input
                      type="text"
                      value={form.nocNumber}
                      onChange={(e) => updateField('nocNumber', e.target.value)}
                      placeholder="e.g. LDA/NOC/2024/1234"
                      maxLength={100}
                      className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none"
                    />
                  </FormField>

                  <FormField label="Registration Number" optional>
                    <input
                      type="text"
                      value={form.registrationNo}
                      onChange={(e) => updateField('registrationNo', e.target.value)}
                      placeholder="Official registration #"
                      maxLength={100}
                      className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none"
                    />
                  </FormField>

                  <FormField label="NOC Issue Date" optional>
                    <input
                      type="date"
                      value={form.nocDate}
                      onChange={(e) => updateField('nocDate', e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none"
                    />
                  </FormField>

                  <FormField label="NOC Expiry Date" optional>
                    <input
                      type="date"
                      value={form.nocExpiryDate}
                      onChange={(e) => updateField('nocExpiryDate', e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none"
                    />
                  </FormField>
                </div>

                <FormField label="Development Authority (Custom)" optional>
                  <input
                    type="text"
                    value={form.developmentAuthority}
                    onChange={(e) => updateField('developmentAuthority', e.target.value)}
                    placeholder="If 'Other' selected above, specify here"
                    maxLength={200}
                    className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none"
                  />
                </FormField>

                <FormField label="Litigation Status" required>
                  <div className="grid grid-cols-3 gap-2">
                    {(['none', 'active', 'resolved'] as LitigationStatus[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => updateField('litigationStatus', s)}
                        className={`px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all capitalize ${
                          form.litigationStatus === s
                            ? s === 'none'
                              ? 'border-[#10b981] bg-[#10b981]/10 text-[#10b981]'
                              : s === 'active'
                              ? 'border-[#ef4444] bg-[#ef4444]/10 text-[#ef4444]'
                              : 'border-[#f59e0b] bg-[#f59e0b]/10 text-[#92400e]'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </FormField>

                {form.litigationStatus !== 'none' && (
                  <FormField label="Litigation Note" optional>
                    <textarea
                      value={form.litigationNote}
                      onChange={(e) => updateField('litigationNote', e.target.value)}
                      placeholder="Brief note about the legal case..."
                      rows={2}
                      maxLength={2000}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none resize-y"
                    />
                  </FormField>
                )}
              </div>
            </FormSection>

            {/* ── SECTION: Developer ── */}
            <FormSection
              title="Developer Information"
              icon={<Award className="w-5 h-5" />}
              description="Owner / developer details"
              isCollapsed={collapsedSections.developer}
              onToggle={() => toggleSection('developer')}
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField label="Developer Name" optional>
                  <input
                    type="text"
                    value={form.developerName}
                    onChange={(e) => updateField('developerName', e.target.value)}
                    placeholder="e.g. Bahria Town Pvt Ltd"
                    maxLength={200}
                    className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none"
                  />
                </FormField>

                <FormField label="Developer Website" optional error={fieldErrors.developerWebsite}>
                  <input
                    type="url"
                    value={form.developerWebsite}
                    onChange={(e) => updateField('developerWebsite', e.target.value)}
                    placeholder="https://example.com"
                    maxLength={300}
                    className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none"
                  />
                </FormField>
              </div>
            </FormSection>

            {/* ── SECTION: Stats ── */}
            <FormSection
              title="Society Stats"
              icon={<Activity className="w-5 h-5" />}
              description="Plots, phases, timeline"
              isCollapsed={collapsedSections.stats}
              onToggle={() => toggleSection('stats')}
            >
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField label="Total Plots" optional>
                  <input
                    type="number"
                    min="0"
                    value={form.totalPlots}
                    onChange={(e) => updateField('totalPlots', e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none"
                  />
                </FormField>

                <FormField label="Total Phases" optional>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={form.totalPhases}
                    onChange={(e) => updateField('totalPhases', e.target.value)}
                    placeholder="e.g. 8"
                    className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none"
                  />
                </FormField>

                <FormField label="Possession %" optional>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.possessionPercentage}
                    onChange={(e) => updateField('possessionPercentage', e.target.value)}
                    placeholder="0-100"
                    className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none"
                  />
                  <FieldHint>On-ground development progress</FieldHint>
                </FormField>

                <FormField label="Launch Year" optional>
                  <input
                    type="number"
                    min="1900"
                    max="2100"
                    value={form.launchYear}
                    onChange={(e) => updateField('launchYear', e.target.value)}
                    placeholder="e.g. 2018"
                    className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none"
                  />
                </FormField>

                <FormField label="Expected Completion" optional>
                  <input
                    type="number"
                    min="1900"
                    max="2100"
                    value={form.expectedCompletionYear}
                    onChange={(e) => updateField('expectedCompletionYear', e.target.value)}
                    placeholder="e.g. 2028"
                    className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none"
                  />
                </FormField>
              </div>
            </FormSection>

            {/* ── SECTION: Intelligence Scores ── */}
            <FormSection
              title="Intelligence Scores"
              icon={<Activity className="w-5 h-5" />}
              description="Manual scores for growth and infrastructure (0-100)"
              isCollapsed={collapsedSections.scores}
              onToggle={() => toggleSection('scores')}
            >
              <div className="space-y-5">
                <div className="bg-[#eff6ff] border border-[#029bba]/30 rounded-xl p-3 text-xs text-[#004063] flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Auto-calculated:</strong> Legal score (from NOC + litigation), Infrastructure score, Livability score, and Overall composite — all calculated automatically when you save.
                    Only manually set Growth Score, Possession Score, and the sub-metrics below.
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <ScoreInput label="Growth Score" value={form.growthScore} onChange={(v) => updateField('growthScore', v)} hint="Investment potential" />
                  <ScoreInput label="Possession Score" value={form.possessionScore} onChange={(v) => updateField('possessionScore', v)} hint="On-ground development" />
                </div>

                <div>
                  <h4 className="text-sm font-bold text-gray-700 mb-3">Infrastructure Sub-metrics (0-100 each)</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <ScoreInput label="Electricity" value={form.infra_electricity} onChange={(v) => updateField('infra_electricity', v)} />
                    <ScoreInput label="Gas" value={form.infra_gas} onChange={(v) => updateField('infra_gas', v)} />
                    <ScoreInput label="Water" value={form.infra_water} onChange={(v) => updateField('infra_water', v)} />
                    <ScoreInput label="Sewerage" value={form.infra_sewerage} onChange={(v) => updateField('infra_sewerage', v)} />
                    <ScoreInput label="Internet" value={form.infra_internet} onChange={(v) => updateField('infra_internet', v)} />
                    <ScoreInput label="Roads" value={form.infra_roads} onChange={(v) => updateField('infra_roads', v)} />
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-gray-700 mb-3">Livability Sub-metrics (0-100 each)</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <ScoreInput label="Schools" value={form.liva_schools} onChange={(v) => updateField('liva_schools', v)} />
                    <ScoreInput label="Hospitals" value={form.liva_hospitals} onChange={(v) => updateField('liva_hospitals', v)} />
                    <ScoreInput label="Markets" value={form.liva_markets} onChange={(v) => updateField('liva_markets', v)} />
                    <ScoreInput label="Transport" value={form.liva_transport} onChange={(v) => updateField('liva_transport', v)} />
                    <ScoreInput label="Security" value={form.liva_security} onChange={(v) => updateField('liva_security', v)} />
                    <ScoreInput label="Parks" value={form.liva_parks} onChange={(v) => updateField('liva_parks', v)} />
                  </div>
                </div>
              </div>
            </FormSection>

            {/* ── SECTION: Media ── */}
            <FormSection
              title="Media"
              icon={<ImageIcon className="w-5 h-5" />}
              description="Featured image and gallery"
              isCollapsed={collapsedSections.media}
              onToggle={() => toggleSection('media')}
            >
              <div className="space-y-5">
                {/* Featured Image */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Featured Image
                    <span className="text-xs font-normal text-gray-500 ml-2">(Main thumbnail)</span>
                  </label>
                  {form.featuredImage ? (
                    <div className="relative w-full max-w-xs">
                      <div className="aspect-video rounded-xl overflow-hidden bg-gray-100 relative">
                        <Image
                          src={form.featuredImage}
                          alt="Featured"
                          fill
                          className="object-cover"
                          sizes="400px"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => updateField('featuredImage', '')}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[#ef4444] text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                        aria-label="Remove featured image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => featuredFileRef.current?.click()}
                      disabled={uploadingFeature}
                      className="w-full max-w-xs aspect-video rounded-xl border-2 border-dashed border-gray-300 hover:border-[#029bba] hover:bg-[#029bba]/5 transition-colors flex flex-col items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {uploadingFeature ? (
                        <>
                          <Loader2 className="w-8 h-8 text-[#029bba] animate-spin" />
                          <span className="text-sm text-gray-600">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-gray-400" />
                          <span className="text-sm font-semibold text-gray-700">Upload Featured Image</span>
                          <span className="text-xs text-gray-500">Max 5MB · JPG, PNG, WebP</span>
                        </>
                      )}
                    </button>
                  )}
                  <input
                    ref={featuredFileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFeaturedUpload}
                    className="hidden"
                  />
                </div>

                {/* Gallery */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Gallery Images
                    <span className="text-xs font-normal text-gray-500 ml-2">
                      ({form.images.length}/20)
                    </span>
                  </label>

                  {form.images.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 mb-3">
                      {form.images.map((img, i) => (
                        <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group">
                          <Image src={img} alt={`Gallery ${i + 1}`} fill className="object-cover" sizes="200px" />
                          <button
                            type="button"
                            onClick={() => handleRemoveGalleryImage(i)}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-[#ef4444] text-white flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label={`Remove image ${i + 1}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {form.images.length < 20 && (
                    <button
                      type="button"
                      onClick={() => galleryFileRef.current?.click()}
                      disabled={uploadingGallery}
                      className="w-full h-20 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#029bba] hover:bg-[#029bba]/5 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {uploadingGallery ? (
                        <>
                          <Loader2 className="w-5 h-5 text-[#029bba] animate-spin" />
                          <span className="text-sm text-gray-600">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-5 h-5 text-gray-400" />
                          <span className="text-sm font-semibold text-gray-700">Add Gallery Images</span>
                        </>
                      )}
                    </button>
                  )}
                  <input
                    ref={galleryFileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleGalleryUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </FormSection>

            {/* ── SECTION: Platform Settings ── */}
            <FormSection
              title="Platform Settings"
              icon={<Eye className="w-5 h-5" />}
              description="Visibility and verification status"
              isCollapsed={collapsedSections.platform}
              onToggle={() => toggleSection('platform')}
            >
              <div className="space-y-3">
                <ToggleField
                  label="Publish (Visible on Public Site)"
                  description="Society will appear at /societies/[slug] and be searchable"
                  checked={form.isPublished}
                  onChange={(v) => updateField('isPublished', v)}
                  icon={<Globe className="w-4 h-4" />}
                  activeColor="#10b981"
                />
                <ToggleField
                  label="Verified by Highrise"
                  description="Mark this society as Highrise-verified (badge shown publicly)"
                  checked={form.isVerifiedByHighrise}
                  onChange={(v) => updateField('isVerifiedByHighrise', v)}
                  icon={<BadgeCheck className="w-4 h-4" />}
                  activeColor="#029bba"
                />
                <ToggleField
                  label="Featured on Homepage"
                  description="Show in featured societies section (priority placement)"
                  checked={form.isFeatured}
                  onChange={(v) => updateField('isFeatured', v)}
                  icon={<Star className="w-4 h-4" />}
                  activeColor="#f59e0b"
                />
              </div>
            </FormSection>

            {/* ── SECTION: SEO ── */}
            <FormSection
              title="SEO (Optional)"
              icon={<FileText className="w-5 h-5" />}
              description="Override default SEO title and description"
              isCollapsed={collapsedSections.seo}
              onToggle={() => toggleSection('seo')}
            >
              <div className="space-y-4">
                <FormField label="SEO Title" optional>
                  <input
                    type="text"
                    value={form.seoTitle}
                    onChange={(e) => updateField('seoTitle', e.target.value)}
                    placeholder="Auto-generated if blank"
                    maxLength={160}
                    className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none"
                  />
                  <FieldHint>{form.seoTitle.length}/160 characters · Recommended: 50-60</FieldHint>
                </FormField>

                <FormField label="SEO Description" optional>
                  <textarea
                    value={form.seoDescription}
                    onChange={(e) => updateField('seoDescription', e.target.value)}
                    placeholder="Auto-generated if blank"
                    rows={3}
                    maxLength={320}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none resize-y"
                  />
                  <FieldHint>{form.seoDescription.length}/320 characters · Recommended: 150-160</FieldHint>
                </FormField>
              </div>
            </FormSection>

            {/* ── SUBMIT ── */}
            <div className="bg-white rounded-2xl shadow-sm p-5 sticky bottom-4 z-10 border border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-gray-600">
                  {form.isPublished ? (
                    <span className="text-[#10b981] font-semibold">
                      <Eye className="w-4 h-4 inline mr-1" /> Will be published immediately
                    </span>
                  ) : (
                    <span className="text-gray-500">
                      <EyeOff className="w-4 h-4 inline mr-1" /> Saved as draft (not published)
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <Link href="/admin/societies">
                    <button
                      type="button"
                      disabled={submitting}
                      className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </Link>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-[#029bba] text-white text-sm font-semibold hover:bg-[#027a94] transition-colors disabled:opacity-50 inline-flex items-center gap-2 shadow-md"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Create Society
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </AdminLayout>
    </>
  );
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

interface FormSectionProps {
  title: string;
  icon: React.ReactElement;
  description?: string;
  isCollapsed: boolean;
  onToggle: () => void;
  required?: boolean;
  children: React.ReactNode;
}

function FormSection({
  title,
  icon,
  description,
  isCollapsed,
  onToggle,
  required,
  children,
}: FormSectionProps): React.ReactElement {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 text-left">
          <div className="w-9 h-9 rounded-xl bg-[#029bba]/10 text-[#029bba] flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
          <div>
            <div className="font-bold text-gray-900 flex items-center gap-2">
              {title}
              {required && <span className="text-xs font-semibold text-[#ef4444]">REQUIRED</span>}
            </div>
            {description && <div className="text-xs text-gray-500 mt-0.5">{description}</div>}
          </div>
        </div>
        {isCollapsed ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronUp className="w-5 h-5 text-gray-400" />}
      </button>
      {!isCollapsed && (
        <div className="px-5 pb-5 pt-2 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  );
}

interface FormFieldProps {
  label: string;
  required?: boolean;
  optional?: boolean;
  error?: string[];
  children: React.ReactNode;
}

function FormField({ label, required, optional, error, children }: FormFieldProps): React.ReactElement {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label}
        {required && <span className="text-[#ef4444] ml-1">*</span>}
        {optional && <span className="text-xs font-normal text-gray-400 ml-2">(optional)</span>}
      </label>
      {children}
      {error && error.length > 0 && (
        <p className="text-xs text-[#ef4444] mt-1 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> {error[0]}
        </p>
      )}
    </div>
  );
}

function FieldHint({ children }: { children: React.ReactNode }): React.ReactElement {
  return <p className="text-[11px] text-gray-500 mt-1">{children}</p>;
}

interface ScoreInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}

function ScoreInput({ label, value, onChange, hint }: ScoreInputProps): React.ReactElement {
  const numValue = parseInt(value, 10) || 0;
  const scoreColor =
    numValue >= 75 ? 'text-[#10b981]' :
    numValue >= 50 ? 'text-[#f59e0b]' :
    'text-gray-400';

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type="number"
          min="0"
          max="100"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-10 pl-3 pr-12 rounded-lg border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none"
        />
        <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold ${scoreColor}`}>
          {numValue}
        </span>
      </div>
      {hint && <p className="text-[10px] text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

interface ToggleFieldProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon: React.ReactElement;
  activeColor: string;
}

function ToggleField({ label, description, checked, onChange, icon, activeColor }: ToggleFieldProps): React.ReactElement {
  return (
    <label className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white transition-colors"
        style={{ backgroundColor: checked ? activeColor : '#9ca3af' }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-900 text-sm">{label}</div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 rounded accent-[#029bba] flex-shrink-0"
      />
    </label>
  );
}