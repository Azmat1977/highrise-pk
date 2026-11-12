import React from 'react';
import Link from 'next/link';
import { ArrowRight, Search, ShieldCheck, Sparkles, Users } from 'lucide-react';

export default function FinalCta() {
  return (
    <section className="bg-white pb-20 pt-4">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-[#001f2b] px-6 py-12 text-center shadow-xl sm:px-12 sm:py-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                'linear-gradient(#38aec7 1px, transparent 1px), linear-gradient(90deg, #38aec7 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-[#029bba]/25 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-[#004063]/60 blur-3xl"
          />

          <div className="relative mx-auto max-w-3xl">
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#38aec7]/30 bg-white/5 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#8fc2d0]">
              <Sparkles className="h-3.5 w-3.5 text-[#38aec7]" />
              <span>Start Your Property Journey</span>
            </span>
            <h2 className="font-heading text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Find the Right Property, <span className="text-[#38aec7]">With the Right Data</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
              Search verified listings, research pricing and connect with documented developers,
              agents and societies across Pakistan.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/properties"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#029bba] px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[#38aec7] hover:text-[#001f2b] hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#001f2b] sm:w-auto"
              >
                <Search className="h-4 w-4" /> Browse Properties
              </Link>
              <Link
                href="/add-property"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/10 sm:w-auto"
              >
                <Users className="h-4 w-4" /> List Your Property
              </Link>
              <Link
                href="/developers"
                className="inline-flex w-full items-center justify-center gap-1.5 px-4 py-3.5 text-sm font-semibold text-[#8fc2d0] transition-colors hover:text-white sm:w-auto"
              >
                For developers
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <p className="mt-7 flex items-center justify-center gap-2 text-xs font-medium text-slate-400">
              <ShieldCheck className="h-4 w-4 text-[#38aec7]" />
              Verified listings · Documented developers · Public risk reporting
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
