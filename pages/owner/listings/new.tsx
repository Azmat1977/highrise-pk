// pages/owner/listings/new.tsx
// Owner: Create new property listing - Unified PropertyListingForm
// Only approved owners can access. Creates property with verification.status = 'draft'.

import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { Loader2, AlertCircle, ArrowLeft, Shield, Plus } from "lucide-react";
import OwnerLayout from "@/components/owner/OwnerLayout";
import PropertyListingForm from "@/components/property/forms/listing/PropertyListingForm";

function NewListingContent(): React.ReactElement {
  const [approved, setApproved] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [listingCount, setListingCount] = useState(0);
  const [listingLimit, setListingLimit] = useState(10);

  // Check owner approval + listing limit
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/owner/dashboard", {
          credentials: "include",
        });

        if (!res.ok) {
          setApproved(false);
          return;
        }

        const data = (await res.json()) as {
          success: boolean;
          owner?: { status?: string };
          stats?: { listingsUsed?: number; listingLimit?: number };
        };

        setApproved(data.owner?.status === "approved");
        setListingCount(data.stats?.listingsUsed ?? 0);
        setListingLimit(data.stats?.listingLimit ?? 10);
      } catch {
        setApproved(false);
      } finally {
        setChecking(false);
      }
    };
    void check();
  }, []);

  // Loading
  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#029bba] animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Checking owner status...</p>
        </div>
      </div>
    );
  }

  // Not approved
  if (approved === false) {
    return (
      <div className="max-w-2xl mx-auto p-6 md:p-10">
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-black text-[#004063] mb-2">
            Owner Verification Required
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            You must complete owner verification before creating listings.
            This helps us protect buyers and ensure listing quality.
          </p>
          <Link
            href="/owner/verify"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#029bba] text-white rounded-xl text-sm font-bold hover:bg-[#027a94] transition-colors shadow-md shadow-[#029bba]/20"
          >
            <Shield className="w-4 h-4" />
            Complete Verification
          </Link>
        </div>
      </div>
    );
  }

  // Listing limit reached
  if (listingCount >= listingLimit) {
    return (
      <div className="max-w-2xl mx-auto p-6 md:p-10">
        <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-black text-[#004063] mb-2">
            Listing Limit Reached
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            You have reached the maximum of {listingLimit} listings.
            Delete an existing listing to add a new one, or contact support
            to request a higher limit.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/owner/listings"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#029bba] text-white rounded-xl text-sm font-bold hover:bg-[#027a94] transition-colors"
            >
              Manage Listings
            </Link>
            <a
              href="mailto:support@highrise.pk?subject=Request%20higher%20listing%20limit"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Approved - render unified form
  return (
    <div className="p-4 md:p-6 pb-16 max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <Link
          href="/owner/listings"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#029bba] transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Listings
        </Link>
        <h1 className="text-2xl font-black text-[#004063] tracking-tight flex items-center gap-2">
          <Plus className="w-6 h-6 text-[#029bba]" />
          Create New Listing
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {listingCount} of {listingLimit} listings used - {" "}
          <span className="text-[#029bba] font-semibold">
            {listingLimit - listingCount} remaining
          </span>
        </p>
      </div>

      {/* Unified Property Listing Form */}
      <PropertyListingForm />
    </div>
  );
}

export default function NewOwnerListingPage(): React.ReactElement {
  return (
    <>
      <Head>
        <title>New Listing | Highrise.pk</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <OwnerLayout>
        <NewListingContent />
      </OwnerLayout>
    </>
  );
}