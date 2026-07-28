// components/property/forms/UnifiedPropertyForm.tsx

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { CheckCircle, AlertCircle, Loader2, ArrowRight, Shield } from 'lucide-react';

import {
  usePropertyForm,
  TABS,
  LISTING_TYPE_LABELS,
  ListingType,
} from './shared/usePropertyForm';

import ProgressBar from './shared/ProgressBar';
import TabNavigation from './shared/TabNavigation';
import PaymentSummaryCard from './shared/PaymentSummaryCard';

import TabBasics from './tabs/TabBasics';
import TabLocation from './tabs/TabLocation';
import TabSize from './tabs/TabSize';
import TabPricing from './tabs/TabPricing';
import TabCharges from './tabs/TabCharges';
import TabFeatures from './tabs/TabFeatures';
import TabMedia from './tabs/TabMedia';

// ─── Role Labels ──────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  user: 'User',
  owner: 'Property Owner',
  agent: 'Agent',
  developer: 'Developer',
  admin: 'Admin',
};

// ─── Profile Status Type ─────────────────────────────────────────────────────

interface ProfileStatus {
  approved: boolean;
  status: string;
  message?: string;
}

// ─── Auth Gate Component ──────────────────────────────────────────────────────

interface AuthGateProps {
  status: 'loading' | 'unauthenticated' | 'authenticated';
  role: string;
  profileStatus: ProfileStatus | null;
  profileLoading: boolean;
}

