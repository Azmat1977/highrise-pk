// File: pages/property/[slug].tsx
// ISR public property detail page -- canonical slug-based URL
// Refactored Thin Page Orchestrator with Full-Width Section Parity

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import type { GetStaticProps, GetStaticPaths } from "next";

import UniversalInquiryModal from "@/components/UniversalInquiryModal";
import LoginOrSignupForm from "@/components/auth/LoginOrSignupForm";
import SimilarProperties from "@/components/property/SimilarProperties";
import { PropertyDetailSkeleton } from "@/components/skeletons/PropertyDetailSkeleton";
import TrueCostCard, {
  TrueCostBreakdown,
  ListingType,
} from "@/components/property/TrueCostCard";
import ReportListingModal from "@/components/property/ReportListingModal";
import { addToRecentlyViewed } from "@/lib/recently-viewed";
import AleemWidget from "@/components/aleem/AleemWidget";
import PropertyLocationInsights from "@/components/property-detail/PropertyLocationInsights";
import UniversalContactCard from "@/components/shared/UniversalContactCard";
import SafeDealSidebarCard from "@/components/shared/SafeDealSidebarCard";
import SafetyWarningCard from "@/components/shared/SafetyWarningCard";
import ShareMenu from "@/components/projects/ShareMenu";
import PropertyMediaExplorer from "@/components/property/PropertyMediaExplorer";
import { useFavorites } from "@/hooks/useFavorites";
import { useCompare } from "@/hooks/useCompare";

// Modular Section Components
import PropertyHeroGallery from "@/components/property-detail/PropertyHeroGallery";
import PropertyOverviewHeader from "@/components/property-detail/PropertyOverviewHeader";
import PropertyHighlights from "@/components/property-detail/PropertyHighlights";
import PropertyDescription from "@/components/property-detail/PropertyDescription";
import PropertyPaymentPlan from "@/components/property-detail/PropertyPaymentPlan";
import PropertyCharges from "@/components/property-detail/PropertyCharges";
import PropertyDetails from "@/components/property-detail/PropertyDetails";
import PropertyAmenities from "@/components/property-detail/PropertyAmenities";
import PropertyVideo from "@/components/property-detail/PropertyVideo";
import PropertyMetaInfo from "@/components/property-detail/PropertyMetaInfo";
import PropertyMobileStickyBar from "@/components/property-detail/PropertyMobileStickyBar";

import {
  stripHtml,
  truncate,
  formatPrice,
  normalizePkMobile,
  getOptimizedImageUrl,
  extractVideoId,
} from "@/components/property-detail/propertyDetailUtils";

import { icons } from "@/lib/design-system/icons";

// ----------------------------------------------------------------------------
// Interfaces
// ----------------------------------------------------------------------------

interface PropertyOwner {
  _id: string;
  name?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  profilePictureUrl?: string;
}

interface InstallmentPlan {
  planName?: string;
  developerName?: string;
  planDuration?: number;
  planDurationUnit?: string;
  hasMonthly?: boolean;
  monthlyAmount?: number;
  monthlyCount?: number;
  hasQuarterly?: boolean;
  quarterlyAmount?: number;
  quarterlyCount?: number;
  hasHalfYearly?: boolean;
  halfYearlyAmount?: number;
  halfYearlyCount?: number;
  hasYearly?: boolean;
  yearlyAmount?: number;
  yearlyCount?: number;
}

interface BookingPayment {
  amount?: number;
  percentage?: number;
  dueDate?: string;
  isPaid?: boolean;
}

interface PossessionPayment {
  amount?: number;
  percentage?: number;
  dueDate?: string;
  isPaid?: boolean;
}

interface PropertyImage {
  url: string;
  public_id?: string;
}

