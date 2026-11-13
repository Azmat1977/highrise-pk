// pages/index.tsx
import React, { useState, useEffect } from 'react';
import Head from 'next/head';

import { icons } from '@/lib/design-system/icons';
import HomeHero from '@/components/home/HomeHero';
import BrowseCategories from '@/components/home/BrowseCategories';
import CityExplorer from '@/components/cities/CityExplorer';
import FeaturedProperties from '@/components/home/FeaturedProperties';
import DirectOwnerListings from '@/components/home/DirectOwnerListings';
import HomeTestimonials from '@/components/home/HomeTestimonials';
import PremiumAdBanner from '@/components/home/PremiumAdBanner';
import ResearchTools from '@/components/home/ResearchTools';
import ProjectShowcase from '@/components/home/ProjectShowcase';
import TrustSection from '@/components/home/TrustSection';
import VerifiedSocieties from '@/components/home/VerifiedSocieties';
import DevelopersPartners from '@/components/home/DevelopersPartners';
import HomeBlog from '@/components/home/HomeBlog';
import HomeNewsletter from '@/components/home/HomeNewsletter';
import PopularSearches from '@/components/home/PopularSearches';
import FinalCta from '@/components/home/FinalCta';

// ===== Types =====

interface PropertyItem {
  _id: string;
  id?: string;
  title: string;
  slug?: string;
  listingType: string;
  propertyType: string;
  price: number;
  bedrooms?: number;
  bathrooms?: number;
  images?: { url: string }[];
  city?: string;
  society?: string;
  area?: string;
  areaUnit?: string;
  unit?: string;
  locality?: string;
  phase?: string;
  block?: string;
  ownerName?: string;
  ownerRole?: string;
  ownerListingCount?: number;
  isVerified?: boolean;
  isFeatured?: boolean;
  monthlyInstallment?: number;
  installmentYears?: number;
  downPaymentPercentage?: number;
}

interface ProjectItem {
  _id: string;
  projectName: string;
  slug?: string;
  city?: string;
  areaName?: string;
  area?: string;
  projectStatus?: string;
  projectCategory?: string;
  projectNature?: string;
  marketingBadge?: string;
  startingPrice?: number;
  minPrice?: number;
  maxPrice?: number;
  priceRangeText?: string;
  startingPriceFormatted?: string;
  possessionDate?: string;
  totalArea?: string;
  areaUnit?: string;
  coverImage?: { url: string };
  images?: { url: string }[];
  primaryImage?: string | null;
  featureImageUrl?: string;
  unitTypeBreakdown?: Array<{ type?: string; category?: string; minArea?: number; maxArea?: number }>;
}

interface DeveloperItem {
  _id: string;
  companyName: string;
  slug?: string;
  developerType?: string;
  city?: string;
  rating?: number;
  reviewsCount?: number;
  completedProjectsCount?: number;
  activeProjectsCount?: number;
  establishedYear?: number;
  isVerified?: boolean;
  logo?: { url: string };
}

interface AgentItem {
  slug?: string;
  displayName?: string;
  tagline?: string;
  agentType?: string;
  agencyName?: string;
  city?: string;
  specializations?: string[];
  verificationLevel?: string;
  ratings?: { averageRating?: number; totalReviews?: number };
  stats?: { activeListings?: number };
  documents?: { profilePhoto?: { url?: string } };
}

interface BlogItem {
  _id: string;
  title: string;
  slug?: string;
  excerpt?: string;
  category?: string;
  publishedAt?: string;
  createdAt?: string;
  image?: { url: string };
}

interface CityItem {
  name: string;
  propertyCount?: number;
  imageUrl?: string;
  image?: string;
  isActive?: boolean;
  isFeaturedOnHomepage?: boolean;
  displayOrder?: number;
}

interface PartnerItem {
  _id: string;
  companyName?: string;
  logo?: { url: string };
}

interface SocietyItem {
  _id: string;
  name: string;
  slug: string;
  city: string;
  areaName: string;
  category: string;
  nocStatus: string;
  approvalAuthority: string;
  overallRiskLevel: string;
  scores: {
    legal: number;
    growth: number;
    overall: number;
  };
  featuredImage?: string;
  activeAlertCount: number;
  isVerifiedByHighrise: boolean;
  developerName?: string;
}

// ===== Newsletter inline modal =====

interface SubscriptionInlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'success' | 'error' | 'already_subscribed';
  message: string;
  email: string;
}