function AuthGate({
  status,
  role,
  profileStatus,
  profileLoading,
}: AuthGateProps): React.ReactElement | null {

  // Loading session
  if (status === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#029bba] animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-[#029bba] bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-[#029bba]" />
          </div>
          <h2 className="text-xl font-bold text-[#004063] mb-2">
            Login Required
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            You need to be logged in to list a property on Highrise.pk.
          </p>
          <a
            href="/login?redirect=/add-property"
            className="
              inline-flex items-center gap-2 px-6 py-3 rounded-xl
              bg-[#029bba] text-white font-semibold text-sm
              hover:bg-[#004063] transition-colors duration-150
            "
          >
            Login / Sign Up
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  // Plain user — needs to register as owner/agent/developer
  if (role === 'user') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-[#f59e0b] bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-[#f59e0b]" />
          </div>
          <h2 className="text-xl font-bold text-[#004063] mb-2">
            Registration Required
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            To list properties, you need to register as a Property Owner, Agent,
            or Developer. This helps us verify listings and protect buyers.
          </p>
          <div className="flex flex-col gap-3">
            <a
              href="/agent/register"
              className="
                px-5 py-2.5 rounded-xl border-2 border-[#029bba]
                text-[#029bba] font-semibold text-sm
                hover:bg-[#029bba] hover:text-white
                transition-colors duration-150
              "
            >
              Register as Agent
            </a>
            <a
              href="/developer/register"
              className="
                px-5 py-2.5 rounded-xl border-2 border-[#7c3aed]
                text-[#7c3aed] font-semibold text-sm
                hover:bg-[#7c3aed] hover:text-white
                transition-colors duration-150
              "
            >
              Register as Developer
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Agent/Developer — checking profile approval
  if ((role === 'agent' || role === 'developer') && profileLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#029bba] animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Checking profile status...</p>
        </div>
      </div>
    );
  }

  // Agent/Developer — not approved
  if (
    (role === 'agent' || role === 'developer') &&
    profileStatus &&
    !profileStatus.approved
  ) {
    const isRejected = profileStatus.status === 'rejected';
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              isRejected
                ? 'bg-[#ef4444] bg-opacity-10'
                : 'bg-[#f59e0b] bg-opacity-10'
            }`}
          >
            <AlertCircle
              className={`w-8 h-8 ${
                isRejected ? 'text-[#ef4444]' : 'text-[#f59e0b]'
              }`}
            />
          </div>
          <h2 className="text-xl font-bold text-[#004063] mb-2">
            {isRejected ? 'Profile Rejected' : 'Profile Under Review'}
          </h2>
          <p className="text-gray-500 text-sm mb-4">
            {isRejected
              ? `Your ${role} profile was rejected. ${
                  profileStatus.message || 'Please contact support.'
                }`
              : `Your ${role} profile is currently under review. You'll be able to list properties once approved.`}
          </p>
          <div
            className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
              ${isRejected
                ? 'bg-red-50 text-[#ef4444]'
                : 'bg-amber-50 text-[#f59e0b]'
              }
            `}
          >
            <span>Status: {profileStatus.status}</span>
          </div>
          {isRejected && (
            <div className="mt-6">
              <a
                href={`/${role}/profile`}
                className="
                  text-sm text-[#029bba] font-medium hover:underline
                "
              >
                Update Profile →
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // All checks passed — return null to render form
  return null;
}

// ─── Success Screen Component ─────────────────────────────────────────────────

interface SuccessScreenProps {
  slug: string;
}

function SuccessScreen({ slug }: SuccessScreenProps): React.ReactElement {
  const router = useRouter();

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
        <div className="w-20 h-20 bg-[#10b981] bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-[#10b981]" />
        </div>
        <h2 className="text-2xl font-bold text-[#004063] mb-2">
          Property Submitted! 🎉
        </h2>
        <p className="text-gray-500 text-sm mb-2">
          Your listing has been submitted for review. Our team will verify it
          within 24–48 hours.
        </p>
        <div className="bg-[#eff6ff] border-l-4 border-[#029bba] px-4 py-3 rounded-r-lg text-left my-6">
          <p className="text-xs text-[#004063]">
            <strong>What happens next?</strong>
          </p>
          <ul className="text-xs text-gray-600 mt-1 space-y-1">
            <li>✅ Our team reviews photos, pricing &amp; documents</li>
            <li>✅ Verified listings get a trust badge</li>
            <li>✅ You&apos;ll receive an email when listing goes live</li>
            <li>✅ Leads &amp; inquiries will appear in your dashboard</li>
          </ul>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {slug && (
            <button
              type="button"
              onClick={() => router.push(`/property/${slug}`)}
              className="
                flex-1 px-5 py-2.5 rounded-xl
                bg-[#029bba] text-white font-semibold text-sm
                hover:bg-[#004063] transition-colors duration-150
              "
            >
              View Listing
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push('/my-properties')}
            className="
              flex-1 px-5 py-2.5 rounded-xl
              border-2 border-[#029bba] text-[#029bba] font-semibold text-sm
              hover:bg-[#029bba] hover:text-white transition-colors duration-150
            "
          >
            My Properties
          </button>
          <button
            type="button"
            onClick={() => router.reload()}
            className="
              flex-1 px-5 py-2.5 rounded-xl
              border-2 border-gray-300 text-gray-600 font-semibold text-sm
              hover:bg-gray-100 transition-colors duration-150
            "
          >
            Add Another
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Profile Check Hook ───────────────────────────────────────────────────────

function useProfileApproval(
  role: string | undefined
): { profileStatus: ProfileStatus | null; profileLoading: boolean } {
  const needsCheck = role === 'agent' || role === 'developer';

  const [profileStatus, setProfileStatus] = useState<ProfileStatus | null>(
    needsCheck ? null : { approved: true, status: 'approved' }
  );
  const [profileLoading, setProfileLoading] = useState(needsCheck);

  useEffect(() => {
    if (!needsCheck) {
      setProfileStatus({ approved: true, status: 'approved' });
      setProfileLoading(false);
      return;
    }

    let cancelled = false;
    const checkProfile = async () => {
      try {
        const endpoint =
          role === 'agent' ? '/api/agent/profile' : '/api/developer/profile';
        const res = await fetch(endpoint);
        if (!res.ok) {
          setProfileStatus({
            approved: false,
            status: 'not_found',
            message: 'Profile not found. Please complete your registration.',
          });
          return;
        }
        const data = (await res.json()) as {
          profile?: { status?: string; rejectionReason?: string };
        };
        if (cancelled) return;

        const status = data.profile?.status ?? 'pending';
        setProfileStatus({
          approved: status === 'approved',
          status,
          message: data.profile?.rejectionReason,
        });
      } catch {
        if (!cancelled) {
          setProfileStatus({
            approved: false,
            status: 'error',
            message: 'Could not verify profile. Please try again.',
          });
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    };

    checkProfile();
    return () => {
      cancelled = true;
    };
  }, [role, needsCheck]);

  return { profileStatus, profileLoading };
}

// ─── Import useState for profile hook ─────────────────────────────────────────

import { useState } from 'react';

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UnifiedPropertyForm(): React.ReactElement {
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? 'user';

  const { profileStatus, profileLoading } = useProfileApproval(role);

  const hook = usePropertyForm();

  const {
    form,
    activeTab,
    tabErrors,
    tabStatuses,
    touchedTabs,
    isSubmitting,
    submitError,
    submitSuccess,
    submittedSlug,
    isDirty,
    lastSaved,
    fieldConfig,
    setField,
    setResidentialField,
    setPlotField,
    setCommercialField,
    setAgriculturalField,
    setConstructionField,
    setParkingField,
    setInstallmentField,
    setRentalField,
    setListingType,
    setActiveTab,
    validateCurrentTab,
    validateAllTabs,
    goToNextTab,
    goToPrevTab,
    saveDraft,
    clearDraft,
    submitForm,
    completedTabCount,
  } = hook;

  // ── Current tab errors
  const currentErrors = tabErrors[activeTab] ?? {};

  // ── Auth gate check
  const gate = AuthGate({
    status,
    role,
    profileStatus,
    profileLoading,
  });

  if (gate) return gate;

  // ── Success screen
  if (submitSuccess) {
    return <SuccessScreen slug={submittedSlug} />;
  }

  // ── Render active tab
  const renderTab = (): React.ReactElement => {
    switch (activeTab) {
      case 'basics':
        return (
          <TabBasics
            form={form}
            errors={currentErrors}
            setField={setField}
            setResidentialField={setResidentialField}
            setPlotField={setPlotField}
            setCommercialField={setCommercialField}
            setAgriculturalField={setAgriculturalField}
            setRentalField={setRentalField}
            fieldConfig={fieldConfig}
          />
        );
      case 'location':
        return (
          <TabLocation
            form={form}
            errors={currentErrors}
            setField={setField}
          />
        );
      case 'size':
        return (
          <TabSize
            form={form}
            errors={currentErrors}
            setField={setField}
            setResidentialField={setResidentialField}
            setCommercialField={setCommercialField}
            setConstructionField={setConstructionField}
            fieldConfig={fieldConfig}
          />
        );
      case 'pricing':
        return (
          <TabPricing
            form={form}
            errors={currentErrors}
            setField={setField}
            setInstallmentField={setInstallmentField}
            setRentalField={setRentalField}
            setListingType={setListingType}
            fieldConfig={fieldConfig}
          />
        );
      case 'charges':
        return (
          <TabCharges
            form={form}
            errors={currentErrors}
            setField={setField}
          />
        );
      case 'features':
        return (
          <TabFeatures
            form={form}
            errors={currentErrors}
            setField={setField}
            setParkingField={setParkingField}
            fieldConfig={fieldConfig}
          />
        );
      case 'media':
        return (
          <TabMedia
            form={form}
            errors={currentErrors}
            setField={setField}
          />
        );
      default:
        return (
          <TabBasics
            form={form}
            errors={currentErrors}
            setField={setField}
            setResidentialField={setResidentialField}
            setPlotField={setPlotField}
            setCommercialField={setCommercialField}
            setAgriculturalField={setAgriculturalField}
            setRentalField={setRentalField}
            fieldConfig={fieldConfig}
          />
        );
    }
  };

  // ── Show payment summary on desktop (pricing/charges tabs or always)
  const showSummary =
    activeTab === 'pricing' ||
    activeTab === 'charges' ||
    activeTab === 'media';

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* ── Sticky Progress Bar ── */}
      <ProgressBar
        activeTab={activeTab}
        tabStatuses={tabStatuses}
        completedTabCount={completedTabCount}
        lastSaved={lastSaved}
        isDirty={isDirty}
        onSaveDraft={saveDraft}
      />

      {/* ── Page Header ── */}
      <div className="max-w-5xl mx-auto px-4 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#004063]">
              Add New Property
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Listing as{' '}
              <span className="font-medium text-[#029bba]">
                {ROLE_LABELS[role] ?? role}
              </span>
              {form.listingType && (
                <>
                  {' · '}
                  <span className="font-medium">
                    {LISTING_TYPE_LABELS[form.listingType as ListingType]}
                  </span>
                </>
              )}
            </p>
          </div>

          {/* Draft indicator (desktop) */}
          {isDirty && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[#f59e0b] bg-amber-50 px-3 py-1.5 rounded-full font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-pulse" />
              Unsaved changes
            </span>
          )}
        </div>
      </div>

      {/* ── Tab Clickable Navigation ── */}
      <div className="max-w-5xl mx-auto px-4 mb-4">
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            const tabStatus = tabStatuses[tab.id];

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5
                  rounded-xl text-sm font-medium
                  transition-all duration-150
                  ${isActive
                    ? 'bg-[#029bba] text-white shadow-md'
                    : tabStatus === 'complete'
                    ? 'bg-[#10b981] bg-opacity-10 text-[#10b981] hover:bg-opacity-20'
                    : tabStatus === 'error'
                    ? 'bg-red-50 text-[#ef4444] hover:bg-red-100'
                    : 'text-gray-600 hover:bg-gray-100'
                  }
                `}
              >
                <span aria-hidden="true">{tab.icon}</span>
                <span>{tab.label}</span>
                {!isActive && tabStatus === 'complete' && (
                  <span className="text-xs">✓</span>
                )}
                {!isActive && tabStatus === 'error' && (
                  <span className="text-xs">⚠</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Submit Error Banner ── */}
      {submitError && (
        <div className="max-w-5xl mx-auto px-4 mb-4">
          <div className="bg-[#fef2f2] border-l-4 border-[#ef4444] px-4 py-3 rounded-r-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-[#ef4444] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-700">
                Submission Failed
              </p>
              <p className="text-sm text-red-600 mt-0.5">{submitError}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content Area ── */}
      <div className="max-w-5xl mx-auto px-4 pb-32">
        <div className="flex gap-6">
          {/* ── Left: Tab Content ── */}
          <div className={`flex-1 min-w-0 ${showSummary ? 'lg:pr-0' : ''}`}>
            {renderTab()}
          </div>

          {/* ── Right: Payment Summary Sidebar (desktop only) ── */}
          {showSummary && (
            <div className="hidden lg:block w-80 flex-shrink-0">
              <PaymentSummaryCard
                listingType={form.listingType}
                price={form.price}
                tokenAmount={form.tokenAmount}
                installmentPlan={form.installmentPlan}
                rentalDetails={form.rentalDetails}
                extraCharges={{
                  cornerCharges: form.extraCharges.cornerCharges,
                  developmentCharges: form.extraCharges.developmentCharges,
                  electricityConnectionCharges: form.extraCharges.electricityConnectionCharges,
                  gasConnectionCharges: form.extraCharges.gasConnectionCharges,
                  waterConnectionCharges: form.extraCharges.waterConnectionCharges,
                  parkingCharges: form.extraCharges.parkingCharges,
                  floorPremium: form.extraCharges.floorPremium,
                  viewPremium: form.extraCharges.viewPremium,
                  otherCharges: form.extraCharges.otherCharges,
                }}
                possessionCharges={{
                  total: form.possessionCharges.total,
                }}
                compact
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky Bottom Navigation ── */}
      <TabNavigation
        activeTab={activeTab}
        tabStatuses={tabStatuses}
        isSubmitting={isSubmitting}
        isDirty={isDirty}
        onPrev={goToPrevTab}
        onNext={goToNextTab}
        onSaveDraft={saveDraft}
        onSubmit={submitForm}
      />
    </div>
  );
}