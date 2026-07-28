// components/property/forms/tabs/TabBasics.tsx

import {
  Building2, Home, Store, Warehouse, Building,
  Castle, Trees, DoorOpen, Layers, Landmark,
} from 'lucide-react';
import FormSection from '../shared/FormSection';
import {
  PropertyFormState,
  PropertyType,
  PROPERTY_TYPE_LABELS,
  PROPERTY_TYPE_GROUPS,
  PROPERTY_SUBTYPES,
  TabErrors,
  UsePropertyFormReturn,
  ResidentialDetails,
  PlotDetails,
  CommercialDetails,
  AgriculturalDetails,
  RentalDetails,
  FieldConfig,
} from '../shared/usePropertyForm';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TabBasicsProps {
  form:                 PropertyFormState;
  errors:               TabErrors;
  setField:             UsePropertyFormReturn['setField'];
  setResidentialField:  UsePropertyFormReturn['setResidentialField'];
  setPlotField:         UsePropertyFormReturn['setPlotField'];
  setCommercialField:   UsePropertyFormReturn['setCommercialField'];
  setAgriculturalField: UsePropertyFormReturn['setAgriculturalField'];
  setRentalField:       UsePropertyFormReturn['setRentalField'];
  fieldConfig:          FieldConfig;
}

// ─── Property Type Icons ──────────────────────────────────────────────────────

const PROPERTY_TYPE_ICONS: Record<PropertyType, React.ReactElement> = {
  apartment:  <Building2  className="w-5 h-5" />,
  house:      <Home       className="w-5 h-5" />,
  villa:      <Castle     className="w-5 h-5" />,
  plot:       <Layers     className="w-5 h-5" />,
  commercial: <Store      className="w-5 h-5" />,
  shop:       <Store      className="w-5 h-5" />,
  office:     <Building   className="w-5 h-5" />,
  warehouse:  <Warehouse  className="w-5 h-5" />,
  building:   <Landmark   className="w-5 h-5" />,
  penthouse:  <Building2  className="w-5 h-5" />,
  farmhouse:  <Trees      className="w-5 h-5" />,
  room:       <DoorOpen   className="w-5 h-5" />,
  other:      <Layers     className="w-5 h-5" />,
};

// ─── Facing Options ───────────────────────────────────────────────────────────

const FACING_OPTIONS = [
  { value: 'north',      label: 'North'      },
  { value: 'south',      label: 'South'      },
  { value: 'east',       label: 'East'       },
  { value: 'west',       label: 'West'       },
  { value: 'north_east', label: 'North East' },
  { value: 'north_west', label: 'North West' },
  { value: 'south_east', label: 'South East' },
  { value: 'south_west', label: 'South West' },
];

// ─── Possession Options ───────────────────────────────────────────────────────

const POSSESSION_OPTIONS: {
  value: NonNullable<PropertyFormState['possessionStatus']>;
  label: string;
  desc:  string;
  icon:  string;
}[] = [
  { value: 'ready',              label: 'Ready to Move In',    desc: 'Possession available immediately',       icon: '🔑' },
  { value: 'under_construction', label: 'Under Construction',  desc: 'Expected completion date required',     icon: '🏗️' },
  { value: 'on_map',             label: 'On Map / Pre-Launch', desc: 'Plot or unit on development plan',      icon: '📋' },
];

// ─── Lawn/Garden Options ──────────────────────────────────────────────────────

const LAWN_OPTIONS: { value: ResidentialDetails['lawnGarden']; label: string }[] = [
  { value: '',        label: 'None'           },
  { value: 'front',   label: 'Front Lawn'     },
  { value: 'back',    label: 'Back Garden'    },
  { value: 'both',    label: 'Front & Back'   },
  { value: 'rooftop', label: 'Rooftop Garden' },
];

// ─── Kitchen Access Options ───────────────────────────────────────────────────

const KITCHEN_ACCESS_OPTIONS: { value: ResidentialDetails['kitchenAccess']; label: string }[] = [
  { value: 'private', label: 'Private Kitchen' },
  { value: 'shared',  label: 'Shared Kitchen'  },
  { value: 'none',    label: 'No Kitchen'      },
];

// ─── Gender Preference Options ────────────────────────────────────────────────

const GENDER_OPTIONS: { value: RentalDetails['genderPreference']; label: string; icon: string }[] = [
  { value: 'any',    label: 'Any',    icon: '👥' },
  { value: 'male',   label: 'Male',   icon: '👨' },
  { value: 'female', label: 'Female', icon: '👩' },
];

// ─── Plot Category Options ────────────────────────────────────────────────────

const PLOT_CATEGORY_OPTIONS: { value: PlotDetails['plotCategory']; label: string; desc: string }[] = [
  { value: 'open_plot',  label: 'Open Plot',  desc: 'Plot on ground, fully demarcated' },
  { value: 'on_ground',  label: 'On Ground',  desc: 'Physically available on site'     },
  { value: 'file',       label: 'File / Map', desc: 'Paper file, not yet on ground'    },
];

// ─── Development Status Options ───────────────────────────────────────────────

const DEVELOPMENT_STATUS_OPTIONS: { value: PlotDetails['developmentStatus']; label: string }[] = [
  { value: 'undeveloped',       label: 'Undeveloped'       },
  { value: 'under_development', label: 'Under Development' },
  { value: 'semi_developed',    label: 'Semi Developed'    },
  { value: 'fully_developed',   label: 'Fully Developed'   },
];

// ─── Building Occupancy Options ───────────────────────────────────────────────

const OCCUPANCY_OPTIONS: { value: CommercialDetails['occupancyStatus']; label: string; desc: string }[] = [
  { value: 'vacant',   label: 'Vacant',             desc: 'No current tenants'      },
  { value: 'tenanted', label: 'Fully Tenanted',     desc: 'All units occupied'      },
  { value: 'partial',  label: 'Partially Tenanted', desc: 'Some units occupied'     },
];

// ─── Land Type Options ────────────────────────────────────────────────────────

const LAND_TYPE_OPTIONS: { value: AgriculturalDetails['landType']; label: string; desc: string }[] = [
  { value: 'irrigated', label: 'Irrigated (Chahi)',  desc: 'Canal or tubewell water available' },
  { value: 'rainfed',   label: 'Barani / Rainfed',  desc: 'Depends on rainfall only'          },
  { value: 'barani',    label: 'Barani (Dry)',       desc: 'Seasonal cultivation only'         },
];

// ─── Water Source Options ─────────────────────────────────────────────────────

const WATER_SOURCE_OPTIONS: { value: AgriculturalDetails['waterSource']; label: string }[] = [
  { value: 'canal',     label: 'Canal Water'  },
  { value: 'tubewell',  label: 'Tubewell'     },
  { value: 'rainwater', label: 'Rainwater'    },
  { value: 'none',      label: 'No Water'     },
];

// ─── Shutter Type Options ─────────────────────────────────────────────────────

