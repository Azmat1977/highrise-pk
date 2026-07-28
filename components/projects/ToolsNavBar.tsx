/**
 * components/projects/ToolsNavBar.tsx
 *
 * Page-level tools navigation bar — polished, production-ready.
 * Links to existing /tools/* pages.
 * Desktop: elegant horizontal bar with hover effects.
 * Mobile: clean expandable panel.
 * No visible scrollbar. No raw/debug appearance.
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  Calculator,
  FileSearch,
  Ruler,
  HardHat,
  Receipt,
  TrendingUp,
  ChevronRight,
  ChevronDown,
  Wrench,
} from 'lucide-react';

// ─── TOOLS CONFIG ─────────────────────────────────────────────────────────────

interface Tool {
  key:   string;
  label: string;
  desc:  string;
  icon:  React.ReactNode;
  href:  string;
  badge: string | null;
}

const TOOLS: Tool[] = [
  {
    key:   'verify',
    label: 'Verify Society NOC',
    desc:  'Check government approval status',
    icon:  <FileSearch className="w-4 h-4" />,
    href:  '/tools/verify-society',
    badge: 'Industry First',
  },
  {
    key:   'fair-price',
    label: 'Fair Price Estimator',
    desc:  'Is the listed price fair?',
    icon:  <TrendingUp className="w-4 h-4" />,
    href:  '/tools/fair-price',
    badge: null,
  },
  {
    key:   'home-loan',
    label: 'Home Loan Calculator',
    desc:  'Islamic + Conventional, 10 banks',
    icon:  <Calculator className="w-4 h-4" />,
    href:  '/tools/home-loan-calculator',
    badge: null,
  },
  {
    key:   'area',
    label: 'Area Converter',
    desc:  'Marla ⇄ Kanal ⇄ Sqft',
    icon:  <Ruler className="w-4 h-4" />,
    href:  '/tools/area-unit-converter',
    badge: null,
  },
  {
    key:   'construction',
    label: 'Construction Cost',
    desc:  'Estimate build cost per Marla',
    icon:  <HardHat className="w-4 h-4" />,
    href:  '/tools/construction-calculator',
    badge: null,
  },
  {
    key:   'tax',
    label: 'Tax Calculator',
    desc:  'FBR 2026 transfer tax',
    icon:  <Receipt className="w-4 h-4" />,
    href:  '#tax-calculator',
    badge: 'Coming Soon',
  },
];

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function ToolsNavBar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="bg-gradient-to-r from-gray-50 to-white
                    border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4">

        {/* ── Desktop: elegant horizontal row ─────────────── */}
        <div className="hidden lg:flex items-center gap-1 py-2
                        overflow-x-auto scrollbar-none">

          {/* Tools label with icon */}
          <div className="flex items-center gap-2 mr-4 pr-4
                          border-r border-gray-200 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-[#029bba]/10
                            flex items-center justify-center">
              <Wrench className="w-3.5 h-3.5 text-[#029bba]" />
            </div>
            <span className="text-xs font-bold text-gray-500
                             uppercase tracking-wider">
              Tools
            </span>
          </div>

          {/* Tool links */}
          {TOOLS.map(tool => (
            <Link
              key={tool.key}
              href={tool.href}
              className="group flex items-center gap-2.5 px-4 py-2.5
                         rounded-xl text-gray-600 hover:text-[#029bba]
                         hover:bg-[#029bba]/5 transition-all duration-200
                         whitespace-nowrap flex-shrink-0"
            >
              <span className="w-8 h-8 rounded-lg bg-gray-100
                               group-hover:bg-[#029bba]/10
                               flex items-center justify-center
                               transition-colors duration-200
                               flex-shrink-0">
                <span className="text-gray-400 group-hover:text-[#029bba]
                                 transition-colors">
                  {tool.icon}
                </span>
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold leading-tight">
                    {tool.label}
                  </p>
                  {tool.badge && (
                    <span className={`px-1.5 py-0.5 rounded-md
                                     text-[8px] font-black uppercase
                                     tracking-wider flex-shrink-0
                                     leading-none ${
                      tool.badge === 'Industry First'
                        ? 'bg-[#029bba]/10 text-[#029bba]'
                        : 'bg-amber-50 text-amber-600'
                    }`}>
                      {tool.badge}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 leading-tight
                               group-hover:text-[#029bba]/60
                               transition-colors mt-0.5">
                  {tool.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* ── Mobile/Tablet: collapsed button → panel ─────── */}
        <div className="lg:hidden py-2">
          <button
            type="button"
            onClick={() => setMobileOpen(prev => !prev)}
            className="flex items-center gap-2.5 px-4 py-2.5
                       bg-white border border-gray-200
                       hover:border-[#029bba]/30 hover:bg-[#029bba]/5
                       rounded-xl text-sm font-semibold text-gray-700
                       hover:text-[#029bba] transition-all
                       shadow-sm w-full sm:w-auto"
          >
            <div className="w-7 h-7 rounded-lg bg-[#029bba]/10
                            flex items-center justify-center
                            flex-shrink-0">
              <Wrench className="w-3.5 h-3.5 text-[#029bba]" />
            </div>
            <span>Property Tools</span>
            <span className="ml-auto px-1.5 py-0.5 rounded-md
                             bg-gray-100 text-gray-400
                             text-[10px] font-bold">
              {TOOLS.length}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400
                                     transition-transform duration-200
                                     flex-shrink-0 ${
              mobileOpen ? 'rotate-180' : ''
            }`} />
          </button>

          {/* Mobile expanded panel */}
          {mobileOpen && (
            <div className="mt-2 bg-white border border-gray-200
                            rounded-2xl overflow-hidden shadow-lg
                            animate-in slide-in-from-top-2 duration-200">
              {TOOLS.map((tool, idx) => (
                <Link
                  key={tool.key}
                  href={tool.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3.5 px-5 py-4
                              text-gray-700 hover:bg-[#029bba]/5
                              hover:text-[#029bba] transition-colors ${
                    idx < TOOLS.length - 1
                      ? 'border-b border-gray-50'
                      : ''
                  }`}
                >
                  <span className="w-9 h-9 rounded-xl bg-[#029bba]/10
                                   flex items-center justify-center
                                   flex-shrink-0">
                    <span className="text-[#029bba]">{tool.icon}</span>
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">
                        {tool.label}
                      </p>
                      {tool.badge && (
                        <span className={`px-1.5 py-0.5 rounded-md
                                         text-[8px] font-black uppercase
                                         tracking-wider ${
                          tool.badge === 'Industry First'
                            ? 'bg-[#029bba]/10 text-[#029bba]'
                            : 'bg-amber-50 text-amber-600'
                        }`}>
                          {tool.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {tool.desc}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300
                                           flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}