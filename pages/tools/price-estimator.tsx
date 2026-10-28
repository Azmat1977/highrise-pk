// pages/tools/price-estimator.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  DollarSign, MapPin, Building2, Home, Maximize, TrendingUp,
  TrendingDown, Minus, AlertTriangle, CheckCircle, XCircle,
  Loader2, Search, Calculator, Banknote, ChevronRight,
  Info, Sparkles, Award, Activity, Shield,
  ArrowDown, ArrowUp, ShieldCheck, X,
  HelpCircle, Lightbulb,
} from 'lucide-react';
import { PageTitleBanner } from '@/components/layout/PageTitleBanner';

// ─── Types ────────────────────────────────────────────────────────────────────

type ListingType = 'sale' | 'rent';
type PropertyType =
  | 'House'
  | 'Apartment'
  | 'Upper Portion'
  | 'Lower Portion'
  | 'Residential Plot'
  | 'Commercial Plot'
  | 'Office'
  | 'Shop';

type AreaUnit = 'Marla' | 'Kanal' | 'Sq Ft' | 'Sq Yd';

interface EstimateInput {
  city: string;
  area: string;
  society?: string;
  propertyType: PropertyType;
  listingType: ListingType;
  size: number;
  sizeUnit: AreaUnit;
  bedrooms?: number;
  askingPrice?: number;
}

interface ComparableProperty {
  _id: string;
  title: string;
  price: number;
  size: number;
  sizeUnit: string;
  bedrooms?: number;
  daysAgo: number;
  slug?: string;
}

interface EstimateResult {
  fairPriceMin: number;
  fairPriceMax: number;
  fairPriceMedian: number;
  pricePerUnit: number;
  pricePerUnitLabel: string;
  verdict: 'underpriced' | 'fair' | 'slightly_high' | 'overpriced' | 'no_data';
  verdictMessage: string;
  confidence: 'low' | 'medium' | 'high';
  comparableCount: number;
  comparables: ComparableProperty[];
  marketTrend?: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
    period: string;
  };
  asking?: {
    amount: number;
    deviationPercent: number;
    suggestion: string;
  };
  insights: string[];
}