const SHUTTER_TYPE_OPTIONS: { value: CommercialDetails['shutterType']; label: string }[] = [
  { value: 'rolling',     label: 'Rolling Shutter'    },
  { value: 'collapsible', label: 'Collapsible Gate'   },
  { value: 'glass',       label: 'Glass Front'        },
  { value: 'none',        label: 'No Shutter'         },
];

// ─── Suitable For Options (Shop/Commercial) ───────────────────────────────────

const SUITABLE_FOR_OPTIONS = [
  'Retail',   'Pharmacy',     'Clinic / Medical',  'Restaurant / Cafe',
  'Salon',    'Grocery',      'Mobile / Electronics', 'Clothing / Fashion',
  'Jewellery','Bakery',       'IT / Telecom',      'Education / Tuition',
  'Bank / ATM','Real Estate', 'Travel Agency',     'Office Use',
];

// ─── Cabin Type Options ───────────────────────────────────────────────────────

const CABIN_TYPE_OPTIONS: { value: CommercialDetails['officeCabinType']; label: string }[] = [
  { value: 'cabin',     label: 'Private Cabins'  },
  { value: 'open_plan', label: 'Open Plan'       },
  { value: 'mixed',     label: 'Mixed Layout'    },
];

// ─── Agreement Type Options ───────────────────────────────────────────────────

const AGREEMENT_TYPE_OPTIONS: { value: RentalDetails['agreementType']; label: string }[] = [
  { value: 'standard',  label: 'Standard Lease'  },
  { value: 'notarized', label: 'Notarized Deed'  },
  { value: 'verbal',    label: 'Verbal Agreement' },
];

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

interface CounterProps {
  label:    string;
  value:    number | '';
  onChange: (val: number | '') => void;
  error?:   string;
  min?:     number;
  max?:     number;
  hint?:    string;
}

function Counter({
  label, value, onChange, error, min = 0, max = 20, hint,
}: CounterProps): React.ReactElement {
  const numVal = value === '' ? 0 : value;
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => { if (numVal > min) onChange(numVal - 1); }}
          disabled={numVal <= min}
          className="w-9 h-9 flex items-center justify-center rounded-lg border
            border-gray-300 text-gray-600 hover:bg-gray-100
            disabled:opacity-30 disabled:cursor-not-allowed
            transition-colors duration-150 text-lg font-bold"
        >−</button>
        <input
          type="number"
          value={value === '' ? '' : value}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') { onChange(''); return; }
            const n = parseInt(raw, 10);
            if (!isNaN(n) && n >= min && n <= max) onChange(n);
          }}
          min={min} max={max}
          className={`w-14 h-9 text-center border rounded-lg text-sm font-medium
            focus:ring-2 focus:ring-[#029bba] focus:border-transparent
            ${error ? 'border-red-500' : 'border-gray-300'}`}
        />
        <button
          type="button"
          onClick={() => { if (numVal < max) onChange(numVal + 1); }}
          disabled={numVal >= max}
          className="w-9 h-9 flex items-center justify-center rounded-lg border
            border-gray-300 text-gray-600 hover:bg-gray-100
            disabled:opacity-30 disabled:cursor-not-allowed
            transition-colors duration-150 text-lg font-bold"
        >+</button>
      </div>
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      <FieldError error={error} />
    </div>
  );
}

interface ToggleProps {
  label:       string;
  checked:     boolean;
  onChange:    (val: boolean) => void;
  description?: string;
}