interface Property {
  _id: string;
  slug?: string;
  owner: PropertyOwner;
  title: string;
  description: string;
  propertyType: string;
  propertySubtype?: string;
  propertyCategory?: string;
  listingType: string;
  listingPurpose?: string;
  price: number;
  totalPrice?: number;
  pricePerUnit?: number;
  priceNegotiable?: boolean;
  area: number;
  unit: string;
  city: string;
  society?: string;
  phase?: string;
  block?: string;
  streetNumber?: string;
  plotNumber?: string;
  completeAddress?: string;
  formattedAddress?: string;
  nearbyLandmarks?: string[];
  coordinates?: { lat: number; lng: number };
  bedrooms?: number;
  bathrooms?: number;
  kitchens?: number;
  balconies?: number;
  storeRooms?: number;
  floorNumber?: number;
  totalFloors?: number;
  furnished?: string;
  condition?: string;
  facing?: string;
  possessionStatus?: string;
  ownershipType?: string;
  amenities?: string[];
  nearbyFacilities?: Array<{ name: string; category?: string; distance?: string }>;
  parking?: string | number;
  isBankFinanceAvailable?: boolean;
  booking?: BookingPayment;
  downPayment?: BookingPayment;
  installmentPlan?: InstallmentPlan;
  possession?: PossessionPayment;
  projectDetails?: {
    projectName?: string;
    developerName?: string;
    projectStatus?: string;
    developmentProgress?: number;
    launchDate?: string;
    expectedCompletionDate?: string;
  };
  approvals?: { authority?: string };
  legal?: { ownershipType?: string };
  extraCharges?: Record<string, number | undefined>;
  possessionCharges?: { total?: number; description?: string };
  transferCharges?: Record<string, number | undefined>;
  governmentTaxes?: Record<string, number | undefined>;
  videoUrl?: string;
  virtualTourUrl?: string;
  images: PropertyImage[];
  status: "pending" | "approved" | "rejected";
  verification?: { status?: "draft" | "pending" | "under_review" | "verified" | "rejected" | "flagged" };
  isVerified: boolean;
  views: number;
  createdAt: string;
  updatedAt: string;
  projectId?: string;
  listingActor?: { role: 'developer' | 'agent' | 'owner'; label: string; displayName: string; profileSlug?: string; profileImageUrl?: string; verified?: boolean } | null;
}

type InquiryLeadType = "project_interest" | "call_back" | "site_visit" | "general_inquiry";

function CopyBanner({ message, onDismiss }: { message: string; onDismiss: () => void }): React.ReactElement {
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-5 py-3 rounded-xl bg-[#004063] text-white text-sm font-medium shadow-xl animate-fadeIn">
      <icons.CheckCircle className="w-4 h-4 text-[#10b981] flex-shrink-0" />
      {message}
      <button
        type="button"
        onClick={onDismiss}
        className="ml-2 text-white/60 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <icons.X className="w-4 h-4" />
      </button>
    </div>
  );
}

interface PageProps {
  initialProperty: Property | null;
}

