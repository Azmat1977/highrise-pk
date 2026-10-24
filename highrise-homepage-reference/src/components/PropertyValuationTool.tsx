import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  Layers, 
  Scale, 
  TrendingUp, 
  ShieldCheck, 
  Calculator, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  Sliders, 
  ExternalLink, 
  Bed, 
  Home, 
  LandPlot, 
  Store, 
  TreePine,
  DollarSign,
  ChevronDown,
  RefreshCw,
  Info
} from 'lucide-react';
import { PropertyCategory } from '../types/index.ts';
import { AreaUnit } from '../utils/calculators.ts';
import { 
  estimatePropertyValuation, 
  ValuationInput, 
  ValuationResult 
} from '../utils/propertyValuation.ts';
import { SAMPLE_PROPERTIES } from '../data/mockData.ts';

const CITIES = ['Islamabad', 'Lahore', 'Karachi', 'Rawalpindi', 'Peshawar', 'Multan', 'Faisalabad'];

const POPULAR_SOCIETIES: Record<string, string[]> = {
  Islamabad: [
    'DHA Phase 2',
    'Sector F-7',
    'Sector F-8',
    'Sector F-10',
    'Sector F-11',
    'Sector G-11',
    'Sector G-13',
    'Sector E-7',
    'Gulberg Greens',
    'Blue Area',
    'Bahria Town',
  ],
  Lahore: [
    'DHA Phase 6',
    'DHA Phase 5',
    'DHA Phase 7',
    'DHA Phase 8',
    'Gulberg III',
    'Model Town',
    'Bahria Town',
    'Johar Town',
    'Askari 11',
  ],
  Karachi: [
    'Clifton Block 4',
    'DHA Phase 8',
    'DHA Phase 6',
    'DHA Phase 5',
    'Bahria Town',
    'Gulshan-e-Iqbal',
    'Bath Island',
  ],
  Rawalpindi: [
    'Bahria Town Phase 7',
    'Bahria Town Phase 8',
    'DHA Phase 1',
    'Satellite Town',
    'Chaklala Scheme 3',
  ],
};

const CATEGORIES: Array<{ id: PropertyCategory; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'house', label: 'House / Villa', icon: Home },
  { id: 'apartment', label: 'Flat / Apartment', icon: Building2 },
  { id: 'residential-plot', label: 'Residential Plot', icon: LandPlot },
  { id: 'shop-office', label: 'Commercial / Office', icon: Store },
  { id: 'commercial-plot', label: 'Commercial Plot', icon: Layers },
  { id: 'farmhouse', label: 'Farmhouse', icon: TreePine },
];

const COMMON_SIZES = [
  { label: '5 Marla', size: 5, unit: 'Marla' as AreaUnit },
  { label: '10 Marla', size: 10, unit: 'Marla' as AreaUnit },
  { label: '1 Kanal', size: 1, unit: 'Kanal' as AreaUnit },
  { label: '2 Kanal', size: 2, unit: 'Kanal' as AreaUnit },
  { label: '1,200 sqft', size: 1200, unit: 'Sq. Ft.' as AreaUnit },
  { label: '2,000 sqft', size: 2000, unit: 'Sq. Ft.' as AreaUnit },
];

interface PropertyValuationToolProps {
  initialCity?: string;
  initialArea?: string;
  initialCategory?: PropertyCategory;
  onNavigateProperty?: () => void;
  compactMode?: boolean;
}

