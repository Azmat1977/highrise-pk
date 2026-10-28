/**
 * components/compare/CompareEmpty.tsx
 *
 * Beautiful empty state for /compare page.
 * Shown when user has no items in comparison.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import {
  BarChart3,
  ArrowRight,
  Building2,
  Home as HomeIcon,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export default function CompareEmpty(): React.ReactElement {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 md:py-24">

      {/* ── Icon + Message ── */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center
                        w-24 h-24 rounded-full
                        bg-gradient-to-br from-[#029bba]/10 to-[#004063]/10
                        border-2 border-[#029bba]/20 mb-6">
          <BarChart3 className="w-12 h-12 text-[#029bba]/50" />
        </div>

        <h2 className="text-3xl md:text-4xl font-black text-gray-900
                       mb-3 tracking-tight">
          Nothing to Compare Yet
        </h2>

        <p className="text-base md:text-lg text-gray-500 max-w-md
                      mx-auto leading-relaxed mb-8">
          Add up to 4 projects or properties to see them side-by-side.
          Compare prices, shield scores, developers, and more.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
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
            <Building2 className="w-4 h-4" />
            Browse Projects
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/properties"
            className="inline-flex items-center gap-2 px-6 py-3.5
                       rounded-2xl bg-white border-2 border-gray-200
                       text-gray-700 text-sm font-black
                       hover:border-[#029bba]/40 hover:text-[#029bba]
                       hover:bg-[#029bba]/5
                       transition-all duration-200
                       focus:outline-none focus:ring-2 focus:ring-[#029bba]/50"
          >
            <HomeIcon className="w-4 h-4" />
            Browse Properties
          </Link>
        </div>
      </div>

      {/* ── How It Works ── */}
      <div className="border-t border-gray-100 pt-12">
        <p className="text-center text-xs font-black text-gray-400
                      uppercase tracking-[0.2em] mb-8">
          How Comparison Works
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="bg-white rounded-2xl border border-gray-100
                          p-5 text-center hover:border-[#029bba]/30
                          hover:shadow-lg transition-all duration-200">
            <div className="inline-flex items-center justify-center
                            w-12 h-12 rounded-xl
                            bg-[#029bba]/10 mb-3">
              <BarChart3 className="w-5 h-5 text-[#029bba]" />
            </div>
            <h3 className="text-sm font-black text-gray-900 mb-2">
              1. Click Add to Compare
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              On any project or property card, click the &quot;Add to Compare&quot; button.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-2xl border border-gray-100
                          p-5 text-center hover:border-[#029bba]/30
                          hover:shadow-lg transition-all duration-200">
            <div className="inline-flex items-center justify-center
                            w-12 h-12 rounded-xl
                            bg-amber-50 mb-3">
              <Sparkles className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="text-sm font-black text-gray-900 mb-2">
              2. Add Up To 4
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Compare up to 4 items side-by-side. See the sticky bar at the bottom.
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
              3. See The Winner
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              We automatically highlight the best value, top shield score, and more.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}