export default function PropertySlugPage({ initialProperty }: PageProps): React.ReactElement {
  const router = useRouter();
  const { data: session } = useSession();
  const favorites = useFavorites({ defaultEntityType: "property" });
  const compare = useCompare({ defaultEntityType: "property" });

  const [property, setProperty] = useState<Property | null>(initialProperty ?? null);
  const [loading, setLoading] = useState(!initialProperty);
  const [error, setError] = useState("");

  const [trueCostLoading, setTrueCostLoading] = useState(false);
  const [trueCostError, setTrueCostError] = useState("");
  const [trueCostBreakdown, setTrueCostBreakdown] = useState<TrueCostBreakdown | null>(null);

  const [selectedImage, setSelectedImage] = useState(0);
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [explorerTab, setExplorerTab] = useState<"media" | "video" | "map">("media");
  const [explorerPhotoIdx, setExplorerPhotoIdx] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [revealedContact, setRevealedContact] = useState<{ phone?: string | null; whatsapp?: string | null } | null>(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [inquiryLeadType, setInquiryLeadType] = useState<InquiryLeadType>("general_inquiry");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const [showJumpLinks, setShowJumpLinks] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");

  const [copyBanner, setCopyBanner] = useState("");
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showCopyBanner = useCallback((msg: string) => {
    setCopyBanner(msg);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopyBanner(""), 3000);
  }, []);

  useEffect(() => () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
  }, []);

  const isInstallment = property?.listingType === "installment";
  const isRent = property?.listingType === "rent";
  const isCommercial =
    property?.propertyCategory === "commercial" ||
    /shop|office|plaza|mall|commercial/i.test(property?.propertyType ?? "");

  const fullLocation = useMemo(() => {
    const parts: string[] = [];
    if (property?.plotNumber) parts.push(`Plot ${property.plotNumber}`);
    if (property?.streetNumber) parts.push(property.streetNumber);
    if (property?.block) parts.push(property.block);
    if (property?.phase) parts.push(property.phase);
    if (property?.society) parts.push(property.society);
    if (property?.city) parts.push(property.city);
    return parts.filter(Boolean).join(", ");
  }, [property]);

  const sessionUser = session?.user as { _id?: string; id?: string; name?: string; email?: string; role?: string } | undefined;
  const isLoggedIn = !!sessionUser;
  const isSaved = property ? favorites.isFavorite(property._id, "property") : false;
  const isCompared = property ? compare.isInCompare(property._id, "property") : false;

  useEffect(() => {
    if (!sessionUser || !property) return;
    const uid = sessionUser._id ?? sessionUser.id ?? "";
    setIsOwner(!!uid && uid === property.owner?._id);
  }, [sessionUser, property]);

  const fetchProperty = useCallback(async (slug: string, signal: AbortSignal) => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/properties/by-slug/${encodeURIComponent(slug)}`, { signal });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Property not found");
        setProperty(null);
        return;
      }
      const data = (await res.json()) as { property: Property };
      setProperty(data.property ?? null);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError("Property not found");
      setProperty(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    if (initialProperty) {
      setProperty(initialProperty);
      setError("");
      setLoading(false);
      setSelectedImage(0);
      setExplorerOpen(false);
      setRevealedContact(null);
      setTrueCostBreakdown(null);
      setTrueCostError("");
      setIsOwner(false);
      setActiveSection("overview");
      return;
    }
    const slug = router.query.slug;
    if (!slug || typeof slug !== "string") {
      setError("Invalid property link");
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    fetchProperty(slug, controller.signal);
    return () => controller.abort();
  }, [router.isReady, router.query.slug, initialProperty, fetchProperty]);

  useEffect(() => {
    if (!property?._id || property.verification?.status !== "verified") return;
    const slug = property.slug;
    if (!slug) return;

    const controller = new AbortController();
    const run = async () => {
      try {
        setTrueCostLoading(true);
        setTrueCostError("");
        setTrueCostBreakdown(null);

        const res = await fetch(`/api/properties/true-cost?slug=${encodeURIComponent(slug)}`, { signal: controller.signal });
        if (!res.ok) {
          const errBody = (await res.json().catch(() => ({}))) as { message?: string };
          setTrueCostError(errBody.message ?? "True cost data not available for this property.");
          return;
        }

        const data = (await res.json()) as {
          success?: boolean;
          trueCost?: {
            basePrice?: number;
            bookingAmount?: number;
            downPaymentAmount?: number;
            totalInstallmentsAmount?: number;
            possessionAmount?: number;
            extraChargesTotal?: number;
            possessionChargesTotal?: number;
            governmentTaxBuyerFiler?: number;
            transferChargesTotal?: number;
            maintenanceAnnual?: number;
            grandTotalBuyerFiler?: number;
            hiddenChargesDisclosed?: boolean;
          };
          message?: string;
        };

        if (!data.success || !data.trueCost) {
          setTrueCostError(data.message ?? "Unable to load true cost");
          return;
        }

        const tc = data.trueCost;
        const items: TrueCostBreakdown["items"] = [];

        if ((tc.bookingAmount ?? 0) > 0) items.push({ key: "booking", label: "Booking Amount", amount: tc.bookingAmount ?? 0 });
        if ((tc.downPaymentAmount ?? 0) > 0) items.push({ key: "down_payment", label: "Down Payment", amount: tc.downPaymentAmount ?? 0 });
        if ((tc.totalInstallmentsAmount ?? 0) > 0) items.push({ key: "installments", label: "Total Installments", amount: tc.totalInstallmentsAmount ?? 0 });
        if ((tc.possessionAmount ?? 0) > 0) items.push({ key: "possession", label: "Possession Amount", amount: tc.possessionAmount ?? 0 });
        if ((tc.extraChargesTotal ?? 0) > 0) items.push({ key: "extra_charges", label: "Extra Charges", amount: tc.extraChargesTotal ?? 0, note: "Society development, club, utilities, etc." });
        if ((tc.possessionChargesTotal ?? 0) > 0) items.push({ key: "possession_charges", label: "Possession Charges", amount: tc.possessionChargesTotal ?? 0 });
        if ((tc.transferChargesTotal ?? 0) > 0) items.push({ key: "transfer_charges", label: "Transfer Charges", amount: tc.transferChargesTotal ?? 0, note: "Stamp duty, registration, transfer fee" });
        if ((tc.governmentTaxBuyerFiler ?? 0) > 0) items.push({ key: "gov_tax_filer", label: "Government Tax (Filer)", amount: tc.governmentTaxBuyerFiler ?? 0, note: "Lower rate for tax filers" });
        if ((tc.maintenanceAnnual ?? 0) > 0) items.push({ key: "maintenance_annual", label: "Annual Maintenance", amount: tc.maintenanceAnnual ?? 0, note: "Estimated per year" });

        const basePrice = tc.basePrice ?? property.price ?? 0;
        const total = tc.grandTotalBuyerFiler ?? basePrice;
        const subtotal = items.reduce((s, it) => s + (it.amount || 0), 0) + basePrice;

        setTrueCostBreakdown({
          total,
          subtotal,
          currency: "PKR",
          listingType: (property.listingType as ListingType) ?? "full_payment",
          baseLabel: "Base Listing Price",
          baseAmount: basePrice,
          disclaimer: tc.hiddenChargesDisclosed
            ? "Seller has disclosed all known charges. Final amounts may vary based on society rules."
            : "Estimates only -- final amounts depend on society and government rules at transfer.",
          items,
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setTrueCostError("Unable to load true cost");
      } finally {
        setTrueCostLoading(false);
      }
    };

    run();
    return () => controller.abort();
  }, [property?._id, property?.verification?.status, property?.slug, property?.price, property?.listingType]);

  useEffect(() => {
    if (!property?._id) return;
    addToRecentlyViewed({
      _id: property._id,
      slug: property.slug,
      title: property.title,
      price: property.price,
      city: property.city,
      images: property.images?.map((img) => img.url),
      propertyType: property.propertyType,
      viewedAt: new Date().toISOString(),
    });
  }, [property?._id, property?.slug, property?.title, property?.price, property?.city, property?.images, property?.propertyType]);

  const openExplorer = useCallback((tab: "media" | "video" | "map", photoIdx = 0) => {
    setExplorerTab(tab);
    setExplorerPhotoIdx(photoIdx);
    setExplorerOpen(true);
  }, []);

  const phoneValue = revealedContact?.phone ?? "";
  const canRevealPhone = !!phoneValue;
  const waValue = normalizePkMobile(revealedContact?.whatsapp ?? "");
  const canWhatsapp = !!waValue;

  const getCleanPropertyId = useCallback((p: Property | null): string => {
    if (!p) return "";
    if (typeof p._id === "string" && p._id && p._id !== "[object Object]") return p._id;
    return p.slug || "";
  }, []);

  const revealContact = useCallback(async (): Promise<void> => {
    const targetId = getCleanPropertyId(property);
    if (!targetId || contactLoading) return;
    if (!isLoggedIn) { setShowAuthModal(true); return; }
    setContactLoading(true);
    try {
      const res = await fetch(`/api/properties/${encodeURIComponent(targetId)}/contact`, { headers: { Accept: "application/json" } });
      const data = await res.json() as { success?: boolean; contact?: typeof revealedContact; message?: string };
      if (res.ok && data.success && data.contact) {
        setRevealedContact(data.contact);
      } else {
        showCopyBanner(data.message ?? "Contact details are not available. You can send an inquiry instead.");
      }
    } catch {
      showCopyBanner("Contact details could not be loaded. You can send an inquiry instead.");
    } finally {
      setContactLoading(false);
    }
  }, [property, getCleanPropertyId, contactLoading, isLoggedIn, showCopyBanner]);

  const jumpLinks = useMemo(() => {
    if (!property) return [];
    const links: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
      { id: "overview", label: "Overview", icon: icons.LayoutGrid },
    ];
    if (isInstallment) links.push({ id: "payment-plan", label: "Payment Plan", icon: icons.CreditCard });
    if (trueCostLoading || !!trueCostBreakdown) links.push({ id: "true-cost", label: "True Cost", icon: icons.Receipt });
    const hasCharges = !!trueCostBreakdown || trueCostLoading || !!property.extraCharges || !!property.possessionCharges || !!property.transferCharges || !!property.governmentTaxes;
    if (hasCharges && !isRent) links.push({ id: "charges", label: "Charges", icon: icons.Banknote });
    links.push({ id: "details", label: "Details", icon: icons.Info });
    links.push({ id: "location", label: "Location", icon: icons.MapPin });
    if (property.amenities?.length) links.push({ id: "amenities", label: "Amenities", icon: icons.CheckCircle });
    links.push({ id: "description", label: "Description", icon: icons.FileText });
    if (property.videoUrl) links.push({ id: "video-section", label: "Video", icon: icons.Play });
    links.push({ id: "contact", label: "Contact", icon: icons.Phone });
    return links;
  }, [property, isInstallment, isRent, trueCostLoading, trueCostBreakdown]);

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.pageYOffset - 80,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    if (!property) return;
    const handler = () => {
      const scrollY = window.scrollY;
      setShowJumpLinks(scrollY > 300);
      const sectionIds = jumpLinks.map((l) => l.id).filter((id) => id !== "contact");
      let current = "overview";
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 200) current = id;
      }
      if (scrollY + window.innerHeight >= document.documentElement.scrollHeight - 200) current = "contact";
      setActiveSection(current);
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [property, jumpLinks]);

  const canonicalUrl = useMemo(() => {
    const slug = property?.slug ?? property?._id ?? "";
    return `https://highrise.pk/property/${slug}`;
  }, [property]);

  const metaDescription = useMemo(() => {
    if (!property?.description) return "Find verified properties in Pakistan on Highrise.pk.";
    return truncate(stripHtml(property.description) || "Find verified properties in Pakistan on Highrise.pk.", 160);
  }, [property?.description]);

  const ogImage = useMemo(() => {
    if (!property?.images?.length) return "";
    return getOptimizedImageUrl(property.images[0].url, 1200);
  }, [property?.images]);

  const heroMapUrl = useMemo(() => {
    if (!property) return "";
    if (property.coordinates?.lat && property.coordinates?.lng) {
      return `https://maps.google.com/maps?q=${property.coordinates.lat},${property.coordinates.lng}&z=15&output=embed`;
    }
    const addr = property.formattedAddress ?? property.completeAddress ?? fullLocation;
    if (!addr) return "";
    return `https://maps.google.com/maps?q=${encodeURIComponent(addr)}&z=15&output=embed`;
  }, [property, fullLocation]);

  const videoInfo = useMemo(() => (property?.videoUrl ? extractVideoId(property.videoUrl) : null), [property?.videoUrl]);

  const videoCount = useMemo(() => {
    let c = 0;
    if (property?.videoUrl) c++;
    if (property?.virtualTourUrl) c++;
    return c;
  }, [property?.videoUrl, property?.virtualTourUrl]);

  if (loading) return <PropertyDetailSkeleton />;

  if (error || !property) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center px-4">
        <Head>
          <title>Property Not Found | Highrise.pk</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center max-w-md w-full">
          <icons.Home className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#004063] mb-2">Property Not Found</h2>
          <p className="text-[#666666] mb-6">{error || "This property does not exist or has been removed."}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/properties" className="px-5 py-2.5 rounded-xl bg-[#029bba] text-white font-semibold text-sm hover:bg-[#017a8a] transition-colors">
              Browse Properties
            </Link>
            <Link href="/" className="px-5 py-2.5 rounded-xl border border-gray-200 text-[#333333] font-semibold text-sm hover:bg-gray-50 transition-colors">
              Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const contactCardNode = (
    <div className="space-y-6 w-full">
      <UniversalContactCard
        entityType="property"
        entityId={getCleanPropertyId(property)}
        entityTitle={property.title}
        actorName={property.listingActor?.displayName ?? "Property Seller"}
        actorRole={property.listingActor?.label ?? "Seller"}
        actorImage={property.listingActor?.profileImageUrl}
        brandLogo="/images/logo.png"
        isVerified={!!property.listingActor?.verified}
      />
      <SafeDealSidebarCard />
      <SafetyWarningCard onReport={() => setShowReportModal(true)} />
    </div>
  );

  return (
    <>
      <Head>
        <title>{property.title} | Highrise.pk</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={`${property.title} | Highrise.pk`} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={canonicalUrl} />
        {ogImage && <meta property="og:image" content={ogImage} />}
      </Head>

      <div className="min-h-screen bg-[#f8f9fa] pb-24 lg:pb-0">
        {copyBanner && <CopyBanner message={copyBanner} onDismiss={() => setCopyBanner("")} />}

        {/* Sticky Jump Links */}
        <div className={`fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-md transition-all duration-300 ${showJumpLinks ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"}`}>
          <div className="max-w-7xl mx-auto px-4">
            <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-3">
              {jumpLinks.map((link) => {
                const Icon = link.icon;
                const active = activeSection === link.id;
                return (
                  <button
                    key={link.id}
                    onClick={() => scrollToSection(link.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${active ? "bg-[#029bba] text-white shadow-sm" : "text-[#666666] hover:bg-gray-100"}`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content Layout Container */}
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-6 lg:py-8">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-gray-500 overflow-x-auto scrollbar-hide mb-4">
            <Link href="/" className="hover:text-[#029bba] flex items-center gap-1 transition-colors flex-shrink-0">
              <icons.Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>
            <icons.ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <Link href="/properties" className="hover:text-[#029bba] transition-colors flex-shrink-0">
              Properties
            </Link>
            {property.city && (
              <>
                <icons.ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                <Link href={`/properties?city=${encodeURIComponent(property.city)}`} className="hover:text-[#029bba] transition-colors flex-shrink-0">
                  {property.city}
                </Link>
              </>
            )}
            <icons.ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <span className="font-semibold text-gray-900 truncate max-w-[200px] sm:max-w-[300px]">
              {property.title}
            </span>
          </nav>

          {/* Hero Gallery Component (Full-Width 1120px) */}
          <PropertyHeroGallery
            images={property.images}
            title={property.title}
            listingType={property.listingType}
            isVerified={property.isVerified}
            status={property.status}
            isOwner={isOwner}
            isSaved={isSaved}
            isCompared={isCompared}
            videoCount={videoCount}
            heroMapUrl={heroMapUrl}
            selectedImage={selectedImage}
            onShare={() => setShareOpen(true)}
            onSave={() => property._id && void favorites.toggle(property._id, "property")}
            onCompare={() => property._id && void compare.toggle(property._id, "property")}
            openExplorer={openExplorer}
          />

          {/* TWO-COLUMN GRID (Content + 340px Natural Scroll Sidebar) */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6">
            {/* Left Column (Paired with Sidebar) */}
            <div className="space-y-6 min-w-0">
              <PropertyOverviewHeader
                title={property.title}
                price={property.price}
                totalPrice={property.totalPrice}
                pricePerUnit={property.pricePerUnit}
                priceNegotiable={property.priceNegotiable}
                unit={property.unit}
                isRent={isRent}
                fullLocation={fullLocation}
                projectId={property.projectId}
                listingActor={property.listingActor}
              />

              <PropertyHighlights
                propertyType={property.propertyType}
                area={property.area}
                unit={property.unit}
                bedrooms={property.bedrooms}
                bathrooms={property.bathrooms}
                parking={property.parking}
                possessionStatus={property.possessionStatus}
              />

              <PropertyDescription description={property.description} />

              <div id="true-cost">
                <TrueCostCard loading={trueCostLoading} error={trueCostError} breakdown={trueCostBreakdown} />
              </div>

              {isInstallment && (
                <PropertyPaymentPlan
                  booking={property.booking}
                  downPayment={property.downPayment}
                  installmentPlan={property.installmentPlan}
                  possession={property.possession}
                  totalPrice={property.totalPrice ?? property.price}
                  projectDetails={property.projectDetails}
                  approvals={property.approvals}
                  legal={property.legal}
                  isBankFinanceAvailable={property.isBankFinanceAvailable}
                />
              )}

              {!isRent && (trueCostLoading || !!trueCostBreakdown || !!property.extraCharges || !!property.possessionCharges || !!property.transferCharges || !!property.governmentTaxes) && (
                <PropertyCharges loading={trueCostLoading} error={trueCostError} breakdown={trueCostBreakdown} />
              )}

              <PropertyDetails
                propertySubtype={property.propertySubtype}
                floorNumber={property.floorNumber}
                totalFloors={property.totalFloors}
                furnished={property.furnished}
                condition={property.condition}
                facing={property.facing}
                ownershipType={property.ownershipType}
                isCommercial={isCommercial}
              />
            </div>

            {/* Right Column (Locked 340px Sidebar Stack) */}
            <div className="relative min-w-0 w-full max-w-[340px] justify-self-end">
              {contactCardNode}
            </div>
          </div>

          {/* FULL-WIDTH SECTIONS (Stretches across 1120px after Sidebar Ends) */}
          <div className="mt-8 lg:mt-12 space-y-8 lg:space-y-12">
            <PropertyLocationInsights property={property} fullLocation={fullLocation} heroMapUrl={heroMapUrl} />

            <PropertyAmenities amenities={property.amenities} />

            <PropertyVideo videoInfo={videoInfo} />

            <PropertyMetaInfo createdAt={property.createdAt} views={property.views} propertyId={property._id} />

            <SimilarProperties
              currentProperty={{
                _id: property._id,
                city: property.city,
                propertyType: property.propertyType,
                listingType: property.listingType,
              }}
            />
          </div>
        </div>

        {/* FULL-WIDTH BOTTOM SAFETY DISCLAIMER (Project Page Parity) */}
        <div className="bg-amber-50 border-t border-amber-100 mt-12">
          <div className="max-w-6xl mx-auto px-4 py-5">
            <div className="flex items-start gap-3">
              <icons.Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">
                <strong className="text-amber-800">Disclaimer:</strong>{" "}
                Highrise.pk verifies listing details to the best of our ability. We strongly recommend
                visiting the property site, verifying documents independently, and consulting legal counsel
                before any financial commitment.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Bar */}
      <PropertyMobileStickyBar
        price={property.price}
        totalPrice={property.totalPrice}
        isRent={isRent}
        isLoggedIn={isLoggedIn}
        canRevealPhone={canRevealPhone}
        phoneValue={phoneValue}
        canWhatsapp={canWhatsapp}
        waValue={waValue}
        propertyTitle={property.title}
        canonicalUrl={canonicalUrl}
        onLoginClick={() => setShowAuthModal(true)}
        onCallbackClick={() => {
          setInquiryLeadType("call_back");
          setShowInquiryModal(true);
        }}
      />

      {/* Modals & Media Explorer */}
      <UniversalInquiryModal
        isOpen={showInquiryModal}
        onClose={() => setShowInquiryModal(false)}
        entityType="property"
        entityId={getCleanPropertyId(property)}
        entityTitle={property.title}
        entityPrice={property.totalPrice ?? property.price}
        entityLocation={fullLocation}
        entityImage={property.images?.[0]?.url}
        developerName={property.listingActor?.displayName ?? "Property seller"}
        leadType={inquiryLeadType}
        buttonText={inquiryLeadType === "site_visit" ? "Schedule Visit" : inquiryLeadType === "call_back" ? "Request Callback" : "Send Inquiry"}
      />

      {showAuthModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAuthModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-fadeIn">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-[#666666] transition-colors"
              aria-label="Close"
            >
              <icons.X className="w-4 h-4" />
            </button>
            <div className="pt-8">
              <LoginOrSignupForm
                isModal={true}
                context="contact"
                onSuccess={() => {
                  setShowAuthModal(false);
                  if (property) void revealContact();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {showReportModal && (
        <ReportListingModal
          open={showReportModal}
          onClose={() => setShowReportModal(false)}
          propertyId={getCleanPropertyId(property)}
          reporterUserId={sessionUser?._id ?? sessionUser?.id ?? ""}
          reporterEmail={sessionUser?.email ?? ""}
          reporterPhone=""
        />
      )}

      <PropertyMediaExplorer
        isOpen={explorerOpen}
        onClose={() => setExplorerOpen(false)}
        title={property.title}
        priceDisplay={`PKR ${formatPrice(property.totalPrice ?? property.price)}`}
        locationDisplay={fullLocation}
        images={property.images ?? []}
        videoUrl={property.videoUrl}
        mapEmbedUrl={heroMapUrl}
        initialTab={explorerTab}
        initialPhotoIdx={explorerPhotoIdx}
        contactCard={contactCardNode}
        onShare={() => setShareOpen(true)}
        isSaved={isSaved}
        onSave={() => property._id && void favorites.toggle(property._id, "property")}
      />

      <ShareMenu
        property={property}
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
      />

      <AleemWidget
        context={{
          type: "property",
          id: property._id,
          slug: property.slug,
          title: property.title,
          price: property.totalPrice ?? property.price,
          city: property.city,
          propertyType: property.propertyType,
          listingType: property.listingType,
          area: `${property.area} ${property.unit}`,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          society: property.society,
          canonicalUrl: canonicalUrl,
        }}
      />
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  return { paths: [], fallback: "blocking" };
};

function isMongoObjectId(value: string): boolean {
  return /^[a-f\d]{24}$/i.test(value);
}

export const getStaticProps: GetStaticProps<PageProps> = async ({ params }) => {
  const slug = params?.slug;
  if (!slug || typeof slug !== "string") return { notFound: true };

  try {
    const { getPublicPropertyBySlug } = await import("@/lib/property/propertyService");
    const result = await getPublicPropertyBySlug(slug);
    if (!result?.property) return { notFound: true };
    const property = JSON.parse(JSON.stringify(result.property)) as Property;

    if (isMongoObjectId(slug) && property.slug && property.slug !== slug) {
      return {
        redirect: {
          destination: `/property/${encodeURIComponent(property.slug)}`,
          permanent: true,
        },
      };
    }

    return { props: { initialProperty: property }, revalidate: 60 };
  } catch {
    return { notFound: true };
  }
};