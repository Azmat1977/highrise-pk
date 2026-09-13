import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { Loader2, ArrowRight } from 'lucide-react';
import HeroSearch from './HeroSearch';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CityItem {
  name: string;
}

interface HeroBannerSlide {
  id: string | number;
  url: string;
  title: string;
  subtitle: string;
  ctaText?: string;
  ctaLink?: string;
  sponsorName?: string;
  isPaidPromotion?: boolean;
}

const fallbackHeroImages: HeroBannerSlide[] = [
  {
    id: 1,
    url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920&q=80',
    title: '',
    subtitle: '',
  },
];

export default function HomeHero({ cities }: { cities: CityItem[] }) {
  const router = useRouter();

  // State
  const [heroImages, setHeroImages] = useState<HeroBannerSlide[]>([]);
  const [currentHeroImage, setCurrentHeroImage] = useState(0);
  const [heroLoading, setHeroLoading] = useState(true);

  // Fetch Banners
  useEffect(() => {
    const fetchHeroBanners = async () => {
      try {
        const res = await fetch('/api/hero-banners');
        const data = await res.json();
        if (data.success && Array.isArray(data.banners) && data.banners.length > 0) {
          const mapped = data.banners
            .filter((b: any) => b?.imageUrl)
            .map((b: any) => ({
              id: b._id,
              url: b.imageUrl,
              title: b.title || 'Featured Promotion',
              subtitle: b.subtitle || '',
              ctaText: b.ctaText || '',
              ctaLink: b.ctaLink || '',
              sponsorName: b.sponsorName || '',
              isPaidPromotion: Boolean(b.isPaidPromotion),
            }));
          setHeroImages(mapped.length > 0 ? mapped : fallbackHeroImages);
        } else {
          setHeroImages(fallbackHeroImages);
        }
      } catch {
        setHeroImages(fallbackHeroImages);
      } finally {
        setHeroLoading(false);
      }
    };
    fetchHeroBanners();
  }, []);

  // Auto-rotate
  useEffect(() => {
    if (!heroImages.length) return;
    const interval = setInterval(() => {
      setCurrentHeroImage((prev) => (prev + 1) % heroImages.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [heroImages]);

  // Track Impression
  useEffect(() => {
    const currentBanner = heroImages[currentHeroImage];
    if (!currentBanner?.id || typeof currentBanner.id === 'number') return;
    fetch(`/api/hero-banners/${currentBanner.id}/impression`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {});
  }, [currentHeroImage, heroImages]);

  const handleHeroCtaClick = (banner: HeroBannerSlide) => {
    if (!banner.ctaLink) return;
    fetch(`/api/hero-banners/${banner.id}/click`, { method: 'POST' }).catch(() => {});
    if (banner.ctaLink.startsWith('http')) {
      window.open(banner.ctaLink, '_blank', 'noopener,noreferrer');
    } else {
      router.push(banner.ctaLink);
    }
  };

  return (
    <section className="relative flex flex-col min-h-[calc(100vh-88px)] z-[40]">
      <div className="absolute inset-0 bg-gradient-to-br from-[#00263b] via-[#003553] to-[#001927]" />

      {/* Background Images */}
      <div className="absolute inset-0">
        {heroLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-[#029bba] animate-spin" />
          </div>
        ) : (
          heroImages.map((image, index) => (
            <div
              key={image.id}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                currentHeroImage === index ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <Image
                src={image.url}
                alt={image.title || 'Hero Banner'}
                fill
                className="object-cover"
                priority={index === 0}
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-[#001f2b]/90" />
            </div>
          ))
        )}
      </div>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_42%)] pointer-events-none" />

      {/* Main Content */}
      <div className="container mx-auto px-4 relative z-[60] flex flex-col flex-grow pt-16 md:pt-24">
        
        {/* Headings */}
        <div className="flex-grow flex flex-col items-center text-center">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight tracking-tight max-w-4xl drop-shadow-lg">
            <span className="block">Pakistan&apos;s First</span>
            <span className="block mt-2 text-[#06b6d4]">Property Intelligence Platform</span>
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto drop-shadow-md font-medium mb-8">
            Verify societies, explore Highrise projects, and discover verified properties — all in one place.
          </p>

          {/* Dynamic Admin Banner (If active) */}
          {heroImages[currentHeroImage] &&
            (heroImages[currentHeroImage].title || heroImages[currentHeroImage].subtitle) && (
              <div className="mb-8 w-full max-w-2xl mx-auto animate-fade-in-up">
                <div className="rounded-2xl border border-white/20 bg-black/40 backdrop-blur-md px-6 py-5 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#06b6d4]" />
                  {heroImages[currentHeroImage].title && (
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-1">
                      {heroImages[currentHeroImage].title}
                    </h3>
                  )}
                  {heroImages[currentHeroImage].subtitle && (
                    <p className="text-sm text-white/80">
                      {heroImages[currentHeroImage].subtitle}
                    </p>
                  )}
                  {heroImages[currentHeroImage].ctaText && (
                    <button
                      onClick={() => handleHeroCtaClick(heroImages[currentHeroImage])}
                      className="mt-4 inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-white text-[#004063] font-bold text-sm hover:bg-gray-100 transition-all active:scale-[0.98]"
                    >
                      {heroImages[currentHeroImage].ctaText}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
        </div>

        {/* The New Search Component */}
        <HeroSearch cities={cities} />
      </div>
    </section>
  );
}