export const PropertyValuationTool: React.FC<PropertyValuationToolProps> = ({
  initialCity = 'Islamabad',
  initialArea = 'DHA Phase 2',
  initialCategory = 'house',
  onNavigateProperty,
  compactMode = false,
}) => {
  // Form State
  const [city, setCity] = useState<string>(initialCity);
  const [area, setArea] = useState<string>(initialArea);
  const [customArea, setCustomArea] = useState<string>('');
  const [category, setCategory] = useState<PropertyCategory>(initialCategory);
  const [size, setSize] = useState<number>(5);
  const [sizeUnit, setSizeUnit] = useState<AreaUnit>('Marla');
  const [marlaStandard, setMarlaStandard] = useState<225 | 250>(225);
  
  // Advanced options
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [bedrooms, setBedrooms] = useState<number>(3);
  const [ageCondition, setAgeCondition] = useState<'brand-new' | '1-5-years' | '5-10-years' | '10plus-years'>('brand-new');
  const [isCornerOrMainRoad, setIsCornerOrMainRoad] = useState<boolean>(false);

  // Active Society List based on selected City
  const availableSocieties = POPULAR_SOCIETIES[city] || [
    'Phase 1', 'Phase 2', 'Sector A', 'Sector B', 'Main Boulevard'
  ];

  const effectiveArea = customArea.trim() ? customArea.trim() : area;

  // Valuation Calculation
  const valuationResult: ValuationResult = useMemo(() => {
    const input: ValuationInput = {
      city,
      area: effectiveArea,
      category,
      size: Number(size) || 1,
      sizeUnit,
      marlaSqFt: marlaStandard,
      bedrooms: category === 'house' || category === 'apartment' ? bedrooms : undefined,
      ageCondition,
      isCornerOrMainRoad,
    };
    return estimatePropertyValuation(input, SAMPLE_PROPERTIES);
  }, [
    city,
    effectiveArea,
    category,
    size,
    sizeUnit,
    marlaStandard,
    bedrooms,
    ageCondition,
    isCornerOrMainRoad,
  ]);

  const handleCityChange = (newCity: string) => {
    setCity(newCity);
    const societies = POPULAR_SOCIETIES[newCity];
    if (societies && societies.length > 0) {
      setArea(societies[0]);
    } else {
      setArea('Main City Sector');
    }
    setCustomArea('');
  };

  return (
    <div className="w-full space-y-6">
      {/* 1. INPUT FORM CARD */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#004063]/10 text-[#004063] mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#029bba]" />
              <span>Real-Time Market Intelligence</span>
            </div>
            <h2 className="font-heading font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
              Property Market Valuation Tool
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Input location, area size, and property type to calculate fair market price based on live Highrise.pk listings.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[11px] font-semibold text-slate-500">Marla Standard:</span>
            <div className="inline-flex p-0.5 bg-slate-100 rounded-xl text-xs font-bold text-slate-700">
              <button
                type="button"
                onClick={() => setMarlaStandard(225)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  marlaStandard === 225
                    ? 'bg-[#004063] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                225 sqft (DHA)
              </button>
              <button
                type="button"
                onClick={() => setMarlaStandard(250)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  marlaStandard === 250
                    ? 'bg-[#004063] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                250 sqft (LDA)
              </button>
            </div>
          </div>
        </div>

        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {/* A. City Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#029bba]" />
              <span>Select City</span>
            </label>
            <div className="relative">
              <select
                value={city}
                onChange={(e) => handleCityChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004063] shadow-xs appearance-none"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* B. Sector / Society Selection */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#029bba]" />
                <span>Location / Society / Sector</span>
              </span>
              {customArea ? (
                <button
                  type="button"
                  onClick={() => setCustomArea('')}
                  className="text-[10px] text-[#029bba] hover:underline"
                >
                  Reset to popular list
                </button>
              ) : null}
            </label>
            
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <select
                    value={customArea ? '' : area}
                    onChange={(e) => {
                      setArea(e.target.value);
                      setCustomArea('');
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004063] shadow-xs appearance-none"
                  >
                    {availableSocieties.map((soc) => (
                      <option key={soc} value={soc}>
                        {soc}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Or type specific Phase / Block / Street..."
                    value={customArea}
                    onChange={(e) => setCustomArea(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004063] shadow-xs"
                  />
                </div>
              </div>

              {/* Quick Pills for top sectors */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {availableSocieties.slice(0, 5).map((soc) => (
                  <button
                    key={soc}
                    type="button"
                    onClick={() => {
                      setArea(soc);
                      setCustomArea('');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      effectiveArea.toLowerCase() === soc.toLowerCase()
                        ? 'bg-[#004063] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {soc}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* C. Property Type Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#029bba]" />
            <span>Property Type</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`p-3 rounded-2xl border text-left flex flex-col items-center justify-center text-center transition-all ${
                    isSelected
                      ? 'border-[#004063] bg-[#004063] text-white shadow-md'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? 'text-[#38aec7]' : 'text-slate-500'}`} />
                  <span className="text-xs font-bold leading-tight">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* D. Land / Covered Area Size & Unit */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-[#029bba]" />
            <span>Area Size & Unit</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 relative">
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={size || ''}
                onChange={(e) => setSize(parseFloat(e.target.value) || 0)}
                placeholder="Enter size (e.g. 5, 10, 1, 2000)"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-base font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#004063] shadow-xs"
              />
              <span className="absolute right-3.5 top-3 text-xs font-bold text-slate-400 uppercase">
                {sizeUnit}
              </span>
            </div>

            <div>
              <select
                value={sizeUnit}
                onChange={(e) => setSizeUnit(e.target.value as AreaUnit)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004063] shadow-xs"
              >
                <option value="Marla">Marla ({marlaStandard} sq ft)</option>
                <option value="Kanal">Kanal (20 Marla)</option>
                <option value="Sq. Ft.">Square Feet (sqft)</option>
                <option value="Sq. Yds.">Square Yards (Gaz)</option>
              </select>
            </div>
          </div>

          {/* Quick Area Size Presets */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-semibold text-slate-500">Popular presets:</span>
            {COMMON_SIZES.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setSize(preset.size);
                  setSizeUnit(preset.unit);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                  size === preset.size && sizeUnit === preset.unit
                    ? 'bg-[#004063] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* E. Advanced Refinements Accordion */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-xs font-bold text-[#004063] hover:text-[#029bba] transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-[#029bba]" />
            <span>{showAdvanced ? 'Hide Additional Specs' : 'Fine-Tune Specifications (Condition, Bedrooms, Corner Plot)'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>

          {showAdvanced && (
            <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in duration-200">
              {/* Bedrooms (if residential) */}
              {(category === 'house' || category === 'apartment') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                    <Bed className="w-3.5 h-3.5 text-slate-500" />
                    <span>Bedrooms</span>
                  </label>
                  <select
                    value={bedrooms}
                    onChange={(e) => setBedrooms(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                  >
                    <option value="1">1 Bedroom</option>
                    <option value="2">2 Bedrooms</option>
                    <option value="3">3 Bedrooms</option>
                    <option value="4">4 Bedrooms</option>
                    <option value="5">5 Bedrooms</option>
                    <option value="6">6+ Bedrooms</option>
                  </select>
                </div>
              )}

              {/* Age / Condition */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Property Age & Finish
                </label>
                <select
                  value={ageCondition}
                  onChange={(e) => setAgeCondition(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                >
                  <option value="brand-new">Brand New (2025-2026 A+)</option>
                  <option value="1-5-years">1 to 5 Years Old</option>
                  <option value="5-10-years">5 to 10 Years Old</option>
                  <option value="10plus-years">10+ Years / Standard</option>
                </select>
              </div>

              {/* Corner / Main Road checkbox */}
              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2 p-2 rounded-xl border border-slate-300 bg-white cursor-pointer hover:border-[#004063]">
                  <input
                    type="checkbox"
                    checked={isCornerOrMainRoad}
                    onChange={(e) => setIsCornerOrMainRoad(e.target.checked)}
                    className="w-4 h-4 rounded text-[#004063] accent-[#004063]"
                  />
                  <span className="text-xs font-bold text-slate-700">
                    Corner Plot / Main Boulevard (+8%)
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. VALUATION RESULTS DASHBOARD */}
      <div className="space-y-6">
        {/* Main Price Card */}
        <div className="bg-gradient-to-br from-[#002b42] via-[#004063] to-[#002236] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#004063]/30 relative overflow-hidden">
          {/* Subtle geometric circles */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#029bba]/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-[#004063]/20 blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            {/* Top row: Tags & Confidence */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#029bba]/20 text-[#38aec7] border border-[#029bba]/30">
                  {valuationResult.confidenceScore}% {valuationResult.confidenceLevel} Confidence
                </span>
                <span className="text-xs text-slate-300 hidden sm:inline">
                  • {effectiveArea}, {city}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/30">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>1-Yr Trend: +{valuationResult.marketTrend1Yr}%</span>
              </div>
            </div>

            {/* Fair Market Value Headline */}
            <div>
              <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#8fc2d0] block mb-1">
                Fair Market Value Estimate
              </span>
              <div className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                {valuationResult.priceFormatted}
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-[#38aec7] shrink-0" />
                <span>{valuationResult.calculationBasis}</span>
              </p>
            </div>

            {/* Estimated Price Range Gauge */}
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15 space-y-2">
              <div className="flex justify-between text-xs sm:text-sm text-slate-200">
                <div>
                  <span className="text-[10px] text-slate-300 block uppercase tracking-wider">Fast Sale (Low)</span>
                  <strong className="text-white font-extrabold">{valuationResult.lowEstimateFormatted}</strong>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-[#38aec7] block uppercase tracking-wider font-bold">Estimated Median</span>
                  <strong className="text-emerald-300 font-extrabold">{valuationResult.priceFormatted}</strong>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-300 block uppercase tracking-wider">Premium Ceiling (High)</span>
                  <strong className="text-white font-extrabold">{valuationResult.highEstimateFormatted}</strong>
                </div>
              </div>

              {/* Gradient slider bar */}
              <div className="relative w-full h-3 bg-white/20 rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-emerald-400 to-[#38aec7] opacity-90" />
              </div>
            </div>

            {/* 4 Key Metric Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-slate-300 block uppercase tracking-wider">Price per Marla</span>
                <strong className="text-base sm:text-lg font-extrabold text-white">
                  {valuationResult.pricePerMarlaFormatted}
                </strong>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  ({marlaStandard} sq ft standard)
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-slate-300 block uppercase tracking-wider">Price per Sq. Ft.</span>
                <strong className="text-base sm:text-lg font-extrabold text-white">
                  {valuationResult.pricePerSqFtFormatted}
                </strong>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Total: {valuationResult.normalizedSqFt.toLocaleString()} sqft
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-slate-300 block uppercase tracking-wider">Estimated Rent</span>
                <strong className="text-base sm:text-lg font-extrabold text-emerald-300">
                  {valuationResult.estimatedMonthlyRentFormatted}
                </strong>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {valuationResult.estimatedGrossYield > 0 ? `~${valuationResult.estimatedGrossYield}% gross yield` : 'Plot (N/A)'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-slate-300 block uppercase tracking-wider">Historical Return</span>
                <strong className="text-base sm:text-lg font-extrabold text-[#38aec7]">
                  +{valuationResult.marketTrend1Yr}%
                </strong>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Annual Capital Gain
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. COMPARABLE ACTIVE LISTINGS ON HIGHRISE.PK */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="font-heading font-extrabold text-slate-900 text-base sm:text-lg">
                  Comparable Active Listings in {city}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Current sample properties matching this property classification and location.
              </p>
            </div>

            <Link
              to={`/properties?city=${encodeURIComponent(city)}&category=${category}`}
              onClick={onNavigateProperty}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#004063] hover:text-[#029bba] transition-colors"
            >
              <span>Explore All {city} Listings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {valuationResult.comparableListings.map((prop) => (
              <div
                key={prop.id}
                className="group rounded-2xl border border-slate-200 hover:border-[#004063] overflow-hidden bg-white shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-36 overflow-hidden bg-slate-100">
                    <img
                      src={prop.images[0]}
                      alt={prop.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#004063]/90 text-white">
                      {prop.categoryLabel}
                    </div>
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-slate-800 shadow-xs">
                      {prop.size} {prop.sizeUnit}
                    </div>
                  </div>

                  <div className="p-3 space-y-1.5">
                    <div className="text-sm font-extrabold text-[#004063] group-hover:text-[#029bba] transition-colors line-clamp-1">
                      {prop.priceFormatted}
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug">
                      {prop.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{prop.area}, {prop.city}</span>
                    </p>
                  </div>
                </div>

                <div className="p-3 pt-0">
                  <Link
                    to={`/properties/${prop.slug}`}
                    onClick={onNavigateProperty}
                    className="w-full py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-[#004063] text-slate-700 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>View Property Details</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
