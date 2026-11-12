import React from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowUpRight, BadgeCheck, Handshake, LineChart, ShieldCheck } from 'lucide-react';

const PILLARS = [
  {
    title: 'Verified Inventory',
    description:
      'Society approvals, developer records and listing details are checked before they go live.',
    href: '/societies',
    cta: 'Browse verified societies',
    icon: BadgeCheck,
  },
  {
    title: 'Market Intelligence',
    description:
      'Price estimators, construction costs and area converters built on recorded market data.',
    href: '/tools',
    cta: 'Open research tools',
    icon: LineChart,
  },
  {
    title: 'Safe Deal Guidance',
    description:
      'Structured due-diligence workflows for buyers who want a documented, low-risk transaction.',
    href: '/safedeal',
    cta: 'Explore SafeDeal',
    icon: Handshake,
  },
  {
    title: 'Risk Alerts',
    description:
      'Public notices and flagged schemes surfaced early, so you can avoid known problem projects.',
    href: '/risk-alerts',
    cta: 'View risk alerts',
    icon: AlertTriangle,
  },
];

export default function TrustSection() {
  return (
    <section className="relative overflow-hidden bg-[#001f2b] py-16 sm:py-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(#38aec7 1px, transparent 1px), linear-gradient(90deg, #38aec7 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#029bba]/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-[#004063]/40 blur-3xl"
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#38aec7]/30 bg-white/5 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#8fc2d0]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#38aec7]" />
            <span>Built for Accountable Property Decisions</span>
          </span>
          <h2 className="font-heading text-3xl font-black tracking-tight text-white sm:text-4xl">
            Trust Infrastructure, <span className="text-[#38aec7]">Not Just Listings</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
            Every Highrise.pk section connects to a documented process — verification, pricing
            research, due diligence and public risk reporting.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <Link
                key={pillar.title}
                href={pillar.href}
                className="group flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#38aec7]/50 hover:bg-white/[0.08] hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38aec7]/60"
              >
                <div>
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[#38aec7]/25 bg-[#029bba]/15 text-[#38aec7] transition-colors group-hover:bg-[#029bba] group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-2 font-heading text-base font-bold text-white">{pillar.title}</h3>
                  <p className="text-xs leading-relaxed text-slate-400">{pillar.description}</p>
                </div>

                <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#8fc2d0] transition-colors group-hover:text-white">
                  {pillar.cta}
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