function Toggle({ label, checked, onChange, description }: ToggleProps): React.ReactElement {
  return (
    <label className="flex items-center justify-between gap-3 py-2 cursor-pointer group">
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-gray-700
          group-hover:text-[#029bba] transition-colors duration-150">
          {label}
        </span>
        {description && (
          <p className="text-xs text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">
        <div
          role="switch" aria-checked={checked} tabIndex={0}
          onClick={() => onChange(!checked)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault(); onChange(!checked);
            }
          }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full
            transition-colors duration-200 cursor-pointer
            ${checked ? 'bg-[#029bba]' : 'bg-gray-300'}`}
        >
          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm
            transition-transform duration-200
            ${checked ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </div>
      </div>
    </label>
  );
}

interface NumberInputProps {
  id:          string;
  label:       string;
  value:       number | '';
  onChange:    (val: number | '') => void;
  placeholder?: string;
  hint?:       string;
  error?:      string;
  min?:        number;
  max?:        number;
  step?:       number;
  suffix?:     string;
  required?:   boolean;
}

function NumberInput({
  id, label, value, onChange, placeholder, hint,
  error, min = 0, max, step = 1, suffix, required = false,
}: NumberInputProps): React.ReactElement {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <input
          id={id} type="number" min={min} max={max} step={step}
          placeholder={placeholder}
          value={value === '' ? '' : value}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') { onChange(''); return; }
            const n = parseFloat(raw);
            if (!isNaN(n) && n >= min) onChange(n);
          }}
          className={`w-full border rounded-lg px-4 py-2.5 pr-${suffix ? '16' : '4'}
            focus:ring-2 focus:ring-[#029bba] focus:border-transparent
            ${error ? 'border-red-500' : 'border-gray-300'}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2
            text-sm text-gray-400 font-medium">
            {suffix}
          </span>
        )}
      </div>
      {hint  && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      <FieldError error={error} />
    </div>
  );
}

// ─── Section: Property Type Selector ─────────────────────────────────────────

interface PropertyTypeSelectorProps {
  value:    PropertyType | '';
  onChange: (type: PropertyType) => void;
  error?:   string;
}

function PropertyTypeSelector({
  value, onChange, error,
}: PropertyTypeSelectorProps): React.ReactElement {
  return (
    <div className="space-y-4">
      {PROPERTY_TYPE_GROUPS.map((group) => (
        <div key={group.label}>
          {/* Group header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">{group.icon}</span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {group.label}
            </span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
          {/* Type buttons */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {group.types.map((type) => {
              const isActive = value === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => onChange(type)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2
                    transition-all duration-150 text-center
                    ${isActive
                      ? 'border-[#029bba] bg-[#029bba] bg-opacity-5 text-[#029bba] shadow-md'
                      : 'border-gray-200 text-gray-500 hover:border-[#029bba] hover:border-opacity-40 hover:bg-gray-50'
                    }`}
                >
                  <span className={isActive ? 'text-[#029bba]' : 'text-gray-400'}>
                    {PROPERTY_TYPE_ICONS[type]}
                  </span>
                  <span className="text-xs font-medium leading-tight">
                    {PROPERTY_TYPE_LABELS[type]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <FieldError error={error} />
    </div>
  );
}

// ─── Section: Sub-Type Selector ───────────────────────────────────────────────

interface SubTypeSelectorProps {
  propertyType: PropertyType | '';
  value:        string;
  onChange:     (val: string) => void;
  error?:       string;
}

function SubTypeSelector({
  propertyType, value, onChange, error,
}: SubTypeSelectorProps): React.ReactElement | null {
  if (!propertyType) return null;
  const options = PROPERTY_SUBTYPES[propertyType];
  if (!options || options.length === 0) return null;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Property Sub-Type <span className="text-red-500">*</span>
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isActive = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(isActive ? '' : opt.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium
                border-2 transition-all duration-150
                ${isActive
                  ? 'border-[#029bba] bg-[#029bba] text-white shadow-sm'
                  : 'border-gray-200 text-gray-600 hover:border-[#029bba] hover:text-[#029bba]'
                }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <FieldError error={error} />
    </div>
  );
}

// ─── Section: Condition ───────────────────────────────────────────────────────

interface ConditionSelectorProps {
  options:  { value: string; label: string }[];
  value:    string;
  onChange: (val: string) => void;
  error?:   string;
}

function ConditionSelector({
  options, value, onChange, error,
}: ConditionSelectorProps): React.ReactElement {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Condition <span className="text-red-500">*</span>
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {options.map((opt) => {
          const isActive = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`px-4 py-2.5 rounded-lg border-2 text-sm font-medium
                transition-all duration-150
                ${isActive
                  ? 'border-[#029bba] bg-[#029bba] bg-opacity-5 text-[#029bba]'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <FieldError error={error} />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TabBasics({
  form,
  errors,
  setField,
  setResidentialField,
  setPlotField,
  setCommercialField,
  setAgriculturalField,
  setRentalField,
  fieldConfig: cfg,
}: TabBasicsProps): React.ReactElement {

  const pt = form.propertyType as PropertyType | '';

  // ── Safety guard — cfg should always be defined but protect against
  //    render timing edge cases during hot reload
  if (!cfg) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center text-gray-400 text-sm">
          Loading form...
        </div>
      </div>
    );
  }

  // ── Property type change handler
  const handleTypeChange = (type: PropertyType) => {
    setField('propertyType', type);
  };

  return (
    <div className="space-y-5">

      {/* ══════════════════════════════════════════════════════
          SECTION 1 — Property Type
         ══════════════════════════════════════════════════════ */}
      <FormSection
        id="basics-type"
        title="Property Type"
        icon={<Building2 className="w-5 h-5" />}
        defaultOpen={true}
        required
        completionStatus={pt ? (errors.propertyType ? 'incomplete' : 'complete') : 'incomplete'}
      >
        <PropertyTypeSelector
          value={pt}
          onChange={handleTypeChange}
          error={errors.propertyType}
        />
      </FormSection>

      {/* ══════════════════════════════════════════════════════
          SECTION 2 — Sub-Type (conditional)
         ══════════════════════════════════════════════════════ */}
      {pt && cfg.showSubType && (
        <FormSection
          id="basics-subtype"
          title="Property Sub-Type"
          icon={<span className="text-lg">🏷️</span>}
          defaultOpen={true}
          required
          completionStatus={form.subType ? 'complete' : 'incomplete'}
        >
          <SubTypeSelector
            propertyType={pt}
            value={form.subType}
            onChange={(val) => setField('subType', val)}
            error={errors.subType}
          />
        </FormSection>
      )}

      {/* ══════════════════════════════════════════════════════
          SECTION 3 — Title & Description
         ══════════════════════════════════════════════════════ */}
      {pt && (
        <FormSection
          id="basics-title"
          title="Title & Description"
          icon={<span className="text-lg">✍️</span>}
          defaultOpen={true}
          required
          completionStatus={
            form.title.trim().length >= 10 && form.description.trim().length >= 50
              ? 'complete' : 'incomplete'
          }
        >
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label htmlFor="prop-title"
                className="block text-sm font-medium text-gray-700 mb-1.5">
                Property Title <span className="text-red-500">*</span>
              </label>
              <input
                id="prop-title" type="text"
                placeholder={
                  pt === 'plot'      ? 'e.g. 5 Marla Residential Plot in DHA Phase 6, Lahore' :
                  pt === 'shop'      ? 'e.g. 200 sqft Ground Floor Shop in Mall of Lahore'    :
                  pt === 'apartment' ? 'e.g. 2 Bed Luxury Apartment in Bahria Town Karachi'   :
                  pt === 'room'      ? 'e.g. Furnished Single Room with Attached Bath in Gulberg' :
                  pt === 'warehouse' ? 'e.g. 5000 sqft Warehouse with Loading Bay in SITE Karachi' :
                  'e.g. 5 Marla Brand New House in DHA Phase 6, Lahore'
                }
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                maxLength={200}
                className={`w-full border rounded-lg px-4 py-2.5
                  focus:ring-2 focus:ring-[#029bba] focus:border-transparent
                  ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
              />
              <div className="flex justify-between items-center mt-1">
                <FieldError error={errors.title} />
                <span className="text-xs text-gray-400 ml-auto">
                  {form.title.length}/200
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Include size, location and key features for better SEO
              </p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="prop-description"
                className="block text-sm font-medium text-gray-700 mb-1.5">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="prop-description"
                placeholder={
                  pt === 'plot'
                    ? 'Describe the plot — location, society, phase, block, plot number, dimensions, facing, nearby landmarks, development status...'
                  : pt === 'warehouse'
                    ? 'Describe the warehouse — height, loading access, power supply, office space, yard area, security, road access...'
                  : pt === 'room'
                    ? 'Describe the room — size, furnishing, attached bath, kitchen access, building type, nearby transport, WiFi...'
                  : 'Describe your property in detail — condition, features, neighborhood, nearby amenities, reason for selling/renting...'
                }
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                rows={5}
                className={`w-full border rounded-lg px-4 py-2.5 resize-y min-h-[120px]
                  focus:ring-2 focus:ring-[#029bba] focus:border-transparent
                  ${errors.description ? 'border-red-500' : 'border-gray-300'}`}
              />
              <div className="flex justify-between items-center mt-1">
                <FieldError error={errors.description} />
                <span className="text-xs text-gray-400 ml-auto">
                  {form.description.length} chars
                  {form.description.length < 50 && form.description.length > 0 && (
                    <span className="text-[#f59e0b] ml-1">(min 50)</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </FormSection>
      )}

      {/* ══════════════════════════════════════════════════════
          SECTION 4 — Rooms & Layout (Residential)
         ══════════════════════════════════════════════════════ */}
      {pt && (cfg.showBedrooms || cfg.showBathrooms || cfg.showKitchens ||
              cfg.showDrawingDining || cfg.showServantQuarters || cfg.showStudyStore) && (
        <FormSection
          id="basics-rooms"
          title="Rooms & Layout"
          icon={<span className="text-lg">🛏️</span>}
          defaultOpen={true}
          required={cfg.showBedrooms}
          completionStatus={
            cfg.showBedrooms
              ? (form.bedrooms !== '' && form.bathrooms !== '' ? 'complete' : 'incomplete')
              : 'optional'
          }
        >
          <div className="space-y-5">
            {/* Bed / Bath / Kitchen counters */}
            {(cfg.showBedrooms || cfg.showBathrooms || cfg.showKitchens) && (
              <div className="grid grid-cols-3 gap-4">
                {cfg.showBedrooms && (
                  <Counter
                    label="Bedrooms"
                    value={form.bedrooms}
                    onChange={(val) => setField('bedrooms', val)}
                    error={errors.bedrooms}
                    min={0} max={20}
                  />
                )}
                {cfg.showBathrooms && (
                  <Counter
                    label="Bathrooms"
                    value={form.bathrooms}
                    onChange={(val) => setField('bathrooms', val)}
                    error={errors.bathrooms}
                    min={0} max={20}
                  />
                )}
                {cfg.showKitchens && (
                  <Counter
                    label="Kitchens"
                    value={form.kitchens}
                    onChange={(val) => setField('kitchens', val)}
                    min={0} max={10}
                  />
                )}
              </div>
            )}

            {/* Drawing / Dining rooms */}
            {cfg.showDrawingDining && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Additional Rooms
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  <Toggle
                    label="Drawing Room"
                    checked={form.residential.drawingRoom}
                    onChange={(val) => setResidentialField('drawingRoom', val)}
                  />
                  <Toggle
                    label="Dining Room"
                    checked={form.residential.diningRoom}
                    onChange={(val) => setResidentialField('diningRoom', val)}
                  />
                  {cfg.showStudyStore && (
                    <>
                      <Toggle
                        label="Study Room"
                        checked={form.residential.studyRoom}
                        onChange={(val) => setResidentialField('studyRoom', val)}
                      />
                      <Toggle
                        label="Store Room"
                        checked={form.residential.storeRoom}
                        onChange={(val) => setResidentialField('storeRoom', val)}
                      />
                      <Toggle
                        label="Laundry Room"
                        checked={form.residential.laundryRoom}
                        onChange={(val) => setResidentialField('laundryRoom', val)}
                      />
                      <Toggle
                        label="Porch / Veranda"
                        checked={form.residential.porch}
                        onChange={(val) => setResidentialField('porch', val)}
                      />
                    </>
                  )}
                  {cfg.showServantQuarters && (
                    <Toggle
                      label="Servant Quarters"
                      checked={form.residential.servantQuarters}
                      onChange={(val) => setResidentialField('servantQuarters', val)}
                      description="Separate servant accommodation"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Lawn / Garden (House / Villa / Farmhouse) */}
            {cfg.showLawnGarden && (
              <div className="border-t border-gray-100 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lawn / Garden
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {LAWN_OPTIONS.map((opt) => {
                    const isActive = form.residential.lawnGarden === opt.value;
                    return (
                      <button
                        key={opt.value ?? 'none'}
                        type="button"
                        onClick={() => setResidentialField('lawnGarden', opt.value)}
                        className={`px-3 py-2 rounded-lg border-2 text-sm font-medium
                          transition-all duration-150 text-center
                          ${isActive
                            ? 'border-[#10b981] bg-[#10b981] bg-opacity-5 text-[#10b981]'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </FormSection>
      )}

      {/* ══════════════════════════════════════════════════════
          SECTION 5 — Floor Information (Apartment / Shop / Office / Penthouse)
         ══════════════════════════════════════════════════════ */}
      {pt && (cfg.showFloorNumber || cfg.showTotalFloors) && (
        <FormSection
          id="basics-floor"
          title="Floor Information"
          icon={<Layers className="w-5 h-5" />}
          defaultOpen={true}
          completionStatus={
            cfg.showFloorNumber && form.floor !== '' ? 'complete' : 'optional'
          }
        >
          <div className="grid grid-cols-2 gap-4">
            {cfg.showFloorNumber && (
              <NumberInput
                id="prop-floor"
                label="Floor Number"
                value={form.floor}
                onChange={(val) => setField('floor', val)}
                placeholder="e.g. 3"
                hint="Use 0 for Ground, -1 for Basement"
                min={-5} max={100}
              />
            )}
            {cfg.showTotalFloors && (
              <NumberInput
                id="prop-total-floors"
                label={pt === 'building' ? 'Total Floors in Building' : 'Total Floors'}
                value={form.totalFloors}
                onChange={(val) => setField('totalFloors', val)}
                placeholder="e.g. 10"
                min={1} max={200}
              />
            )}
          </div>

          {/* Building-specific: Total Units + Lifts */}
          {cfg.showTotalUnits && (
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
              <NumberInput
                id="prop-total-units"
                label="Total Units in Building"
                value={form.commercial.totalUnits}
                onChange={(val) => setCommercialField('totalUnits', val)}
                placeholder="e.g. 24"
                hint="Total residential / commercial units"
                min={1}
              />
              <NumberInput
                id="prop-lifts"
                label="Number of Lifts / Elevators"
                value={form.commercial.liftsCount}
                onChange={(val) => setCommercialField('liftsCount', val)}
                placeholder="e.g. 2"
                min={0}
              />
              <NumberInput
                id="prop-basement-floors"
                label="Basement Floors"
                value={form.commercial.basementFloors}
                onChange={(val) => setCommercialField('basementFloors', val)}
                placeholder="e.g. 1"
                min={0}
              />
              <NumberInput
                id="prop-building-age"
                label="Building Age (years)"
                value={form.commercial.buildingAge}
                onChange={(val) => setCommercialField('buildingAge', val)}
                placeholder="e.g. 5"
                min={0}
              />
            </div>
          )}
        </FormSection>
      )}

      {/* ══════════════════════════════════════════════════════
          SECTION 6 — Penthouse Extras
         ══════════════════════════════════════════════════════ */}
      {pt === 'penthouse' && (
        <FormSection
          id="basics-penthouse"
          title="Penthouse Features"
          icon={<span className="text-lg">👑</span>}
          defaultOpen={true}
          completionStatus="optional"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            <Toggle
              label="Private Rooftop / Terrace"
              checked={form.residential.hasPanoramicView}
              onChange={(val) => setResidentialField('hasPanoramicView', val)}
              description="Exclusive outdoor space"
            />
            <Toggle
              label="Private Elevator Access"
              checked={form.residential.hasPrivateElevator}
              onChange={(val) => setResidentialField('hasPrivateElevator', val)}
            />
            <Toggle
              label="Jacuzzi / Spa"
              checked={form.residential.hasJacuzzi}
              onChange={(val) => setResidentialField('hasJacuzzi', val)}
            />
            <Toggle
              label="Concierge Service"
              checked={form.residential.hasConcierge}
              onChange={(val) => setResidentialField('hasConcierge', val)}
            />
          </div>
        </FormSection>
      )}

      {/* ══════════════════════════════════════════════════════
          SECTION 7 — Room Specific Details
         ══════════════════════════════════════════════════════ */}
      {pt === 'room' && (
        <FormSection
          id="basics-room"
          title="Room Details"
          icon={<DoorOpen className="w-5 h-5" />}
          defaultOpen={true}
          required
          completionStatus="optional"
        >
          <div className="space-y-4">
            {/* Bathroom */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              <Toggle
                label="Attached Bathroom"
                checked={form.residential.attachedBath}
                onChange={(val) => setResidentialField('attachedBath', val)}
                description="Private bathroom inside room"
              />
              <Toggle
                label="Shared Bathroom"
                checked={form.residential.sharedBath}
                onChange={(val) => setResidentialField('sharedBath', val)}
                description="Common bathroom on floor"
              />
            </div>

            {/* Kitchen Access */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kitchen Access
              </label>
              <div className="grid grid-cols-3 gap-2">
                {KITCHEN_ACCESS_OPTIONS.map((opt) => {
                  const isActive = form.residential.kitchenAccess === opt.value;
                  return (
                    <button
                      key={opt.value ?? 'none'}
                      type="button"
                      onClick={() =>
                        setResidentialField('kitchenAccess', opt.value)
                      }
                      className={`px-3 py-2.5 rounded-lg border-2 text-sm font-medium
                        transition-all duration-150 text-center
                        ${isActive
                          ? 'border-[#029bba] bg-[#029bba] bg-opacity-5 text-[#029bba]'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Meals included */}
            {cfg.showMealsIncluded && (
              <Toggle
                label="Meals Included"
                checked={form.rentalDetails.mealsIncluded}
                onChange={(val) => setRentalField('mealsIncluded', val)}
                description="Breakfast / dinner provided (PG / hostel)"
              />
            )}

            {/* Gender preference */}
            {cfg.showGenderPreference && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Gender of Tenant
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {GENDER_OPTIONS.map((opt) => {
                    const isActive = form.rentalDetails.genderPreference === opt.value;
                    return (
                      <button
                        key={opt.value ?? 'any'}
                        type="button"
                        onClick={() => setRentalField('genderPreference', opt.value)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2
                          text-sm font-medium transition-all duration-150
                          ${isActive
                            ? 'border-[#029bba] bg-[#029bba] bg-opacity-5 text-[#029bba]'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                      >
                        <span className="text-xl">{opt.icon}</span>
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </FormSection>
      )}

      {/* ══════════════════════════════════════════════════════
          SECTION 8 — Plot Details
         ══════════════════════════════════════════════════════ */}
      {pt === 'plot' && (
        <FormSection
          id="basics-plot"
          title="Plot Details"
          icon={<Layers className="w-5 h-5" />}
          defaultOpen={true}
          required
          completionStatus={
            form.plotDetails.plotCategory ? 'complete' : 'incomplete'
          }
        >
          <div className="space-y-5">
            {/* Plot Category */}
            {cfg.showPlotCategory && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plot Category <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PLOT_CATEGORY_OPTIONS.map((opt) => {
                    const isActive = form.plotDetails.plotCategory === opt.value;
                    return (
                      <button
                        key={opt.value ?? 'none'}
                        type="button"
                        onClick={() => setPlotField('plotCategory', opt.value)}
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
              </div>
            )}

            {/* Plot Number */}
            {cfg.showPlotNumber && (
              <div>
                <label htmlFor="plot-number"
                  className="block text-sm font-medium text-gray-700 mb-1.5">
                  Plot Number
                </label>
                <input
                  id="plot-number"
                  type="text"
                  placeholder="e.g. Plot-45, Street-7, Block-D"
                  value={form.plotDetails.plotNumber}
                  onChange={(e) => setPlotField('plotNumber', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                    focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Official plot number from society records
                </p>
              </div>
            )}

            {/* Road Width + Allowed Floors */}
            <div className="grid grid-cols-2 gap-4">
              {cfg.showRoadWidth && (
                <NumberInput
                  id="plot-road-width"
                  label="Road Width (feet)"
                  value={form.plotDetails.roadWidth}
                  onChange={(val) => setPlotField('roadWidth', val)}
                  placeholder="e.g. 30"
                  hint="Width of road in front of plot"
                  suffix="ft"
                  min={10}
                />
              )}
              {cfg.showAllowedFloors && (
                <NumberInput
                  id="plot-allowed-floors"
                  label="Allowed Floors"
                  value={form.plotDetails.allowedFloors}
                  onChange={(val) => setPlotField('allowedFloors', val)}
                  placeholder="e.g. 3"
                  hint="Permitted building height by authority"
                  min={1} max={50}
                />
              )}
            </div>

            {/* Special features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {cfg.showIsParkFacing && (
                <Toggle
                  label="Park Facing"
                  checked={form.plotDetails.isParkFacing}
                  onChange={(val) => setPlotField('isParkFacing', val)}
                  description="Plot faces a park or green area"
                />
              )}
              {cfg.showIsMainRoadFacing && (
                <Toggle
                  label="Main Road Facing"
                  checked={form.plotDetails.isMainRoadFacing}
                  onChange={(val) => setPlotField('isMainRoadFacing', val)}
                  description="Facing main road / boulevard"
                />
              )}
              <Toggle
                label="Corner Plot"
                checked={form.plotDetails.isCorner}
                onChange={(val) => setPlotField('isCorner', val)}
                description="Corner plots command premium pricing"
              />
              {cfg.showBoundaryWall && (
                <Toggle
                  label="Boundary Wall"
                  checked={form.plotDetails.boundaryWall}
                  onChange={(val) => setPlotField('boundaryWall', val)}
                  description="Plot has boundary wall"
                />
              )}
            </div>

            {/* Development Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Development Status
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DEVELOPMENT_STATUS_OPTIONS.map((opt) => {
                  const isActive = form.plotDetails.developmentStatus === opt.value;
                  return (
                    <button
                      key={opt.value ?? 'none'}
                      type="button"
                      onClick={() =>
                        setPlotField('developmentStatus',
                          isActive ? '' : opt.value)
                      }
                      className={`px-3 py-2 rounded-lg border-2 text-xs font-medium
                        transition-all duration-150 text-center
                        ${isActive
                          ? 'border-[#10b981] bg-[#10b981] bg-opacity-5 text-[#10b981]'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </FormSection>
      )}

      {/* ══════════════════════════════════════════════════════
          SECTION 9 — Shop Details
         ══════════════════════════════════════════════════════ */}
      {pt === 'shop' && (
        <FormSection
          id="basics-shop"
          title="Shop Details"
          icon={<Store className="w-5 h-5" />}
          defaultOpen={true}
          completionStatus="optional"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Shop Number */}
              <div>
                <label htmlFor="shop-number"
                  className="block text-sm font-medium text-gray-700 mb-1.5">
                  Shop Number
                </label>
                <input
                  id="shop-number" type="text"
                  placeholder="e.g. Shop-5, Ground Floor"
                  value={form.commercial.shopNumber}
                  onChange={(e) => setCommercialField('shopNumber', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                    focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                />
              </div>

              {/* Road Width */}
              {cfg.showRoadWidth && (
                <NumberInput
                  id="shop-road-width"
                  label="Road Width in Front (ft)"
                  value={form.commercial.roadWidth}
                  onChange={(val) => setCommercialField('roadWidth', val)}
                  placeholder="e.g. 30"
                  suffix="ft"
                  min={10}
                />
              )}
            </div>

            {/* Frontage Width */}
            {cfg.showFrontageWidth && (
              <NumberInput
                id="shop-frontage"
                label="Shop Frontage Width (ft)"
                value={form.commercial.frontageWidth}
                onChange={(val) => setCommercialField('frontageWidth', val)}
                placeholder="e.g. 12"
                hint="Display window / entrance width"
                suffix="ft"
                min={1}
              />
            )}

            {/* Ceiling Height */}
            {cfg.showCeilingHeight && (
              <NumberInput
                id="shop-ceiling"
                label="Ceiling Height (ft)"
                value={form.commercial.ceilingHeight}
                onChange={(val) => setCommercialField('ceilingHeight', val)}
                placeholder="e.g. 12"
                suffix="ft"
                min={6}
              />
            )}

            {/* Power Load */}
            {cfg.showPowerLoad && (
              <NumberInput
                id="shop-power"
                label="Sanctioned Power Load (kW)"
                value={form.commercial.powerLoad}
                onChange={(val) => setCommercialField('powerLoad', val)}
                placeholder="e.g. 10"
                suffix="kW"
                min={1}
              />
            )}

            {/* Shutter Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shutter / Entrance Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SHUTTER_TYPE_OPTIONS.map((opt) => {
                  const isActive = form.commercial.shutterType === opt.value;
                  return (
                    <button
                      key={opt.value ?? 'none'}
                      type="button"
                      onClick={() =>
                        setCommercialField('shutterType', isActive ? '' : opt.value)
                      }
                      className={`px-3 py-2 rounded-lg border-2 text-xs font-medium
                        transition-all duration-150 text-center
                        ${isActive
                          ? 'border-[#029bba] bg-[#029bba] bg-opacity-5 text-[#029bba]'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Feature toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1
              border-t border-gray-100 pt-3">
              {cfg.showDisplayWindow && (
                <Toggle
                  label="Display Window"
                  checked={form.commercial.hasDisplayWindow}
                  onChange={(val) => setCommercialField('hasDisplayWindow', val)}
                  description="Glass display window facing road"
                />
              )}
              {cfg.showStorageRoom && (
                <Toggle
                  label="Storage Room / Back Store"
                  checked={form.commercial.hasStorageRoom}
                  onChange={(val) => setCommercialField('hasStorageRoom', val)}
                />
              )}
              <Toggle
                label="Washroom / Toilet"
                checked={form.commercial.hasWashroom}
                onChange={(val) => setCommercialField('hasWashroom', val)}
              />
              <Toggle
                label="Mezzanine Floor"
                checked={form.commercial.hasMezzanine}
                onChange={(val) => setCommercialField('hasMezzanine', val)}
                description="Upper half-floor inside shop"
              />
            </div>

            {/* Suitable For (multi-select) */}
            <div className="border-t border-gray-100 pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Suitable For (select all that apply)
              </label>
              <div className="flex flex-wrap gap-2">
                {SUITABLE_FOR_OPTIONS.map((opt) => {
                  const isActive = form.commercial.suitableFor.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        const current = form.commercial.suitableFor;
                        setCommercialField(
                          'suitableFor',
                          isActive
                            ? current.filter((v) => v !== opt)
                            : [...current, opt]
                        );
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium
                        border-2 transition-all duration-150
                        ${isActive
                          ? 'border-[#7c3aed] bg-[#7c3aed] text-white'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </FormSection>
      )}

      {/* ══════════════════════════════════════════════════════
          SECTION 10 — Office Details
         ══════════════════════════════════════════════════════ */}
      {pt === 'office' && (
        <FormSection
          id="basics-office"
          title="Office Details"
          icon={<Building className="w-5 h-5" />}
          defaultOpen={true}
          completionStatus="optional"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Office Number */}
              <div>
                <label htmlFor="office-number"
                  className="block text-sm font-medium text-gray-700 mb-1.5">
                  Office Number
                </label>
                <input
                  id="office-number" type="text"
                  placeholder="e.g. Suite-301"
                  value={form.commercial.shopNumber}
                  onChange={(e) => setCommercialField('shopNumber', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                    focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                />
              </div>

              {/* Meeting Rooms */}
              <NumberInput
                id="office-meeting-rooms"
                label="Meeting Rooms"
                value={form.commercial.meetingRooms}
                onChange={(val) => setCommercialField('meetingRooms', val)}
                placeholder="e.g. 2"
                min={0} max={20}
              />
            </div>

            {/* Ceiling Height */}
            {cfg.showCeilingHeight && (
              <NumberInput
                id="office-ceiling"
                label="Ceiling Height (ft)"
                value={form.commercial.ceilingHeight}
                onChange={(val) => setCommercialField('ceilingHeight', val)}
                placeholder="e.g. 10"
                suffix="ft"
                min={7}
              />
            )}

            {/* Power Load */}
            {cfg.showPowerLoad && (
              <NumberInput
                id="office-power"
                label="Power Load (kW)"
                value={form.commercial.powerLoad}
                onChange={(val) => setCommercialField('powerLoad', val)}
                placeholder="e.g. 20"
                suffix="kW"
                min={1}
              />
            )}

            {/* Layout Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Office Layout
              </label>
              <div className="grid grid-cols-3 gap-2">
                {CABIN_TYPE_OPTIONS.map((opt) => {
                  const isActive = form.commercial.officeCabinType === opt.value;
                  return (
                    <button
                      key={opt.value ?? 'none'}
                      type="button"
                      onClick={() =>
                        setCommercialField('officeCabinType', isActive ? '' : opt.value)
                      }
                      className={`px-3 py-2.5 rounded-lg border-2 text-sm font-medium
                        transition-all duration-150 text-center
                        ${isActive
                          ? 'border-[#029bba] bg-[#029bba] bg-opacity-5 text-[#029bba]'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Feature Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1
              border-t border-gray-100 pt-3">
              <Toggle
                label="Reception Area"
                checked={form.commercial.hasReception}
                onChange={(val) => setCommercialField('hasReception', val)}
              />
              {cfg.showServerRoom && (
                <Toggle
                  label="Server / IT Room"
                  checked={form.commercial.hasServerRoom}
                  onChange={(val) => setCommercialField('hasServerRoom', val)}
                />
              )}
              {cfg.showPantry && (
                <Toggle
                  label="Pantry / Kitchenette"
                  checked={form.commercial.hasPantry}
                  onChange={(val) => setCommercialField('hasPantry', val)}
                />
              )}
              {cfg.showPrayerRoom && (
                <Toggle
                  label="Prayer Room / Musalla"
                  checked={form.commercial.hasPrayerRoom}
                  onChange={(val) => setCommercialField('hasPrayerRoom', val)}
                />
              )}
              <Toggle
                label="Washroom / Toilet"
                checked={form.commercial.hasWashroom}
                onChange={(val) => setCommercialField('hasWashroom', val)}
              />
            </div>
          </div>
        </FormSection>
      )}

      {/* ══════════════════════════════════════════════════════
          SECTION 11 — Warehouse / Factory Details
         ══════════════════════════════════════════════════════ */}
      {pt === 'warehouse' && (
        <FormSection
          id="basics-warehouse"
          title="Warehouse / Factory Details"
          icon={<Warehouse className="w-5 h-5" />}
          defaultOpen={true}
          completionStatus="optional"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Ceiling Height */}
              {cfg.showCeilingHeight && (
                <NumberInput
                  id="wh-ceiling"
                  label="Ceiling / Height (ft)"
                  value={form.commercial.ceilingHeight}
                  onChange={(val) => setCommercialField('ceilingHeight', val)}
                  placeholder="e.g. 25"
                  hint="Clear height to truss / roof"
                  suffix="ft"
                  min={8}
                />
              )}

              {/* Loading Bays */}
              {cfg.showLoadingBays && (
                <NumberInput
                  id="wh-loading-bays"
                  label="Loading Bays / Docks"
                  value={form.commercial.loadingBays}
                  onChange={(val) => setCommercialField('loadingBays', val)}
                  placeholder="e.g. 2"
                  min={0}
                />
              )}

              {/* Road Width */}
              {cfg.showRoadWidth && (
                <NumberInput
                  id="wh-road-width"
                  label="Road Width (ft)"
                  value={form.commercial.roadWidth}
                  onChange={(val) => setCommercialField('roadWidth', val)}
                  placeholder="e.g. 40"
                  hint="Wide roads needed for trucks"
                  suffix="ft"
                  min={10}
                />
              )}

              {/* Power Load */}
              {cfg.showPowerLoad && (
                <NumberInput
                  id="wh-power"
                  label="Power Load (kW)"
                  value={form.commercial.powerLoad}
                  onChange={(val) => setCommercialField('powerLoad', val)}
                  placeholder="e.g. 100"
                  suffix="kW"
                  min={1}
                />
              )}
            </div>

            {/* Feature Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1
              border-t border-gray-100 pt-3">
              {cfg.showThreePhase && (
                <Toggle
                  label="3-Phase Electricity"
                  checked={form.commercial.hasThreePhase}
                  onChange={(val) => setCommercialField('hasThreePhase', val)}
                  description="Industrial 3-phase power supply"
                />
              )}
              <Toggle
                label="Office Portion"
                checked={form.commercial.hasOfficePortion}
                onChange={(val) => setCommercialField('hasOfficePortion', val)}
                description="Separate office area within facility"
              />
              {cfg.showFireSafety && (
                <Toggle
                  label="Fire Safety System"
                  checked={form.commercial.hasFireSafety}
                  onChange={(val) => setCommercialField('hasFireSafety', val)}
                  description="Sprinklers / fire alarm"
                />
              )}
              <Toggle
                label="Dock Leveler"
                checked={form.commercial.hasDockLeveler}
                onChange={(val) => setCommercialField('hasDockLeveler', val)}
                description="Height-adjustable loading platform"
              />
              <Toggle
                label="Crane / Overhead Hoist"
                checked={form.commercial.hasCraneAccess}
                onChange={(val) => setCommercialField('hasCraneAccess', val)}
              />
              <Toggle
                label="Drainage System"
                checked={form.commercial.hasDrainage}
                onChange={(val) => setCommercialField('hasDrainage', val)}
              />
              <Toggle
                label="Washroom Facility"
                checked={form.commercial.hasWashroom}
                onChange={(val) => setCommercialField('hasWashroom', val)}
              />
              {cfg.showPrayerRoom && (
                <Toggle
                  label="Prayer Room / Musalla"
                  checked={form.commercial.hasPrayerRoom}
                  onChange={(val) => setCommercialField('hasPrayerRoom', val)}
                />
              )}
            </div>
          </div>
        </FormSection>
      )}

      {/* ══════════════════════════════════════════════════════
          SECTION 12 — Building Occupancy
         ══════════════════════════════════════════════════════ */}
      {pt === 'building' && cfg.showBuildingOccupancy && (
        <FormSection
          id="basics-building"
          title="Building Occupancy & Income"
          icon={<Landmark className="w-5 h-5" />}
          defaultOpen={true}
          completionStatus="optional"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Occupancy Status
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {OCCUPANCY_OPTIONS.map((opt) => {
                  const isActive = form.commercial.occupancyStatus === opt.value;
                  return (
                    <button
                      key={opt.value ?? 'none'}
                      type="button"
                      onClick={() =>
                        setCommercialField('occupancyStatus', isActive ? '' : opt.value)
                      }
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
            </div>

            {/* Current Rental Income (if tenanted) */}
            {(form.commercial.occupancyStatus === 'tenanted' ||
              form.commercial.occupancyStatus === 'partial') && (
              <div className="relative">
                <label htmlFor="building-rental-income"
                  className="block text-sm font-medium text-gray-700 mb-1.5">
                  Current Monthly Rental Income
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2
                    text-gray-400 text-sm font-medium">
                    Rs.
                  </span>
                  <input
                    id="building-rental-income"
                    type="number" min={0}
                    placeholder="e.g. 500000"
                    value={form.commercial.currentRentalIncome === ''
                      ? '' : form.commercial.currentRentalIncome}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') {
                        setCommercialField('currentRentalIncome', '');
                        return;
                      }
                      const n = parseFloat(raw);
                      if (!isNaN(n) && n >= 0) {
                        setCommercialField('currentRentalIncome', n);
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5
                      focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Helps buyers calculate rental yield
                </p>
              </div>
            )}
          </div>
        </FormSection>
      )}

      {/* ══════════════════════════════════════════════════════
          SECTION 13 — Agricultural / Farmhouse Details
         ══════════════════════════════════════════════════════ */}
      {(pt === 'other' || pt === 'farmhouse') && (
        <FormSection
          id="basics-agri"
          title={pt === 'farmhouse' ? 'Farm House Details' : 'Agricultural Land Details'}
          icon={<Trees className="w-5 h-5" />}
          defaultOpen={true}
          completionStatus="optional"
        >
          <div className="space-y-4">
            {/* Land Type */}
            {cfg.showLandType && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Land Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {LAND_TYPE_OPTIONS.map((opt) => {
                    const isActive = form.agricultural.landType === opt.value;
                    return (
                      <button
                        key={opt.value ?? 'none'}
                        type="button"
                        onClick={() =>
                          setAgriculturalField('landType', isActive ? '' : opt.value)
                        }
                        className={`text-left p-3 rounded-xl border-2
                          transition-all duration-150
                          ${isActive
                            ? 'border-[#10b981] bg-[#10b981] bg-opacity-5'
                            : 'border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        <p className={`font-medium text-sm
                          ${isActive ? 'text-[#10b981]' : 'text-gray-700'}`}>
                          {opt.label}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Water Source */}
            {cfg.showWaterSource && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Water Source
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {WATER_SOURCE_OPTIONS.map((opt) => {
                    const isActive = form.agricultural.waterSource === opt.value;
                    return (
                      <button
                        key={opt.value ?? 'none'}
                        type="button"
                        onClick={() =>
                          setAgriculturalField('waterSource', isActive ? '' : opt.value)
                        }
                        className={`px-3 py-2.5 rounded-lg border-2 text-sm font-medium
                          transition-all duration-150 text-center
                          ${isActive
                            ? 'border-[#029bba] bg-[#029bba] bg-opacity-5 text-[#029bba]'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Crop History */}
            {pt === 'other' && (
              <div>
                <label htmlFor="crop-history"
                  className="block text-sm font-medium text-gray-700 mb-1.5">
                  Crop History
                </label>
                <input
                  id="crop-history" type="text"
                  placeholder="e.g. Wheat, Sugarcane, Rice, Mango"
                  value={form.agricultural.cropHistory}
                  onChange={(e) =>
                    setAgriculturalField('cropHistory', e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                    focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                />
              </div>
            )}

            {/* Feature Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1
              border-t border-gray-100 pt-3">
              {cfg.showTubewell && (
                <Toggle
                  label="Tubewell / Water Bore"
                  checked={form.agricultural.hasTubewell}
                  onChange={(val) => setAgriculturalField('hasTubewell', val)}
                  description="Private water boring available"
                />
              )}
              <Toggle
                label="Fruit Trees / Orchard"
                checked={form.agricultural.hasFruitTrees}
                onChange={(val) => setAgriculturalField('hasFruitTrees', val)}
              />
              <Toggle
                label="Livestock / Animal Area"
                checked={form.agricultural.hasLivestockArea}
                onChange={(val) => setAgriculturalField('hasLivestockArea', val)}
              />
              {pt === 'farmhouse' && (
                <Toggle
                  label="Guest House Portion"
                  checked={form.agricultural.hasGuestHouse}
                  onChange={(val) => setAgriculturalField('hasGuestHouse', val)}
                  description="Separate guest accommodation"
                />
              )}

              {/* Access Road Type */}
              {cfg.showAccessRoad && (
                <div className="col-span-full mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Access Road
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'paved',   label: 'Paved Road'  },
                      { value: 'unpaved', label: 'Unpaved / Kacha' },
                      { value: 'none',    label: 'No Road Access' },
                    ].map((opt) => {
                      const isActive = form.agricultural.accessRoadType === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            setAgriculturalField('accessRoadType',
                              isActive ? '' : (opt.value as AgriculturalDetails['accessRoadType']))
                          }
                          className={`px-3 py-2 rounded-lg border-2 text-xs font-medium
                            transition-all duration-150 text-center
                            ${isActive
                              ? 'border-[#f59e0b] bg-[#f59e0b] bg-opacity-5 text-[#f59e0b]'
                              : 'border-gray-200 text-gray-500 hover:border-gray-300'
                            }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </FormSection>
      )}

      {/* ══════════════════════════════════════════════════════
          SECTION 14 — Condition & Orientation
         ══════════════════════════════════════════════════════ */}
      {pt && cfg.showCondition && (
        <FormSection
          id="basics-condition"
          title="Condition & Orientation"
          icon={<span className="text-lg">🏗️</span>}
          defaultOpen={true}
          required
          completionStatus={form.condition ? 'complete' : 'incomplete'}
        >
          <div className="space-y-5">
            <ConditionSelector
              options={cfg.conditionOptions}
              value={form.condition}
              onChange={(val) => setField('condition', val)}
              error={errors.condition}
            />

            {/* Facing Direction */}
            {cfg.showFacing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Facing Direction
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {FACING_OPTIONS.map((opt) => {
                    const isActive = form.facing === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setField('facing', isActive ? '' : opt.value)
                        }
                        className={`px-3 py-2 rounded-lg border text-xs font-medium
                          transition-all duration-150 text-center
                          ${isActive
                            ? 'border-[#029bba] bg-[#029bba] bg-opacity-5 text-[#029bba]'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Property characteristics — all in one aligned 2-column grid */}
            {pt !== 'plot' && (
              cfg.showCorner ||
              cfg.showBoundaryWall ||
              cfg.showIsParkFacing ||
              cfg.showIsMainRoadFacing
            ) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                {cfg.showCorner && (
                  <Toggle
                    label={cfg.cornerLabel}
                    checked={form.isCorner}
                    onChange={(val) => setField('isCorner', val)}
                    description="Corner properties typically command premium pricing"
                  />
                )}
                {cfg.showIsParkFacing && (
                  <Toggle
                    label="Park Facing"
                    checked={form.residential.isParkFacing}
                    onChange={(val) => setResidentialField('isParkFacing', val)}
                    description="Property faces a park or green area"
                  />
                )}
                {cfg.showIsMainRoadFacing && (
                  <Toggle
                    label="Main Road Facing"
                    checked={form.residential.isMainRoadFacing}
                    onChange={(val) => setResidentialField('isMainRoadFacing', val)}
                    description="Facing main road / boulevard"
                  />
                )}
                {cfg.showBoundaryWall && (
                  <Toggle
                    label="Boundary Wall"
                    checked={form.residential.boundaryWall}
                    onChange={(val) => setResidentialField('boundaryWall', val)}
                    description="Property has boundary wall around it"
                  />
                )}
              </div>
            )}
          </div>
        </FormSection>
      )}

      {/* ══════════════════════════════════════════════════════
          SECTION 15 — Possession Status
         ══════════════════════════════════════════════════════ */}
      {pt && cfg.showPossession && (
        <FormSection
          id="basics-possession"
          title="Possession Status"
          icon={<span className="text-lg">🔑</span>}
          defaultOpen={true}
          required
          completionStatus={form.possessionStatus ? 'complete' : 'incomplete'}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {POSSESSION_OPTIONS.map((opt) => {
                const isActive = form.possessionStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setField('possessionStatus', opt.value)}
                    className={`text-left p-4 rounded-xl border-2
                      transition-all duration-150
                      ${isActive
                        ? 'border-[#029bba] bg-[#029bba] bg-opacity-5'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <p className="text-lg mb-1">{opt.icon}</p>
                    <p className={`font-medium text-sm
                      ${isActive ? 'text-[#029bba]' : 'text-gray-700'}`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
            <FieldError error={errors.possessionStatus} />

            {/* Possession Date */}
            {(form.possessionStatus === 'under_construction' ||
              form.possessionStatus === 'on_map') && (
              <div className="mt-3">
                <label htmlFor="prop-possession-date"
                  className="block text-sm font-medium text-gray-700 mb-1.5">
                  Expected Possession Date
                </label>
                <input
                  id="prop-possession-date"
                  type="date"
                  value={form.possessionDate}
                  onChange={(e) => setField('possessionDate', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                    focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Approximate date when possession will be available
                </p>
              </div>
            )}
          </div>
        </FormSection>
      )}

      {/* ── Prompt when no type selected ─── */}
      {!pt && (
        <div className="bg-[#eff6ff] border-l-4 border-[#029bba] px-5 py-4 rounded-r-xl">
          <p className="text-sm font-semibold text-[#004063]">
            👆 Select a property type above to continue
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Fields will appear based on the type you select
          </p>
        </div>
      )}

    </div>
  );
}