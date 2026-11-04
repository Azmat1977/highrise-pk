import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  ArrowRight,
  Calculator,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  History,
  Home,
  MapPin,
  Ruler,
  Search,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import {
  RECENT_SEARCHES_EVENT,
  clearRecentSearches,
  formatRelativeTime,
  getRecentSearches,
  removeRecentSearch,
  type RecentSearchEntry,
} from '@/utils/recentSearches';

interface ToolCard {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TOOLS: ToolCard[] = [
  {
    id: 'verify',
    title: 'Verify Society / NOC',
    subtitle: 'Check approval authority, NOC status and recorded risk alerts for a housing scheme.',
    tag: 'Verification',
    href: '/tools/verify-society',
    icon: ShieldCheck,
  },
  {
    id: 'price',
    title: 'Fair Price Estimator',
    subtitle: 'Compare an asking price against recorded market data before you negotiate.',
    tag: 'Pricing',
    href: '/tools/price-estimator',
    icon: TrendingUp,
  },
  {
    id: 'construction',
    title: 'Construction Cost',
    subtitle: 'Estimate grey structure and finishing costs using live material rates.',
    tag: 'Estimator',
    href: '/tools/construction-calculator',
    icon: Calculator,
  },
  {
    id: 'loan',
    title: 'Home Loan Calculator',
    subtitle: 'Compare monthly installments across Pakistani bank financing options.',
    tag: 'Financing',
    href: '/tools/home-loan-calculator',
    icon: Wallet,
  },
  {
    id: 'area',
    title: 'Area Unit Converter',
    subtitle: 'Convert Marla, Kanal, Sq. Ft., Sq. Yd. and Gaz with standard conversions.',
    tag: 'Marla & Kanal',
    href: '/tools/area-unit-converter',
    icon: Ruler,
  },
  {
    id: 'tools',
    title: 'All Research Tools',
    subtitle: 'Browse every calculator and verification tool available on Highrise.pk.',
    tag: 'Directory',
    href: '/tools',
    icon: ClipboardCheck,
  },
];

const PURPOSE_LABEL: Record<RecentSearchEntry['purpose'], string> = {
  buy: 'BUY',
  rent: 'RENT',
  installment: 'INSTALLMENT',
};

const PURPOSE_BADGE: Record<RecentSearchEntry['purpose'], string> = {
  buy: 'bg-[#004063] text-white',
  rent: 'bg-[#029bba] text-white',
  installment: 'bg-[#007196] text-white',
};

export default function ResearchTools() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [searches, setSearches] = useState<RecentSearchEntry[]>([]);
  const [filter, setFilter] = useState<'all' | RecentSearchEntry['purpose']>('all');

