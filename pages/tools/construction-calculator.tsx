// pages/tools/construction-calculator.tsx
// 🏗️ MULTI-TYPOLOGY CONSTRUCTION COST CALCULATOR — HIGHRISE.PK
// 3-Step Wizard: Category → Sub-Type → Specifications

import React, { useState, useRef, useCallback, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  Calculator, MapPin, Layers, Award, Wrench,
  Loader2, X, CheckCircle, XCircle, Info,
  TrendingUp, TrendingDown, Minus, Sparkles,
  Home, ShieldCheck, Banknote, Clock, Hammer, Lightbulb,
  Package, Construction, Plus, ArrowLeft, ArrowRight,
  Building, Building2, Briefcase, Factory, Snowflake,
  Store, ShoppingBag, Trees, AlertTriangle, Database,
} from 'lucide-react';

// ─── Types (mirror lib/constructionRates.ts) ──────────────────────────────────

type City =
  | 'Lahore' | 'Islamabad' | 'Rawalpindi' | 'Karachi' | 'Faisalabad'
  | 'Multan' | 'Peshawar' | 'Gujranwala' | 'Sialkot' | 'Quetta';

type QualityGrade = 'standard' | 'premium' | 'luxury';
type ConstructionType = 'grey_structure' | 'finishing' | 'turnkey';
type AreaUnit = 'Marla' | 'Kanal' | 'Sq Ft';

type PropertyCategory = 'residential' | 'commercial' | 'industrial' | 'mixed_use';

type PropertySubType =
  | 'house' | 'villa' | 'farmhouse' | 'highrise_apartment_building'
  | 'shop_showroom' | 'commercial_plaza' | 'office_building' | 'highrise_office_tower'
  | 'warehouse' | 'industrial_building' | 'cold_storage' | 'workshop'
  | 'shops_plus_apartments' | 'complete_mixed_tower';

interface SubTypeUiMeta {
  id: PropertySubType;
  category: PropertyCategory;
  displayName: string;
  shortName: string;
  description: string;
  icon: React.ReactElement;
  coverageRatio: number;
  defaultFloors: number;
  minFloors: number;
  maxFloors: number;
  supportsFinishing: boolean;
  supportsBoundaryWall: boolean;
  supportsBasement: boolean;
  supportsParking: boolean;
  supportsElevators: boolean;
  supportsHVAC: boolean;
  supportsClearHeight: boolean;
  supportsLoadingDocks: boolean;
  defaultAreaUnit: AreaUnit;
  requiresEngineerNote: boolean;
}

interface CostBreakdownItem {
  category: string;
  description: string;
  amount: number;
  percentage: number;
}

interface MaterialRate {
  name: string;
  unit: string;
  pricePKR: number;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
  category: 'structural' | 'finishing' | 'mep' | 'labor';
}

