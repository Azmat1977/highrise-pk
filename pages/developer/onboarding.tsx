// pages/developer/onboarding.tsx
// Highrise.pk -- 4-Stage Developer Onboarding Wizard
// Stage 1: Corporate Identity | Stage 2: SECP & FBR Tax | Stage 3: Representative NADRA KYC | Stage 4: Track Record & Submit
// Rule Set A Design System Locked | Pure ASCII comments | Zero react-hot-toast

import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { icons } from '@/lib/design-system/icons';
import { colors } from '@/lib/design-system/tokens';
import { typography } from '@/lib/design-system/typography';
import { card, button, input } from '@/lib/design-system/components';

// ============================================================================
// PAKISTANI CITIES CONSTANT
// ============================================================================

const MAJOR_PK_CITIES = [
  'Islamabad',
  'Rawalpindi',
  'Lahore',
  'Karachi',
  'Peshawar',
  'Faisalabad',
  'Multan',
  'Quetta',
  'Sialkot',
  'Gujranwala',
  'Hyderabad',
  'Abbottabad',
  'Gwadar',
  'Bahawalpur',
];

export default function DeveloperOnboardingPage(): React.ReactElement {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);
  const [bannerNotice, setBannerNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string[]>>({});
  const [existingStatus, setExistingStatus] = useState<string>('unstarted');

  // Form State
  const [formData, setFormData] = useState({
    // Stage 1
    developerType: 'developer',
    companyName: '',
    companyType: 'Private Limited (Pvt Ltd)',
    establishedYear: new Date().getFullYear() - 5,
    ceoName: '',
    tagline: '',
    description: '',
    email: '',
    phone: '',
    whatsapp: '',
    website: '',
    city: 'Islamabad',
    officeAddress: '',
    operatingCities: ['Islamabad', 'Rawalpindi'],
    logoUrl: '',
    coverImageUrl: '',

    // Stage 2
    ntnNumber: '',
    secpNumber: '',
    strnNumber: '',
    ntnCertificateUrl: '',
    secpCertificateUrl: '',

    // Stage 3
    authorizedPersonName: '',
    authorizedPersonDesignation: 'Director / Authorized Signatory',
    authorizedPersonCnic: '',
    authorizedPersonPhone: '',
    authorizedPersonEmail: '',
    cnicFrontUrl: '',
    cnicBackUrl: '',

    // Stage 4
    totalUnitsDelivered: 0,
    totalLandArea: 0,
    agreedToTerms: false,
  });

  // Auth gate
  useEffect(() => {
    if (status === 'unauthenticated') {
      void router.replace('/auth/login?redirect=/developer/onboarding');
    }
  }, [status, router]);

  // Load existing application data
  const loadExistingApplication = useCallback(async () => {
    try {
      const res = await fetch('/api/developer/onboarding');
      const data = await res.json();

      if (res.ok && data.success && data.data) {
        setExistingStatus(data.data.status);

        if (data.data.profile) {
          const p = data.data.profile;
          setFormData((prev) => ({
            ...prev,
            developerType: p.developerType || prev.developerType,
            companyName: p.companyName || prev.companyName,
            companyType: p.companyType || prev.companyType,
            establishedYear: p.establishedYear || prev.establishedYear,
            ceoName: p.ceoName || prev.ceoName,
            tagline: p.tagline || prev.tagline,
            description: p.description || prev.description,
            email: p.email || session?.user?.email || prev.email,
            city: p.city || prev.city,
            officeAddress: p.officeAddress || prev.officeAddress,
            operatingCities: p.operatingCities?.length ? p.operatingCities : prev.operatingCities,
            website: p.website || prev.website,
            logoUrl: p.logo?.url || '',
            coverImageUrl: p.coverImage?.url || '',
            ntnNumber: p.ntnNumber || '',
            secpNumber: p.secpNumber || '',
            strnNumber: p.strnMasked || '',
            ntnCertificateUrl: p.legalDocs?.ntnCertificate?.url || '',
            secpCertificateUrl: p.legalDocs?.secpCertificate?.url || '',
            authorizedPersonName: p.authorizedPersonName || session?.user?.name || '',
            authorizedPersonDesignation: p.authorizedPersonDesignation || prev.authorizedPersonDesignation,
            authorizedPersonCnic: p.authorizedPersonCnic || '',
            authorizedPersonEmail: p.authorizedPersonEmail || session?.user?.email || '',
            cnicFrontUrl: p.legalDocs?.authorizedPersonCnicFrontImage?.url || '',
            cnicBackUrl: p.legalDocs?.authorizedPersonCnicBackImage?.url || '',
            totalUnitsDelivered: p.portfolio?.totalUnitsDelivered || 0,
            totalLandArea: p.portfolio?.totalLandArea || 0,
          }));
        } else if (session?.user) {
          setFormData((prev) => ({
            ...prev,
            email: session.user.email || '',
            authorizedPersonName: session.user.name || '',
            authorizedPersonEmail: session.user.email || '',
          }));
        }
      }
    } catch {
      setBannerNotice({ type: 'error', text: 'Could not load existing application draft.' });
    } finally {
      setLoadingInitial(false);
    }
  }, [session]);

  useEffect(() => {
    if (status === 'authenticated') {
      void loadExistingApplication();
    }
  }, [status, loadExistingApplication]);

  // Handle Input Changes
  const handleChange = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (serverErrors[field]) {
      setServerErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const handleCityToggle = (city: string) => {
    setFormData((prev) => {
      const exists = prev.operatingCities.includes(city);
      const updated = exists
        ? prev.operatingCities.filter((c) => c !== city)
        : [...prev.operatingCities, city];
      return { ...prev, operatingCities: updated.length ? updated : [city] };
    });
  };

  // Save Draft / Submit Application
  const handleSave = async (isFinalSubmit: boolean) => {
    setBannerNotice(null);
    setServerErrors({});
    if (isFinalSubmit) setIsSubmitting(true);
    else setIsSavingDraft(true);

    try {
      const payload: Record<string, any> = {
        action: isFinalSubmit ? 'submit' : 'draft',
        developerType: formData.developerType,
        companyName: formData.companyName.trim(),
        companyType: formData.companyType,
        establishedYear: Number(formData.establishedYear),
        ceoName: formData.ceoName.trim() || undefined,
        tagline: formData.tagline.trim() || undefined,
        description: formData.description.trim() || undefined,
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        whatsapp: formData.whatsapp.trim() || undefined,
        website: formData.website.trim() || undefined,
        city: formData.city,
        officeAddress: formData.officeAddress.trim(),
        operatingCities: formData.operatingCities,
        logo: formData.logoUrl ? { url: formData.logoUrl, public_id: 'dev_logo' } : undefined,
        coverImage: formData.coverImageUrl ? { url: formData.coverImageUrl, public_id: 'dev_cover' } : undefined,
        ntnNumber: formData.ntnNumber.trim(),
        secpNumber: formData.secpNumber.trim(),
        strnNumber: formData.strnNumber.trim() || undefined,
        legalDocs: {
          ntnCertificate: formData.ntnCertificateUrl ? { url: formData.ntnCertificateUrl, public_id: 'ntn_doc' } : undefined,
          secpCertificate: formData.secpCertificateUrl ? { url: formData.secpCertificateUrl, public_id: 'secp_doc' } : undefined,
          authorizedPersonCnicFrontImage: formData.cnicFrontUrl ? { url: formData.cnicFrontUrl, public_id: 'cnic_f' } : undefined,
          authorizedPersonCnicBackImage: formData.cnicBackUrl ? { url: formData.cnicBackUrl, public_id: 'cnic_b' } : undefined,
        },
        authorizedPersonName: formData.authorizedPersonName.trim(),
        authorizedPersonDesignation: formData.authorizedPersonDesignation.trim(),
        authorizedPersonCnic: formData.authorizedPersonCnic.trim(),
        authorizedPersonPhone: formData.authorizedPersonPhone.trim(),
        authorizedPersonEmail: formData.authorizedPersonEmail.trim(),
        totalUnitsDelivered: Number(formData.totalUnitsDelivered) || 0,
        totalLandArea: Number(formData.totalLandArea) || 0,
        agreedToTerms: formData.agreedToTerms,
      };

      const res = await fetch('/api/developer/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.errors) {
          setServerErrors(data.errors);
        }
        setBannerNotice({
          type: 'error',
          text: data.message || 'Please correct the highlighted errors before continuing.',
        });
        return;
      }

      setBannerNotice({
        type: 'success',
        text: data.message || (isFinalSubmit ? 'Application submitted!' : 'Draft progress saved!'),
      });

      if (isFinalSubmit) {
        setExistingStatus('pending');
      }
    } catch {
      setBannerNotice({ type: 'error', text: 'Network connection error. Please try again.' });
    } finally {
      setIsSubmitting(false);
      setIsSavingDraft(false);
    }
  };

  // Step validation check before proceeding
  const handleNextStep = () => {
    setBannerNotice(null);
    if (currentStep === 1) {
      if (!formData.companyName.trim()) {
        setBannerNotice({ type: 'error', text: 'Company Name is required to proceed.' });
        return;
      }
      if (!formData.phone.trim()) {
        setBannerNotice({ type: 'error', text: 'Official contact phone number is required.' });
        return;
      }
    }
    if (currentStep === 2) {
      if (!formData.ntnNumber.trim()) {
        setBannerNotice({ type: 'error', text: 'FBR NTN is mandatory for verified developer status.' });
        return;
      }
    }
    if (currentStep === 3) {
      if (!formData.authorizedPersonName.trim() || !formData.authorizedPersonCnic.trim()) {
        setBannerNotice({ type: 'error', text: 'Representative Name and 13-Digit NADRA CNIC are required.' });
        return;
      }
    }
    setCurrentStep((s) => Math.min(s + 1, 4));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loadingInitial || status === 'loading') {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <icons.Loader2 className="w-10 h-10 text-[#029bba] animate-spin mx-auto" />
          <p className="text-sm font-semibold text-gray-600">Loading Developer Verification Portal...</p>
        </div>
      </div>
    );
  }

  // Pending State Screen
  if (existingStatus === 'pending') {
    return (
      <>
        <Head>
          <title>Application Submitted | Highrise.pk</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <div className="min-h-screen bg-[#f8f9fa] py-12 px-4 sm:px-6">
          <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto text-amber-600">
              <icons.Clock className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#004063]">Application Under Review</h1>
              <p className="text-sm text-gray-500 mt-1">
                Your developer profile credentials for <span className="font-bold text-gray-800">{formData.companyName || 'your firm'}</span> have been submitted to our compliance team.
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2.5 text-xs text-gray-600 border border-gray-100">
              <div className="flex items-center gap-2 font-bold text-[#004063]">
                <icons.ShieldCheck className="w-4 h-4 text-[#029bba]" />
                Verification Process (12 - 24 Hours):
              </div>
              <p>1. FBR Active Taxpayer list matching &amp; NTN validation</p>
              <p>2. SECP Corporate registry confirmation</p>
              <p>3. NADRA CNIC cross-verification for authorized signatory</p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Link href="/" className="w-full sm:w-1/2 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-200 transition-colors">
                Back to Home
              </Link>
              <a
                href="https://wa.me/923335877106?text=Assalam-o-Alaikum%2C%20I%20have%20submitted%20my%20developer%20onboarding%20application%20on%20Highrise.pk."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-1/2 py-3 bg-[#25D366] text-white font-bold rounded-xl text-sm hover:bg-[#128C7E] transition-colors flex items-center justify-center gap-2"
              >
                <icons.Phone className="w-4 h-4" />
                WhatsApp Desk
              </a>
            </div>
          </div>
        </div>
      </>
    );
  }

  const stepTitles = [
    { num: 1, label: 'Corporate Identity', icon: icons.Building2 },
    { num: 2, label: 'SECP & FBR Tax', icon: icons.FileText },
    { num: 3, label: 'Representative KYC', icon: icons.UserCheck },
    { num: 4, label: 'Track Record & Submit', icon: icons.ShieldCheck },
  ];

  return (
    <>
      <Head>
        <title>Developer Onboarding &amp; Verification | Highrise.pk</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-[#f8f9fa] py-8 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Top Title & Progress Header */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#029bba]/10 text-[#029bba] text-xs font-bold mb-2">
                <icons.ShieldCheck className="w-3.5 h-3.5" />
                Verified Builder &amp; Developer Program
              </div>
              <h1 className={typography.pageTitle}>Developer Onboarding</h1>
              <p className={typography.pageSubtitle}>
                Step {currentStep} of 4: {stepTitles[currentStep - 1].label}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleSave(false)}
              disabled={isSavingDraft}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors shrink-0 disabled:opacity-50"
            >
              <icons.Save className="w-4 h-4 text-gray-500" />
              {isSavingDraft ? 'Saving Draft...' : 'Save Draft Progress'}
            </button>
          </div>

          {/* Stepper Indicator */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {stepTitles.map((step) => {
              const Icon = step.icon;
              const isDone = currentStep > step.num;
              const isCurrent = currentStep === step.num;
              return (
                <div
                  key={step.num}
                  onClick={() => setCurrentStep(step.num)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                    isCurrent
                      ? 'bg-white border-[#029bba] shadow-sm ring-1 ring-[#029bba]/30'
                      : isDone
                      ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800'
                      : 'bg-white/60 border-gray-200 text-gray-400 hover:bg-white'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                      isCurrent
                        ? 'bg-[#029bba] text-white'
                        : isDone
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {isDone ? <icons.Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 leading-tight">
                      Step {step.num}
                    </p>
                    <p className={`text-xs font-bold truncate ${isCurrent ? 'text-[#004063]' : 'text-gray-700'}`}>
                      {step.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Notification Banner */}
          {bannerNotice && (
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 text-sm font-medium ${
                bannerNotice.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              {bannerNotice.type === 'error' ? (
                <icons.AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              ) : (
                <icons.CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">{bannerNotice.text}</div>
            </div>
          )}

          {/* STAGE 1: CORPORATE IDENTITY */}
          {currentStep === 1 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <h2 className={typography.sectionTitlePlain}>Stage 1: Company &amp; Corporate Profile</h2>
                <p className={typography.caption}>Official business name, registration category, and headquarters information.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={input.label}>Developer Classification *</label>
                  <select
                    value={formData.developerType}
                    onChange={(e) => handleChange('developerType', e.target.value)}
                    className={input.select}
                  >
                    <option value="developer">Real Estate Developer</option>
                    <option value="builder">Construction Builder</option>
                    <option value="society">Housing Society Management</option>
                    <option value="corporate">Corporate Real Estate Firm</option>
                    <option value="individual">Individual Registered Builder</option>
                  </select>
                </div>

                <div>
                  <label className={input.label}>Corporate Structure *</label>
                  <select
                    value={formData.companyType}
                    onChange={(e) => handleChange('companyType', e.target.value)}
                    className={input.select}
                  >
                    <option value="Private Limited (Pvt Ltd)">Private Limited (Pvt Ltd)</option>
                    <option value="Public Limited (Unlisted)">Public Limited (Unlisted)</option>
                    <option value="Sole Proprietorship">Sole Proprietorship</option>
                    <option value="Partnership / AOP">Partnership / AOP</option>
                    <option value="LLP (Limited Liability Partnership)">LLP (Limited Liability Partnership)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className={input.label}>Registered Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Zameen Developers Pvt Ltd"
                    value={formData.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                    className={input.text}
                  />
                  {serverErrors.companyName && <p className={input.errorText}>{serverErrors.companyName[0]}</p>}
                </div>

                <div>
                  <label className={input.label}>Established Year *</label>
                  <input
                    type="number"
                    min="1900"
                    max={new Date().getFullYear()}
                    value={formData.establishedYear}
                    onChange={(e) => handleChange('establishedYear', Number(e.target.value))}
                    className={input.text}
                  />
                </div>

                <div>
                  <label className={input.label}>CEO / Managing Director Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Muhammad Farooq"
                    value={formData.ceoName}
                    onChange={(e) => handleChange('ceoName', e.target.value)}
                    className={input.text}
                  />
                </div>

                <div>
                  <label className={input.label}>Official Company Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="info@yourcompany.com"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className={input.text}
                  />
                </div>

                <div>
                  <label className={input.label}>Official Contact Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="03XXXXXXXXX or 051-XXXXXXX"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className={input.text}
                  />
                </div>

                <div>
                  <label className={input.label}>Official WhatsApp Number</label>
                  <input
                    type="tel"
                    placeholder="03XXXXXXXXX"
                    value={formData.whatsapp}
                    onChange={(e) => handleChange('whatsapp', e.target.value)}
                    className={input.text}
                  />
                </div>

                <div>
                  <label className={input.label}>Official Website URL</label>
                  <input
                    type="url"
                    placeholder="https://www.yourcompany.com"
                    value={formData.website}
                    onChange={(e) => handleChange('website', e.target.value)}
                    className={input.text}
                  />
                </div>

                <div>
                  <label className={input.label}>Headquarter City *</label>
                  <select
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    className={input.select}
                  >
                    {MAJOR_PK_CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className={input.label}>Head Office Physical Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="Floor, Plaza Name, Sector / Block, City"
                    value={formData.officeAddress}
                    onChange={(e) => handleChange('officeAddress', e.target.value)}
                    className={input.text}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={input.label}>Operating Cities in Pakistan</label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {MAJOR_PK_CITIES.map((city) => {
                      const selected = formData.operatingCities.includes(city);
                      return (
                        <button
                          key={city}
                          type="button"
                          onClick={() => handleCityToggle(city)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            selected
                              ? 'bg-[#029bba] text-white border-[#029bba]'
                              : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {city}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className={input.label}>Company Bio / Brief Profile</label>
                  <textarea
                    rows={3}
                    placeholder="Describe your firm's construction track record, vision, and scale..."
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    className={input.textarea}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STAGE 2: SECP & FBR TAX KYC */}
          {currentStep === 2 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <h2 className={typography.sectionTitlePlain}>Stage 2: SECP &amp; FBR Tax Compliance</h2>
                <p className={typography.caption}>Provide your official Pakistani regulatory registration identifiers.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={input.label}>FBR NTN (National Tax Number) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1234567-8"
                    value={formData.ntnNumber}
                    onChange={(e) => handleChange('ntnNumber', e.target.value)}
                    className={input.text}
                  />
                  <p className={input.helper}>7 or 8 digits. Encrypted with AES-256 at rest.</p>
                </div>

                <div>
                  <label className={input.label}>SECP Registration Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 0012345 or CUIN number"
                    value={formData.secpNumber}
                    onChange={(e) => handleChange('secpNumber', e.target.value)}
                    className={input.text}
                  />
                  <p className={input.helper}>Corporate Universal Identification Number (CUIN).</p>
                </div>

                <div className="sm:col-span-2">
                  <label className={input.label}>Sales Tax / STRN (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 32-00-XXXX-XXX-XX"
                    value={formData.strnNumber}
                    onChange={(e) => handleChange('strnNumber', e.target.value)}
                    className={input.text}
                  />
                </div>

                <div>
                  <label className={input.label}>FBR NTN Certificate Image URL (Cloudinary)</label>
                  <input
                    type="url"
                    placeholder="https://res.cloudinary.com/..."
                    value={formData.ntnCertificateUrl}
                    onChange={(e) => handleChange('ntnCertificateUrl', e.target.value)}
                    className={input.text}
                  />
                </div>

                <div>
                  <label className={input.label}>SECP Incorporation Certificate URL</label>
                  <input
                    type="url"
                    placeholder="https://res.cloudinary.com/..."
                    value={formData.secpCertificateUrl}
                    onChange={(e) => handleChange('secpCertificateUrl', e.target.value)}
                    className={input.text}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STAGE 3: REPRESENTATIVE NADRA KYC */}
          {currentStep === 3 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <h2 className={typography.sectionTitlePlain}>Stage 3: Authorized Representative (NADRA KYC)</h2>
                <p className={typography.caption}>Focal person legally authorized to represent the developer firm.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={input.label}>Representative Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="As per NADRA CNIC"
                    value={formData.authorizedPersonName}
                    onChange={(e) => handleChange('authorizedPersonName', e.target.value)}
                    className={input.text}
                  />
                </div>

                <div>
                  <label className={input.label}>Designation in Firm *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CEO, Director, Managing Partner"
                    value={formData.authorizedPersonDesignation}
                    onChange={(e) => handleChange('authorizedPersonDesignation', e.target.value)}
                    className={input.text}
                  />
                </div>

                <div>
                  <label className={input.label}>13-Digit NADRA CNIC Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="XXXXX-XXXXXXX-X"
                    value={formData.authorizedPersonCnic}
                    onChange={(e) => handleChange('authorizedPersonCnic', e.target.value)}
                    className={input.text}
                  />
                  <p className={input.helper}>Encrypted with AES-256. Masked on public profiles.</p>
                </div>

                <div>
                  <label className={input.label}>Representative Direct Mobile *</label>
                  <input
                    type="tel"
                    required
                    placeholder="03XXXXXXXXX"
                    value={formData.authorizedPersonPhone}
                    onChange={(e) => handleChange('authorizedPersonPhone', e.target.value)}
                    className={input.text}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={input.label}>Representative Official Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="representative@company.com"
                    value={formData.authorizedPersonEmail}
                    onChange={(e) => handleChange('authorizedPersonEmail', e.target.value)}
                    className={input.text}
                  />
                </div>

                <div>
                  <label className={input.label}>CNIC Front Image URL (Cloudinary)</label>
                  <input
                    type="url"
                    placeholder="https://res.cloudinary.com/..."
                    value={formData.cnicFrontUrl}
                    onChange={(e) => handleChange('cnicFrontUrl', e.target.value)}
                    className={input.text}
                  />
                </div>

                <div>
                  <label className={input.label}>CNIC Back Image URL (Cloudinary)</label>
                  <input
                    type="url"
                    placeholder="https://res.cloudinary.com/..."
                    value={formData.cnicBackUrl}
                    onChange={(e) => handleChange('cnicBackUrl', e.target.value)}
                    className={input.text}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STAGE 4: TRACK RECORD & SUBMIT */}
          {currentStep === 4 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <h2 className={typography.sectionTitlePlain}>Stage 4: Track Record &amp; Final Certification</h2>
                <p className={typography.caption}>Declare past deliveries and certify legal compliance.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={input.label}>Estimated Total Units Delivered</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 250"
                    value={formData.totalUnitsDelivered}
                    onChange={(e) => handleChange('totalUnitsDelivered', Number(e.target.value))}
                    className={input.text}
                  />
                </div>

                <div>
                  <label className={input.label}>Total Land Area Developed (Kanals / Sq Ft)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 50"
                    value={formData.totalLandArea}
                    onChange={(e) => handleChange('totalLandArea', Number(e.target.value))}
                    className={input.text}
                  />
                </div>
              </div>

              {/* Review Summary Box */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-2">
                <div className="font-bold text-[#004063] text-sm flex items-center gap-1.5">
                  <icons.CheckCircle2 className="w-4 h-4 text-[#029bba]" />
                  Application Summary:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-gray-600">
                  <div>
                    <span className="text-gray-400 block">Firm Name:</span>
                    <span className="font-bold text-gray-800">{formData.companyName || 'Not filled'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">FBR NTN:</span>
                    <span className="font-bold text-gray-800">{formData.ntnNumber || 'Not filled'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">SECP Reg:</span>
                    <span className="font-bold text-gray-800">{formData.secpNumber || 'Not filled'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Signatory CNIC:</span>
                    <span className="font-bold text-gray-800">{formData.authorizedPersonCnic || 'Not filled'}</span>
                  </div>
                </div>
              </div>

              {/* Legal Declaration */}
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={formData.agreedToTerms}
                    onChange={(e) => handleChange('agreedToTerms', e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-[#029bba] focus:ring-[#029bba]"
                  />
                  <span className="text-xs text-amber-900 leading-relaxed font-medium">
                    I hereby certify that all corporate registrations (SECP), tax documents (FBR NTN), and representative details submitted are authentic and legally valid in the Islamic Republic of Pakistan. I agree to Highrise.pk Terms of Verification.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-2">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((s) => s - 1)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                <icons.ChevronLeft className="w-4 h-4" />
                Previous Step
              </button>
            ) : (
              <div />
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#029bba] hover:bg-[#017a8a] text-white text-sm font-bold transition-colors shadow-sm"
              >
                Continue to Step {currentStep + 1}
                <icons.ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleSave(true)}
                disabled={isSubmitting || !formData.agreedToTerms}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors shadow-md disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <icons.Loader2 className="w-4 h-4 animate-spin" />
                    Submitting Application...
                  </>
                ) : (
                  <>
                    <icons.ShieldCheck className="w-4 h-4" />
                    Submit Application for Verification
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