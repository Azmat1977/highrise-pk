import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import HeroSearch from './HeroSearch';

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

const FALLBACK_HERO_IMAGE =
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920&q=80';

const fallbackHeroImages: HeroBannerSlide[] = [
  {
    id: 'fallback',
    url: FALLBACK_HERO_IMAGE,
    title: '',
    subtitle: '',
  },
];

export default function HomeHero({ cities }: { cities: CityItem[] }) {
  const router = useRouter();
  const [heroImages, setHeroImages] = useState<HeroBannerSlide[]>([]);
  const [currentHeroImage, setCurrentHeroImage] = useState(0);
  const [heroLoading, setHeroLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchHeroBanners = async () => {
      try {
        const res = await fetch('/api/hero-banners');
        const data = await res.json();
        if (cancelled) return;

        const banners = Array.isArray(data?.banners) ? data.banners : [];
        const mapped: HeroBannerSlide[] = banners
          .filter((banner: { imageUrl?: string }) => Boolean(banner?.imageUrl))
          .map((banner: {
            _id: string;
            imageUrl: string;
            title?: string;
            subtitle?: string;
            ctaText?: string;
            ctaLink?: string;
            sponsorName?: string;
            isPaidPromotion?: boolean;
          }) => ({
            id: banner._id,
            url: banner.imageUrl,
            title: banner.title || '',
            subtitle: banner.subtitle || '',
            ctaText: banner.ctaText || '',
            ctaLink: banner.ctaLink || '',
            sponsorName: banner.sponsorName || '',
            isPaidPromotion: Boolean(banner.isPaidPromotion),
          }));

        setHeroImages(mapped.length > 0 ? mapped : fallbackHeroImages);
      } catch {
        if (!cancelled) setHeroImages(fallbackHeroImages);
      } finally {
        if (!cancelled) setHeroLoading(false);
      }
    };

    void fetchHeroBanners();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (heroImages.length <= 1) return;
    const interval = window.setInterval(() => {
      setCurrentHeroImage((prev) => (prev + 1) % heroImages.length);
    }, 8000);
    return () => window.clearInterval(interval);
  }, [heroImages]);

  useEffect(() => {
    const currentBanner = heroImages[currentHeroImage];
    if (!currentBanner || typeof currentBanner.id === 'number' || currentBanner.id === 'fallback') return;
    void fetch(`/api/hero-banners/${currentBanner.id}/impression`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => undefined);
  }, [currentHeroImage, heroImages]);

  const handleHeroCtaClick = (banner: HeroBannerSlide) => {
    if (!banner.ctaLink) return;
    void fetch(`/api/hero-banners/${banner.id}/click`, { method: 'POST' }).catch(() => undefined);
    if (banner.ctaLink.startsWith('http')) {
      window.open(banner.ctaLink, '_blank', 'noopener,noreferrer');
    } else {
      void router.push(banner.ctaLink);
    }
  };

  const activeBanner = heroImages[currentHeroImage];

  return (
    <section className="relative isolate overflow-hidden bg-[#002b42] pb-14 pt-10 text-white sm:pb-16 sm:pt-14">
      <div className="absolute inset-0 z-0">
        {!heroLoading &&
          heroImages.map((image, index) => (
            <div
              key={image.id}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                currentHeroImage === index ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <Image
                src={image.url}
                alt={image.title || 'Highrise.pk featured development'}
                fill
                priority={index === 0}
                sizes="100vw"
                className="scale-105 object-cover opacity-30 mix-blend-luminosity"
              />
            </div>
          ))}
        {heroLoading && (
          <div className="absolute inset-0 bg-gradient-to-b from-[#002b42] to-[#004063]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#002236]/95 via-[#004063]/85 to-[#002236]/95" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[#f8fafc]/10" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#029bba]/40 bg-[#029bba]/20 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#bbd8e0]">
            <ShieldCheck className="h-4 w-4 text-[#38aec7]" />
            <span>Pakistan&apos;s First Property Intelligence Platform</span>
          </div>

          <h1 className="mx-auto mb-4 max-w-4xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            Find Your Place in Pakistan.{' '}
            <span className="text-[#38aec7]">Invest With Confidence.</span>
          </h1>

          <p className="mx-auto mb-8 max-w-2xl text-sm font-light leading-relaxed text-slate-200 sm:text-base">
            Explore verified listings, compare trusted developers, verify society NOCs, and estimate fair
            prices across Pakistan &mdash; all in one place.
          </p>
        </div>

        <HeroSearch cities={cities} />

        {activeBanner && (activeBanner.title || activeBanner.subtitle) && (
          <div className="mx-auto mt-6 max-w-2xl">
            <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-black/35 px-5 py-4 text-left shadow-2xl backdrop-blur-md">
              <div className="absolute left-0 top-0 h-full w-1 bg-[#38aec7]" />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  {activeBanner.sponsorName && (
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#8fc2d0]">
                      {activeBanner.sponsorName}
                    </p>
                  )}
                  {activeBanner.title && (
                    <h2 className="text-base font-bold text-white sm:text-lg">{activeBanner.title}</h2>
                  )}
                  {activeBanner.subtitle && (
                    <p className="text-xs text-white/80 sm:text-sm">{activeBanner.subtitle}</p>
                  )}
                </div>
                {activeBanner.ctaText && activeBanner.ctaLink && (
                  <button
                    type="button"
                    onClick={() => handleHeroCtaClick(activeBanner)}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-[#004063] transition-colors hover:bg-[#ecedee]"
                  >
                    {activeBanner.ctaText}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {heroImages.length > 1 && (
          <div className="mt-5 flex items-center justify-center gap-2" aria-label="Featured banner slides">
            {heroImages.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setCurrentHeroImage(index)}
                aria-label={`Show banner ${index + 1}`}
                aria-current={currentHeroImage === index}
                className={`h-1.5 rounded-full transition-all ${
                  currentHeroImage === index ? 'w-6 bg-[#38aec7]' : 'w-1.5 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