interface CalculationResult {
  city: City;
  subType: PropertySubType;
  subTypeDisplayName: string;
  category: PropertyCategory;
  quality: QualityGrade;
  constructionType: ConstructionType;
  floors: number;
  plotSizeSqft: number;
  coveredAreaPerFloor: number;
  totalCoveredSqft: number;
  coverageRatio: number;
  baseCost: number;
  addOnsCost: number;
  totalCost: number;
  costPerSqft: number;
  costPerMarla: number;
  costMin: number;
  costMax: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  breakdown: CostBreakdownItem[];
  addOns: {
    boundaryWall?: number;
    basement?: number;
    elevators?: number;
    parking?: number;
    generator?: number;
    hvac?: number;
  };
  timelineMonths: { min: number; max: number };
  materialRates: MaterialRate[];
  requiresEngineerNote: boolean;
  engineerNoteText?: string;
  insights: string[];
  lastUpdated: string;
  ratesVersion: string;
  validUntil: string;
  cityMultiplier: number;
  dataSource: {
    perSqftSource: 'admin_override' | 'baseline';
    cityMultiplierSource: 'admin_override' | 'baseline';
    overridesApplied: number;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CITIES: City[] = [
  'Lahore', 'Islamabad', 'Rawalpindi', 'Karachi', 'Faisalabad',
  'Multan', 'Peshawar', 'Gujranwala', 'Sialkot', 'Quetta',
];

const CATEGORIES: {
  id: PropertyCategory;
  name: string;
  description: string;
  icon: React.ReactElement;
  iconBg: string;
  examples: string[];
}[] = [
  {
    id: 'residential',
    name: 'Residential',
    description: 'Where you live — houses, villas, apartments',
    icon: <Home className="w-8 h-8" />,
    iconBg: 'from-[#029bba] to-[#004063]',
    examples: ['House', 'Villa', 'Farmhouse', 'Apartment Building'],
  },
  {
    id: 'commercial',
    name: 'Commercial',
    description: 'Business properties — shops, offices, plazas',
    icon: <Briefcase className="w-8 h-8" />,
    iconBg: 'from-[#004063] to-[#003553]',
    examples: ['Shop', 'Plaza', 'Office Building', 'Office Tower'],
  },
  {
    id: 'industrial',
    name: 'Industrial',
    description: 'Manufacturing & storage — factories, warehouses',
    icon: <Factory className="w-8 h-8" />,
    iconBg: 'from-[#027a94] to-[#004063]',
    examples: ['Warehouse', 'Factory', 'Cold Storage', 'Workshop'],
  },
  {
    id: 'mixed_use',
    name: 'Mixed-Use',
    description: 'Multiple usages — shops + apartments combined',
    icon: <Layers className="w-8 h-8" />,
    iconBg: 'from-[#06b6d4] to-[#029bba]',
    examples: ['Shops + Apartments', 'Mixed Tower'],
  },
];

const SUB_TYPES: SubTypeUiMeta[] = [
  // Residential
  {
    id: 'house', category: 'residential',
    displayName: 'House (Independent)', shortName: 'House',
    description: 'Single-family independent home, 1-4 floors',
    icon: <Home className="w-6 h-6" />,
    coverageRatio: 0.70, defaultFloors: 1, minFloors: 1, maxFloors: 4,
    supportsFinishing: true, supportsBoundaryWall: true, supportsBasement: true,
    supportsParking: false, supportsElevators: false, supportsHVAC: false,
    supportsClearHeight: false, supportsLoadingDocks: false,
    defaultAreaUnit: 'Marla', requiresEngineerNote: false,
  },
  {
    id: 'villa', category: 'residential',
    displayName: 'Villa (Luxury)', shortName: 'Villa',
    description: 'Premium independent home with luxury finishing',
    icon: <Building className="w-6 h-6" />,
    coverageRatio: 0.65, defaultFloors: 2, minFloors: 1, maxFloors: 3,
    supportsFinishing: true, supportsBoundaryWall: true, supportsBasement: true,
    supportsParking: false, supportsElevators: true, supportsHVAC: true,
    supportsClearHeight: false, supportsLoadingDocks: false,
    defaultAreaUnit: 'Kanal', requiresEngineerNote: false,
  },
  {
    id: 'farmhouse', category: 'residential',
    displayName: 'Farmhouse', shortName: 'Farmhouse',
    description: 'Large-land residence with sprawling structure',
    icon: <Trees className="w-6 h-6" />,
    coverageRatio: 0.25, defaultFloors: 1, minFloors: 1, maxFloors: 3,
    supportsFinishing: true, supportsBoundaryWall: true, supportsBasement: false,
    supportsParking: false, supportsElevators: false, supportsHVAC: true,
    supportsClearHeight: false, supportsLoadingDocks: false,
    defaultAreaUnit: 'Kanal', requiresEngineerNote: false,
  },
  {
    id: 'highrise_apartment_building', category: 'residential',
    displayName: 'Highrise Apartment Building', shortName: 'Apartment Building',
    description: 'Multi-story residential, G+4 to G+50 floors',
    icon: <Building2 className="w-6 h-6" />,
    coverageRatio: 0.85, defaultFloors: 8, minFloors: 4, maxFloors: 50,
    supportsFinishing: true, supportsBoundaryWall: false, supportsBasement: true,
    supportsParking: true, supportsElevators: true, supportsHVAC: true,
    supportsClearHeight: false, supportsLoadingDocks: false,
    defaultAreaUnit: 'Kanal', requiresEngineerNote: true,
  },
  // Commercial
  {
    id: 'shop_showroom', category: 'commercial',
    displayName: 'Shop / Showroom', shortName: 'Shop',
    description: 'Single commercial unit with glass facade',
    icon: <Store className="w-6 h-6" />,
    coverageRatio: 0.90, defaultFloors: 1, minFloors: 1, maxFloors: 6,
    supportsFinishing: true, supportsBoundaryWall: false, supportsBasement: true,
    supportsParking: false, supportsElevators: false, supportsHVAC: true,
    supportsClearHeight: true, supportsLoadingDocks: false,
    defaultAreaUnit: 'Marla', requiresEngineerNote: false,
  },
  {
    id: 'commercial_plaza', category: 'commercial',
    displayName: 'Commercial Plaza', shortName: 'Plaza',
    description: 'Multi-shop building with shared facilities, up to 20 floors',
    icon: <ShoppingBag className="w-6 h-6" />,
    coverageRatio: 0.85, defaultFloors: 4, minFloors: 2, maxFloors: 20,
    supportsFinishing: true, supportsBoundaryWall: false, supportsBasement: true,
    supportsParking: true, supportsElevators: true, supportsHVAC: true,
    supportsClearHeight: false, supportsLoadingDocks: false,
    defaultAreaUnit: 'Marla', requiresEngineerNote: false,
  },
  {
    id: 'office_building', category: 'commercial',
    displayName: 'Office Building', shortName: 'Office Building',
    description: 'Standalone office building, 1-10 floors',
    icon: <Briefcase className="w-6 h-6" />,
    coverageRatio: 0.75, defaultFloors: 3, minFloors: 1, maxFloors: 10,
    supportsFinishing: true, supportsBoundaryWall: true, supportsBasement: true,
    supportsParking: true, supportsElevators: true, supportsHVAC: true,
    supportsClearHeight: false, supportsLoadingDocks: false,
    defaultAreaUnit: 'Marla', requiresEngineerNote: false,
  },
  {
    id: 'highrise_office_tower', category: 'commercial',
    displayName: 'Highrise Office Tower', shortName: 'Office Tower',
    description: 'Corporate tower with curtain wall, G+5 to G+60 floors',
    icon: <Building2 className="w-6 h-6" />,
    coverageRatio: 0.80, defaultFloors: 12, minFloors: 5, maxFloors: 60,
    supportsFinishing: true, supportsBoundaryWall: false, supportsBasement: true,
    supportsParking: true, supportsElevators: true, supportsHVAC: true,
    supportsClearHeight: false, supportsLoadingDocks: false,
    defaultAreaUnit: 'Kanal', requiresEngineerNote: true,
  },
  // Industrial
  {
    id: 'warehouse', category: 'industrial',
    displayName: 'Warehouse', shortName: 'Warehouse',
    description: 'Storage facility with high clear ceiling',
    icon: <Package className="w-6 h-6" />,
    coverageRatio: 0.85, defaultFloors: 1, minFloors: 1, maxFloors: 3,
    supportsFinishing: false, supportsBoundaryWall: true, supportsBasement: false,
    supportsParking: true, supportsElevators: false, supportsHVAC: false,
    supportsClearHeight: true, supportsLoadingDocks: true,
    defaultAreaUnit: 'Kanal', requiresEngineerNote: false,
  },
  {
    id: 'industrial_building', category: 'industrial',
    displayName: 'Industrial Building', shortName: 'Factory',
    description: 'Manufacturing facility with steel frame, up to 4 floors',
    icon: <Factory className="w-6 h-6" />,
    coverageRatio: 0.80, defaultFloors: 1, minFloors: 1, maxFloors: 4,
    supportsFinishing: false, supportsBoundaryWall: true, supportsBasement: false,
    supportsParking: true, supportsElevators: false, supportsHVAC: false,
    supportsClearHeight: true, supportsLoadingDocks: true,
    defaultAreaUnit: 'Kanal', requiresEngineerNote: true,
  },
  {
    id: 'cold_storage', category: 'industrial',
    displayName: 'Cold Storage', shortName: 'Cold Storage',
    description: 'Refrigerated storage with insulation',
    icon: <Snowflake className="w-6 h-6" />,
    coverageRatio: 0.85, defaultFloors: 1, minFloors: 1, maxFloors: 3,
    supportsFinishing: false, supportsBoundaryWall: true, supportsBasement: false,
    supportsParking: true, supportsElevators: false, supportsHVAC: true,
    supportsClearHeight: true, supportsLoadingDocks: true,
    defaultAreaUnit: 'Kanal', requiresEngineerNote: true,
  },
  {
    id: 'workshop', category: 'industrial',
    displayName: 'Workshop', shortName: 'Workshop',
    description: 'Auto / mechanical workshop',
    icon: <Wrench className="w-6 h-6" />,
    coverageRatio: 0.80, defaultFloors: 1, minFloors: 1, maxFloors: 3,
    supportsFinishing: false, supportsBoundaryWall: true, supportsBasement: false,
    supportsParking: true, supportsElevators: false, supportsHVAC: false,
    supportsClearHeight: true, supportsLoadingDocks: false,
    defaultAreaUnit: 'Marla', requiresEngineerNote: false,
  },
  // Mixed-Use
  {
    id: 'shops_plus_apartments', category: 'mixed_use',
    displayName: 'Shops + Apartments', shortName: 'Shops + Apartments',
    description: 'Ground floor shops + residential above, up to 15 floors',
    icon: <Layers className="w-6 h-6" />,
    coverageRatio: 0.85, defaultFloors: 4, minFloors: 2, maxFloors: 15,
    supportsFinishing: true, supportsBoundaryWall: false, supportsBasement: true,
    supportsParking: true, supportsElevators: true, supportsHVAC: true,
    supportsClearHeight: false, supportsLoadingDocks: false,
    defaultAreaUnit: 'Marla', requiresEngineerNote: false,
  },
  {
    id: 'complete_mixed_tower', category: 'mixed_use',
    displayName: 'Complete Mixed Tower', shortName: 'Mixed Tower',
    description: 'Retail + office + residential in one tower, up to G+60',
    icon: <Building2 className="w-6 h-6" />,
    coverageRatio: 0.85, defaultFloors: 15, minFloors: 6, maxFloors: 60,
    supportsFinishing: true, supportsBoundaryWall: false, supportsBasement: true,
    supportsParking: true, supportsElevators: true, supportsHVAC: true,
    supportsClearHeight: false, supportsLoadingDocks: false,
    defaultAreaUnit: 'Kanal', requiresEngineerNote: true,
  },
];

const QUALITY_OPTIONS: {
  id: QualityGrade;
  label: string;
  description: string;
  badge: string;
  badgeColor: string;
}[] = [
  {
    id: 'standard',
    label: 'Standard (A-Class)',
    description: 'Quality local materials, durable finish',
    badge: 'Most Popular',
    badgeColor: 'bg-[#10b981]/15 text-[#10b981]',
  },
  {
    id: 'premium',
    label: 'Premium',
    description: 'Branded materials, modern fixtures',
    badge: 'Best Value',
    badgeColor: 'bg-[#029bba]/15 text-[#029bba]',
  },
  {
    id: 'luxury',
    label: 'Luxury',
    description: 'Imported materials, designer interior',
    badge: 'Top Tier',
    badgeColor: 'bg-[#004063]/15 text-[#004063]',
  },
];

const CONSTRUCTION_TYPES: {
  id: ConstructionType;
  label: string;
  description: string;
  icon: React.ReactElement;
}[] = [
  {
    id: 'grey_structure',
    label: 'Grey Structure Only',
    description: 'Foundation, walls, slab — no finishing',
    icon: <Construction className="w-5 h-5" />,
  },
  {
    id: 'finishing',
    label: 'Finishing Only',
    description: 'Already have grey structure — need finishing',
    icon: <Wrench className="w-5 h-5" />,
  },
  {
    id: 'turnkey',
    label: 'Turnkey (Complete)',
    description: 'Everything — ready-to-move-in',
    icon: <Hammer className="w-5 h-5" />,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPKR(amount: number): string {
  if (amount >= 10_000_000) return `Rs ${(amount / 10_000_000).toFixed(2)} Cr`;
  if (amount >= 100_000) return `Rs ${(amount / 100_000).toFixed(2)} Lac`;
  return `Rs ${amount.toLocaleString()}`;
}

function getBreakdownColor(index: number): string {
  const colors = [
    '#029bba', '#004063', '#06b6d4', '#027a94', '#003553',
    '#0d9488', '#0891b2', '#065f46', '#0e7490', '#155e75',
    '#1e40af', '#0c4a6e', '#134e4a', '#164e63',
  ];
  return colors[index % colors.length];
}

function getSubTypesByCategory(category: PropertyCategory): SubTypeUiMeta[] {
  return SUB_TYPES.filter((s) => s.category === category);
}

function getSubType(id: PropertySubType): SubTypeUiMeta {
  return SUB_TYPES.find((s) => s.id === id) || SUB_TYPES[0];
}

// ─── Main Component ───────────────────────────────────────────────────────────

type WizardStep = 1 | 2 | 3;

export default function ConstructionCalculatorPage(): React.ReactElement {
  // Wizard state
  const [step, setStep] = useState<WizardStep>(1);
  const [category, setCategory] = useState<PropertyCategory | null>(null);
  const [subType, setSubType] = useState<PropertySubType | null>(null);

  // Form state
  const [city, setCity] = useState<City>('Lahore');
  const [size, setSize] = useState('10');
  const [sizeUnit, setSizeUnit] = useState<AreaUnit>('Marla');
  const [floors, setFloors] = useState(1);
  const [quality, setQuality] = useState<QualityGrade>('standard');
  const [constructionType, setConstructionType] = useState<ConstructionType>('turnkey');
  const [includeBoundaryWall, setIncludeBoundaryWall] = useState(false);
  const [includeBasement, setIncludeBasement] = useState(false);
  const [elevatorCount, setElevatorCount] = useState(0);
  const [parkingSlots, setParkingSlots] = useState(0);
  const [generatorKVA, setGeneratorKVA] = useState(0);
  const [hvacIncluded, setHvacIncluded] = useState(false);
  const [clearHeightFt, setClearHeightFt] = useState(20);
  const [loadingDocks, setLoadingDocks] = useState(0);

  // Result state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Computed
  const selectedMeta = useMemo(() => (subType ? getSubType(subType) : null), [subType]);

  // ─── Wizard navigation ───────────────────────────────────────────────────

  const handleCategorySelect = (cat: PropertyCategory) => {
    setCategory(cat);
    setSubType(null);
    setStep(2);
  };

  const handleSubTypeSelect = (sub: PropertySubType) => {
    const meta = getSubType(sub);
    setSubType(sub);
    // Apply smart defaults from sub-type metadata
    setFloors(meta.defaultFloors);
    setSizeUnit(meta.defaultAreaUnit);
    // Reset add-ons to safe defaults
    setIncludeBoundaryWall(false);
    setIncludeBasement(false);
    setElevatorCount(0);
    setParkingSlots(0);
    setGeneratorKVA(0);
    setHvacIncluded(false);
    // Industrial = no finishing
    if (!meta.supportsFinishing) {
      setConstructionType('grey_structure');
    } else {
      setConstructionType('turnkey');
    }
    setStep(3);
  };

  const handleBack = () => {
    if (step === 3) {
      setStep(2);
      setResult(null);
      setError(null);
    } else if (step === 2) {
      setStep(1);
      setCategory(null);
      setSubType(null);
    }
  };

  const handleStartOver = () => {
    setStep(1);
    setCategory(null);
    setSubType(null);
    setResult(null);
    setError(null);
    setFormError(null);
  };

  // ─── Submit ──────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);
      setError(null);

      if (!subType || !selectedMeta) {
        setFormError('Please select a property type first');
        return;
      }

      const sizeNum = parseFloat(size);
      if (!sizeNum || sizeNum <= 0) {
        setFormError('Please enter a valid plot size');
        return;
      }
      if (sizeNum > 10000) {
        setFormError('Plot size seems too large. Please verify.');
        return;
      }
      if (floors < selectedMeta.minFloors) {
        setFormError(`${selectedMeta.displayName} requires minimum ${selectedMeta.minFloors} floors`);
        return;
      }
      if (floors > selectedMeta.maxFloors) {
        setFormError(`${selectedMeta.displayName} supports maximum ${selectedMeta.maxFloors} floors`);
        return;
      }

      setLoading(true);
      setResult(null);

      try {
        const payload = {
          city,
          subType,
          quality,
          constructionType,
          size: sizeNum,
          sizeUnit,
          floors,
          includeBoundaryWall: selectedMeta.supportsBoundaryWall ? includeBoundaryWall : false,
          includeBasement: selectedMeta.supportsBasement ? includeBasement : false,
          elevatorCount: selectedMeta.supportsElevators ? elevatorCount : 0,
          parkingSlots: selectedMeta.supportsParking ? parkingSlots : 0,
          generatorKVA,
          hvacIncluded: selectedMeta.supportsHVAC ? hvacIncluded : false,
          ...(selectedMeta.supportsClearHeight && { clearHeightFt }),
          ...(selectedMeta.supportsLoadingDocks && { loadingDocks }),
        };

        const res = await fetch('/api/tools/construction-rates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data?.error || 'Failed to calculate construction cost');
          return;
        }

        setResult(data.data);

        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [
      subType, selectedMeta, city, quality, constructionType, size, sizeUnit, floors,
      includeBoundaryWall, includeBasement, elevatorCount, parkingSlots, generatorKVA,
      hvacIncluded, clearHeightFt, loadingDocks,
    ]
  );

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <Head>
        <title>Construction Cost Calculator Pakistan | All Property Types | Highrise.pk</title>
        <meta
          name="description"
          content="Calculate construction cost for any property in Pakistan — houses, villas, apartments, shops, plazas, warehouses, factories, mixed-use towers. Live rates, 10 cities, 14 typologies. Free."
        />
        <meta name="keywords" content="construction cost calculator Pakistan, building cost Lahore Karachi, apartment building cost, warehouse cost, commercial plaza cost, factory cost Pakistan" />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Multi-Property Construction Calculator | Highrise.pk" />
        <meta property="og:description" content="Pakistan's first multi-typology construction cost engine — covers 14 property types from house to highrise tower." />
        <meta property="og:url" content="https://highrise.pk/tools/construction-calculator" />
        <link rel="canonical" href="https://highrise.pk/tools/construction-calculator" />
      </Head>

      <div className="min-h-screen bg-gray-50">

        {/* ── HERO ── */}
        <section className="relative bg-gradient-to-br from-[#001f2b] via-[#003553] to-[#001927] py-14 md:py-16 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.10),transparent_50%)] pointer-events-none" />
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 1px, transparent 20px)',
            }}
          />

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm text-white text-sm font-semibold mb-5">
                <Construction className="w-4 h-4 text-[#06b6d4]" />
                Pakistan&apos;s First Multi-Property Cost Engine
              </div>

              <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight tracking-tight">
                Banane Ka <span className="text-[#06b6d4] underline decoration-[#06b6d4]/40 decoration-4 underline-offset-4">Kharcha</span> Kitna Aayega?
              </h1>

              <p className="text-base md:text-lg text-white/85 max-w-2xl mx-auto mb-5">
                Calculate cost for any property type — house, villa, apartment building, shop, plaza,
                warehouse, factory, or mixed-use tower. <strong>14 typologies, 10 cities.</strong>
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4 text-white/80 text-sm">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#06b6d4]" />
                  <span>Live material rates</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#06b6d4]" />
                  <span>10 major cities</span>
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#06b6d4]" />
                  <span>14 property types</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#06b6d4]" />
                  <span>3 quality grades</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── PROGRESS BAR ── */}
        <section className="container mx-auto px-4 py-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Step {step} of 3
              </span>
              <span className="text-xs text-gray-500">
                {step === 1 && 'Choose Property Category'}
                {step === 2 && 'Select Property Type'}
                {step === 3 && 'Project Specifications'}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#029bba] to-[#004063] transition-all duration-500"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* STEP 1 — CATEGORY SELECTION */}
        {/* ═══════════════════════════════════════════════════════ */}
        {step === 1 && (
          <section className="container mx-auto px-4 pb-12">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  What Are You Building?
                </h2>
                <p className="text-gray-600">Select the main category that best describes your project</p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategorySelect(cat.id)}
                    className="group bg-white rounded-2xl p-6 text-left border-2 border-gray-200 hover:border-[#029bba] hover:shadow-xl transition-all"
                  >
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${cat.iconBg} text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      {cat.icon}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{cat.name}</h3>
                    <p className="text-sm text-gray-600 mb-3">{cat.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.examples.map((ex) => (
                        <span key={ex} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {ex}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-[#029bba] group-hover:gap-2 transition-all">
                      <span>Select</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* STEP 2 — SUB-TYPE SELECTION */}
        {/* ═══════════════════════════════════════════════════════ */}
        {step === 2 && category && (
          <section className="container mx-auto px-4 pb-12">
            <div className="max-w-5xl mx-auto">
              {/* Back + Header */}
              <button
                type="button"
                onClick={handleBack}
                className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#029bba] hover:gap-3 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Categories
              </button>

              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  Choose Specific Type
                </h2>
                <p className="text-gray-600">
                  Select the exact {CATEGORIES.find((c) => c.id === category)?.name.toLowerCase()} property type
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-4">
                {getSubTypesByCategory(category).map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => handleSubTypeSelect(sub.id)}
                    className="group bg-white rounded-2xl p-5 text-left border-2 border-gray-200 hover:border-[#029bba] hover:shadow-lg transition-all flex items-start gap-4"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#029bba]/10 text-[#029bba] flex items-center justify-center flex-shrink-0 group-hover:bg-[#029bba] group-hover:text-white transition-colors">
                      {sub.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-gray-900 text-base leading-tight">
                          {sub.displayName}
                        </h3>
                        {sub.requiresEngineerNote && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#fef3c7] text-[#92400e] flex-shrink-0">
                            <AlertTriangle className="w-2.5 h-2.5 inline mr-0.5" />
                            ENGINEER
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mb-2 leading-relaxed">{sub.description}</p>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-500">
                        <span>Floors: {sub.minFloors}-{sub.maxFloors}</span>
                        <span>·</span>
                        <span>Coverage: {Math.round(sub.coverageRatio * 100)}%</span>
                        <span>·</span>
                        <span>Default: {sub.defaultAreaUnit}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-[#029bba] flex-shrink-0 mt-1" />
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* STEP 3 — SPECIFICATIONS + RESULT */}
        {/* ═══════════════════════════════════════════════════════ */}
        {step === 3 && selectedMeta && (
          <section className="container mx-auto px-4 pb-12">
            <div className="max-w-6xl mx-auto">
              {/* Back + Selected Property Banner */}
              <button
                type="button"
                onClick={handleBack}
                className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#029bba] hover:gap-3 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Change Property Type
              </button>

              <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#029bba]/10 text-[#029bba] flex items-center justify-center flex-shrink-0">
                  {selectedMeta.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Selected</div>
                  <div className="font-bold text-gray-900">{selectedMeta.displayName}</div>
                  <div className="text-xs text-gray-500">{selectedMeta.description}</div>
                </div>
                <button
                  type="button"
                  onClick={handleStartOver}
                  className="text-xs font-semibold text-gray-500 hover:text-[#029bba] flex-shrink-0"
                >
                  Start Over
                </button>
              </div>

              <div className="grid lg:grid-cols-5 gap-8">

                {/* ─── FORM (2 cols) ─── */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-2xl shadow-md p-6 sticky top-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Calculator className="w-5 h-5 text-[#029bba]" />
                      <h2 className="text-xl font-bold text-gray-900">Specifications</h2>
                    </div>
                    <p className="text-sm text-gray-500 mb-6">Adjust to match your project</p>

                    <form onSubmit={handleSubmit} className="space-y-5">

                      {/* City */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                          <MapPin className="w-3 h-3 inline mr-1" /> City *
                        </label>
                        <select
                          value={city}
                          onChange={(e) => setCity(e.target.value as City)}
                          className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none cursor-pointer bg-white"
                        >
                          {CITIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      {/* Plot Size + Unit */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                          Plot Size *
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="number"
                            value={size}
                            onChange={(e) => setSize(e.target.value)}
                            min="0"
                            step="0.5"
                            placeholder="e.g. 10"
                            className="col-span-2 h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none"
                          />
                          <select
                            value={sizeUnit}
                            onChange={(e) => setSizeUnit(e.target.value as AreaUnit)}
                            className="h-11 px-2 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none cursor-pointer bg-white"
                          >
                            <option value="Marla">Marla</option>
                            <option value="Kanal">Kanal</option>
                            <option value="Sq Ft">Sq Ft</option>
                          </select>
                        </div>
                      </div>

                      {/* Floors — adaptive min/max */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                          <Layers className="w-3 h-3 inline mr-1" /> Number of Floors *
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setFloors(Math.max(selectedMeta.minFloors, floors - 1))}
                            disabled={floors <= selectedMeta.minFloors}
                            className="w-11 h-11 rounded-xl border border-gray-300 flex items-center justify-center text-gray-700 font-bold hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            aria-label="Decrease floors"
                          >
                            −
                          </button>
                          <div className="flex-1 h-11 rounded-xl border border-gray-300 flex items-center justify-center font-bold text-gray-900 text-lg bg-gray-50">
                            {floors} {floors === 1 ? 'Floor' : 'Floors'}
                          </div>
                          <button
                            type="button"
                            onClick={() => setFloors(Math.min(selectedMeta.maxFloors, floors + 1))}
                            disabled={floors >= selectedMeta.maxFloors}
                            className="w-11 h-11 rounded-xl border border-gray-300 flex items-center justify-center text-gray-700 font-bold hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            aria-label="Increase floors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1">
                          Range: {selectedMeta.minFloors}–{selectedMeta.maxFloors} floors for {selectedMeta.shortName}
                        </p>
                      </div>

                      {/* Quality Grade */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                          <Award className="w-3 h-3 inline mr-1" /> Quality Grade *
                        </label>
                        <div className="space-y-2">
                          {QUALITY_OPTIONS.map((q) => (
                            <button
                              key={q.id}
                              type="button"
                              onClick={() => setQuality(q.id)}
                              className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                                quality === q.id
                                  ? 'border-[#029bba] bg-[#029bba]/5'
                                  : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-gray-900 text-sm">{q.label}</span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${q.badgeColor}`}>
                                      {q.badge}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-600 leading-tight">{q.description}</p>
                                </div>
                                {quality === q.id && (
                                  <CheckCircle className="w-5 h-5 text-[#029bba] flex-shrink-0" />
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Construction Type — hide finishing for industrial */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                          <Wrench className="w-3 h-3 inline mr-1" /> Construction Type *
                        </label>
                        <div className="space-y-2">
                          {CONSTRUCTION_TYPES
                            .filter((t) => selectedMeta.supportsFinishing || t.id === 'grey_structure')
                            .map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => setConstructionType(t.id)}
                                className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                                  constructionType === t.id
                                    ? 'border-[#029bba] bg-[#029bba]/5'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                    constructionType === t.id ? 'bg-[#029bba] text-white' : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {t.icon}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-bold text-gray-900 text-sm">{t.label}</div>
                                    <p className="text-xs text-gray-600 leading-tight">{t.description}</p>
                                  </div>
                                  {constructionType === t.id && (
                                    <CheckCircle className="w-5 h-5 text-[#029bba] flex-shrink-0" />
                                  )}
                                </div>
                              </button>
                            ))}
                        </div>
                        {!selectedMeta.supportsFinishing && (
                          <p className="text-[11px] text-gray-500 mt-1">
                            ℹ️ Industrial buildings don&apos;t require separate finishing
                          </p>
                        )}
                      </div>

                      {/* ─── ADAPTIVE ADD-ONS (Per Sub-Type) ─── */}
                      {(selectedMeta.supportsBoundaryWall ||
                        selectedMeta.supportsBasement ||
                        selectedMeta.supportsElevators ||
                        selectedMeta.supportsParking ||
                        selectedMeta.supportsHVAC) && (
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                            Optional Add-ons
                          </label>
                          <div className="space-y-2">
                            {selectedMeta.supportsBoundaryWall && (
                              <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={includeBoundaryWall}
                                  onChange={(e) => setIncludeBoundaryWall(e.target.checked)}
                                  className="w-4 h-4 accent-[#029bba]"
                                />
                                <div className="flex-1">
                                  <div className="font-semibold text-gray-900 text-sm">Boundary Wall</div>
                                  <div className="text-xs text-gray-500">Perimeter wall with gate</div>
                                </div>
                              </label>
                            )}
                            {selectedMeta.supportsBasement && (
                              <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={includeBasement}
                                  onChange={(e) => setIncludeBasement(e.target.checked)}
                                  className="w-4 h-4 accent-[#029bba]"
                                />
                                <div className="flex-1">
                                  <div className="font-semibold text-gray-900 text-sm">Basement</div>
                                  <div className="text-xs text-gray-500">Underground floor with waterproofing</div>
                                </div>
                              </label>
                            )}
                            {selectedMeta.supportsHVAC && (
                              <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={hvacIncluded}
                                  onChange={(e) => setHvacIncluded(e.target.checked)}
                                  className="w-4 h-4 accent-[#029bba]"
                                />
                                <div className="flex-1">
                                  <div className="font-semibold text-gray-900 text-sm">HVAC / Central AC</div>
                                  <div className="text-xs text-gray-500">Climate control system</div>
                                </div>
                              </label>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Elevators — only for highrise/multi-story commercial */}
                      {selectedMeta.supportsElevators && (
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                            Elevators <span className="text-gray-400 font-normal normal-case">(0–8)</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setElevatorCount(Math.max(0, elevatorCount - 1))}
                              className="w-11 h-11 rounded-xl border border-gray-300 flex items-center justify-center text-gray-700 font-bold hover:bg-gray-50"
                            >
                              −
                            </button>
                            <div className="flex-1 h-11 rounded-xl border border-gray-300 flex items-center justify-center font-bold text-gray-900 bg-gray-50">
                              {elevatorCount} {elevatorCount === 1 ? 'Elevator' : 'Elevators'}
                            </div>
                            <button
                              type="button"
                              onClick={() => setElevatorCount(Math.min(8, elevatorCount + 1))}
                              className="w-11 h-11 rounded-xl border border-gray-300 flex items-center justify-center text-gray-700 font-bold hover:bg-gray-50"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-1">💡 ~1 elevator per 30-40 apartments</p>
                        </div>
                      )}

                      {/* Parking — commercial/highrise */}
                      {selectedMeta.supportsParking && (
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                            Parking Slots
                          </label>
                          <input
                            type="number"
                            value={parkingSlots}
                            onChange={(e) => setParkingSlots(parseInt(e.target.value, 10) || 0)}
                            min="0"
                            max="2000"
                            placeholder="e.g. 50"
                            className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none"
                          />
                          <p className="text-[11px] text-gray-500 mt-1">Number of car parking spaces</p>
                        </div>
                      )}

                      {/* Generator KVA — all types */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                          Generator Backup <span className="text-gray-400 font-normal normal-case">(KVA)</span>
                        </label>
                        <input
                          type="number"
                          value={generatorKVA}
                          onChange={(e) => setGeneratorKVA(parseInt(e.target.value, 10) || 0)}
                          min="0"
                          max="5000"
                          placeholder="0 = no generator"
                          className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none"
                        />
                        <p className="text-[11px] text-gray-500 mt-1">Typical: House 10-25 KVA · Plaza 100-250 · Highrise 500+</p>
                      </div>

                      {/* Industrial-only: Clear Height */}
                      {selectedMeta.supportsClearHeight && (
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                            Clear Height <span className="text-gray-400 font-normal normal-case">(feet)</span>
                          </label>
                          <select
                            value={clearHeightFt}
                            onChange={(e) => setClearHeightFt(parseInt(e.target.value, 10))}
                            className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none cursor-pointer bg-white"
                          >
                            <option value="20">20 ft (Standard)</option>
                            <option value="30">30 ft (High-bay)</option>
                            <option value="40">40 ft (Heavy storage)</option>
                          </select>
                          <p className="text-[11px] text-gray-500 mt-1">Higher = more material cost</p>
                        </div>
                      )}

                      {/* Industrial-only: Loading Docks */}
                      {selectedMeta.supportsLoadingDocks && (
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                            Loading Docks
                          </label>
                          <input
                            type="number"
                            value={loadingDocks}
                            onChange={(e) => setLoadingDocks(parseInt(e.target.value, 10) || 0)}
                            min="0"
                            max="50"
                            placeholder="e.g. 2"
                            className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none"
                          />
                        </div>
                      )}

                      {/* Engineer Warning */}
                      {selectedMeta.requiresEngineerNote && (
                        <div className="bg-[#fef3c7] border-l-4 border-[#f59e0b] p-3 rounded-lg text-xs text-[#92400e] flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span>This typology requires a certified structural engineer. Estimate excludes consultancy fees (Rs 5–30 Lac depending on scale).</span>
                        </div>
                      )}

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
                        className="w-full h-12 rounded-xl bg-gradient-to-r from-[#029bba] to-[#004063] hover:from-[#027a94] hover:to-[#003553] text-white font-semibold transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Calculating...
                          </>
                        ) : (
                          <>
                            <Calculator className="w-5 h-5" />
                            Calculate Cost
                          </>
                        )}
                      </button>

                      {result && (
                        <button
                          type="button"
                          onClick={handleStartOver}
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
                  {!result && !loading && !error && <EmptyState selectedMeta={selectedMeta} />}

                  {error && (
                    <div className="bg-[#fef2f2] border-l-4 border-[#ef4444] p-6 rounded-2xl text-center">
                      <XCircle className="w-12 h-12 text-[#ef4444] mx-auto mb-3" />
                      <h3 className="text-lg font-bold text-red-700 mb-2">{error}</h3>
                      <p className="text-sm text-red-600">Please try again or adjust your inputs.</p>
                    </div>
                  )}

                  {result && <ResultDisplay result={result} />}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── HOW IT WORKS ── */}
        <section className="bg-white py-14 border-t border-gray-200">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#029bba]/10 text-[#029bba] text-sm font-semibold mb-3">
                <Lightbulb className="w-4 h-4" />
                How We Calculate
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                Industry-Standard <span className="text-[#029bba]">Cost Engineering</span>
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Calculations follow Pakistan Engineering Council (PEC) guidelines, contractor market data,
                and developer-published rates — updated quarterly + admin overrides.
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-5 max-w-5xl mx-auto">
              {[
                {
                  icon: <Layers className="w-5 h-5" />,
                  title: '14 Property Types',
                  description: 'Each typology has unique cost structure, breakdown, and timeline.',
                  color: '#029bba',
                },
                {
                  icon: <MapPin className="w-5 h-5" />,
                  title: 'City-Specific Rates',
                  description: 'Lahore, Karachi, Islamabad, and 7 more cities with logistics multipliers.',
                  color: '#004063',
                },
                {
                  icon: <Database className="w-5 h-5" />,
                  title: 'Live Material Rates',
                  description: 'Cement, steel, bricks, labor — adjusted weekly by our admin team.',
                  color: '#06b6d4',
                },
                {
                  icon: <Award className="w-5 h-5" />,
                  title: 'Quality Grades',
                  description: 'Standard, Premium, Luxury — distinct materials & finishing.',
                  color: '#027a94',
                },
              ].map((item) => (
                <div key={item.title} className="bg-gray-50 rounded-2xl p-5 hover:shadow-md transition-shadow">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-white"
                    style={{ backgroundColor: item.color }}
                  >
                    {item.icon}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1.5">{item.title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="bg-gradient-to-br from-[#001f2b] to-[#003553] py-12">
          <div className="container mx-auto px-4 text-center">
            <Sparkles className="w-10 h-10 text-[#06b6d4] mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Ready to <span className="text-[#06b6d4]">Build Smart</span>?
            </h2>
            <p className="text-white/80 mb-6 max-w-xl mx-auto">
              Use our complete intelligence suite to make confident property decisions.
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
              <Link href="/properties?propertyType=Residential+Plot">
                <button className="px-5 py-3 rounded-xl bg-[#029bba] text-white font-semibold hover:bg-[#027a94] transition-colors inline-flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Find a Plot
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

interface EmptyStateProps {
  selectedMeta: SubTypeUiMeta;
}

function EmptyState({ selectedMeta }: EmptyStateProps): React.ReactElement {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-10 text-center h-full flex flex-col items-center justify-center min-h-[500px]">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#029bba]/10 to-[#004063]/10 flex items-center justify-center mb-4">
        {selectedMeta.icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to Calculate</h3>
      <p className="text-gray-600 mb-1">
        You&apos;ve selected: <strong>{selectedMeta.displayName}</strong>
      </p>
      <p className="text-sm text-gray-500 mb-6 max-w-md">
        Fill in the specifications on the left to get an accurate cost estimate with full breakdown.
      </p>
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm text-left">
        {[
          { text: 'Live material rates' },
          { text: 'Full cost breakdown' },
          { text: 'Timeline estimate' },
          { text: 'Expert insights' },
        ].map((item) => (
          <div key={item.text} className="flex items-center gap-2 text-sm text-gray-700">
            <CheckCircle className="w-4 h-4 text-[#10b981]" />
            <span>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Result Display ───────────────────────────────────────────────────────────

interface ResultDisplayProps {
  result: CalculationResult;
}

function ResultDisplay({ result }: ResultDisplayProps): React.ReactElement {
  const confidenceLabel = result.confidenceLevel === 'high' ? 'High Confidence' :
                          result.confidenceLevel === 'medium' ? 'Medium Confidence' : 'Estimate Only';
  const confidenceColor = result.confidenceLevel === 'high' ? 'bg-[#10b981]/15 text-[#10b981]' :
                          result.confidenceLevel === 'medium' ? 'bg-[#f59e0b]/15 text-[#92400e]' :
                          'bg-[#ef4444]/15 text-red-700';

  return (
    <div className="space-y-6">

      {/* TOTAL COST BANNER */}
      <div className="bg-gradient-to-br from-[#029bba] to-[#004063] rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="text-xs font-bold uppercase tracking-wider opacity-90">
            Estimated Construction Cost
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${confidenceColor}`}>
            {confidenceLabel}
          </span>
        </div>
        <div className="text-4xl md:text-5xl font-extrabold mb-2">{formatPKR(result.totalCost)}</div>
        <div className="text-sm opacity-90 mb-4">
          Range: {formatPKR(result.costMin)} – {formatPKR(result.costMax)}
        </div>

        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/30">
          <div>
            <div className="text-[10px] uppercase tracking-wider opacity-80 mb-0.5">Per Sq Ft</div>
            <div className="font-bold text-lg">{formatPKR(result.costPerSqft)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider opacity-80 mb-0.5">Per Marla</div>
            <div className="font-bold text-lg">{formatPKR(result.costPerMarla)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider opacity-80 mb-0.5">Covered Area</div>
            <div className="font-bold text-lg">{result.totalCoveredSqft.toLocaleString()} sqft</div>
          </div>
        </div>
      </div>

      {/* DATA SOURCE TRANSPARENCY */}
      {result.dataSource.overridesApplied > 0 && (
        <div className="bg-[#eff6ff] border-l-4 border-[#029bba] rounded-lg p-3 text-sm text-[#004063] flex items-start gap-2">
          <Database className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Live data:</strong> {result.dataSource.overridesApplied} rate{result.dataSource.overridesApplied > 1 ? 's' : ''} updated by our admin team. Baseline rates from {result.ratesVersion}.
          </div>
        </div>
      )}

      {/* ENGINEER NOTE */}
      {result.requiresEngineerNote && result.engineerNoteText && (
        <div className="bg-[#fef3c7] border-l-4 border-[#f59e0b] rounded-lg p-4 text-sm text-[#92400e] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Engineering Note:</strong> {result.engineerNoteText}
          </div>
        </div>
      )}

      {/* TIMELINE */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#029bba]/10 text-[#029bba] flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Estimated Timeline</h3>
              <p className="text-xs text-gray-500">Based on typology + quality + scale</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-extrabold text-[#029bba]">
              {result.timelineMonths.min}–{result.timelineMonths.max}
            </div>
            <div className="text-xs text-gray-500">months</div>
          </div>
        </div>
      </div>

      {/* COST BREAKDOWN */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#029bba]" />
          Cost Breakdown
        </h3>
        <p className="text-xs text-gray-500 mb-5">Where your money goes</p>

        <div className="mb-5">
          <div className="flex h-3 rounded-full overflow-hidden">
            {result.breakdown.map((item, i) => (
              <div
                key={i}
                className="transition-all hover:opacity-80"
                style={{ width: `${item.percentage}%`, backgroundColor: getBreakdownColor(i) }}
                title={`${item.category}: ${item.percentage}%`}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {result.breakdown.map((item, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
              <div className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: getBreakdownColor(i) }} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 text-sm truncate">{item.category}</div>
                <div className="text-xs text-gray-500 truncate">{item.description}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-bold text-gray-900 text-sm">{formatPKR(item.amount)}</div>
                <div className="text-[10px] text-gray-500">{item.percentage}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MATERIAL RATES */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-[#029bba]" />
            Current Material Rates
          </h3>
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {result.ratesVersion}
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-4">{result.city} rates · Last updated {result.lastUpdated}</p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 font-semibold text-gray-700">Material</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-700 hidden sm:table-cell">Unit</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">Price</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">Trend</th>
              </tr>
            </thead>
            <tbody>
              {result.materialRates.map((m) => (
                <tr key={m.name} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2.5 px-2 font-semibold text-gray-900">{m.name}</td>
                  <td className="py-2.5 px-2 text-gray-600 hidden sm:table-cell text-xs">{m.unit}</td>
                  <td className="py-2.5 px-2 text-right font-bold text-gray-900">Rs {m.pricePKR.toLocaleString()}</td>
                  <td className="py-2.5 px-2 text-right">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold ${
                      m.trend === 'up' ? 'text-[#ef4444]' :
                      m.trend === 'down' ? 'text-[#10b981]' :
                      'text-gray-500'
                    }`}>
                      {m.trend === 'up' ? <TrendingUp className="w-3 h-3" /> :
                       m.trend === 'down' ? <TrendingDown className="w-3 h-3" /> :
                       <Minus className="w-3 h-3" />}
                      {m.changePercent > 0 ? '+' : ''}{m.changePercent}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* INSIGHTS */}
      {result.insights && result.insights.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-[#029bba]" />
            Expert Insights for {result.subTypeDisplayName}
          </h3>
          <ul className="space-y-3">
            {result.insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-[#029bba]/10 text-[#029bba] flex items-center justify-center flex-shrink-0 mt-0.5 text-[11px] font-bold">
                  {i + 1}
                </div>
                <span className="text-gray-700 leading-relaxed">{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* DISCLAIMER */}
      <div className="bg-[#fef3c7] border-l-4 border-[#f59e0b] rounded-lg p-4 text-sm text-[#92400e]">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Disclaimer:</strong> This estimate uses industry-standard rates ({result.ratesVersion} baseline, valid until {result.validUntil}).
            Actual costs depend on site conditions, contractor quotes, design complexity, and market fluctuations.
            Always get 2-3 detailed quotations from licensed contractors. For highrise and industrial projects,
            structural engineer consultation is <strong>mandatory</strong> and not included in this estimate.
          </div>
        </div>
      </div>
    </div>
  );
}