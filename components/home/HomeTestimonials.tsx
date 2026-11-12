// components/home/HomeTestimonials.tsx
// Self-contained: fetches /api/testimonials on mount. Shows sample cards until
// real testimonials exist (set SHOW_SAMPLES_WHEN_EMPTY = false in production).

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BadgeCheck, Quote, ShieldCheck, Star } from 'lucide-react';

interface TestimonialItem {
  _id: string;
  name: string;
  role: string;
  location?: string;
  quote: string;
  rating?: number;
  avatarUrl?: string;
  propertyTag?: string;
  isVerified?: boolean;
}

/** Demo cards until real testimonials are added to the database. */
const SHOW_SAMPLES_WHEN_EMPTY = true;

const SAMPLE_TESTIMONIALS: TestimonialItem[] = [
  {
    _id: 'sample-1',
    name: 'Malik Tariq Mehmood',
    role: 'Overseas Pakistani Investor',
    location: 'Manchester, UK & Islamabad',
    quote:
      'Purchasing a 1 Kanal designer villa in DHA Phase 2 while living abroad felt risky until I used Highrise.pk. The title document verification and 0% direct owner filters saved me millions in unnecessary broker commissions.',
    rating: 5,
    propertyTag: '1 Kanal Luxury Villa • DHA Phase 2, Islamabad',
    isVerified: true,
  },
  {
    _id: 'sample-2',
    name: 'Dr. Ayesha Siddiqui',
    role: 'Cardiologist & First-Time Buyer',
    location: 'Lahore',
    quote:
      'Highrise.pk is miles ahead of cluttered classified sites. The sector-wise location search and construction cost calculator gave us exact transparency on our Gulberg III apartment booking.',
    rating: 5,
    propertyTag: '3-Bed Executive Suite • Gulberg III, Lahore',
    isVerified: true,
  },
  {
    _id: 'sample-3',
    name: 'Syed Hamza Rizvi',
    role: 'Tech Entrepreneur & Commercial Buyer',
    location: 'Karachi',
    quote:
      'The verification reports gave my team true confidence on corporate office floors in Clifton before we even visited. The installment plan schedules were 100% accurate with zero hidden charges.',
    rating: 5,
    propertyTag: '2,400 Sq. Ft. Corporate Floor • Clifton, Karachi',
    isVerified: true,
  },
];

function initialsOf(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0] ?? '').slice(0, 2).toUpperCase();
  return `${(parts[0] ?? '').charAt(0)}${(parts[parts.length - 1] ?? '').charAt(0)}`.toUpperCase();
}

export default function HomeTestimonials() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/testimonials', { cache: 'no-store' });
        const data = await res.json();
        if (cancelled) return;
        const list = data?.success && Array.isArray(data.testimonials) ? data.testimonials : [];
        setTestimonials(list.length > 0 ? list : SHOW_SAMPLES_WHEN_EMPTY ? SAMPLE_TESTIMONIALS : []);
      } catch {
        if (!cancelled) setTestimonials(SHOW_SAMPLES_WHEN_EMPTY ? SAMPLE_TESTIMONIALS : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const scroll = useCallback((direction: 'left' | 'right') => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction === 'left' ? -track.clientWidth : track.clientWidth, behavior: 'smooth' });
  }, []);

  if (!loading && testimonials.length === 0) return null;

  return (
    <section className="bg-white pb-16 sm:pb-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[28px] bg-[#001f2b] px-6 py-12 shadow-xl sm:px-10 sm:py-14">
          {/* Ambient pattern + glows */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                'linear-gradient(#38aec7 1px, transparent 1px), linear-gradient(90deg, #38aec7 1px, transparent 1px)',
              backgroundSize: '44px 44px',
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#029bba]/20 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-[#004063]/50 blur-3xl"
          />

          <div className="relative">
            {/* Header: centered, arrows bottom-right on desktop */}
            <div className="relative mb-10 flex flex-col items-center text-center">
              <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#38aec7]/30 bg-white/5 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#8fc2d0]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#38aec7]" />
                <span>Verified Buyer Experiences</span>
              </span>
              <h2 className="max-w-3xl font-heading text-3xl font-black tracking-tight text-white sm:text-4xl">
                Trusted by Families, Investors &amp;{' '}
                <span className="text-[#38aec7]">Overseas Pakistanis</span>
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
                Hear how verified buyers and property owners across Islamabad, Lahore, Karachi and
                the global diaspora make confident real estate decisions with Highrise.pk.
              </p>

              <div className="mt-5 flex items-center gap-2 sm:absolute sm:bottom-0 sm:right-0 sm:mt-0">
                <button
                  type="button"
                  onClick={() => scroll('left')}
                  aria-label="Previous testimonials"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white backdrop-blur transition-all hover:-translate-y-0.5 hover:border-[#38aec7]/50 hover:bg-[#029bba]"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
                    <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => scroll('right')}
                  aria-label="Next testimonials"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white backdrop-blur transition-all hover:-translate-y-0.5 hover:border-[#38aec7]/50 hover:bg-[#029bba]"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
                    <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Carousel */}
            {loading ? (
              <div className="flex gap-5 overflow-hidden">
                {[0, 1, 2].map((slot) => (
                  <div
                    key={slot}
                    className="h-64 w-full shrink-0 animate-pulse rounded-2xl border border-white/10 bg-white/5 sm:w-[calc((100%_-_1.25rem)/2)] lg:w-[calc((100%_-_2.5rem)/3)]"
                  />
                ))}
              </div>
            ) : (
              <div
                ref={trackRef}
                className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              >
                {testimonials.map((item) => {
                  const stars = Math.max(1, Math.min(5, item.rating ?? 5));
                  return (
                    <figure
                      key={item._id}
                      className="flex w-full shrink-0 snap-start flex-col rounded-2xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-sm transition-all duration-300 hover:border-[#38aec7]/40 hover:bg-white/[0.08] sm:w-[calc((100%_-_1.25rem)/2)] lg:w-[calc((100%_-_2.5rem)/3)]"
                    >
                      <div className="mb-4 flex items-start justify-between">
                        <div className="flex gap-0.5" aria-label={`Rated ${stars} out of 5`}>
                          {Array.from({ length: stars }).map((_, index) => (
                            <Star key={index} className="h-4 w-4 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        <Quote className="h-6 w-6 text-[#38aec7]/40" aria-hidden="true" />
                      </div>

                      <blockquote className="flex-1 text-sm leading-relaxed text-slate-300">
                        &ldquo;{item.quote}&rdquo;
                      </blockquote>

                      <figcaption className="mt-5 border-t border-white/10 pt-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#029bba]/25 text-sm font-bold text-[#38aec7] ring-1 ring-[#38aec7]/30">
                            {item.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.avatarUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              initialsOf(item.name)
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 text-sm font-bold text-white">
                              <span className="truncate">{item.name}</span>
                              {item.isVerified && (
                                <BadgeCheck className="h-4 w-4 shrink-0 text-[#38aec7]" />
                              )}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-slate-400">
                              {item.role}
                              {item.location ? ` • ${item.location}` : ''}
                            </p>
                          </div>
                        </div>
                        {item.propertyTag && (
                          <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-[11px]">
                            <span className="truncate text-slate-300">{item.propertyTag}</span>
                            {item.isVerified && (
                              <span className="shrink-0 font-bold text-emerald-400">Verified</span>
                            )}
                          </div>
                        )}
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}