interface CityOption {
  name: string;
  propertyCount?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const POPULAR_CITIES = [
  'Lahore', 'Islamabad', 'Karachi', 'Rawalpindi', 'Faisalabad',
  'Multan', 'Peshawar', 'Quetta', 'Gujranwala', 'Sialkot',
];

const PROPERTY_TYPES: { id: PropertyType; label: string; icon: React.ReactElement }[] = [
  { id: 'House', label: 'House', icon: <Home className="w-4 h-4" /> },
  { id: 'Apartment', label: 'Apartment / Flat', icon: <Building2 className="w-4 h-4" /> },
  { id: 'Upper Portion', label: 'Upper Portion', icon: <Building2 className="w-4 h-4" /> },
  { id: 'Lower Portion', label: 'Lower Portion', icon: <Building2 className="w-4 h-4" /> },
  { id: 'Residential Plot', label: 'Residential Plot', icon: <Maximize className="w-4 h-4" /> },
  { id: 'Commercial Plot', label: 'Commercial Plot', icon: <Maximize className="w-4 h-4" /> },
  { id: 'Office', label: 'Office', icon: <Building2 className="w-4 h-4" /> },
  { id: 'Shop', label: 'Shop', icon: <Building2 className="w-4 h-4" /> },
];

const SIZE_UNITS: { id: AreaUnit; label: string }[] = [
  { id: 'Marla', label: 'Marla' },
  { id: 'Kanal', label: 'Kanal' },
  { id: 'Sq Ft', label: 'Sq Ft' },
  { id: 'Sq Yd', label: 'Sq Yd' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPKR(amount: number): string {
  if (amount >= 10_000_000) return `Rs ${(amount / 10_000_000).toFixed(2)} Cr`;
  if (amount >= 100_000) return `Rs ${(amount / 100_000).toFixed(2)} Lac`;
  return `Rs ${amount.toLocaleString()}`;
}

function getVerdictConfig(verdict: EstimateResult['verdict']): {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactElement;
} {
  switch (verdict) {
    case 'underpriced':
      return {
        label: 'Underpriced — Great Deal',
        color: 'text-[#10b981]',
        bg: 'bg-[#f0fdf4]',
        border: 'border-[#10b981]',
        icon: <ArrowDown className="w-6 h-6" />,
      };
    case 'fair':
      return {
        label: 'Fair Price',
        color: 'text-[#10b981]',
        bg: 'bg-[#f0fdf4]',
        border: 'border-[#10b981]',
        icon: <CheckCircle className="w-6 h-6" />,
      };
    case 'slightly_high':
      return {
        label: 'Slightly Above Market',
        color: 'text-[#f59e0b]',
        bg: 'bg-[#fef3c7]',
        border: 'border-[#f59e0b]',
        icon: <AlertTriangle className="w-6 h-6" />,
      };
    case 'overpriced':
      return {
        label: 'Overpriced',
        color: 'text-[#ef4444]',
        bg: 'bg-[#fef2f2]',
        border: 'border-[#ef4444]',
        icon: <ArrowUp className="w-6 h-6" />,
      };
    default:
      return {
        label: 'Insufficient Data',
        color: 'text-gray-600',
        bg: 'bg-gray-50',
        border: 'border-gray-300',
        icon: <Info className="w-6 h-6" />,
      };
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PriceEstimatorPage(): React.ReactElement {
  // Form state
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [society, setSociety] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>('House');
  const [listingType, setListingType] = useState<ListingType>('sale');
  const [size, setSize] = useState('');
  const [sizeUnit, setSizeUnit] = useState<AreaUnit>('Marla');
  const [bedrooms, setBedrooms] = useState('');
  const [askingPrice, setAskingPrice] = useState('');

  // City suggestions
  const [cities, setCities] = useState<CityOption[]>([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const cityInputRef = useRef<HTMLDivElement>(null);

  // Result state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // ─── Fetch cities ─────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await fetch('/api/cities');
        const data = await res.json();
        if (data.success && Array.isArray(data.cities)) {
          setCities(data.cities);
        }
      } catch {
        // Use popular cities as fallback
        setCities(POPULAR_CITIES.map((name) => ({ name })));
      }
    };
    fetchCities();
  }, []);

  // ─── Close city dropdown on outside click ─────────────────────────────────

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cityInputRef.current && !cityInputRef.current.contains(e.target as Node)) {
        setShowCityDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ─── Submit estimate ─────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);
      setError(null);

      // Validate
      if (!city.trim()) {
        setFormError('Please select a city');
        return;
      }
      if (!area.trim()) {
        setFormError('Please enter the area/locality');
        return;
      }
      const sizeNum = parseFloat(size);
      if (!sizeNum || sizeNum <= 0) {
        setFormError('Please enter a valid size');
        return;
      }

      const askingPriceNum = askingPrice ? parseFloat(askingPrice) : undefined;
      const bedroomsNum = bedrooms ? parseInt(bedrooms, 10) : undefined;

      const payload: EstimateInput = {
        city: city.trim(),
        area: area.trim(),
        society: society.trim() || undefined,
        propertyType,
        listingType,
        size: sizeNum,
        sizeUnit,
        bedrooms: bedroomsNum,
        askingPrice: askingPriceNum,
      };

      setLoading(true);
      setResult(null);

      try {
        const res = await fetch('/api/tools/price-estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data?.error || 'Failed to calculate fair price');
          return;
        }

        setResult(data.data);

        // Scroll to result
        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [city, area, society, propertyType, listingType, size, sizeUnit, bedrooms, askingPrice]
  );

  const handleReset = () => {
    setResult(null);
    setError(null);
    setAskingPrice('');
  };

  const filteredCities = city
    ? cities.filter((c) => c.name.toLowerCase().includes(city.toLowerCase())).slice(0, 8)
    : POPULAR_CITIES.map((name) => ({ name })).slice(0, 8);

  return (
    <>
      <Head>
        <title>Fair Price Estimator | Check Property Price in Pakistan | Highrise.pk</title>
        <meta
          name="description"
          content="Pakistan's first data-driven property price estimator. Check if a property is fairly priced, overpriced, or a great deal. Free analysis for plots, houses, apartments, commercial."
        />
        <meta name="keywords" content="property price estimator Pakistan, fair price check, plot price calculator, house valuation, real estate market rates" />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Fair Price Estimator | Highrise.pk" />
        <meta property="og:description" content="Don't overpay. Get data-driven fair price estimates for any property in Pakistan." />
        <meta property="og:url" content="https://highrise.pk/tools/price-estimator" />
        <link rel="canonical" href="https://highrise.pk/tools/price-estimator" />
      </Head>

      <div className="min-h-screen bg-gray-50">

        {/* ── PHASE 5 PAGE BANNER ── */}
        <PageTitleBanner
          title="Is the Price Fair?"
          subtitle="Get a data-driven fair price range for any property before you negotiate."
          breadcrumb={
            <nav
              aria-label="Breadcrumb"
              className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold text-blue-100/75"
            >
              <Link href="/" className="flex items-center gap-1 transition-colors hover:text-white">
                <Home className="w-3 h-3" />
                <span>Home</span>
              </Link>
              <ChevronRight className="w-3 h-3 text-blue-200/40" />
              <Link href="/tools" className="transition-colors hover:text-white">Tools</Link>
              <ChevronRight className="w-3 h-3 text-blue-200/40" />
              <span className="text-white">Price Estimator</span>
            </nav>
          }
        />

        {/* ── FORM + RESULT ── */}
        <section className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-10">
          <div className="grid lg:grid-cols-5 gap-8 max-w-6xl mx-auto">

            {/* ─── FORM (2 cols) ─── */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-md p-6 sticky top-4">
                <div className="flex items-center gap-2 mb-1">
                  <Calculator className="w-5 h-5 text-[#029bba]" />
                  <h2 className="text-xl font-bold text-gray-900">Property Details</h2>
                </div>
                <p className="text-sm text-gray-500 mb-6">All fields marked * are required</p>

                <form onSubmit={handleSubmit} className="space-y-4">

                  {/* Listing Type Toggle */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                      Listing Type *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['sale', 'rent'] as ListingType[]).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setListingType(t)}
                          className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                            listingType === t
                              ? 'bg-[#029bba] text-white shadow-md'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {t === 'sale' ? 'For Sale' : 'For Rent'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* City */}
                  <div ref={cityInputRef}>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                      City *
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => {
                          setCity(e.target.value);
                          setShowCityDropdown(true);
                        }}
                        onFocus={() => setShowCityDropdown(true)}
                        placeholder="e.g. Lahore"
                        className="w-full h-11 pl-9 pr-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none transition-all"
                        autoComplete="off"
                      />
                      {showCityDropdown && filteredCities.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-60 overflow-y-auto">
                          {filteredCities.map((c) => (
                            <button
                              key={c.name}
                              type="button"
                              onClick={() => {
                                setCity(c.name);
                                setShowCityDropdown(false);
                              }}
                              className="w-full px-3 py-2.5 text-left text-sm hover:bg-[#029bba]/5 transition-colors flex items-center gap-2"
                            >
                              <MapPin className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-gray-800">{c.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Area */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                      Area / Locality *
                    </label>
                    <input
                      type="text"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder="e.g. DHA Phase 5"
                      className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none transition-all"
                    />
                  </div>

                  {/* Society (Optional) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                      Society / Block <span className="text-gray-400 font-normal normal-case">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={society}
                      onChange={(e) => setSociety(e.target.value)}
                      placeholder="e.g. Block E"
                      className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none transition-all"
                    />
                  </div>

                  {/* Property Type */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                      Property Type *
                    </label>
                    <select
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                      className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none cursor-pointer bg-white"
                    >
                      {PROPERTY_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Size + Unit */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                      Size *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        value={size}
                        onChange={(e) => setSize(e.target.value)}
                        placeholder="e.g. 5"
                        min="0"
                        step="0.5"
                        className="col-span-2 h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none transition-all"
                      />
                      <select
                        value={sizeUnit}
                        onChange={(e) => setSizeUnit(e.target.value as AreaUnit)}
                        className="h-11 px-2 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none cursor-pointer bg-white"
                      >
                        {SIZE_UNITS.map((u) => (
                          <option key={u.id} value={u.id}>{u.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Bedrooms (conditional) */}
                  {(propertyType === 'House' || propertyType === 'Apartment' ||
                    propertyType === 'Upper Portion' || propertyType === 'Lower Portion') && (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                        Bedrooms <span className="text-gray-400 font-normal normal-case">(optional)</span>
                      </label>
                      <select
                        value={bedrooms}
                        onChange={(e) => setBedrooms(e.target.value)}
                        className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none cursor-pointer bg-white"
                      >
                        <option value="">Any</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                          <option key={n} value={String(n)}>{n} Bed{n > 1 ? 's' : ''}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Asking Price (Optional) */}
                  <div>
                    <label className="flex items-center gap-1 text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                      Asking Price (PKR) <span className="text-gray-400 font-normal normal-case">(optional)</span>
                      <span title="Enter to see if asking price is fair">
                        <HelpCircle className="w-3 h-3 text-gray-400" />
                      </span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-semibold pointer-events-none">Rs</span>
                      <input
                        type="number"
                        value={askingPrice}
                        onChange={(e) => setAskingPrice(e.target.value)}
                        placeholder="e.g. 10500000"
                        min="0"
                        className="w-full h-11 pl-10 pr-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none transition-all"
                      />
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">
                      💡 Enter asking price to get a fairness verdict
                    </p>
                  </div>

                  {/* Form Error */}
                  {formError && (
                    <div className="bg-[#fef2f2] border-l-4 border-[#ef4444] p-3 rounded-lg text-sm text-red-700 flex items-center gap-2">
                      <XCircle className="w-4 h-4 flex-shrink-0" />
                      {formError}
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-[#029bba] to-[#004063] hover:from-[#027a94] hover:to-[#003350] text-white font-semibold transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Calculating...
                      </>
                    ) : (
                      <>
                        <Calculator className="w-5 h-5" />
                        Estimate Fair Price
                      </>
                    )}
                  </button>

                  {result && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="w-full h-10 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Start Over
                    </button>
                  )}
                </form>
              </div>
            </div>

            {/* ─── RESULT (3 cols) ─── */}
            <div className="lg:col-span-3" ref={resultRef}>
              {!result && !loading && !error && (
                <EmptyState />
              )}

              {error && (
                <div className="bg-[#fef2f2] border-l-4 border-[#ef4444] p-6 rounded-2xl text-center">
                  <XCircle className="w-12 h-12 text-[#ef4444] mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-red-700 mb-2">{error}</h3>
                  <p className="text-sm text-red-600">Please try again or adjust your inputs.</p>
                </div>
              )}

              {result && <ResultDisplay result={result} listingType={listingType} />}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="bg-white py-14 border-t border-gray-200">
          <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6">
            <div className="text-center mb-10">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#029bba]/10 text-[#029bba] text-sm font-semibold mb-3">
                <Lightbulb className="w-4 h-4" />
                How It Works
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                Data-Driven Price Intelligence
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Our engine analyzes thousands of comparable properties, market trends, and society-level
                pricing data to give you the most accurate fair price estimate.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                {
                  step: '01',
                  title: 'Enter Property Details',
                  description: 'City, area, property type, size — the more details you provide, the more accurate the estimate.',
                  icon: <Calculator className="w-5 h-5" />,
                },
                {
                  step: '02',
                  title: 'AI Analyzes Comparables',
                  description: 'We match your property against recent verified listings in the same area, society, and block.',
                  icon: <Activity className="w-5 h-5" />,
                },
                {
                  step: '03',
                  title: 'Get Verdict + Insights',
                  description: 'Receive fair price range, market trend, and a clear verdict — Fair, Overpriced, or Great Deal.',
                  icon: <Award className="w-5 h-5" />,
                },
              ].map((item) => (
                <div key={item.step} className="bg-gray-50 rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute -top-2 -right-2 text-6xl font-extrabold text-[#029bba]/10">
                    {item.step}
                  </div>
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-[#029bba] text-white flex items-center justify-center mb-3">
                      {item.icon}
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="bg-gradient-to-br from-[#001f2b] to-[#003553] py-12">
          <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 text-center">
            <Sparkles className="w-10 h-10 text-[#06b6d4] mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Make Smarter <span className="text-[#06b6d4]">Property Decisions</span>
            </h2>
            <p className="text-white/80 mb-6 max-w-xl mx-auto">
              Combine price intelligence with NOC verification and construction cost calculation.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/tools/verify-society">
                <button className="px-5 py-3 rounded-xl bg-white text-[#004063] font-semibold hover:bg-gray-100 transition-colors inline-flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Verify Society NOC
                </button>
              </Link>
              <Link href="/tools/construction-calculator">
                <button className="px-5 py-3 rounded-xl bg-white/15 text-white border border-white/30 font-semibold hover:bg-white/25 transition-colors inline-flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Build Cost Calculator
                </button>
              </Link>
              <Link href="/properties">
                <button className="px-5 py-3 rounded-xl bg-[#029bba] text-white font-semibold hover:bg-[#027a94] transition-colors inline-flex items-center gap-2">
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

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState(): React.ReactElement {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-10 text-center h-full flex flex-col items-center justify-center min-h-[500px]">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#029bba]/10 to-[#004063]/10 flex items-center justify-center mb-4">
        <DollarSign className="w-10 h-10 text-[#029bba]" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Get Your Fair Price Estimate</h3>
      <p className="text-gray-600 mb-6 max-w-md">
        Fill in the property details on the left, and we&apos;ll instantly analyze the market
        to give you a data-driven fair price.
      </p>
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm text-left">
        {[
          { icon: <CheckCircle className="w-4 h-4 text-[#10b981]" />, text: 'Block-level rates' },
          { icon: <CheckCircle className="w-4 h-4 text-[#10b981]" />, text: 'Verified comparables' },
          { icon: <CheckCircle className="w-4 h-4 text-[#10b981]" />, text: 'Market trend' },
          { icon: <CheckCircle className="w-4 h-4 text-[#10b981]" />, text: 'Fairness verdict' },
        ].map((item) => (
          <div key={item.text} className="flex items-center gap-2 text-sm text-gray-700">
            {item.icon}
            <span>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Result Display ───────────────────────────────────────────────────────────

interface ResultDisplayProps {
  result: EstimateResult;
  listingType: ListingType;
}

function ResultDisplay({ result, listingType }: ResultDisplayProps): React.ReactElement {
  const verdict = getVerdictConfig(result.verdict);
  const rentSuffix = listingType === 'rent' ? '/mo' : '';

  return (
    <div className="space-y-6">

      {/* VERDICT BANNER */}
      <div className={`rounded-2xl border-2 ${verdict.border} ${verdict.bg} p-6`}>
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 w-14 h-14 rounded-full bg-white shadow-md flex items-center justify-center ${verdict.color}`}>
            {verdict.icon}
          </div>
          <div className="flex-1">
            <div className={`text-xs font-bold uppercase tracking-wider ${verdict.color} mb-1`}>
              Market Verdict
            </div>
            <div className={`text-2xl font-extrabold ${verdict.color} mb-2`}>
              {verdict.label}
            </div>
            <p className="text-sm text-gray-700">{result.verdictMessage}</p>

            {result.asking && (
              <div className="mt-4 pt-4 border-t border-current/20">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-gray-600 uppercase tracking-wider">Asking Price</div>
                    <div className="text-lg font-bold text-gray-900">
                      {formatPKR(result.asking.amount)}{rentSuffix}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 uppercase tracking-wider">Deviation</div>
                    <div className={`text-lg font-bold ${verdict.color}`}>
                      {result.asking.deviationPercent > 0 ? '+' : ''}
                      {result.asking.deviationPercent.toFixed(1)}%
                    </div>
                  </div>
                </div>
                <p className={`text-xs mt-2 font-semibold ${verdict.color}`}>
                  💡 {result.asking.suggestion}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FAIR PRICE RANGE */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
          <Banknote className="w-5 h-5 text-[#029bba]" />
          Fair Price Range
        </h3>
        <p className="text-xs text-gray-500 mb-5">Based on {result.comparableCount} comparable {result.comparableCount === 1 ? 'property' : 'properties'}</p>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="text-center p-4 rounded-xl bg-[#f0fdf4] border border-[#10b981]/30">
            <div className="text-[10px] font-bold text-[#10b981] uppercase tracking-wider mb-1">Min</div>
            <div className="text-lg font-extrabold text-[#10b981]">
              {formatPKR(result.fairPriceMin)}{rentSuffix}
            </div>
          </div>
          <div className="text-center p-4 rounded-xl bg-[#029bba]/10 border-2 border-[#029bba]">
            <div className="text-[10px] font-bold text-[#029bba] uppercase tracking-wider mb-1">Median ★</div>
            <div className="text-lg font-extrabold text-[#029bba]">
              {formatPKR(result.fairPriceMedian)}{rentSuffix}
            </div>
          </div>
          <div className="text-center p-4 rounded-xl bg-[#fef3c7] border border-[#f59e0b]/30">
            <div className="text-[10px] font-bold text-[#f59e0b] uppercase tracking-wider mb-1">Max</div>
            <div className="text-lg font-extrabold text-[#92400e]">
              {formatPKR(result.fairPriceMax)}{rentSuffix}
            </div>
          </div>
        </div>

        {/* Per unit + Confidence + Trend */}
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50">
            <Calculator className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-xs text-gray-500">Per {result.pricePerUnitLabel}</div>
              <div className="font-bold text-gray-900 truncate">{formatPKR(result.pricePerUnit)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50">
            <Shield className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-xs text-gray-500">Confidence</div>
              <div className={`font-bold capitalize ${
                result.confidence === 'high' ? 'text-[#10b981]' :
                result.confidence === 'medium' ? 'text-[#f59e0b]' :
                'text-[#ef4444]'
              }`}>{result.confidence}</div>
            </div>
          </div>
          {result.marketTrend && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50">
              {result.marketTrend.direction === 'up' ? (
                <TrendingUp className="w-4 h-4 text-[#10b981] flex-shrink-0" />
              ) : result.marketTrend.direction === 'down' ? (
                <TrendingDown className="w-4 h-4 text-[#ef4444] flex-shrink-0" />
              ) : (
                <Minus className="w-4 h-4 text-gray-500 flex-shrink-0" />
              )}
              <div className="min-w-0">
                <div className="text-xs text-gray-500">Trend ({result.marketTrend.period})</div>
                <div className={`font-bold ${
                  result.marketTrend.direction === 'up' ? 'text-[#10b981]' :
                  result.marketTrend.direction === 'down' ? 'text-[#ef4444]' :
                  'text-gray-700'
                }`}>
                  {result.marketTrend.direction === 'up' ? '+' : result.marketTrend.direction === 'down' ? '-' : ''}
                  {Math.abs(result.marketTrend.percentage).toFixed(1)}%
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* INSIGHTS */}
      {result.insights && result.insights.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-[#f59e0b]" />
            Market Insights
          </h3>
          <ul className="space-y-2">
            {result.insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle className="w-4 h-4 text-[#10b981] flex-shrink-0 mt-0.5" />
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* COMPARABLES */}
      {result.comparables && result.comparables.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Search className="w-5 h-5 text-[#029bba]" />
            Recent Comparable Properties
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Showing {result.comparables.length} similar {listingType === 'rent' ? 'rentals' : 'sales'}
          </p>
          <div className="space-y-2">
            {result.comparables.map((c) => (
              c.slug ? (
                <Link key={c._id} href={`/property/${c.slug}`}>
                  <ComparableItem comparable={c} rentSuffix={rentSuffix} clickable />
                </Link>
              ) : (
                <ComparableItem key={c._id} comparable={c} rentSuffix={rentSuffix} />
              )
            ))}
          </div>
        </div>
      )}

      {/* DISCLAIMER */}
      <div className="bg-[#fef3c7] border-l-4 border-[#f59e0b] rounded-lg p-4 text-sm text-[#92400e]">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Disclaimer:</strong> This estimate is based on available market data and is for informational purposes only.
            Actual market value depends on property condition, exact location, legal status, and negotiation. Always consult a verified agent or conduct due diligence before any transaction.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Comparable Item ──────────────────────────────────────────────────────────

interface ComparableItemProps {
  comparable: ComparableProperty;
  rentSuffix: string;
  clickable?: boolean;
}

function ComparableItem({ comparable, rentSuffix, clickable }: ComparableItemProps): React.ReactElement {
  return (
    <div className={`flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 ${clickable ? 'hover:bg-[#029bba]/5 cursor-pointer transition-colors' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-900 text-sm truncate">{comparable.title}</div>
        <div className="text-xs text-gray-500 mt-0.5">
          {comparable.size} {comparable.sizeUnit}
          {comparable.bedrooms ? ` · ${comparable.bedrooms} Bed` : ''}
          {' · '}
          <span className="text-gray-400">{comparable.daysAgo} day{comparable.daysAgo !== 1 ? 's' : ''} ago</span>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="font-bold text-[#029bba]">{formatPKR(comparable.price)}{rentSuffix}</div>
        {clickable && (
          <div className="text-[10px] text-gray-400 flex items-center gap-0.5 justify-end mt-0.5">
            View <ChevronRight className="w-3 h-3" />
          </div>
        )}
      </div>
    </div>
  );
}