function SubscriptionInlineModal({
  isOpen,
  onClose,
  type,
  message,
  email,
}: SubscriptionInlineModalProps): React.ReactElement | null {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sub-modal-title"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200"
          aria-label="Close"
        >
          <icons.X className="h-4 w-4 text-gray-600" />
        </button>

        {type === 'success' && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <icons.Check className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 id="sub-modal-title" className="mb-2 text-xl font-bold text-gray-900">
              You&apos;re Subscribed!
            </h3>
            <p className="text-gray-600">
              Thank you for subscribing. You&apos;ll receive our latest property insights.
            </p>
          </>
        )}

        {type === 'already_subscribed' && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <icons.Check className="h-8 w-8 text-[#029bba]" />
            </div>
            <h3 id="sub-modal-title" className="mb-2 text-xl font-bold text-gray-900">
              Already Subscribed
            </h3>
            <p className="text-gray-600">{email} is already on our list. Thank you!</p>
          </>
        )}

        {type === 'error' && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <icons.X className="h-8 w-8 text-red-500" />
            </div>
            <h3 id="sub-modal-title" className="mb-2 text-xl font-bold text-gray-900">
              Something Went Wrong
            </h3>
            <p className="text-gray-600">{message || 'Please try again.'}</p>
          </>
        )}

        <button
          onClick={onClose}
          className="mt-6 rounded-xl bg-[#029bba] px-6 py-2.5 font-semibold text-white transition-colors hover:bg-[#027a94]"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ===== Page =====

