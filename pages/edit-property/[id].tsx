import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';
import UnifiedPropertyForm from '@/components/property/forms/UnifiedPropertyForm';
import { propertyToUnifiedFormState } from '@/components/property/forms/shared/propertyFormAdapter';
import type { PropertyFormState } from '@/components/property/forms/shared/usePropertyForm';

type VerificationSummary = {
  status: string;
  submittedAt?: string | null;
  verifiedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
};

type OwnerPropertyResponse = {
  success?: boolean;
  message?: string;
  code?: string;
  property?: Record<string, unknown>;
  verificationSummary?: VerificationSummary;
};

export default function EditPropertyPage(): React.ReactElement {
  const router = useRouter();
  const id = typeof router.query.id === 'string' ? router.query.id : '';
  const [initialForm, setInitialForm] = useState<PropertyFormState | null>(null);
  const [verification, setVerification] = useState<VerificationSummary | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!router.isReady || !id) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/properties/${id}`, { credentials: 'include' });
        const data = await res.json() as OwnerPropertyResponse;
        if (!res.ok || !data.success || !data.property) {
          if (!cancelled) setError(data.message ?? 'Property could not be loaded for editing.');
          return;
        }
        const status = data.verificationSummary?.status ?? 'draft';
        if (status === 'under_review' || status === 'flagged') {
          if (!cancelled) {
            setVerification(data.verificationSummary ?? { status });
            setError(status === 'flagged'
              ? 'This Property is flagged and must be resolved through moderation before it can be edited.'
              : 'This Property is currently under review. Editing is temporarily locked until the review is complete.');
          }
          return;
        }
        if (!cancelled) {
          setInitialForm(propertyToUnifiedFormState(data.property));
          setVerification(data.verificationSummary ?? { status });
        }
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load Property.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [router.isReady, id]);

  return (
    <>
      <Head>
        <title>Edit Property | Highrise.pk</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <div className="min-h-screen bg-[#f8f9fa]">
        <div className="max-w-5xl mx-auto px-4 pt-5">
          <Link href="/my-properties" className="inline-flex items-center gap-2 text-sm font-medium text-[#004063] hover:text-[#029bba]">
            <ArrowLeft className="w-4 h-4" /> My Properties
          </Link>
        </div>

        {loading && (
          <div className="min-h-[55vh] flex items-center justify-center">
            <div className="text-center text-gray-600">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-[#029bba]" />
              Loading your Property…
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="max-w-xl mx-auto px-4 py-16">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <div className="flex gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                <div>
                  <h1 className="font-semibold text-[#004063]">Property cannot be edited right now</h1>
                  <p className="text-sm text-gray-700 mt-2">{error}</p>
                  {verification?.status === 'rejected' && verification.rejectionReason && (
                    <p className="text-sm text-red-700 mt-3"><strong>Review note:</strong> {verification.rejectionReason}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && initialForm && (
          <UnifiedPropertyForm
            mode="edit"
            propertyId={id}
            initialForm={initialForm}
            currentVerificationStatus={verification?.status ?? 'draft'}
          />
        )}
      </div>
    </>
  );
}
