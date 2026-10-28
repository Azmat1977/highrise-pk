// pages/society/profile.tsx
// Highrise.pk — Society Profile Management
// View & edit: contact info, amenities, bank details
// NO framer-motion | NO as any | NO toast | inline banners only

import { useEffect, useState, useCallback } from 'react';
import type { ReactElement } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Shield,
  CheckCircle,
  AlertCircle,
  Loader2,
  Save,
  Edit3,
  X,
  FileText,
  ExternalLink,
} from 'lucide-react';
import SocietyLayout from '@/components/society/SocietyLayout';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileData {
  societyName: string;
  registeredName: string;
  slug: string;
  city: string;
  areaName: string;
  fullAddress: string;
  authority: string;
  nocNumber: string;
  nocIssuanceDate?: string;
  nocExpiryDate?: string;
  totalAreaAcres?: number;
  launchYear?: number;
  authorizedPersonName: string;
  authorizedPersonDesignation: string;
  authorizedPersonPhone: string;
  authorizedPersonEmail: string;
  fbrNtn?: string;
  ntcNumber?: string;
  officePhone: string;
  officeEmail: string;
  websiteUrl?: string;
  bankAccountTitle?: string;
  bankName?: string;
  amenities: string[];
  kycDocuments: Array<{
    _id: string;
    type: string;
    title: string;
    url: string;
    uploadedAt: string;
  }>;
  status: string;
  kycStatus: string;
  trustScore: number;
  nocVerified: boolean;
  cnicVerified: boolean;
}

interface ProfileApiResponse {
  success: boolean;
  profile?: ProfileData;
  message?: string;
  errors?: Record<string, string[]>;
}

// ─── Amenity config ───────────────────────────────────────────────────────────

const ALL_AMENITIES = [
  { value: 'mosque', label: '🕌 Mosque' },
  { value: 'school', label: '🏫 School' },
  { value: 'hospital', label: '🏥 Hospital' },
  { value: 'park', label: '🌳 Park' },
  { value: 'community_center', label: '🏛️ Community Center' },
  { value: 'commercial_area', label: '🏪 Commercial Area' },
  { value: 'security_gate', label: '🔒 Security Gate' },
  { value: 'cctv', label: '📷 CCTV' },
  { value: 'underground_electricity', label: '⚡ Underground Electricity' },
  { value: 'gas', label: '🔥 Gas' },
  { value: 'water_supply', label: '💧 Water Supply' },
  { value: 'sewerage', label: '🚿 Sewerage' },
  { value: 'gymnasium', label: '💪 Gymnasium' },
  { value: 'swimming_pool', label: '🏊 Swimming Pool' },
  { value: 'sports_complex', label: '⚽ Sports Complex' },
  { value: 'cinema', label: '🎬 Cinema' },
  { value: 'food_court', label: '🍽️ Food Court' },
  { value: 'playground', label: '🛝 Playground' },
  { value: 'jogging_track', label: '🏃 Jogging Track' },
  { value: 'library', label: '📚 Library' },
  { value: 'graveyard', label: '🪦 Graveyard' },
  { value: 'car_parking', label: '🚗 Car Parking' },
  { value: 'visitor_parking', label: '🅿️ Visitor Parking' },
  { value: 'fire_station', label: '🚒 Fire Station' },
  { value: 'police_post', label: '👮 Police Post' },
];