export default function HomePage(): React.ReactElement {
  // Data states
  const [featuredProperties, setFeaturedProperties] = useState<PropertyItem[]>([]);
  const [featuredTotal, setFeaturedTotal] = useState<number | null>(null);
  const [ownerProperties, setOwnerProperties] = useState<PropertyItem[]>([]);
  const [ownerTotal, setOwnerTotal] = useState<number | null>(null);
  const [loadingOwner, setLoadingOwner] = useState(true);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [developers, setDevelopers] = useState<DeveloperItem[]>([]);
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [blogs, setBlogs] = useState<BlogItem[]>([]);
  const [cities, setCities] = useState<CityItem[]>([]);
  const [trustedPartners, setTrustedPartners] = useState<PartnerItem[]>([]);
  const [verifiedSocieties, setVerifiedSocieties] = useState<SocietyItem[]>([]);
  const [loadingSocieties, setLoadingSocieties] = useState(true);

  // Loading states
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingDevelopers, setLoadingDevelopers] = useState(true);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [loadingBlogs, setLoadingBlogs] = useState(true);
  const [loadingCities, setLoadingCities] = useState(true);
  const [loadingPartners, setLoadingPartners] = useState(true);

  // Newsletter states
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);

  // Inline modal state
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error' | 'already_subscribed'>('success');
  const [modalMessage, setModalMessage] = useState('');

  // Data fetching

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/properties?sort=newest&limit=6');
        const data = await res.json();
        setFeaturedProperties(
          data?.success && Array.isArray(data.properties) ? data.properties : []
        );
        setFeaturedTotal(
          typeof data?.pagination?.total === 'number' ? data.pagination.total : null
        );
      } catch {
        setFeaturedProperties([]);
        setFeaturedTotal(null);
      } finally {
        setLoadingProperties(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/properties?sort=newest&limit=6&listingSource=owner');
        const data = await res.json();
        setOwnerProperties(
          data?.success && Array.isArray(data.properties) ? data.properties : []
        );
        setOwnerTotal(
          typeof data?.pagination?.total === 'number' ? data.pagination.total : null
        );
      } catch {
        setOwnerProperties([]);
        setOwnerTotal(null);
      } finally {
        setLoadingOwner(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/projects?status=verified&limit=6');
        const data = await res.json();
        setProjects(data.success ? data.projects || [] : []);
      } catch {
        setProjects([]);
      } finally {
        setLoadingProjects(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/developers?limit=6');
        const data = await res.json();
        // API shape: { success, data: { developers } }; verified filter applied client-side
        const payload = (data?.data ?? data) as { developers?: Partial<DeveloperItem>[] };
        const verified = (Array.isArray(payload.developers) ? payload.developers : []).filter(
          (d) => d?.isVerified
        );
        setDevelopers(verified as DeveloperItem[]);
      } catch {
        setDevelopers([]);
      } finally {
        setLoadingDevelopers(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/agents?verified=true&limit=6&sortBy=rating');
        const data = await res.json();
        setAgents(data.success && Array.isArray(data.agents) ? data.agents : []);
      } catch {
        setAgents([]);
      } finally {
        setLoadingAgents(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/blogs?status=published&limit=3');
        const data = await res.json();
        setBlogs(data.success ? data.blogs || [] : []);
      } catch {
        setBlogs([]);
      } finally {
        setLoadingBlogs(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/cities');
        const data = await res.json();
        setCities(data.success ? data.cities || [] : []);
      } catch {
        setCities([]);
      } finally {
        setLoadingCities(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/trusted-partners');
        const data = await res.json();
        setTrustedPartners(data.success ? data.partners || [] : []);
      } catch {
        setTrustedPartners([]);
      } finally {
        setLoadingPartners(false);
      }
    };
    run();
  }, []);

  // Verified societies (top 5 by score)
  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/societies?isVerified=true&sortBy=overallScore&limit=5');
        const data = await res.json();
        if (data.success && Array.isArray(data.data?.societies)) {
          setVerifiedSocieties(data.data.societies);
        }
      } catch {
        setVerifiedSocieties([]);
      } finally {
        setLoadingSocieties(false);
      }
    };
    run();
  }, []);

  // Newsletter signup

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) {
      setModalType('error');
      setModalMessage('Please enter your email address');
      setShowModal(true);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newsletterEmail)) {
      setModalType('error');
      setModalMessage('Please enter a valid email address');
      setShowModal(true);
      return;
    }
    if (!turnstileToken) {
      setModalType('error');
      setModalMessage('Please complete the CAPTCHA verification.');
      setShowModal(true);
      return;
    }
    setIsSubscribing(true);
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail, source: 'homepage', turnstileToken }),
      });
      const data = await res.json();
      if (data.success) {
        setModalType('success');
        setShowModal(true);
        setNewsletterEmail('');
        setTurnstileToken(null);
        setTurnstileKey((k) => k + 1);
      } else {
        setModalType(data.message?.toLowerCase().includes('already') ? 'already_subscribed' : 'error');
        setModalMessage(data.message || 'Failed to subscribe. Please try again.');
        setShowModal(true);
        setTurnstileToken(null);
        setTurnstileKey((k) => k + 1);
      }
    } catch {
      setModalType('error');
      setModalMessage('Network error. Please try again.');
      setShowModal(true);
      setTurnstileToken(null);
      setTurnstileKey((k) => k + 1);
    } finally {
      setIsSubscribing(false);
    }
  };

  // Render

  return (
    <>
      <Head>
        <title>Highrise.pk – Buy, Rent &amp; Verify Properties in Pakistan</title>
        <meta
          name="description"
          content="Pakistan's first property intelligence platform. Verify societies, check fair prices, calculate construction costs, and discover verified properties across Pakistan."
        />
        <meta
          name="keywords"
          content="Pakistan real estate, buy property Pakistan, verify society NOC, fair price estimator, construction cost calculator, Highrise.pk"
        />
        <meta name="robots" content="index, follow" />
        <meta name="theme-color" content="#029bba" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Highrise.pk" />
        <meta property="og:title" content="Highrise.pk – Pakistan's First Property Intelligence Platform" />
        <meta
          property="og:description"
          content="Verify societies, check fair prices, and discover verified properties across Pakistan."
        />
        <meta property="og:url" content="https://highrise.pk/" />
        <meta property="og:image" content="https://highrise.pk/og-image.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Highrise.pk – Pakistan's First Property Intelligence Platform" />
        <meta name="twitter:description" content="Verify, compare, and invest with confidence." />
        <meta name="twitter:image" content="https://highrise.pk/og-image.jpg" />
        <link rel="canonical" href="https://highrise.pk/" />
      </Head>

      <div className="min-h-screen">
        <HomeHero cities={cities} />

        <BrowseCategories />

        <CityExplorer isHomepage={true} />

        <FeaturedProperties
          properties={featuredProperties}
          total={featuredTotal}
          loading={loadingProperties}
        />

        <DirectOwnerListings
          properties={ownerProperties}
          total={ownerTotal}
          loading={loadingOwner}
        />

        <PremiumAdBanner
          imageUrl="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80"
          sponsorName="Highrise Enterprise"
          title="Looking to sell faster?"
          subtitle="List your property as a Premium Sponsored Ad to reach thousands of buyers."
          link="/onboarding/business"
        />

        <ResearchTools />

        <ProjectShowcase projects={projects} loading={loadingProjects} />

        <TrustSection />

        <VerifiedSocieties societies={verifiedSocieties} loading={loadingSocieties} />

        <DevelopersPartners
          developers={developers}
          agents={agents}
          trustedPartners={trustedPartners}
          loadingDevelopers={loadingDevelopers}
          loadingAgents={loadingAgents}
          loadingPartners={loadingPartners}
        />

        <HomeBlog blogs={blogs} loading={loadingBlogs} />

        <HomeNewsletter
          email={newsletterEmail}
          setEmail={setNewsletterEmail}
          onSubmit={handleNewsletterSubmit}
          isSubscribing={isSubscribing}
          turnstileKey={turnstileKey}
          setTurnstileToken={setTurnstileToken}
        />

        <HomeTestimonials />

        <PopularSearches />

        <SubscriptionInlineModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          type={modalType}
          message={modalMessage}
          email={newsletterEmail}
        />
      </div>
    </>
  );
}