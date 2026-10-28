// components/property/forms/tabs/TabFeatures.tsx

import { Sparkles, Car, Scale, Zap } from 'lucide-react';
import FormSection from '../shared/FormSection';
import {
  PropertyFormState,
  PropertyType,
  TabErrors,
  UsePropertyFormReturn,
  FieldConfig,
  AmenityGroupId,
  ParkingAvailability,
  ParkingLocationType,
} from '../shared/usePropertyForm';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TabFeaturesProps {
  form:            PropertyFormState;
  errors:          TabErrors;
  setField:        UsePropertyFormReturn['setField'];
  setParkingField: UsePropertyFormReturn['setParkingField'];
  fieldConfig:     FieldConfig;
}

// ─── Reusable Components ──────────────────────────────────────────────────────

function FieldError({ error }: { error?: string }): React.ReactElement | null {
  if (!error) return null;
  return (
    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
      <span>⚠</span>
      <span>{error}</span>
    </p>
  );
}

interface ToggleProps {
  label:    string;
  checked:  boolean;
  onChange: (val: boolean) => void;
}

function Toggle({ label, checked, onChange }: ToggleProps): React.ReactElement {
  return (
    <label className="flex items-center gap-3 py-2 px-3 rounded-lg
      cursor-pointer group hover:bg-gray-50 transition-colors duration-150">
      <div
        role="switch" aria-checked={checked} tabIndex={0}
        onClick={(e) => { e.preventDefault(); onChange(!checked); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault(); onChange(!checked);
          }
        }}
        className={`relative inline-flex h-5 w-9 items-center rounded-full
          flex-shrink-0 transition-colors duration-200 cursor-pointer
          ${checked ? 'bg-[#029bba]' : 'bg-gray-300'}`}
      >
        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white
          shadow-sm transition-transform duration-200
          ${checked ? 'translate-x-[18px]' : 'translate-x-[3px]'}`}
        />
      </div>
      <span className={`text-sm transition-colors duration-150
        ${checked
          ? 'text-[#029bba] font-medium'
          : 'text-gray-600 group-hover:text-gray-800'
        }`}>
        {label}
      </span>
    </label>
  );
}

// ═══════════════════════════════════════════════════════════════
// AMENITY CONFIGURATION
// ═══════════════════════════════════════════════════════════════

interface AmenityItem {
  key:   keyof PropertyFormState;
  label: string;
}

interface AmenityGroupDef {
  id:     AmenityGroupId;
  title:  string;
  color:  string;
  items:  AmenityItem[];
}

const ALL_AMENITY_GROUPS: AmenityGroupDef[] = [
  {
    id:    'climate_power',
    title: '❄️ Climate & Power',
    color: 'border-blue-200',
    items: [
      { key: 'centralAC',              label: '❄️ Central AC'           },
      { key: 'centralHeating',         label: '🔥 Central Heating'      },
      { key: 'generator',              label: '⚡ Generator'             },
      { key: 'upsBackup',              label: '🔋 UPS Backup'            },
      { key: 'solarPanels',            label: '☀️ Solar Panels'          },
      { key: 'floorHeating',           label: '🌡️ Floor Heating'         },
      { key: 'doubleGlazing',          label: '🪟 Double Glazing'        },
      { key: 'centralAirConditioning', label: '🌬️ Central Air System'    },
    ],
  },
  {
    id:    'security',
    title: '🔒 Security',
    color: 'border-red-200',
    items: [
      { key: 'security24_7',  label: '👮 24/7 Security'      },
      { key: 'cctv',          label: '📹 CCTV'                },
      { key: 'intercom',      label: '📞 Intercom'            },
      { key: 'gatedCommunity',label: '🚧 Gated Community'     },
      { key: 'guardRoom',     label: '🏠 Guard Room'          },
      { key: 'accessControl', label: '🔑 Access Control'      },
    ],
  },
  {
    id:    'lifestyle',
    title: '🏊 Lifestyle & Recreation',
    color: 'border-green-200',
    items: [
      { key: 'swimmingPool',        label: '🏊 Swimming Pool'       },
      { key: 'gym',                 label: '🏋️ Gym / Fitness'        },
      { key: 'park',                label: '🌳 Park'                 },
      { key: 'playground',          label: '🎠 Playground'           },
      { key: 'communityCenter',     label: '🏛️ Community Center'     },
      { key: 'rooftopAccess',       label: '🏗️ Rooftop Access'       },
      { key: 'balcony',             label: '🪟 Balcony'              },
      { key: 'garden',              label: '🌿 Garden / Lawn'        },
      { key: 'basement',            label: '🏚️ Basement'             },
    ],
  },
  {
    id:    'nearby',
    title: '🏪 Nearby Facilities',
    color: 'border-purple-200',
    items: [
      { key: 'mosque',   label: '🕌 Mosque'       },
      { key: 'shopping', label: '🛒 Shopping'      },
      { key: 'hospital', label: '🏥 Hospital'      },
      { key: 'school',   label: '🏫 School'        },
    ],
  },
  {
    id:    'connectivity',
    title: '🔌 Connectivity & Services',
    color: 'border-yellow-200',
    items: [
      { key: 'broadband',            label: '🌐 Broadband Internet'  },
      { key: 'cableTV',              label: '📺 Cable TV'             },
      { key: 'elevator',             label: '🛗 Elevator / Lift'      },
      { key: 'wasteManagement',      label: '♻️ Waste Management'     },
      { key: 'maintenanceStaff',     label: '🧹 Maintenance Staff'    },
      { key: 'laundry',              label: '👔 Laundry'              },
      { key: 'servantQuartersAmenity',label: '🏠 Servant Quarters'    },
    ],
  },
  {
    id:    'commercial_specific',
    title: '🏢 Commercial Features',
    color: 'border-indigo-200',
    items: [
      { key: 'powerBackup',    label: '🔌 Power Backup'          },
      { key: 'accessControl',  label: '🔑 Access Control System' },
      { key: 'fireSuppression',label: '🚿 Fire Suppression'      },
      { key: 'elevator',       label: '🛗 Elevator / Lift'       },
      { key: 'broadband',      label: '🌐 Fiber Broadband'       },
      { key: 'generator',      label: '⚡ Generator Backup'       },
      { key: 'cctv',           label: '📹 CCTV System'           },
      { key: 'security24_7',   label: '👮 24/7 Security'         },
    ],
  },
  {
    id:    'warehouse_specific',
    title: '🏭 Industrial Features',
    color: 'border-orange-200',
    items: [
      { key: 'loadingDock',          label: '🚛 Loading Dock'           },
      { key: 'craneAvailable',       label: '🏗️ Overhead Crane'         },
      { key: 'coldStorageAvailable', label: '❄️ Cold Storage'            },
      { key: 'fireSuppression',      label: '🚿 Fire Suppression'        },
      { key: 'powerBackup',          label: '🔌 Power Backup'            },
      { key: 'cctv',                 label: '📹 CCTV'                    },
      { key: 'security24_7',         label: '👮 24/7 Security'           },
    ],
  },
  {
    id:    'farmhouse_specific',
    title: '🌾 Farm & Outdoor Features',
    color: 'border-lime-200',
    items: [
      { key: 'tubewell',     label: '💧 Tubewell / Water Bore'  },
      { key: 'fruitTrees',   label: '🌳 Fruit Trees / Orchard'  },
      { key: 'livestockArea',label: '🐄 Livestock Area'          },
      { key: 'swimmingPool', label: '🏊 Swimming Pool'           },
      { key: 'garden',       label: '🌿 Large Garden / Lawn'     },
      { key: 'generator',    label: '⚡ Generator'               },
      { key: 'security24_7', label: '👮 Security'                },
    ],
  },
];

// ─── Ownership Type Options ───────────────────────────────────────────────────

const OWNERSHIP_TYPES: {
  value: string; label: string; desc: string;
}[] = [
  { value: 'freehold',    label: 'Freehold',      desc: 'Full ownership with no restrictions'  },
  { value: 'leasehold',   label: 'Leasehold',     desc: 'Ownership for a fixed period'         },
  { value: 'cooperative', label: 'Cooperative',   desc: 'Shared ownership through society'     },
  { value: 'strata',      label: 'Strata Title',  desc: 'Individual unit + shared common area' },
  { value: 'power_of_attorney', label: 'Power of Attorney', desc: 'Transfer via POA document' },
];

// ─── Legal Document Toggles ───────────────────────────────────────────────────

interface LegalDocItem {
  key:   keyof PropertyFormState['legal'];
  label: string;
  hint:  string;
  icon:  string;
}

const LEGAL_DOCS: LegalDocItem[] = [
  { key: 'nocAvailable',                  label: 'NOC Available',           hint: 'No Objection Certificate from authority',    icon: '📄' },
  { key: 'registryAvailable',             label: 'Registry Available',      hint: 'Property registered with sub-registrar',     icon: '📋' },
  { key: 'allotmentLetterAvailable',      label: 'Allotment Letter',        hint: 'Original allotment from society/authority',  icon: '✉️' },
  { key: 'agreementToSellAvailable',      label: 'Agreement to Sell',       hint: 'Notarized sale agreement',                   icon: '🤝' },
  { key: 'possessionLetterAvailable',     label: 'Possession Letter',       hint: 'Official possession from authority',         icon: '🔑' },
  { key: 'completionCertificateAvailable',label: 'Completion Certificate',  hint: 'Building completion certificate',            icon: '🏆' },
  { key: 'encumbranceFree',               label: 'Encumbrance Free',        hint: 'No loans or liens on property',              icon: '✅' },
  { key: 'disputeFree',                   label: 'Dispute Free',            hint: 'No ongoing legal disputes',                  icon: '⚖️' },
  { key: 'taxPaidUpToDate',               label: 'Tax Paid Up to Date',     hint: 'All property taxes cleared',                 icon: '💰' },
];

// ─── File Type Options ────────────────────────────────────────────────────────

const FILE_TYPE_OPTIONS = [
  { value: 'registry',    label: 'Registry'           },
  { value: 'open_file',   label: 'Open File'          },
  { value: 'allocation',  label: 'Allocation Letter'  },
  { value: 'affidavit',   label: 'Affidavit'          },
  { value: 'lease',       label: 'Lease Deed'         },
];

// ─── Parking V4.9.7 — 6-Step Option Sets ──────────────────────────────────────

// Step 1 — Availability
const PARKING_AVAILABILITY: {
  value: ParkingAvailability;
  label: string;
  desc:  string;
  icon:  string;
  color: string;
}[] = [
  {
    value: 'dedicated',
    label: 'Dedicated',
    desc:  'Reserved private spot(s) for this property',
    icon:  '🅿️',
    color: 'border-[#10b981] bg-[#f0fdf4] text-[#10b981]',
  },
  {
    value: 'shared',
    label: 'Shared / Common',
    desc:  'First-come-first-serve in building/society',
    icon:  '🚗',
    color: 'border-[#f59e0b] bg-[#fef3c7] text-amber-800',
  },
  {
    value: 'none',
    label: 'No Parking',
    desc:  'No parking facility available',
    icon:  '🚫',
    color: 'border-gray-300 bg-gray-50 text-gray-600',
  },
];

// Step 5 — Location type
const PARKING_LOCATION_TYPES: {
  value: ParkingLocationType;
  label: string;
  icon:  string;
}[] = [
  { value: 'covered',  label: 'Covered',  icon: '🏗️' },
  { value: 'open',     label: 'Open Air', icon: '🏞️' },
  { value: 'garage',   label: 'Garage',   icon: '🚗' },
  { value: 'basement', label: 'Basement', icon: '🅿️' },
  { value: 'driveway', label: 'Driveway', icon: '🛤️' },
];

// ─── Nested Setter Helpers ────────────────────────────────────────────────────

type LegalKey = keyof PropertyFormState['legal'];
type InfraKey = keyof PropertyFormState['infrastructure'];

function useNestedSetters(
  form:     PropertyFormState,
  setField: UsePropertyFormReturn['setField']
) {
  const setLegal = (key: LegalKey, value: boolean | string) => {
    setField('legal', { ...form.legal, [key]: value });
  };

  const setInfra = (key: InfraKey, value: boolean) => {
    setField('infrastructure', { ...form.infrastructure, [key]: value });
  };

  return { setLegal, setInfra };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TabFeatures({
  form,
  errors,
  setField,
  setParkingField,
  fieldConfig: cfg,
}: TabFeaturesProps): React.ReactElement {
  const { setLegal, setInfra } = useNestedSetters(form, setField);
  const pt = form.propertyType as PropertyType | '';

  // ── Parking derived state
  const p = form.parking;
  const hasParking = p.availability === 'dedicated' || p.availability === 'shared';
  const totalSpaces = (
    (p.carSpaces !== '' ? Number(p.carSpaces) : 0) +
    (p.motorcycleSpaces !== '' ? Number(p.motorcycleSpaces) : 0)
  );

  // ── Filter amenity groups by what's relevant for this property type
  const visibleGroups = ALL_AMENITY_GROUPS.filter(
    (g) => cfg.amenityGroups.includes(g.id)
  );

  // ── Only count/toggle VISIBLE amenities (fix the hidden-select bug)
  const visibleItemKeys = new Set(
    visibleGroups.flatMap((g) => g.items.map((i) => i.key))
  );

  const amenityCount = visibleGroups.reduce(
    (count, group) =>
      count + group.items.filter((item) => form[item.key] === true).length,
    0
  );

  const totalVisibleAmenities = visibleGroups.reduce(
    (count, group) => count + group.items.length,
    0
  );

  // Legal doc count
  const legalDocCount = LEGAL_DOCS.filter(
    (doc) => form.legal[doc.key] === true
  ).length;

  // Infrastructure count
  const infraCount = Object.values(form.infrastructure).filter(Boolean).length;
  const totalInfra = Object.keys(form.infrastructure).length;

  // ── Select all / Clear all — only visible amenities
  const handleSelectAll = () => {
    visibleGroups.forEach((group) => {
      group.items.forEach((item) => {
        setField(item.key as keyof PropertyFormState, true as never);
      });
    });
  };

  const handleClearAll = () => {
    visibleGroups.forEach((group) => {
      group.items.forEach((item) => {
        setField(item.key as keyof PropertyFormState, false as never);
      });
    });
  };

  return (
    <div className="space-y-5">

      {/* ══════════════════════════════════════════════════════
          SECTION 1 — Amenities & Features
         ══════════════════════════════════════════════════════ */}
      {visibleGroups.length > 0 && (
        <FormSection
          id="features-amenities"
          title="Amenities & Features"
          icon={<Sparkles className="w-5 h-5" />}
          defaultOpen={true}
          description={`${amenityCount}/${totalVisibleAmenities} selected`}
          completionStatus={amenityCount > 0 ? 'complete' : 'optional'}
        >
          <div className="space-y-5">
            {/* Progress bar */}
            {totalVisibleAmenities > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#029bba] rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round(
                        (amenityCount / totalVisibleAmenities) * 100
                      )}%`,
                    }}
                    role="progressbar"
                    aria-valuenow={amenityCount}
                    aria-valuemin={0}
                    aria-valuemax={totalVisibleAmenities}
                  />
                </div>
                <span className="text-xs font-medium text-[#029bba] flex-shrink-0">
                  {amenityCount}/{totalVisibleAmenities}
                </span>
              </div>
            )}

            {/* Amenity groups — only visible ones */}
            {visibleGroups.map((group) => {
              const groupSelected = group.items.filter(
                (item) => form[item.key] === true
              ).length;

              return (
                <div
                  key={group.id}
                  className={`border rounded-xl overflow-hidden ${group.color}`}
                >
                  {/* Group header */}
                  <div className="px-4 py-2.5 bg-gray-50
                    flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">
                      {group.title}
                    </span>
                    <span className="text-xs text-gray-400">
                      {groupSelected}/{group.items.length}
                    </span>
                  </div>

                  {/* Group toggles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
                    gap-0 divide-y sm:divide-y-0 divide-gray-100">
                    {group.items.map((item) => (
                      <Toggle
                        key={String(item.key)}
                        label={item.label}
                        checked={form[item.key] === true}
                        onChange={(val) =>
                          setField(
                            item.key as keyof PropertyFormState,
                            val as never
                          )
                        }
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Select all / Clear all */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs px-3 py-1.5 rounded-lg
                  border border-[#029bba] text-[#029bba]
                  hover:bg-[#029bba] hover:text-white
                  transition-colors duration-150 font-medium"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs px-3 py-1.5 rounded-lg
                  border border-gray-300 text-gray-500
                  hover:bg-gray-100 transition-colors duration-150 font-medium"
              >
                Clear All
              </button>
              {amenityCount > 0 && (
                <span className="text-xs text-gray-400 self-center ml-1">
                  {amenityCount} feature{amenityCount !== 1 ? 's' : ''} selected
                </span>
              )}
            </div>
          </div>
        </FormSection>
      )}

      {/* No amenities for this type */}
      {visibleGroups.length === 0 && pt !== '' && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl
          px-5 py-4 text-center">
          <p className="text-sm text-gray-500">
            Amenity selection is not applicable for{' '}
            <span className="font-medium capitalize">{pt}</span> listings.
            Legal documents and infrastructure below still apply.
          </p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          SECTION 2 — Parking (V4.9.7 — 6-Step Conversational Flow)
         ══════════════════════════════════════════════════════ */}
      {cfg.showParking && (
        <FormSection
          id="features-parking"
          title="Parking"
          icon={<Car className="w-5 h-5" />}
          defaultOpen={false}
          description={
            !p.availability
              ? 'Not configured'
              : p.availability === 'none'
              ? 'No parking available'
              : `${totalSpaces || '?'} space(s) · ${p.availability}${
                  p.isIncludedInPrice ? ' · included' : ' · extra cost'
                }`
          }
          completionStatus={p.availability ? 'complete' : 'optional'}
        >
          <div className="space-y-6">

            {/* ── STEP 1: Is parking available? ───────────────────── */}
            <div>
              <div className="flex items-start gap-2 mb-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full
                  bg-[#029bba] text-white text-xs font-bold
                  flex items-center justify-center">1</span>
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-800">
                    Is parking available with this property?
                  </label>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Buyers want clarity — pick what applies
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PARKING_AVAILABILITY.map((opt) => {
                  const isActive = p.availability === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setParkingField('availability', opt.value)}
                      className={`text-left p-4 rounded-xl border-2
                        transition-all duration-150
                        ${isActive
                          ? opt.color + ' shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                    >
                      <div className="text-2xl mb-1">{opt.icon}</div>
                      <p className="font-semibold text-sm">{opt.label}</p>
                      <p className={`text-xs mt-1 ${
                        isActive ? 'opacity-80' : 'text-gray-400'
                      }`}>
                        {opt.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* If "none" — show info banner and stop */}
            {p.availability === 'none' && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl
                px-4 py-3 text-center">
                <p className="text-sm text-gray-600">
                  ℹ️ No parking — buyers will be informed clearly on the listing.
                </p>
              </div>
            )}

            {/* If "dedicated" or "shared" — continue conversation */}
            {hasParking && (
              <>
                {/* ── STEP 2: Included in price? ───────────────────── */}
                <div className="border-t border-gray-100 pt-5">
                  <div className="flex items-start gap-2 mb-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full
                      bg-[#029bba] text-white text-xs font-bold
                      flex items-center justify-center">2</span>
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-gray-800">
                        Is parking included in the property price?
                      </label>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Hidden parking fees are a top buyer complaint — disclose upfront
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setParkingField('isIncludedInPrice', true)}
                      className={`text-left p-4 rounded-xl border-2
                        transition-all duration-150
                        ${p.isIncludedInPrice
                          ? 'border-[#10b981] bg-[#f0fdf4] shadow-sm'
                          : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      <p className={`font-semibold text-sm flex items-center gap-2
                        ${p.isIncludedInPrice ? 'text-[#10b981]' : 'text-gray-700'}`}>
                        ✓ Yes — Included in price
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        No extra parking charges
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setParkingField('isIncludedInPrice', false)}
                      className={`text-left p-4 rounded-xl border-2
                        transition-all duration-150
                        ${!p.isIncludedInPrice
                          ? 'border-[#f59e0b] bg-[#fef3c7] shadow-sm'
                          : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      <p className={`font-semibold text-sm flex items-center gap-2
                        ${!p.isIncludedInPrice ? 'text-amber-800' : 'text-gray-700'}`}>
                        ₨ No — Extra cost
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Parking sold/rented separately
                      </p>
                    </button>
                  </div>
                </div>

                {/* ── STEP 3: Extra cost breakdown (only if not included) ── */}
                {!p.isIncludedInPrice && (
                  <div className="border-t border-gray-100 pt-5">
                    <div className="flex items-start gap-2 mb-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full
                        bg-[#029bba] text-white text-xs font-bold
                        flex items-center justify-center">3</span>
                      <div className="flex-1">
                        <label className="block text-sm font-semibold text-gray-800">
                          How much extra for parking?
                        </label>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Fill what applies — both, either, or neither
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="parking-onetime"
                          className="block text-sm font-medium text-gray-700 mb-1.5">
                          One-Time Purchase Fee (PKR)
                        </label>
                        <input
                          id="parking-onetime"
                          type="number" min="0"
                          placeholder="e.g. 500000"
                          value={p.oneTimePurchaseFee === '' ? '' : p.oneTimePurchaseFee}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === '') { setParkingField('oneTimePurchaseFee', ''); return; }
                            const n = parseInt(raw, 10);
                            if (!isNaN(n) && n >= 0) setParkingField('oneTimePurchaseFee', n);
                          }}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                            focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Buy the parking spot outright
                        </p>
                      </div>
                      <div>
                        <label htmlFor="parking-monthly"
                          className="block text-sm font-medium text-gray-700 mb-1.5">
                          Monthly Fee (PKR)
                        </label>
                        <input
                          id="parking-monthly"
                          type="number" min="0"
                          placeholder="e.g. 3000"
                          value={p.monthlyFee === '' ? '' : p.monthlyFee}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === '') { setParkingField('monthlyFee', ''); return; }
                            const n = parseInt(raw, 10);
                            if (!isNaN(n) && n >= 0) setParkingField('monthlyFee', n);
                          }}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                            focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Recurring parking rent
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP 4: Vehicle counts (cars + motorcycles) ───── */}
                <div className="border-t border-gray-100 pt-5">
                  <div className="flex items-start gap-2 mb-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full
                      bg-[#029bba] text-white text-xs font-bold
                      flex items-center justify-center">4</span>
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-gray-800">
                        How many vehicles can park?
                      </label>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Pakistani households often have multiple cars + bikes
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="parking-cars"
                        className="block text-sm font-medium text-gray-700 mb-1.5">
                        🚗 Car Spaces
                      </label>
                      <input
                        id="parking-cars"
                        type="number" min="0" max="50"
                        placeholder="e.g. 2"
                        value={p.carSpaces === '' ? '' : p.carSpaces}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === '') { setParkingField('carSpaces', ''); return; }
                          const n = parseInt(raw, 10);
                          if (!isNaN(n) && n >= 0 && n <= 50) setParkingField('carSpaces', n);
                        }}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                          focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label htmlFor="parking-motorcycles"
                        className="block text-sm font-medium text-gray-700 mb-1.5">
                        🏍️ Motorcycle Spaces
                      </label>
                      <input
                        id="parking-motorcycles"
                        type="number" min="0" max="50"
                        placeholder="e.g. 2"
                        value={p.motorcycleSpaces === '' ? '' : p.motorcycleSpaces}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === '') { setParkingField('motorcycleSpaces', ''); return; }
                          const n = parseInt(raw, 10);
                          if (!isNaN(n) && n >= 0 && n <= 50) setParkingField('motorcycleSpaces', n);
                        }}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                          focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                      />
                    </div>
                  </div>
                  {totalSpaces > 0 && (
                    <div className="mt-3 bg-[#eff6ff] border-l-4 border-[#029bba]
                      px-3 py-2 rounded-r-lg">
                      <p className="text-xs text-[#004063]">
                        ✓ Total parking capacity: <strong>{totalSpaces}</strong> vehicle(s)
                      </p>
                    </div>
                  )}
                </div>

                {/* ── STEP 5: Parking type/location ───────────────── */}
                <div className="border-t border-gray-100 pt-5">
                  <div className="flex items-start gap-2 mb-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full
                      bg-[#029bba] text-white text-xs font-bold
                      flex items-center justify-center">5</span>
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-gray-800">
                        Where is the parking?
                      </label>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Covered vs open affects vehicle protection & value
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {PARKING_LOCATION_TYPES.map((opt) => {
                      const isActive = p.locationType === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            setParkingField('locationType', isActive ? '' : opt.value)
                          }
                          className={`flex flex-col items-center gap-1 p-3
                            rounded-xl border-2 transition-all duration-150
                            ${isActive
                              ? 'border-[#029bba] bg-[#029bba] bg-opacity-5 text-[#029bba]'
                              : 'border-gray-200 text-gray-500 hover:border-gray-300'
                            }`}
                        >
                          <span className="text-xl">{opt.icon}</span>
                          <span className="text-xs font-medium">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── STEP 6: Features & special notes ──────────────── */}
                <div className="border-t border-gray-100 pt-5">
                  <div className="flex items-start gap-2 mb-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full
                      bg-[#029bba] text-white text-xs font-bold
                      flex items-center justify-center">6</span>
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-gray-800">
                        Parking features & security
                      </label>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Toggle anything that applies
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    <Toggle
                      label="🎯 Dedicated / Assigned Spot"
                      checked={p.isDedicated}
                      onChange={(val) => setParkingField('isDedicated', val)}
                    />
                    <Toggle
                      label="⚡ EV Charging Point"
                      checked={p.hasEVCharging}
                      onChange={(val) => setParkingField('hasEVCharging', val)}
                    />
                    <Toggle
                      label="📹 CCTV Coverage"
                      checked={p.hasCCTV}
                      onChange={(val) => setParkingField('hasCCTV', val)}
                    />
                    <Toggle
                      label="👮 Security Guard"
                      checked={p.hasSecurityGuard}
                      onChange={(val) => setParkingField('hasSecurityGuard', val)}
                    />
                    <Toggle
                      label="🅿️ Visitor Parking Available"
                      checked={p.hasVisitorParking}
                      onChange={(val) => setParkingField('hasVisitorParking', val)}
                    />
                    <Toggle
                      label="🤵 Valet Parking Service"
                      checked={p.hasValet}
                      onChange={(val) => setParkingField('hasValet', val)}
                    />
                  </div>

                  {/* Special notes textarea */}
                  <div className="mt-4">
                    <label htmlFor="parking-notes"
                      className="block text-sm font-medium text-gray-700 mb-1.5">
                      Special Notes (Optional)
                    </label>
                    <textarea
                      id="parking-notes"
                      rows={2}
                      maxLength={300}
                      placeholder="e.g. 'Slot B-14 in 2nd basement' or 'Tight entry — small cars only'"
                      value={p.specialNotes}
                      onChange={(e) => setParkingField('specialNotes', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                        focus:ring-2 focus:ring-[#029bba] focus:border-transparent
                        resize-none"
                    />
                    <p className="text-xs text-gray-400 mt-1 flex justify-between">
                      <span>Helps buyers find the spot easily</span>
                      <span>{p.specialNotes.length}/300</span>
                    </p>
                  </div>
                </div>

                {/* ── Transparency badge ─────────────────────────── */}
                <div className="bg-[#f0fdf4] border-l-4 border-[#10b981]
                  px-4 py-3 rounded-r-lg">
                  <p className="text-sm text-[#10b981] font-medium">
                    🛡️ Transparent Parking Disclosure
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Listings with full parking details get 2× more inquiries.
                    Buyers trust honest sellers.
                  </p>
                </div>
              </>
            )}
          </div>
        </FormSection>
      )}

      {/* ══════════════════════════════════════════════════════
          SECTION 3 — Legal & Documentation
         ══════════════════════════════════════════════════════ */}
      <FormSection
        id="features-legal"
        title="Legal & Documentation"
        icon={<Scale className="w-5 h-5" />}
        defaultOpen={true}
        required
        description={`${legalDocCount} document${legalDocCount !== 1 ? 's' : ''} verified`}
        completionStatus={
          form.legal.ownershipType
            ? (errors['legal.ownershipType'] ? 'incomplete' : 'complete')
            : 'incomplete'
        }
      >
        <div className="space-y-5">

          {/* Ownership Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ownership Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {OWNERSHIP_TYPES.map((opt) => {
                const isActive = form.legal.ownershipType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLegal('ownershipType', opt.value)}
                    className={`text-left p-4 rounded-xl border-2
                      transition-all duration-150
                      ${isActive
                        ? 'border-[#029bba] bg-[#029bba] bg-opacity-5'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <p className={`font-medium text-sm
                      ${isActive ? 'text-[#029bba]' : 'text-gray-700'}`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
            <FieldError error={errors['legal.ownershipType']} />
          </div>

          {/* File Type (plot specific) */}
          {pt === 'plot' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                File / Document Type
              </label>
              <div className="flex flex-wrap gap-2">
                {FILE_TYPE_OPTIONS.map((opt) => {
                  const isActive = form.legal.fileType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setLegal('fileType', isActive ? '' : opt.value)
                      }
                      className={`px-4 py-2 rounded-full text-sm font-medium
                        border-2 transition-all duration-150
                        ${isActive
                          ? 'border-[#029bba] bg-[#029bba] text-white'
                          : 'border-gray-200 text-gray-600 hover:border-[#029bba]'
                        }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Approval Authority */}
          <div>
            <label htmlFor="legal-authority"
              className="block text-sm font-medium text-gray-700 mb-1.5">
              Approval Authority
            </label>
            <input
              id="legal-authority"
              type="text"
              placeholder="e.g. DHA, LDA, CDA, RDA, GDA, TMA, Bahria Town"
              value={form.legal.approvalAuthority}
              onChange={(e) => setLegal('approvalAuthority', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">
              Authority that approved the housing scheme / building plan
            </p>
          </div>

          {/* Quick authority pills */}
          <div className="flex flex-wrap gap-2">
            {['DHA','LDA','CDA','RDA','GDA','TMA','KDA','MDA',
              'Bahria Town','PHATA','PCSIR'].map((auth) => {
              const isActive = form.legal.approvalAuthority === auth;
              return (
                <button
                  key={auth}
                  type="button"
                  onClick={() =>
                    setLegal('approvalAuthority', isActive ? '' : auth)
                  }
                  className={`px-3 py-1 rounded-full text-xs font-medium
                    transition-all duration-150
                    ${isActive
                      ? 'bg-[#004063] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  {auth}
                </button>
              );
            })}
          </div>

          {/* Legal documents checklist */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700">
                Available Documents
              </p>
              <span className="text-xs text-[#029bba] font-medium">
                {legalDocCount}/{LEGAL_DOCS.length} verified
              </span>
            </div>

            {/* Trust signal */}
            {legalDocCount > 0 && (
              <div className="mb-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    legalDocCount >= 6 ? 'bg-[#10b981]'
                    : legalDocCount >= 3 ? 'bg-[#029bba]'
                    : 'bg-[#f59e0b]'
                  }`}
                  style={{
                    width: `${Math.round((legalDocCount / LEGAL_DOCS.length) * 100)}%`,
                  }}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {LEGAL_DOCS.map((doc) => (
                <div key={String(doc.key)} className="group">
                  <label className="flex items-start gap-3 py-2.5 px-3
                    rounded-lg cursor-pointer hover:bg-gray-50
                    transition-colors duration-150">
                    <input
                      type="checkbox"
                      checked={form.legal[doc.key] === true}
                      onChange={(e) => setLegal(doc.key, e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded border-gray-300
                        text-[#029bba] focus:ring-[#029bba] cursor-pointer
                        flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm flex items-center gap-1.5
                        ${form.legal[doc.key] === true
                          ? 'text-[#029bba] font-medium'
                          : 'text-gray-600'
                        }`}>
                        <span>{doc.icon}</span>
                        {doc.label}
                      </span>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {doc.hint}
                      </p>
                    </div>
                    {form.legal[doc.key] === true && (
                      <span className="text-[#10b981] text-sm flex-shrink-0 mt-0.5">
                        ✓
                      </span>
                    )}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* RERA Registration */}
          <div className="border-t border-gray-100 pt-4">
            <Toggle
              label="RERA Registered"
              checked={form.legal.reraRegistered}
              onChange={(val) => setLegal('reraRegistered', val)}
            />
            {form.legal.reraRegistered && (
              <div className="mt-3">
                <label htmlFor="legal-rera"
                  className="block text-sm font-medium text-gray-700 mb-1.5">
                  RERA Registration Number
                </label>
                <input
                  id="legal-rera"
                  type="text"
                  placeholder="e.g. RERA-LHR-2024-XXXX"
                  value={form.legal.reraNumber}
                  onChange={(e) => setLegal('reraNumber', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                    focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                />
              </div>
            )}
          </div>

          {/* Trust badge signals */}
          {legalDocCount >= 4 && (
            <div className="bg-[#f0fdf4] border-l-4 border-[#10b981]
              px-4 py-3 rounded-r-lg">
              <p className="text-sm text-[#10b981] font-medium">
                🛡️ Strong Documentation
              </p>
              <p className="text-xs text-gray-600 mt-1">
                This listing has {legalDocCount} verified documents — it will
                receive a &quot;Well Documented&quot; trust badge and rank
                higher in search results.
              </p>
            </div>
          )}

          {legalDocCount === 0 && (
            <div className="bg-[#fef3c7] border-l-4 border-[#f59e0b]
              px-4 py-3 rounded-r-lg">
              <p className="text-sm text-amber-800 font-medium">
                ⚠️ No documents verified
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Listings with verified documents receive 3× more inquiries.
                Please tick all available documents above.
              </p>
            </div>
          )}
        </div>
      </FormSection>

      {/* ══════════════════════════════════════════════════════
          SECTION 4 — Infrastructure & Utilities
         ══════════════════════════════════════════════════════ */}
      <FormSection
        id="features-infrastructure"
        title="Infrastructure & Utilities"
        icon={<Zap className="w-5 h-5" />}
        defaultOpen={false}
        description={`${infraCount}/${totalInfra} available`}
        completionStatus={infraCount > 0 ? 'complete' : 'optional'}
      >
        <div className="space-y-3">
          {/* Progress bar */}
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  infraCount === totalInfra ? 'bg-[#10b981]'
                  : infraCount > totalInfra / 2 ? 'bg-[#029bba]'
                  : 'bg-[#f59e0b]'
                }`}
                style={{
                  width: `${Math.round((infraCount / totalInfra) * 100)}%`,
                }}
                role="progressbar"
                aria-valuenow={infraCount}
                aria-valuemin={0}
                aria-valuemax={totalInfra}
              />
            </div>
            <span className="text-xs font-medium text-gray-500 flex-shrink-0">
              {infraCount}/{totalInfra}
            </span>
          </div>

          {/* Infrastructure toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            <Toggle
              label="⚡ Electricity"
              checked={form.infrastructure.electricity}
              onChange={(val) => setInfra('electricity', val)}
            />
            <Toggle
              label="🔥 Gas Supply"
              checked={form.infrastructure.gas}
              onChange={(val) => setInfra('gas', val)}
            />
            <Toggle
              label="💧 Water Supply"
              checked={form.infrastructure.water}
              onChange={(val) => setInfra('water', val)}
            />
            <Toggle
              label="🚿 Sewerage"
              checked={form.infrastructure.sewerage}
              onChange={(val) => setInfra('sewerage', val)}
            />
            <Toggle
              label="🌐 Internet / Broadband"
              checked={form.infrastructure.internet}
              onChange={(val) => setInfra('internet', val)}
            />
            <Toggle
              label="🛣️ Paved Roads"
              checked={form.infrastructure.roads}
              onChange={(val) => setInfra('roads', val)}
            />
            <Toggle
              label="💡 Street Lights"
              checked={form.infrastructure.streetLights}
              onChange={(val) => setInfra('streetLights', val)}
            />
          </div>

          {/* Select all / Clear all */}
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                (Object.keys(form.infrastructure) as InfraKey[]).forEach(
                  (key) => setInfra(key, true)
                );
              }}
              className="text-xs px-3 py-1.5 rounded-lg
                border border-[#029bba] text-[#029bba]
                hover:bg-[#029bba] hover:text-white
                transition-colors duration-150 font-medium"
            >
              All Available
            </button>
            <button
              type="button"
              onClick={() => {
                (Object.keys(form.infrastructure) as InfraKey[]).forEach(
                  (key) => setInfra(key, false)
                );
              }}
              className="text-xs px-3 py-1.5 rounded-lg
                border border-gray-300 text-gray-500
                hover:bg-gray-100 transition-colors duration-150 font-medium"
            >
              Clear All
            </button>
          </div>

          {infraCount === totalInfra && (
            <div className="bg-[#f0fdf4] border-l-4 border-[#10b981]
              px-4 py-2.5 rounded-r-lg">
              <p className="text-sm text-[#10b981] font-medium">
                ✓ All infrastructure available — fully developed area
              </p>
            </div>
          )}
        </div>
      </FormSection>

      {/* ══════════════════════════════════════════════════════
          FEATURES SUMMARY CARD
         ══════════════════════════════════════════════════════ */}
      {(amenityCount > 0 || legalDocCount > 0 || infraCount > 0) && (
        <div className="bg-gradient-to-r from-[#029bba] to-[#004063]
          rounded-xl p-4 text-white">
          <h4 className="font-semibold text-sm mb-3 opacity-90">
            ✨ Features Summary
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

            {/* Amenities count */}
            <div className="bg-white bg-opacity-10 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{amenityCount}</p>
              <p className="text-xs opacity-70 mt-1">Amenities</p>
            </div>

            {/* Parking */}
            {cfg.showParking && (
              <div className="bg-white bg-opacity-10 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">
                  {p.availability === 'none' || !p.availability
                    ? '—'
                    : totalSpaces || '✓'}
                </p>
                <p className="text-xs opacity-70 mt-1">
                  {!p.availability
                    ? 'Not Set'
                    : p.availability === 'none'
                    ? 'No Parking'
                    : totalSpaces
                    ? 'Parking Spaces'
                    : p.availability === 'dedicated' ? 'Dedicated' : 'Shared'}
                </p>
              </div>
            )}

            {/* Legal Docs */}
            <div className="bg-white bg-opacity-10 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{legalDocCount}</p>
              <p className="text-xs opacity-70 mt-1">Documents</p>
            </div>

            {/* Infrastructure */}
            <div className="bg-white bg-opacity-10 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">
                {infraCount}/{totalInfra}
              </p>
              <p className="text-xs opacity-70 mt-1">Infrastructure</p>
            </div>

          </div>

          {/* Trust level indicator */}
          <div className="mt-3 pt-3 border-t border-white border-opacity-20">
            <div className="flex items-center justify-between text-xs">
              <span className="opacity-70">Listing Trust Score</span>
              <span className="font-semibold">
                {legalDocCount >= 6 && infraCount >= 5 && amenityCount >= 5
                  ? '🏆 Premium'
                  : legalDocCount >= 4 && infraCount >= 4
                  ? '⭐ Trusted'
                  : legalDocCount >= 2
                  ? '✅ Standard'
                  : '📋 Basic'}
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}