  const load = useCallback(() => {
    setSearches(getRecentSearches());
  }, []);

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener(RECENT_SEARCHES_EVENT, handler);
    return () => window.removeEventListener(RECENT_SEARCHES_EVENT, handler);
  }, [load]);

  const filtered = searches.filter((entry) => (filter === 'all' ? true : entry.purpose === filter));

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: direction === 'left' ? -320 : 320, behavior: 'smooth' });
  };

  return (
    <section className="bg-[#f8fafc] py-16 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#004063]/10 bg-[#004063]/5 px-3 py-1 text-xs font-semibold text-[#004063]">
            <Calculator className="h-3.5 w-3.5 text-[#029bba]" />
            <span>Interactive Financial Planning</span>
          </span>
          <h2 className="text-3xl font-black tracking-tight text-[#004063] sm:text-4xl">
            Property Research &amp; <span className="text-[#029bba]">Financial Tools</span>
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600">
            Verify approvals, estimate costs and plan financing before you commit to a property.
          </p>
        </div>

        {searches.length > 0 && (
          <div className="mb-10 rounded-3xl border border-slate-200/90 bg-gradient-to-r from-slate-50 via-white to-[#004063]/5 p-4 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#004063] text-white shadow-sm">
                  <History className="h-5 w-5 text-[#38aec7]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold tracking-tight text-slate-900 sm:text-lg">
                      Recent Searches
                    </h3>
                    <span className="rounded-full bg-[#004063]/10 px-2 py-0.5 text-[11px] font-bold text-[#004063]">
                      {searches.length} saved
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Resume where you left off with one click</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold">
                  {(['all', 'buy', 'rent', 'installment'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setFilter(option)}
                      className={`rounded-lg px-2.5 py-1 capitalize transition-colors ${
                        filter === option ? 'bg-white text-[#004063] shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setSearches(clearRecentSearches())}
                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear
                </button>
              </div>
            </div>

            {filtered.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((entry) => (
                  <div
                    key={entry.id}
                    className="group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:border-[#004063] hover:shadow-md"
                    role="button"
                    tabIndex={0}
                    onClick={() => void router.push(entry.url)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        void router.push(entry.url);
                      }
                    }}
                  >
                    <div className="mb-2.5 flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${PURPOSE_BADGE[entry.purpose]}`}
                        >
                          {PURPOSE_LABEL[entry.purpose]}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-slate-500">
                          <Clock className="h-2.5 w-2.5" />
                          {formatRelativeTime(entry.timestamp)}
                        </span>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove recent search for ${entry.city}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSearches(removeRecentSearch(entry.id));
                        }}
                        className="rounded-lg p-1 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="mb-3">
                      <p className="flex items-center gap-1.5 text-sm font-bold leading-snug text-slate-900 transition-colors group-hover:text-[#004063]">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-[#029bba]" />
                        <span className="truncate">
                          {entry.city}
                          {entry.area ? ` · ${entry.area}` : ''}
                        </span>
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {entry.categoryLabel && (
                          <span className="rounded border border-slate-200/60 bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                            {entry.categoryLabel}
                          </span>
                        )}
                        {entry.maxPriceLabel && (
                          <span className="rounded border border-emerald-200/60 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                            {entry.maxPriceLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs font-bold text-[#004063] transition-colors group-hover:text-[#029bba]">
                      <span className="flex items-center gap-1">
                        <Search className="h-3 w-3" /> Revisit
                      </span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="pt-4 text-center text-xs text-slate-500">
                No {filter === 'all' ? '' : `${filter} `}searches saved yet.
              </p>
            )}
          </div>
        )}

        <div className="mb-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => scroll('left')}
            aria-label="Previous tools"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-600 shadow-sm transition-all hover:border-[#004063] hover:bg-[#004063] hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            aria-label="Next tools"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-600 shadow-sm transition-all hover:border-[#004063] hover:bg-[#004063] hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div
          ref={scrollRef}
          className="scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 pt-1 sm:gap-6"
        >
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.id}
                href={tool.href}
                className="group flex w-full shrink-0 snap-start flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 text-left shadow-sm transition-all duration-300 hover:border-[#004063] hover:shadow-lg sm:w-[290px]"
              >
                <div>
                  <span className="mb-2 inline-block rounded-md border border-[#004063]/10 bg-[#004063]/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#004063]">
                    {tool.tag}
                  </span>
                  <h3 className="font-heading text-base font-extrabold leading-tight text-slate-900 transition-colors group-hover:text-[#004063] sm:text-lg">
                    {tool.title}
                  </h3>
                  <p className="mb-4 mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                    {tool.subtitle}
                  </p>

                  <div className="mb-4 flex h-36 items-center justify-center overflow-hidden rounded-2xl border border-[#004063]/15 bg-gradient-to-br from-[#00314d]/10 via-[#004063]/10 to-[#029bba]/10">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#004063]/15 bg-white text-[#004063] shadow-sm">
                      <Icon className="h-7 w-7" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-xs font-bold text-[#004063] transition-colors group-hover:text-[#029bba]">
                    Open Tool
                  </span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#004063] text-white shadow-sm transition-all group-hover:translate-x-1 group-hover:bg-[#029bba]">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {searches.length === 0 && (
          <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-4 text-center sm:flex-row sm:text-left">
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <Home className="h-4 w-4 text-[#029bba]" />
              Your searches will be saved here automatically for quick access.
            </p>
            <Link
              href="/properties"
              className="inline-flex items-center gap-2 rounded-xl bg-[#004063] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#029bba]"
            >
              Start Searching
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
