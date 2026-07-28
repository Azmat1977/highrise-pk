/**
 * components/shortlist/ShortlistEmpty.tsx
 *
 * Beautiful empty state for /shortlist page.
 * Shown when user has no favorites yet.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import {
  Heart,
  ArrowRight,
  Sparkles,
  Building2,
  MapPin,
  ShieldCheck,
} from 'lucide-react';

export default function ShortlistEmpty(): React.ReactElement {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 md:py-24">

      {/* ── Icon + Message ── */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center
                        w-24 h-24 rounded-full
                        bg-gradient-to-br from-red-50 to-pink-50
                        border-2 border-red-100 mb-6">
          <Heart className="w-12 h-12 text-red-300" />
        </div>

        <h2 className="text-3xl md:text-4xl font-black text-gray-900
                       mb-3 tracking-tight">
          Your Shortlist is Empty
        </h2>

        <p className="text-base md:text-lg text-gray-500 max-w-md
                      mx-auto leading-relaxed mb-8">
          Start heart-ing projects you love. They&apos;ll appear here so
          you can compare, share, and revisit anytime.
        </p>

        <Link
          href="/projects"
          className="inline-flex items-center gap-2 px-6 py-3.5
                     rounded-2xl bg-[#029bba] text-white
                     text-sm font-black shadow-lg
                     hover:bg-[#017a94] hover:shadow-xl
                     hover:-translate-y-0.5
                     transition-all duration-200
                     focus:outline-none focus:ring-2 focus:ring-[#029bba]/50"
        >
          <Sparkles className="w-4 h-4" />
          Browse Verified Projects
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* ── How It Works ── */}
      <div className="border-t border-gray-100 pt-12">
        <p className="text-center text-xs font-black text-gray-400
                      uppercase tracking-[0.2em] mb-8">
          How Your Shortlist Works
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="bg-white rounded-2xl border border-gray-100
                          p-5 text-center hover:border-[#029bba]/30
                          hover:shadow-lg transition-all duration-200">
            <div className="inline-flex items-center justify-center
                            w-12 h-12 rounded-xl
                            bg-red-50 mb-3">
              <Heart className="w-5 h-5 text-red-500 fill-red-500" />
            </div>
            <h3 className="text-sm font-black text-gray-900 mb-2">
              1. Click the Heart
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Any project card has a heart icon. One click saves it here.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-2xl border border-gray-100
                          p-5 text-center hover:border-[#029bba]/30
                          hover:shadow-lg transition-all duration-200">
            <div className="inline-flex items-center justify-center
                            w-12 h-12 rounded-xl
                            bg-[#029bba]/10 mb-3">
              <Building2 className="w-5 h-5 text-[#029bba]" />
            </div>
            <h3 className="text-sm font-black text-gray-900 mb-2">
              2. Compare Side by Side
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              See all your saved projects in one place. Prices, shields, everything.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-2xl border border-gray-100
                          p-5 text-center hover:border-[#029bba]/30
                          hover:shadow-lg transition-all duration-200">
            <div className="inline-flex items-center justify-center
                            w-12 h-12 rounded-xl
                            bg-emerald-50 mb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="text-sm font-black text-gray-900 mb-2">
              3. Never Lose Track
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Works even without login. Sync to your account for cross-device access.
            </p>
          </div>
        </div>
      </div>

      {/* ── Quick Suggestions ── */}
      <div className="mt-12 border-t border-gray-100 pt-12">
        <p className="text-center text-xs font-black text-gray-400
                      uppercase tracking-[0.2em] mb-6">
          Popular Destinations
        </p>

        <div className="flex flex-wrap gap-2 justify-center">
          {[
            { label: 'Karachi',    href: '/projects?city=Karachi'    },
            { label: 'Lahore',     href: '/projects?city=Lahore'     },
            { label: 'Islamabad',  href: '/projects?city=Islamabad'  },
            { label: 'Rawalpindi', href: '/projects?city=Rawalpindi' },
            { label: 'Faisalabad', href: '/projects?city=Faisalabad' },
          ].map(city => (
            <Link
              key={city.label}
              href={city.href}
              className="inline-flex items-center gap-1.5 px-4 py-2
                         rounded-full bg-gray-50 border border-gray-100
                         text-sm font-semibold text-gray-700
                         hover:bg-[#029bba]/10 hover:border-[#029bba]/30
                         hover:text-[#029bba] transition-all duration-200"
            >
              <MapPin className="w-3.5 h-3.5" />
              {city.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}