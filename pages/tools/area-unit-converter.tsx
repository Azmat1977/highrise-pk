// pages/tools/area-unit-converter.tsx
// 📐 AREA UNIT CONVERTER — HIGHRISE.PK
// Pakistan's most comprehensive area unit converter
// 12 units, quick-links, conversion chart, history, educational content

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  ArrowLeftRight, Copy, Check, Trash2, Clock, BookOpen,
  ShieldCheck, Banknote, Construction, Sparkles, ArrowRight,
  Ruler, MapPin, Info, Home, Building2, Calculator,
} from 'lucide-react';
import {
  AREA_UNITS,
  ALL_UNITS,
  UNITS_BY_CATEGORY,
  CATEGORY_META,
  COMMON_SIZES,
  EDUCATIONAL_SECTIONS,
  SEO_LANDING_PAGES,
  convert,
  convertToAll,
  formatAreaValue,
  getConversionHistory,
  addToConversionHistory,
  clearConversionHistory,
  type AreaUnitKey,
  type ConversionHistoryEntry,
} from '@/lib/areaUnits';

// ─── Types ────────────────────────────────────────────────────────────────────

type BannerType = 'success' | 'info';

interface Banner {
  type: BannerType;
  message: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AreaUnitConverterPage(): React.ReactElement {
  // Converter state
  const [fromValue, setFromValue] = useState<string>('5');
  const [fromUnit, setFromUnit] = useState<AreaUnitKey>('marla');
  const [toUnit, setToUnit] = useState<AreaUnitKey>('sqft');

  // UI state
  const [history, setHistory] = useState<ConversionHistoryEntry[]>([]);
  const [copied, setCopied] = useState(false);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [activeEducation, setActiveEducation] = useState<string>('what-is-marla');

  // ─── Computed values ──────────────────────────────────────────────────────

  const fromValueNum = useMemo(() => {
    const parsed = parseFloat(fromValue);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  }, [fromValue]);

  const toValue = useMemo(() => {
    return convert(fromValueNum, fromUnit, toUnit);
  }, [fromValueNum, fromUnit, toUnit]);

  const allConversions = useMemo(() => {
    return convertToAll(fromValueNum, fromUnit);
  }, [fromValueNum, fromUnit]);

  const fromUnitMeta = AREA_UNITS[fromUnit];
  const toUnitMeta = AREA_UNITS[toUnit];

  // ─── Effects ──────────────────────────────────────────────────────────────

  // Load history on mount
  useEffect(() => {
    setHistory(getConversionHistory());
  }, []);

  // Auto-dismiss banner
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 3000);
    return () => clearTimeout(t);
  }, [banner]);

  // Save to history after value/unit changes (debounced)
  useEffect(() => {
    if (fromValueNum <= 0 || fromUnit === toUnit) return;
    const t = setTimeout(() => {
      const updated = addToConversionHistory({
        fromValue: fromValueNum,
        fromUnit,
        toValue,
        toUnit,
      });
      setHistory(updated);
    }, 1500); // Wait 1.5s after typing stops
    return () => clearTimeout(t);
  }, [fromValueNum, fromUnit, toUnit, toValue]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleSwap = () => {
    const oldFrom = fromUnit;
    const oldTo = toUnit;
    setFromUnit(oldTo);
    setToUnit(oldFrom);
    setFromValue(String(toValue));
  };

  const handleCopy = async () => {
    try {
      const text = `${formatAreaValue(fromValueNum)} ${fromUnitMeta.shortName} = ${formatAreaValue(toValue)} ${toUnitMeta.shortName}`;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setBanner({ type: 'success', message: 'Copied to clipboard!' });
    } catch {
      setBanner({ type: 'info', message: 'Could not copy. Please copy manually.' });
    }
  };

  const handleQuickSize = (value: number, unit: AreaUnitKey) => {
    setFromValue(String(value));
    setFromUnit(unit);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleHistoryClick = (entry: ConversionHistoryEntry) => {
    setFromValue(String(entry.fromValue));
    setFromUnit(entry.fromUnit);
    setToUnit(entry.toUnit);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleClearHistory = () => {
    clearConversionHistory();
    setHistory([]);
    setBanner({ type: 'success', message: 'History cleared' });
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <Head>
        <title>Area Unit Converter Pakistan | Marla, Kanal, Sqft, Sqyd | Highrise.pk</title>
        <meta
          name="description"
          content="Pakistan's most comprehensive area unit converter. Convert Marla, Kanal, Sqft, Sqyd, Acre, Sqm and more. Free, instant, mobile-friendly with 12+ Pakistani area units."
        />
        <meta name="keywords" content="marla to sqft, sqft to marla, kanal to sqft, area converter Pakistan, marla kanal converter, sqyd to marla, property unit converter, Pakistani land measurement" />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Area Unit Converter | Highrise.pk" />
        <meta property="og:description" content="Convert between Marla, Kanal, Sqft, Sqyd, Acre and 7+ more Pakistani area units instantly." />
        <meta property="og:url" content="https://highrise.pk/tools/area-unit-converter" />
        <link rel="canonical" href="https://highrise.pk/tools/area-unit-converter" />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Area Unit Converter — Highrise.pk',
              url: 'https://highrise.pk/tools/area-unit-converter',
              applicationCategory: 'UtilityApplication',
              operatingSystem: 'All',
              description:
                'Free Pakistani area unit converter supporting Marla, Kanal, Sqft, Sqyd, Acre, Sqm and more.',
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'PKR' },
            }),
          }}
        />
      </Head>

      <div className="min-h-screen bg-gray-50">

        {/* ── HERO ── */}
        <section className="relative bg-gradient-to-br from-[#001f2b] via-[#003553] to-[#001927] py-12 md:py-16 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.10),transparent_50%)] pointer-events-none" />

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm text-white text-sm font-semibold mb-5">
                <Ruler className="w-4 h-4 text-[#06b6d4]" />
                Pakistan&apos;s Most Comprehensive Area Converter
              </div>

              <h1 className="text-3xl md:text-5xl font-bold text-white mb-3 leading-tight tracking-tight">
                Area Unit <span className="text-[#06b6d4]">Converter</span>
              </h1>

              <p className="text-base md:text-lg text-white/85 max-w-2xl mx-auto mb-4">
                Convert Marla, Kanal, Sqft, Sqyd, Acre, and 7 more units instantly.
                <strong className="text-white"> 12 Pakistani &amp; international units</strong> — free, accurate, mobile-friendly.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3 text-white/80 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#06b6d4]" />
                  <span>Pakistani standards</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-[#06b6d4]" />
                  <span>Real-time math</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#06b6d4]" />
                  <span>Educational</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── BANNER ── */}
        {banner && (
          <div className="container mx-auto px-4 mt-4">
            <div
              className={`max-w-3xl mx-auto rounded-xl border-l-4 p-3 flex items-start gap-2 text-sm ${
                banner.type === 'success'
                  ? 'bg-[#f0fdf4] border-[#10b981] text-[#10b981]'
                  : 'bg-[#eff6ff] border-[#029bba] text-[#004063]'
              }`}
            >
              {banner.type === 'success' ? (
                <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
              ) : (
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              )}
              <span className="flex-1 font-medium">{banner.message}</span>
            </div>
          </div>
        )}

        {/* ── MAIN CONVERTER ── */}
        <section className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">

              {/* Marla Standard Selector — Only shown when Marla is selected */}
              {(fromUnit === 'marla' || fromUnit === 'marla_punjab' || fromUnit === 'marla_old' ||
                toUnit === 'marla' || toUnit === 'marla_punjab' || toUnit === 'marla_old') && (
                <div className="mb-5 p-3 rounded-xl bg-[#eff6ff] border border-[#029bba]/20">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#004063] mb-2 flex items-center gap-1.5">
                    <Ruler className="w-3 h-3" />
                    Marla Standard (3 variants exist in Pakistan)
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <MarlaStandardButton
                      label="Modern"
                      sqft="272 sqft"
                      region="DHA, modern"
                      active={fromUnit === 'marla' || toUnit === 'marla'}
                      onClick={() => {
                        if (fromUnit === 'marla_punjab' || fromUnit === 'marla_old') setFromUnit('marla');
                        if (toUnit === 'marla_punjab' || toUnit === 'marla_old') setToUnit('marla');
                      }}
                    />
                    <MarlaStandardButton
                      label="Punjab"
                      sqft="250 sqft"
                      region="Bahria, Gulberg"
                      active={fromUnit === 'marla_punjab' || toUnit === 'marla_punjab'}
                      onClick={() => {
                        if (fromUnit === 'marla' || fromUnit === 'marla_old') setFromUnit('marla_punjab');
                        if (toUnit === 'marla' || toUnit === 'marla_old') setToUnit('marla_punjab');
                      }}
                    />
                    <MarlaStandardButton
                      label="Old Lahore"
                      sqft="225 sqft"
                      region="Heritage areas"
                      active={fromUnit === 'marla_old' || toUnit === 'marla_old'}
                      onClick={() => {
                        if (fromUnit === 'marla' || fromUnit === 'marla_punjab') setFromUnit('marla_old');
                        if (toUnit === 'marla' || toUnit === 'marla_punjab') setToUnit('marla_old');
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Converter Form */}
              <div className="grid md:grid-cols-[1fr_auto_1fr] gap-4 items-end">

                {/* FROM */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                    From
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
                    To
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

              {/* Result Summary */}
              {fromValueNum > 0 && fromUnit !== toUnit && (
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
            </div>

            {/* ── QUICK SIZE LINKS ── */}
            <div className="mt-6 bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#029bba]" />
                Quick Pakistani Plot Sizes
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                Tap any common size to instantly convert
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {COMMON_SIZES.map((size, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleQuickSize(size.value, size.unit)}
                    className="p-3 rounded-xl border border-gray-200 hover:border-[#029bba] hover:bg-[#029bba]/5 text-left transition-all group"
                  >
                    <div className="font-bold text-gray-900 text-sm group-hover:text-[#029bba]">
                      {size.label}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5 truncate">
                      {size.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CONVERSION CHART (All Units) ── */}
        {fromValueNum > 0 && (
          <section className="container mx-auto px-4 pb-8">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <Ruler className="w-5 h-5 text-[#029bba]" />
                  {formatAreaValue(fromValueNum)} {fromUnitMeta.name} = ?
                </h2>
                <p className="text-xs text-gray-500 mb-5">
                  Your value in all available units at a glance
                </p>

                {/* Pakistani Units */}
                <div className="mb-5">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                    🇵🇰 Pakistani Standard
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {UNITS_BY_CATEGORY.pakistani.map((unit) => (
                      <ChartCell
                        key={unit.key}
                        unitName={unit.name}
                        value={allConversions[unit.key]}
                        isCurrent={unit.key === fromUnit}
                        isTarget={unit.key === toUnit}
                        onClick={() => setToUnit(unit.key)}
                      />
                    ))}
                  </div>
                </div>

                {/* International Units */}
                <div className="mb-5">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                    🌐 International
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {UNITS_BY_CATEGORY.international.map((unit) => (
                      <ChartCell
                        key={unit.key}
                        unitName={unit.name}
                        value={allConversions[unit.key]}
                        isCurrent={unit.key === fromUnit}
                        isTarget={unit.key === toUnit}
                        onClick={() => setToUnit(unit.key)}
                      />
                    ))}
                  </div>
                </div>

                {/* Rural Units */}
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                    🌾 Rural / Agricultural
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {UNITS_BY_CATEGORY.rural.map((unit) => (
                      <ChartCell
                        key={unit.key}
                        unitName={unit.name}
                        value={allConversions[unit.key]}
                        isCurrent={unit.key === fromUnit}
                        isTarget={unit.key === toUnit}
                        onClick={() => setToUnit(unit.key)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── CONVERSION HISTORY ── */}
        {history.length > 0 && (
          <section className="container mx-auto px-4 pb-8">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[#029bba]" />
                    Recent Conversions
                  </h2>
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="text-xs font-semibold text-gray-500 hover:text-[#ef4444] flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear
                  </button>
                </div>
                <div className="space-y-1.5">
                  {history.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => handleHistoryClick(entry)}
                      className="w-full p-3 rounded-xl border border-gray-100 hover:border-[#029bba] hover:bg-[#029bba]/5 text-left transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {formatAreaValue(entry.fromValue)} {AREA_UNITS[entry.fromUnit]?.shortName}
                          {' → '}
                          <span className="text-[#029bba]">
                            {formatAreaValue(entry.toValue)} {AREA_UNITS[entry.toUnit]?.shortName}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          {formatRelativeTime(entry.timestamp)}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#029bba] flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── EDUCATIONAL CONTENT ── */}
        <section className="bg-white py-12 border-t border-gray-200">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-8">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#029bba]/10 text-[#029bba] text-sm font-semibold mb-3">
                  <BookOpen className="w-4 h-4" />
                  Learn About Pakistani Area Units
                </span>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  The Complete Guide to <span className="text-[#029bba]">Pakistani Land Measurements</span>
                </h2>
                <p className="text-gray-600 max-w-2xl mx-auto text-sm">
                  Understanding Marla, Kanal, Sqyd, and regional variations helps you make smarter property decisions.
                </p>
              </div>

              <div className="grid md:grid-cols-[280px_1fr] gap-6">
                {/* Tabs Sidebar */}
                <div className="space-y-1">
                  {EDUCATIONAL_SECTIONS.map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveEducation(section.id)}
                      className={`w-full text-left p-3 rounded-xl transition-colors ${
                        activeEducation === section.id
                          ? 'bg-[#029bba] text-white shadow-md'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="font-semibold text-sm leading-snug">
                        {section.title}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Active Content */}
                <div className="bg-gray-50 rounded-2xl p-6">
                  {EDUCATIONAL_SECTIONS.filter((s) => s.id === activeEducation).map((section) => (
                    <div key={section.id}>
                      <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-[#029bba]" />
                        {section.title}
                      </h3>
                      <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
                        {section.content}
                      </div>
                      {section.relatedUnits.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                            Related Units
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {section.relatedUnits.map((unitKey) => {
                              const unit = AREA_UNITS[unitKey];
                              return (
                                <button
                                  key={unitKey}
                                  type="button"
                                  onClick={() => {
                                    setFromUnit(unitKey);
                                    if (typeof window !== 'undefined') {
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }
                                  }}
                                  className="px-2.5 py-1 rounded-full bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:border-[#029bba] hover:text-[#029bba] transition-colors"
                                >
                                  {unit.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

         {/* ── REFERENCE TABLE — Marla → Kanal/Sqft/Sqm/Sqyd ── */}
        <section className="bg-white py-12 border-t border-gray-200">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-6">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#029bba]/10 text-[#029bba] text-sm font-semibold mb-3">
                  <Ruler className="w-4 h-4" />
                  Quick Reference Table
                </span>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  Marla Conversion Chart <span className="text-[#029bba]">(1–20 Marla)</span>
                </h2>
                <p className="text-gray-600 text-sm">
                  Tap any row to instantly load that value in the converter above
                </p>
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-[#029bba] to-[#004063] text-white">
                    <tr>
                      <th className="text-left py-3 px-4 font-bold">Marla</th>
                      <th className="text-right py-3 px-4 font-bold">Kanal</th>
                      <th className="text-right py-3 px-4 font-bold">Square Feet</th>
                      <th className="text-right py-3 px-4 font-bold">Square Meter</th>
                      <th className="text-right py-3 px-4 font-bold">Square Yard</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 20 }, (_, i) => i + 1).map((marla) => (
                      <tr
                        key={marla}
                        onClick={() => handleQuickSize(marla, 'marla')}
                        className="border-b border-gray-100 last:border-0 hover:bg-[#029bba]/5 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-4 font-semibold text-gray-900">
                          {marla} Marla
                        </td>
                        <td className="py-2.5 px-4 text-right text-gray-700">
                          {formatAreaValue(convert(marla, 'marla', 'kanal'))} Kanal
                        </td>
                        <td className="py-2.5 px-4 text-right text-gray-700">
                          {formatAreaValue(convert(marla, 'marla', 'sqft'))} sq ft
                        </td>
                        <td className="py-2.5 px-4 text-right text-gray-700">
                          {formatAreaValue(convert(marla, 'marla', 'sqm'))} sq m
                        </td>
                        <td className="py-2.5 px-4 text-right text-gray-700">
                          {formatAreaValue(convert(marla, 'marla', 'sqyd'))} sq yd
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-2">
                {Array.from({ length: 20 }, (_, i) => i + 1).map((marla) => (
                  <button
                    key={marla}
                    type="button"
                    onClick={() => handleQuickSize(marla, 'marla')}
                    className="w-full p-3 bg-white rounded-xl border border-gray-200 hover:border-[#029bba] hover:bg-[#029bba]/5 text-left transition-all"
                  >
                    <div className="font-bold text-gray-900 text-base mb-2">
                      {marla} Marla
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-gray-500">Kanal</div>
                        <div className="font-semibold text-gray-900">
                          {formatAreaValue(convert(marla, 'marla', 'kanal'))}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Sq Ft</div>
                        <div className="font-semibold text-gray-900">
                          {formatAreaValue(convert(marla, 'marla', 'sqft'))}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Sq M</div>
                        <div className="font-semibold text-gray-900">
                          {formatAreaValue(convert(marla, 'marla', 'sqm'))}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Sq Yd</div>
                        <div className="font-semibold text-gray-900">
                          {formatAreaValue(convert(marla, 'marla', 'sqyd'))}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Footer note */}
              <div className="mt-4 text-center text-xs text-gray-500">
                <Info className="w-3 h-3 inline mr-1" />
                Based on Modern Marla standard (272.25 sqft). Switch to Punjab (250) or Old Lahore (225) standards using the selector above.
              </div>
            </div>
          </div>
        </section>

        {/* ── POPULAR CONVERSIONS (SEO Landing Page Links) ── */}
        <section className="bg-gray-50 py-12 border-t border-gray-200">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  Popular <span className="text-[#029bba]">Conversion Pages</span>
                </h2>
                <p className="text-gray-600 text-sm">
                  Dedicated pages for the most common Pakistani area conversions
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {SEO_LANDING_PAGES.map((page) => (
                  <Link
                    key={page.slug}
                    href={`/tools/area-unit-converter/${page.slug}`}
                    className="bg-white p-4 rounded-xl border border-gray-200 hover:border-[#029bba] hover:shadow-md transition-all group"
                  >
                    <div className="font-bold text-gray-900 text-sm group-hover:text-[#029bba] mb-1">
                      {AREA_UNITS[page.fromUnit].shortName} → {AREA_UNITS[page.toUnit].shortName}
                    </div>
                    <div className="text-[11px] text-gray-500 line-clamp-2">
                      Convert {AREA_UNITS[page.fromUnit].name} to {AREA_UNITS[page.toUnit].name}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="bg-gradient-to-br from-[#001f2b] to-[#003553] py-12">
          <div className="container mx-auto px-4 text-center">
            <Sparkles className="w-10 h-10 text-[#06b6d4] mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Use Our Complete <span className="text-[#06b6d4]">Intelligence Suite</span>
            </h2>
            <p className="text-white/80 mb-6 max-w-xl mx-auto">
              Now that you know the plot size, explore verified properties, fair prices, and construction costs.
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
          </div>
        </section>
      </div>
    </>
  );
}

// ─── Sub-Component: Chart Cell ────────────────────────────────────────────────

interface ChartCellProps {
  unitName: string;
  value: number;
  isCurrent: boolean;
  isTarget: boolean;
  onClick: () => void;
}

function ChartCell({ unitName, value, isCurrent, isTarget, onClick }: ChartCellProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isCurrent}
      className={`p-3 rounded-xl border text-left transition-all ${
        isCurrent
          ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
          : isTarget
          ? 'border-[#029bba] bg-[#029bba]/5'
          : 'border-gray-200 bg-white hover:border-[#029bba] hover:bg-[#029bba]/5'
      }`}
    >
      <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
        {unitName}
        {isCurrent && <span className="ml-1 text-[9px] text-gray-400">(current)</span>}
        {isTarget && !isCurrent && <span className="ml-1 text-[9px] text-[#029bba]">(target)</span>}
      </div>
      <div className={`text-base font-bold ${isCurrent ? 'text-gray-400' : 'text-gray-900'}`}>
        {formatAreaValue(value)}
      </div>
    </button>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  return `${Math.floor(seconds / 86400)} day${Math.floor(seconds / 86400) > 1 ? 's' : ''} ago`;
}

// ─── Sub-Component: Marla Standard Selector Button ───────────────────────────

interface MarlaStandardButtonProps {
  label: string;
  sqft: string;
  region: string;
  active: boolean;
  onClick: () => void;
}

function MarlaStandardButton({
  label,
  sqft,
  region,
  active,
  onClick,
}: MarlaStandardButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-2 rounded-lg border-2 text-center transition-all ${
        active
          ? 'border-[#029bba] bg-[#029bba] text-white shadow-md'
          : 'border-gray-200 bg-white text-gray-700 hover:border-[#029bba]'
      }`}
    >
      <div className={`font-bold text-xs leading-tight ${active ? 'text-white' : 'text-gray-900'}`}>
        {label}
      </div>
      <div className={`text-[10px] font-semibold mt-0.5 ${active ? 'text-white' : 'text-[#029bba]'}`}>
        {sqft}
      </div>
      <div className={`text-[9px] mt-0.5 truncate ${active ? 'text-white/80' : 'text-gray-500'}`}>
        {region}
      </div>
    </button>
  );
}