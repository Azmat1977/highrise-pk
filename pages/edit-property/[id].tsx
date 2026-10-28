// File: pages/edit-property/[id].tsx
// Secured property editing gateway utilizing the main ListingForm wizard in PATCH mode

import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";

import PropertyListingForm from "@/components/property/forms/listing/PropertyListingForm";
import { propertyToListingFormState } from "@/components/property/forms/listing/propertyFormAdapter";
import type { ListingFormState } from "@/components/property/forms/listing/types";

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
  property?: Record<string, unknown>;
  verificationSummary?: VerificationSummary;
};

export default function EditPropertyPage(): React.ReactElement {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";

  const [initialForm, setInitialForm] = useState<ListingFormState | null>(null);
  const [verification, setVerification] = useState<VerificationSummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!router.isReady || !id) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        // Query correct owner-secured endpoint check instead of public API endpoint
        const res = await fetch(`/api/owner/listings/${encodeURIComponent(id)}`, {
          credentials: "include",
        });
        const data = (await res.json()) as OwnerPropertyResponse;

        if (!res.ok || !data.success || !data.property) {
          if (!cancelled) {
            setError(data.message || "Property listing details could not be loaded.");
          }
          return;
        }

        const rawProperty = data.property as Record<string, any>;
        const verStatus = rawProperty?.verification?.status || "draft";

        // Lock editing only if under active moderation review or flagged
        if (verStatus === "under_review" || verStatus === "flagged") {
          if (!cancelled) {
            setError(
              verStatus === "flagged"
                ? "This property has been flagged and is locked from editing. Please contact support."
                : "This property is currently under active review by our moderation team. Editing is temporarily locked until review is complete."
            );
          }
          return;
        }

        if (!cancelled) {
          setInitialForm(propertyToListingFormState(data.property));
          setVerification({
            status: verStatus,
            rejectionReason: typeof rawProperty?.verification?.rejectionReason === "string" 
              ? rawProperty.verification.rejectionReason 
              : null,
          });
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load Property.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [router.isReady, id]);

  return (
    <>
      <Head>
        <title>Edit Property | Highrise.pk</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <div className="min-h-screen bg-[#f8f9fa] pb-12">
        <div className="max-w-4xl mx-auto px-4 pt-5 mb-4">
          <Link
            href="/owner/listings"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#004063] hover:text-[#029bba]"
          >
            <ArrowLeft className="w-4 h-4" /> Back to My Listings
          </Link>
        </div>

        {loading && (
          <div className="min-h-[55vh] flex items-center justify-center">
            <div className="text-center text-gray-600">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-[#029bba]" />
              Loading listing parameters...
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="max-w-xl mx-auto px-4 py-16 animate-fadeIn">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
              <div className="flex gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                <div>
                  <h1 className="font-semibold text-[#004063]">
                    Property cannot be edited
                  </h1>
                  <p className="text-sm text-gray-700 mt-2">{error}</p>
                  {verification?.rejectionReason && (
                    <div className="text-sm text-red-700 mt-3 p-3 bg-red-50 rounded-xl border border-red-100">
                      <strong>Rejection note:</strong> {verification.rejectionReason}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Load main 4-step wizard with reverse-mapped state */}
        {!loading && !error && initialForm && (
          <div className="animate-fadeIn">
            <PropertyListingForm editId={id} initialState={initialForm} />
          </div>
        )}
      </div>
    </>
  );
}