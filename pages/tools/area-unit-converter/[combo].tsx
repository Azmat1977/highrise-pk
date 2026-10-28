// pages/tools/area-unit-converter/[combo].tsx
// 📐 SEO LANDING PAGES FOR AREA UNIT CONVERSIONS
// Dynamic routes for 12 high-volume conversion combos
// e.g. /tools/area-unit-converter/marla-to-sqft
//
// Strategy:
//   - SSG via getStaticPaths + getStaticProps (best SEO)
//   - Unique <title>, <meta>, <h1>, intro per conversion
//   - Embedded interactive converter (pre-filled with from/to units)
//   - Conversion table specific to the combo (1-20 of fromUnit → toUnit)
//   - Related conversion suggestions
//   - Full JSON-LD structured data per page

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { GetStaticPaths, GetStaticProps } from 'next';
import {
  ArrowLeftRight, Copy, Check, ArrowLeft, ArrowRight, Sparkles,
  ShieldCheck, Banknote, Construction, Ruler,
  BookOpen, Info, Home, ChevronRight,
} from 'lucide-react';
import {
  AREA_UNITS,
  UNITS_BY_CATEGORY,
  CATEGORY_META,
  SEO_LANDING_PAGES,
  convert,
  formatAreaValue,
  getAllSeoSlugs,
  getSeoLandingBySlug,
  type AreaUnitKey,
  type SeoLandingConfig,
} from '@/lib/areaUnits';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageProps {
  config: SeoLandingConfig;
  fromUnitMeta: {
    name: string;
    shortName: string;
    pluralName: string;
    sqftPerUnit: number;
    region: string;
    description: string;
  };
  toUnitMeta: {
    name: string;
    shortName: string;
    pluralName: string;
    sqftPerUnit: number;
    region: string;
    description: string;
  };
  baseConversion: number;        // 1 fromUnit = X toUnit
  inverseConversion: number;     // 1 toUnit = X fromUnit
  relatedSlugs: SeoLandingConfig[];
  tableRows: Array<{ from: number; to: number }>;
}

// ─── Static Generation ────────────────────────────────────────────────────────

export const getStaticPaths: GetStaticPaths = async () => {
  const slugs = getAllSeoSlugs();
  return {
    paths: slugs.map((slug) => ({ params: { combo: slug } })),
    fallback: false, // 404 for any non-listed combo
  };
};