const DOC_TYPE_LABELS: Record<string, string> = {
  noc_certificate: 'NOC Certificate',
  layout_plan: 'Layout Plan',
  master_plan: 'Master Plan',
  secp_certificate: 'SECP Certificate',
  ntn_certificate: 'NTN Certificate',
  authority_approval: 'Authority Approval',
  land_acquisition: 'Land Acquisition',
  environmental_noc: 'Environmental NOC',
  other: 'Other Document',
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function SocietyProfilePage(): ReactElement {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Editable form state
  const [officePhone, setOfficePhone] = useState('');
  const [officeEmail, setOfficeEmail] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [bankAccountTitle, setBankAccountTitle] = useState('');
  const [bankName, setBankName] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/society/profile', { credentials: 'include' });
      const data = (await res.json()) as ProfileApiResponse;
      if (!res.ok || !data.success || !data.profile) {
        setErrorMsg(data.message ?? 'Failed to load profile.');
        return;
      }
      setProfile(data.profile);
      // Populate form state
      setOfficePhone(data.profile.officePhone);
      setOfficeEmail(data.profile.officeEmail);
      setWebsiteUrl(data.profile.websiteUrl ?? '');
      setBankAccountTitle(data.profile.bankAccountTitle ?? '');
      setBankName(data.profile.bankName ?? '');
      setSelectedAmenities(data.profile.amenities);
    } catch {
      setErrorMsg('Network error. Please try again.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void fetchProfile().finally(() => setLoading(false));
  }, [fetchProfile]);

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await fetch('/api/society/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          officePhone,
          officeEmail,
          websiteUrl: websiteUrl || undefined,
          bankAccountTitle,
          bankName,
          amenities: selectedAmenities,
        }),
      });
      const data = (await res.json()) as ProfileApiResponse;

      if (!res.ok || !data.success) {
        setErrorMsg(data.message ?? 'Failed to save changes.');
        return;
      }

      if (data.profile) setProfile(data.profile);
      setSuccessMsg('Profile updated successfully.');
      setEditing(false);
    } catch {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (!profile) return;
    // Reset form to current profile values
    setOfficePhone(profile.officePhone);
    setOfficeEmail(profile.officeEmail);
    setWebsiteUrl(profile.websiteUrl ?? '');
    setBankAccountTitle(profile.bankAccountTitle ?? '');
    setBankName(profile.bankName ?? '');
    setSelectedAmenities(profile.amenities);
    setEditing(false);
    setErrorMsg('');
  };

  const toggleAmenity = (value: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(value) ? prev.filter((a) => a !== value) : [...prev, value]
    );
  };

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SocietyLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-10 h-10 text-[#029bba] animate-spin" />
        </div>
      </SocietyLayout>
    );
  }

  if (!profile) {
    return (
      <SocietyLayout>
        <div className="text-center py-20">
          <p className="text-gray-500">Profile not found.</p>
        </div>
      </SocietyLayout>
    );
  }

  const isApproved = profile.status === 'approved';

  return (
    <>
      <Head>
        <title>My Profile — {profile.societyName} | Highrise.pk</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <SocietyLayout>
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Society Profile</h1>
            <p className="text-sm text-gray-500 mt-1">
              View and edit your society&apos;s public and contact information.
            </p>
          </div>

          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#029bba] text-white text-sm font-semibold hover:bg-[#027a94] transition-colors shadow-sm"
            >
              <Edit3 className="w-4 h-4" />
              Edit Profile
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancelEdit}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:border-gray-400 transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#029bba] text-white text-sm font-semibold hover:bg-[#027a94] transition-colors shadow-sm disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>

        {/* Banners */}
        {successMsg && (
          <div className="mb-4 flex items-center gap-3 p-4 border-l-4 border-[#10b981] bg-[#f0fdf4] rounded-r-xl">
            <CheckCircle className="w-5 h-5 text-[#10b981] flex-shrink-0" />
            <p className="text-sm font-medium text-green-800">{successMsg}</p>
          </div>
        )}
        {errorMsg && (
          <div className="mb-4 flex items-center gap-3 p-4 border-l-4 border-red-500 bg-red-50 rounded-r-xl">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm font-medium text-red-700">{errorMsg}</p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* ── Left: Identity + Compliance ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Society Identity — read-only (admin-controlled) */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#029bba]" />
                <h2 className="text-sm font-semibold text-gray-700">Society Identity</h2>
                <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  Read-only
                </span>
              </div>
              <div className="p-6 grid sm:grid-cols-2 gap-4">
                {[
                  { label: 'Society Name', value: profile.societyName },
                  { label: 'Registered Name', value: profile.registeredName },
                  { label: 'City', value: profile.city },
                  { label: 'Area', value: profile.areaName },
                  { label: 'Authority', value: profile.authority },
                  { label: 'NOC Number', value: profile.nocNumber },
                  {
                    label: 'Total Area',
                    value: profile.totalAreaAcres ? `${profile.totalAreaAcres} Acres` : '—',
                  },
                  {
                    label: 'Launch Year',
                    value: profile.launchYear ? String(profile.launchYear) : '—',
                  },
                ].map((f) => (
                  <div key={f.label}>
                    <p className="text-xs text-gray-400 mb-1">{f.label}</p>
                    <p className="text-sm font-medium text-gray-800">{f.value}</p>
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <p className="text-xs text-gray-400 mb-1">Full Address</p>
                  <p className="text-sm font-medium text-gray-800">{profile.fullAddress}</p>
                </div>
              </div>
            </div>

            {/* Authorized Person — read-only */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#029bba]" />
                <h2 className="text-sm font-semibold text-gray-700">Authorized Person (KYC)</h2>
                <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  Read-only
                </span>
              </div>
              <div className="p-6 grid sm:grid-cols-2 gap-4">
                {[
                  { label: 'Name', value: profile.authorizedPersonName },
                  { label: 'Designation', value: profile.authorizedPersonDesignation },
                  { label: 'Email', value: profile.authorizedPersonEmail },
                ].map((f) => (
                  <div key={f.label}>
                    <p className="text-xs text-gray-400 mb-1">{f.label}</p>
                    <p className="text-sm font-medium text-gray-800">{f.value}</p>
                  </div>
                ))}
                <div>
                  <p className="text-xs text-gray-400 mb-1">CNIC</p>
                  <p className="text-sm font-medium text-gray-800">
                    ●●●●●-●●●●●●●-● <span className="text-xs text-gray-400">(encrypted)</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Contact — editable */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#029bba]" />
                <h2 className="text-sm font-semibold text-gray-700">Contact Information</h2>
                {editing && (
                  <span className="ml-auto text-xs text-[#029bba] bg-[#029bba]/10 px-2 py-0.5 rounded-full">
                    Editing
                  </span>
                )}
              </div>
              <div className="p-6 grid sm:grid-cols-2 gap-4">
                {/* Office Phone */}
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Office Phone</label>
                  {editing ? (
                    <input
                      type="tel"
                      value={officePhone}
                      onChange={(e) => setOfficePhone(e.target.value)}
                      placeholder="+92 300 1234567"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]/20 transition-colors"
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-800">{profile.officePhone}</p>
                  )}
                </div>

                {/* Office Email */}
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Office Email</label>
                  {editing ? (
                    <input
                      type="email"
                      value={officeEmail}
                      onChange={(e) => setOfficeEmail(e.target.value)}
                      placeholder="office@society.pk"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]/20 transition-colors"
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-800">{profile.officeEmail}</p>
                  )}
                </div>

                {/* Website */}
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-400 mb-1 block">Website URL</label>
                  {editing ? (
                    <input
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://www.yoursociety.pk"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]/20 transition-colors"
                    />
                  ) : profile.websiteUrl ? (
                    <a
                      href={profile.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-[#029bba] hover:underline flex items-center gap-1"
                    >
                      {profile.websiteUrl}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <p className="text-sm text-gray-400">Not provided</p>
                  )}
                </div>
              </div>
            </div>

            {/* Bank Details — editable */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#029bba]" />
                <h2 className="text-sm font-semibold text-gray-700">Bank Details</h2>
              </div>
              <div className="p-6 grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Account Title</label>
                  {editing ? (
                    <input
                      type="text"
                      value={bankAccountTitle}
                      onChange={(e) => setBankAccountTitle(e.target.value)}
                      placeholder="Society Name Account"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]/20 transition-colors"
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-800">
                      {profile.bankAccountTitle || '—'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Bank Name</label>
                  {editing ? (
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="HBL / UBL / Meezan Bank"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]/20 transition-colors"
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-800">
                      {profile.bankName || '—'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Amenities — editable */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#029bba]" />
                <h2 className="text-sm font-semibold text-gray-700">Amenities</h2>
                <span className="ml-auto text-xs text-gray-500">
                  {selectedAmenities.length} / 25 selected
                </span>
              </div>
              <div className="p-6">
                {editing ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ALL_AMENITIES.map((a) => {
                      const checked = selectedAmenities.includes(a.value);
                      return (
                        <button
                          key={a.value}
                          type="button"
                          onClick={() => toggleAmenity(a.value)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium text-left transition-all ${
                            checked
                              ? 'border-[#029bba] bg-[#029bba]/10 text-[#029bba]'
                              : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-[#029bba]/40'
                          }`}
                        >
                          <span>{a.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {profile.amenities.length === 0 ? (
                      <p className="text-sm text-gray-400">No amenities listed.</p>
                    ) : (
                      profile.amenities.map((a) => {
                        const found = ALL_AMENITIES.find((x) => x.value === a);
                        return (
                          <span
                            key={a}
                            className="inline-flex items-center px-3 py-1 bg-[#029bba]/10 text-[#004063] text-xs font-medium rounded-full"
                          >
                            {found?.label ?? a}
                          </span>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right: KYC status + documents ── */}
          <div className="space-y-6">

            {/* Verification status */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#029bba]" />
                <h2 className="text-sm font-semibold text-gray-700">Verification Status</h2>
              </div>
              <div className="p-6 space-y-4">
                {/* Overall status */}
                <div>
                  <p className="text-xs text-gray-400 mb-2">Application Status</p>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                      profile.status === 'approved'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : profile.status === 'pending'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : profile.status === 'info_required'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : profile.status === 'rejected'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}
                  >
                    {profile.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                    {profile.status === 'pending' && <Loader2 className="w-3 h-3 animate-spin" />}
                    {profile.status === 'info_required' && <AlertCircle className="w-3 h-3" />}
                    {profile.status.charAt(0).toUpperCase() + profile.status.slice(1).replace('_', ' ')}
                  </span>
                </div>

                {/* NOC */}
                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="text-xs text-gray-500">NOC Verification</span>
                  <span
                    className={`text-xs font-semibold ${
                      profile.nocVerified ? 'text-green-600' : 'text-amber-600'
                    }`}
                  >
                    {profile.nocVerified ? '✓ Verified' : '⏳ Pending'}
                  </span>
                </div>

                {/* CNIC */}
                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="text-xs text-gray-500">CNIC Verification</span>
                  <span
                    className={`text-xs font-semibold ${
                      profile.cnicVerified ? 'text-green-600' : 'text-amber-600'
                    }`}
                  >
                    {profile.cnicVerified ? '✓ Verified' : '⏳ Pending'}
                  </span>
                </div>

                {/* KYC Status */}
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-gray-500">KYC Status</span>
                  <span
                    className={`text-xs font-semibold ${
                      profile.kycStatus === 'verified'
                        ? 'text-green-600'
                        : profile.kycStatus === 'in_review'
                        ? 'text-blue-600'
                        : profile.kycStatus === 'failed'
                        ? 'text-red-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {profile.kycStatus.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                </div>

                {/* Trust score */}
                {isApproved && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-gray-500">Trust Score</span>
                      <span className="text-xs font-bold text-[#029bba]">
                        {profile.trustScore}/100
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#029bba] rounded-full transition-all"
                        style={{ width: `${profile.trustScore}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* KYC Documents */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#029bba]" />
                <h2 className="text-sm font-semibold text-gray-700">KYC Documents</h2>
                <span className="ml-auto text-xs text-gray-400">
                  {profile.kycDocuments.length} uploaded
                </span>
              </div>
              <div className="p-6">
                {profile.kycDocuments.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">
                    No documents uploaded.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {profile.kycDocuments.map((doc) => (
                      <div
                        key={doc._id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-gray-800 truncate">
                            {doc.title}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {DOC_TYPE_LABELS[doc.type] ?? doc.type}
                          </p>
                        </div>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-3 shrink-0 p-1.5 rounded-lg hover:bg-[#029bba]/10 text-gray-400 hover:text-[#029bba] transition-colors"
                          title="View document"
                          aria-label="View document"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-3 text-[10px] text-gray-400 text-center">
                  To add or remove documents, contact support.
                </p>
              </div>
            </div>

            {/* Compliance numbers — read-only */}
            {(profile.fbrNtn || profile.ntcNumber) && (
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#029bba]" />
                  <h2 className="text-sm font-semibold text-gray-700">Compliance Numbers</h2>
                </div>
                <div className="p-6 space-y-3">
                  {profile.fbrNtn && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">FBR NTN</p>
                      <p className="text-sm font-mono font-medium text-gray-800">
                        {profile.fbrNtn}
                      </p>
                    </div>
                  )}
                  {profile.ntcNumber && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">NTC Number</p>
                      <p className="text-sm font-mono font-medium text-gray-800">
                        {profile.ntcNumber}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </SocietyLayout>
    </>
  );
}