export const getStaticProps: GetStaticProps<PageProps> = async ({ params }) => {
  const combo = params?.combo as string;
  const config = getSeoLandingBySlug(combo);

  if (!config) {
    return { notFound: true };
  }

  const fromUnit = AREA_UNITS[config.fromUnit];
  const toUnit = AREA_UNITS[config.toUnit];

  if (!fromUnit || !toUnit) {
    return { notFound: true };
  }

  // Pre-compute base conversion (1 fromUnit = X toUnit)
  const baseConversion = convert(1, config.fromUnit, config.toUnit);
  const inverseConversion = convert(1, config.toUnit, config.fromUnit);

  // Find related conversions (same source unit OR same target unit, excluding self)
  const relatedSlugs = SEO_LANDING_PAGES
    .filter(
      (p) =>
        p.slug !== config.slug &&
        (p.fromUnit === config.fromUnit ||
          p.toUnit === config.toUnit ||
          p.fromUnit === config.toUnit ||
          p.toUnit === config.fromUnit)
    )
    .slice(0, 6);

  // Pre-compute conversion table rows (1-20 of fromUnit)
  const tableRows = Array.from({ length: 20 }, (_, i) => {
    const from = i + 1;
    const to = convert(from, config.fromUnit, config.toUnit);
    return { from, to };
  });

  return {
    props: {
      config,
      fromUnitMeta: {
        name: fromUnit.name,
        shortName: fromUnit.shortName,
        pluralName: fromUnit.pluralName,
        sqftPerUnit: fromUnit.sqftPerUnit,
        region: fromUnit.region,
        description: fromUnit.description,
      },
      toUnitMeta: {
        name: toUnit.name,
        shortName: toUnit.shortName,
        pluralName: toUnit.pluralName,
        sqftPerUnit: toUnit.sqftPerUnit,
        region: toUnit.region,
        description: toUnit.description,
      },
      baseConversion,
      inverseConversion,
      relatedSlugs,
      tableRows,
    },
    revalidate: 86400, // ISR — revalidate once per day
  };
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ConversionLandingPage({
  config,
  fromUnitMeta,
  toUnitMeta,
  baseConversion,
  inverseConversion,
  relatedSlugs,
  tableRows,
}: PageProps): React.ReactElement {

  // Converter state — pre-filled from config
  const [fromValue, setFromValue] = useState<string>(String(config.defaultValue));
  const [fromUnit, setFromUnit] = useState<AreaUnitKey>(config.fromUnit);
  const [toUnit, setToUnit] = useState<AreaUnitKey>(config.toUnit);
  const [copied, setCopied] = useState(false);

  // Reset state when route changes (Next.js doesn't unmount on dynamic route change)
  useEffect(() => {
    setFromValue(String(config.defaultValue));
    setFromUnit(config.fromUnit);
    setToUnit(config.toUnit);
  }, [config]);

  // ─── Computed ─────────────────────────────────────────────────────────────

  const fromValueNum = useMemo(() => {
    const parsed = parseFloat(fromValue);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  }, [fromValue]);

  const toValue = useMemo(() => {
    return convert(fromValueNum, fromUnit, toUnit);
  }, [fromValueNum, fromUnit, toUnit]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleSwap = useCallback(() => {
    const oldFrom = fromUnit;
    const oldTo = toUnit;
    setFromUnit(oldTo);
    setToUnit(oldFrom);
    setFromValue(String(toValue));
  }, [fromUnit, toUnit, toValue]);

  const handleCopy = async () => {
    try {
      const text = `${formatAreaValue(fromValueNum)} ${fromUnitMeta.shortName} = ${formatAreaValue(toValue)} ${toUnitMeta.shortName}`;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silent fallback — clipboard may not be available
    }
  };

  const handleTableRowClick = (from: number) => {
    setFromValue(String(from));
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 200, behavior: 'smooth' });
    }
  };

  const canonicalUrl = `https://highrise.pk/tools/area-unit-converter/${config.slug}`;

  return (
    <>
      <Head>
        <title>{config.title}</title>
        <meta name="description" content={config.metaDescription} />
        <meta name="keywords" content={`${fromUnitMeta.name} to ${toUnitMeta.name}, ${config.slug.replace(/-/g, ' ')}, area converter Pakistan, ${fromUnitMeta.shortName} ${toUnitMeta.shortName} converter`} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={canonicalUrl} />

        {/* OpenGraph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={config.title} />
        <meta property="og:description" content={config.metaDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content="Highrise.pk" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={config.title} />
        <meta name="twitter:description" content={config.metaDescription} />

        {/* JSON-LD WebApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: config.h1,
              url: canonicalUrl,
              applicationCategory: 'UtilityApplication',
              operatingSystem: 'All',
              description: config.metaDescription,
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'PKR' },
            }),
          }}
        />

        {/* JSON-LD BreadcrumbList */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: 'Home',
                  item: 'https://highrise.pk',
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: 'Area Unit Converter',
                  item: 'https://highrise.pk/tools/area-unit-converter',
                },
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: config.h1,
                  item: canonicalUrl,
                },
              ],
            }),
          }}
        />

        {/* JSON-LD FAQ */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: [
                {
                  '@type': 'Question',
                  name: `How many ${toUnitMeta.pluralName} are in 1 ${fromUnitMeta.name}?`,
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: `1 ${fromUnitMeta.name} equals ${formatAreaValue(baseConversion)} ${toValue === 1 ? toUnitMeta.name : toUnitMeta.pluralName}.`,
                  },
                },
                {
                  '@type': 'Question',
                  name: `How to convert ${fromUnitMeta.name} to ${toUnitMeta.name}?`,
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: `To convert ${fromUnitMeta.name} to ${toUnitMeta.name}, multiply the ${fromUnitMeta.name} value by ${formatAreaValue(baseConversion)}. For example, 5 ${fromUnitMeta.pluralName} = ${formatAreaValue(convert(5, config.fromUnit, config.toUnit))} ${toUnitMeta.pluralName}.`,
                  },
                },
                {
                  '@type': 'Question',
                  name: `What is 1 ${toUnitMeta.name} in ${fromUnitMeta.pluralName}?`,
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: `1 ${toUnitMeta.name} equals ${formatAreaValue(inverseConversion)} ${inverseConversion === 1 ? fromUnitMeta.name : fromUnitMeta.pluralName}.`,
                  },
                },
              ],
            }),
          }}
        />
      </Head>

      <div className="min-h-screen bg-gray-50">

        {/* ── COMPACT PAGE HEADER ── */}
        <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-4 md:py-5">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-gray-500 mb-2 overflow-x-auto whitespace-nowrap">
            <Link href="/" className="hover:text-[#029bba] font-medium transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
            <Link href="/tools/area-unit-converter" className="hover:text-[#029bba] font-medium transition-colors">
              Area Unit Converter
            </Link>
            <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
            <span className="text-[#004063] font-bold truncate">{config.h1}</span>
          </nav>

          <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-[#004063] tracking-tight leading-tight">
            {config.h1}
          </h1>
          <p className="text-sm text-gray-600 font-medium mt-1 max-w-3xl">{config.intro}</p>
          <p className="text-xs text-gray-600 font-semibold mt-1.5 flex flex-wrap items-center gap-2">
            <span>
              1 {fromUnitMeta.name} = {formatAreaValue(baseConversion)} {baseConversion === 1 ? toUnitMeta.name : toUnitMeta.pluralName}
            </span>
            <span className="text-gray-300">•</span>
            <span>Free &amp; instant</span>
            <span className="text-gray-300">•</span>
            <span className="text-[#029bba]">Pakistani area standards</span>
          </p>
        </div>

        {/* ── MAIN CONVERTER ── */}
        <section className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-8">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">

              <div className="grid md:grid-cols-[1fr_auto_1fr] gap-4 items-end">

                {/* FROM */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                    From — {fromUnitMeta.name}
                  </label>
                  <input
                    type="number"
                    value={fromValue}
                    onChange={(e) => setFromValue(e.target.value)}
                    min="0"
                    step="any"
                    placeholder="Enter value"
                    className="w-full h-14 px-4 rounded-xl border-2 border-gray-200 text-2xl font-bold text-gray-900 focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none mb-2"
                  />
                  <select
                    value={fromUnit}
                    onChange={(e) => setFromUnit(e.target.value as AreaUnitKey)}
                    className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm font-semibold focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none cursor-pointer bg-white"
                  >
                    {(Object.keys(UNITS_BY_CATEGORY) as Array<keyof typeof UNITS_BY_CATEGORY>).map((category) => (
                      <optgroup key={category} label={CATEGORY_META[category].label}>
                        {UNITS_BY_CATEGORY[category].map((unit) => (
                          <option key={unit.key} value={unit.key}>
                            {unit.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* SWAP BUTTON */}
                <div className="flex justify-center pb-1">
                  <button
                    type="button"
                    onClick={handleSwap}
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-[#029bba] to-[#004063] hover:from-[#027a94] hover:to-[#003553] text-white flex items-center justify-center shadow-md hover:shadow-lg transition-all md:rotate-0 rotate-90"
                    aria-label="Swap units"
                    title="Swap units"
                  >
                    <ArrowLeftRight className="w-5 h-5" />
                  </button>
                </div>

                {/* TO */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                    To — {toUnitMeta.name}
                  </label>
                  <div className="w-full h-14 px-4 rounded-xl border-2 border-[#029bba] bg-[#029bba]/5 text-2xl font-bold text-[#004063] flex items-center mb-2 overflow-hidden">
                    <span className="truncate" title={formatAreaValue(toValue)}>
                      {formatAreaValue(toValue)}
                    </span>
                  </div>
                  <select
                    value={toUnit}
                    onChange={(e) => setToUnit(e.target.value as AreaUnitKey)}
                    className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm font-semibold focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none cursor-pointer bg-white"
                  >
                    {(Object.keys(UNITS_BY_CATEGORY) as Array<keyof typeof UNITS_BY_CATEGORY>).map((category) => (
                      <optgroup key={category} label={CATEGORY_META[category].label}>
                        {UNITS_BY_CATEGORY[category].map((unit) => (
                          <option key={unit.key} value={unit.key}>
                            {unit.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              {/* Result + Copy */}
              {fromValueNum > 0 && (
                <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-[#029bba]/5 to-[#004063]/5 border border-[#029bba]/20 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Conversion Result
                    </div>
                    <div className="text-base md:text-lg font-bold text-gray-900">
                      <span className="text-[#029bba]">{formatAreaValue(fromValueNum)}</span>{' '}
                      {fromValueNum === 1 ? fromUnitMeta.name : fromUnitMeta.pluralName}
                      {' = '}
                      <span className="text-[#004063]">{formatAreaValue(toValue)}</span>{' '}
                      {toValue === 1 ? toUnitMeta.name : toUnitMeta.pluralName}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                      copied
                        ? 'bg-[#10b981] text-white'
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              )}

              {/* Full converter link */}
              <div className="mt-4 text-center">
                <Link
                  href="/tools/area-unit-converter"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#029bba] hover:underline"
                >
                  Open full converter with all 12 units
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── EXPLANATION ── */}
        <section className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-6">
          <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Info className="w-5 h-5 text-[#029bba]" />
              How to Convert {fromUnitMeta.name} to {toUnitMeta.name}
            </h2>

            <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
              <p>
                <strong>Quick formula:</strong> Multiply your {fromUnitMeta.name} value by{' '}
                <strong className="text-[#029bba]">{formatAreaValue(baseConversion)}</strong> to get the equivalent in {toUnitMeta.pluralName}.
              </p>

              <div className="bg-[#f8fafc] rounded-xl p-4 border-l-4 border-[#029bba]">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Example
                </div>
                <div className="text-base font-semibold text-gray-900">
                  5 {fromUnitMeta.pluralName} × {formatAreaValue(baseConversion)} = {formatAreaValue(convert(5, config.fromUnit, config.toUnit))} {toUnitMeta.pluralName}
                </div>
              </div>

              <p>
                <strong>{fromUnitMeta.name}:</strong> {fromUnitMeta.description} Commonly used in {fromUnitMeta.region}.
              </p>

              <p>
                <strong>{toUnitMeta.name}:</strong> {toUnitMeta.description} Commonly used in {toUnitMeta.region}.
              </p>

              <p>
                <strong>Inverse conversion:</strong> 1 {toUnitMeta.name} equals{' '}
                <strong className="text-[#029bba]">{formatAreaValue(inverseConversion)}</strong>{' '}
                {inverseConversion === 1 ? fromUnitMeta.name : fromUnitMeta.pluralName}.
              </p>
            </div>
          </div>
        </section>

        {/* ── CONVERSION TABLE (1-20) ── */}
        <section className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-6">
          <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Ruler className="w-5 h-5 text-[#029bba]" />
              {fromUnitMeta.name} to {toUnitMeta.name} Conversion Table
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Tap any row to load that value in the converter above
            </p>

            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-[#029bba] to-[#004063] text-white">
                  <tr>
                    <th className="text-left py-3 px-4 font-bold">{fromUnitMeta.name}</th>
                    <th className="text-right py-3 px-4 font-bold">{toUnitMeta.name}</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map(({ from, to }) => (
                    <tr
                      key={from}
                      onClick={() => handleTableRowClick(from)}
                      className="border-b border-gray-100 last:border-0 hover:bg-[#029bba]/5 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-4 font-semibold text-gray-900">
                        {from} {from === 1 ? fromUnitMeta.name : fromUnitMeta.pluralName}
                      </td>
                      <td className="py-2.5 px-4 text-right text-gray-700">
                        {formatAreaValue(to)} {to === 1 ? toUnitMeta.name : toUnitMeta.pluralName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── RELATED CONVERSIONS ── */}
        {relatedSlugs.length > 0 && (
          <section className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-6">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-[#029bba]" />
                Related Conversions
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {relatedSlugs.map((related) => {
                  const relFrom = AREA_UNITS[related.fromUnit];
                  const relTo = AREA_UNITS[related.toUnit];
                  return (
                    <Link
                      key={related.slug}
                      href={`/tools/area-unit-converter/${related.slug}`}
                      className="bg-white p-4 rounded-xl border border-gray-200 hover:border-[#029bba] hover:shadow-md transition-all group"
                    >
                      <div className="font-bold text-gray-900 text-sm group-hover:text-[#029bba] mb-1">
                        {relFrom.shortName} → {relTo.shortName}
                      </div>
                      <div className="text-[11px] text-gray-500 line-clamp-2">
                        Convert {relFrom.name} to {relTo.name}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── FAQ SECTION ── */}
        <section className="bg-white py-12 border-t border-gray-200 mt-6">
          <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-8">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#029bba]/10 text-[#029bba] text-sm font-semibold mb-3">
                  <BookOpen className="w-4 h-4" />
                  Frequently Asked Questions
                </span>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {fromUnitMeta.name} to {toUnitMeta.name} — <span className="text-[#029bba]">Common Questions</span>
                </h2>
              </div>

              <div className="space-y-3">
                <FaqItem
                  question={`How many ${toUnitMeta.pluralName} are in 1 ${fromUnitMeta.name}?`}
                  answer={`1 ${fromUnitMeta.name} equals ${formatAreaValue(baseConversion)} ${baseConversion === 1 ? toUnitMeta.name : toUnitMeta.pluralName}.`}
                />
                <FaqItem
                  question={`How do I convert ${fromUnitMeta.name} to ${toUnitMeta.name}?`}
                  answer={`Simply multiply the ${fromUnitMeta.name} value by ${formatAreaValue(baseConversion)}. For example, 5 ${fromUnitMeta.pluralName} = ${formatAreaValue(convert(5, config.fromUnit, config.toUnit))} ${toUnitMeta.pluralName}.`}
                />
                <FaqItem
                  question={`What is 1 ${toUnitMeta.name} in ${fromUnitMeta.pluralName}?`}
                  answer={`1 ${toUnitMeta.name} equals ${formatAreaValue(inverseConversion)} ${inverseConversion === 1 ? fromUnitMeta.name : fromUnitMeta.pluralName}.`}
                />
                <FaqItem
                  question={`Where is ${fromUnitMeta.name} commonly used in Pakistan?`}
                  answer={`${fromUnitMeta.name} is commonly used in ${fromUnitMeta.region}. ${fromUnitMeta.description}`}
                />
                <FaqItem
                  question={`Where is ${toUnitMeta.name} commonly used?`}
                  answer={`${toUnitMeta.name} is commonly used in ${toUnitMeta.region}. ${toUnitMeta.description}`}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="bg-gradient-to-br from-[#001f2b] to-[#003553] py-12">
          <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 text-center">
            <Sparkles className="w-10 h-10 text-[#06b6d4] mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Use Our <span className="text-[#06b6d4]">Intelligence Suite</span>
            </h2>
            <p className="text-white/80 mb-6 max-w-xl mx-auto">
              Now that you have the right size, take the next step in your property journey.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/tools/verify-society">
                <button className="px-5 py-3 rounded-xl bg-white text-[#004063] font-semibold hover:bg-gray-100 transition-colors inline-flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Verify Society NOC
                </button>
              </Link>
              <Link href="/tools/price-estimator">
                <button className="px-5 py-3 rounded-xl bg-white/15 text-white border border-white/30 font-semibold hover:bg-white/25 transition-colors inline-flex items-center gap-2">
                  <Banknote className="w-4 h-4" />
                  Check Fair Price
                </button>
              </Link>
              <Link href="/tools/construction-calculator">
                <button className="px-5 py-3 rounded-xl bg-[#029bba] text-white font-semibold hover:bg-[#027a94] transition-colors inline-flex items-center gap-2">
                  <Construction className="w-4 h-4" />
                  Calculate Build Cost
                </button>
              </Link>
              <Link href="/properties">
                <button className="px-5 py-3 rounded-xl bg-white/15 text-white border border-white/30 font-semibold hover:bg-white/25 transition-colors inline-flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Browse Properties
                </button>
              </Link>
            </div>

            {/* Back to main converter */}
            <div className="mt-8">
              <Link
                href="/tools/area-unit-converter"
                className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to full Area Unit Converter
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

// ─── Sub-Component: FAQ Item ──────────────────────────────────────────────────

interface FaqItemProps {
  question: string;
  answer: string;
}

function FaqItem({ question, answer }: FaqItemProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className={`bg-white rounded-2xl border-2 overflow-hidden transition-all ${
        isOpen ? 'border-[#029bba] shadow-md' : 'border-gray-200'
      }`}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-900 text-sm md:text-base">{question}</span>
        <ChevronRight
          className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-90 text-[#029bba]' : 'text-gray-400'
          }`}
        />
      </button>
      {isOpen && (
        <div className="px-5 pb-4 pt-1 text-sm text-gray-700 leading-relaxed border-t border-gray-100">
          {answer}
        </div>
      )}
    </div>
  );
}