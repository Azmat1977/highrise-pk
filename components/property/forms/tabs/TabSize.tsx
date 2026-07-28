// components/property/forms/tabs/TabSize.tsx

import {
  Ruler, Calendar, Maximize2, PenTool,
  HardHat, CheckCircle2, AlertCircle, Zap, Rocket,
} from 'lucide-react';
import FormSection from '../shared/FormSection';
import {
  PropertyFormState,
  PropertyType,
  AreaUnit,
  AREA_UNITS,
  AREA_UNIT_DESCRIPTIONS,
  convertToSqFt,
  TabErrors,
  UsePropertyFormReturn,
  FieldConfig,
  ResidentialDetails,
  CommercialDetails,
  ConstructionDetails,
  ProjectStatus,
  ConstructionStage,
  ScheduleStatus,
  STAGE_PROGRESS_MAP,
  STAGE_DETAILS,
} from '../shared/usePropertyForm';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TabSizeProps {
  form:                 PropertyFormState;
  errors:               TabErrors;
  setField:             UsePropertyFormReturn['setField'];
  setResidentialField:  UsePropertyFormReturn['setResidentialField'];
  setCommercialField:   UsePropertyFormReturn['setCommercialField'];
  setConstructionField: UsePropertyFormReturn['setConstructionField'];
  fieldConfig:          FieldConfig;
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

interface NumberInputProps {
  id:           string;
  label:        string;
  value:        number | '';
  onChange:     (val: number | '') => void;
  placeholder?: string;
  hint?:        string;
  error?:       string;
  min?:         number;
  max?:         number;
  step?:        number;
  suffix?:      string;
  required?:    boolean;
}

function NumberInput({
  id, label, value, onChange, placeholder, hint,
  error, min = 0, max, step = 0.01, suffix, required = false,
}: NumberInputProps): React.ReactElement {
  return (
    <div>
      <label htmlFor={id}
        className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
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
          className={`w-full border rounded-lg px-4 py-2.5
            ${suffix ? 'pr-14' : 'pr-4'}
            focus:ring-2 focus:ring-[#029bba] focus:border-transparent
            ${error ? 'border-red-500' : 'border-gray-300'}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2
            text-sm text-gray-400 font-medium pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {hint && !error && (
        <p className="text-xs text-gray-400 mt-1">{hint}</p>
      )}
      <FieldError error={error} />
    </div>
  );
}

// ─── Area Input with Unit Selector ────────────────────────────────────────────

interface AreaInputProps {
  id:           string;
  label:        string;
  sizeValue:    number | '';
  unitValue:    AreaUnit;
  onSizeChange: (val: number | '') => void;
  onUnitChange: (val: AreaUnit) => void;
  error?:       string;
  required?:    boolean;
  hint?:        string;
  availableUnits?: AreaUnit[];
}

function AreaInput({
  id, label, sizeValue, unitValue,
  onSizeChange, onUnitChange,
  error, required = false, hint,
  availableUnits = AREA_UNITS,
}: AreaInputProps): React.ReactElement {
  const sqFt = sizeValue !== '' && sizeValue > 0
    ? convertToSqFt(sizeValue, unitValue) : 0;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="grid grid-cols-5 gap-3">
        {/* Size input — 3 cols */}
        <div className="col-span-3">
          <input
            id={id} type="number" step="0.01" min="0"
            placeholder="e.g. 5"
            value={sizeValue === '' ? '' : sizeValue}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') { onSizeChange(''); return; }
              const n = parseFloat(raw);
              if (!isNaN(n) && n >= 0) onSizeChange(n);
            }}
            className={`w-full border rounded-lg px-4 py-2.5
              focus:ring-2 focus:ring-[#029bba] focus:border-transparent
              ${error ? 'border-red-500' : 'border-gray-300'}`}
          />
        </div>
        {/* Unit selector — 2 cols */}
        <div className="col-span-2">
          <select
            value={unitValue}
            onChange={(e) => onUnitChange(e.target.value as AreaUnit)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5
              focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
          >
            {availableUnits.map((unit) => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Conversion helper */}
      {sqFt > 0 && unitValue !== 'Square Feet' && (
        <div className="mt-2 bg-[#eff6ff] border-l-4 border-[#029bba]
          px-3 py-2 rounded-r-lg flex items-center gap-2">
          <Maximize2 className="w-3.5 h-3.5 text-[#029bba] flex-shrink-0" />
          <span className="text-xs text-[#004063]">
            {sizeValue} {unitValue} ={' '}
            <strong>{sqFt.toLocaleString('en-PK')} sq ft</strong>
            {unitValue === 'Marla' && (
              <span className="text-gray-400 ml-2">
                ({((sqFt) / 5445).toFixed(3)} Kanal)
              </span>
            )}
            {unitValue === 'Kanal' && (
              <span className="text-gray-400 ml-2">
                ({(sizeValue as number * 20).toFixed(0)} Marla)
              </span>
            )}
          </span>
        </div>
      )}

      {hint && !error && (
        <p className="text-xs text-gray-400 mt-1">{hint}</p>
      )}
      {AREA_UNIT_DESCRIPTIONS[unitValue] && (
        <p className="text-xs text-gray-400 mt-1">
          ℹ️ {AREA_UNIT_DESCRIPTIONS[unitValue]}
        </p>
      )}
      <FieldError error={error} />
    </div>
  );
}

// ─── Quick Size Pills ─────────────────────────────────────────────────────────

interface QuickSizePillsProps {
  sizes:        { label: string; size: number; unit: AreaUnit }[];
  currentSize:  number | '';
  currentUnit:  AreaUnit;
  onSelect:     (size: number, unit: AreaUnit) => void;
  propertyType: PropertyType | '';
}

function QuickSizePills({
  sizes, currentSize, currentUnit, onSelect, propertyType,
}: QuickSizePillsProps): React.ReactElement | null {
  if (!sizes.length) return null;
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">
        Common Sizes
        {propertyType && (
          <span className="text-xs text-gray-400 font-normal ml-2">
            for {propertyType}
          </span>
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        {sizes.map((qs) => {
          const isActive = currentSize === qs.size && currentUnit === qs.unit;
          return (
            <button
              key={qs.label}
              type="button"
              onClick={() => onSelect(qs.size, qs.unit)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium
                transition-all duration-150
                ${isActive
                  ? 'bg-[#029bba] text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {qs.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Current Year ─────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();

// ─── Area unit sets per category ─────────────────────────────────────────────

const PLOT_AREA_UNITS: AreaUnit[]       = ['Marla','Kanal','Square Feet','Square Yards','Acres'];
const SQFT_AREA_UNITS: AreaUnit[]       = ['Square Feet','Square Yards','Square Meters','Marla'];
const LARGE_AREA_UNITS: AreaUnit[]      = ['Kanal','Acres','Marla','Square Feet'];
const ALL_AREA_UNITS: AreaUnit[]        = AREA_UNITS;

function getAreaUnits(pt: PropertyType | ''): AreaUnit[] {
  switch (pt) {
    case 'plot':                    return PLOT_AREA_UNITS;
    case 'house': case 'villa':     return PLOT_AREA_UNITS;
    case 'apartment': case 'room':
    case 'penthouse': case 'shop':
    case 'office': case 'commercial': return SQFT_AREA_UNITS;
    case 'warehouse': case 'building': return ALL_AREA_UNITS;
    case 'farmhouse': case 'other':  return LARGE_AREA_UNITS;
    default:                        return ALL_AREA_UNITS;
  }
}

// ═══════════════════════════════════════════════════════════════
// CONSTRUCTION JOURNEY COMPONENT
// ═══════════════════════════════════════════════════════════════

interface ConstructionJourneyProps {
  construction:                 ConstructionDetails;
  setConstructionField:         UsePropertyFormReturn['setConstructionField'];
  setField:                     UsePropertyFormReturn['setField'];
  currentTopLevelYearBuilt:     number | '';
  currentTopLevelRenovationYear:number | '';
}

const PROJECT_STATUS_OPTIONS: {
  value: ProjectStatus;
  label: string;
  icon: React.ReactElement;
  desc: string;
  color: string;
}[] = [
  {
    value: 'planned',
    label: 'Planned',
    icon: <Rocket className="w-5 h-5" />,
    desc: 'Pre-launch / not yet started',
    color: '#4f46e5',
  },
  {
    value: 'building',
    label: 'Building',
    icon: <HardHat className="w-5 h-5" />,
    desc: 'Active construction in progress',
    color: '#f59e0b',
  },
  {
    value: 'finishing',
    label: 'Finishing',
    icon: <Zap className="w-5 h-5" />,
    desc: 'Near completion — finishing work',
    color: '#7c3aed',
  },
  {
    value: 'ready',
    label: 'Ready',
    icon: <CheckCircle2 className="w-5 h-5" />,
    desc: 'Completed & ready for possession',
    color: '#10b981',
  },
];

const SCHEDULE_STATUS_OPTIONS: {
  value: ScheduleStatus;
  label: string;
  icon: string;
  color: string;
  bg: string;
}[] = [
  { value: 'on_time', label: 'On Schedule', icon: '✅', color: '#029bba', bg: '#eff6ff' },
  { value: 'delayed', label: 'Delayed',     icon: '⚠️', color: '#ef4444', bg: '#fef2f2' },
  { value: 'ahead',   label: 'Ahead of Schedule', icon: '⚡', color: '#10b981', bg: '#f0fdf4' },
];

const STAGE_ORDER: Exclude<ConstructionStage, ''>[] = [
  'foundation', 'structure', 'brickwork',
  'plastering', 'electrical', 'finishing', 'final_touches',
];

function ConstructionJourney({
  construction,
  setConstructionField,
  setField,
  currentTopLevelYearBuilt,
  currentTopLevelRenovationYear,
}: ConstructionJourneyProps): React.ReactElement {

  const isBuildingOrFinishing =
    construction.projectStatus === 'building' ||
    construction.projectStatus === 'finishing';

  // ─── Project Status Selection ───────────────────────────────
  const handleStatusChange = (status: ProjectStatus) => {
    setConstructionField('projectStatus', status);
    // Auto-clear irrelevant fields when switching status
    if (status === 'ready') {
      setConstructionField('currentStage', '');
      setConstructionField('progressPercent', '');
      setConstructionField('constructionStart', '');
      setConstructionField('expectedCompletion', '');
      setConstructionField('scheduleStatus', '');
      setConstructionField('originalCompletion', '');
      setConstructionField('delayReason', '');
    }
    if (status === 'planned') {
      setConstructionField('currentStage', '');
      setConstructionField('progressPercent', '');
      setConstructionField('scheduleStatus', '');
      setConstructionField('yearBuilt', '');
    }
  };

  // ─── Stage Selection (auto-fills progress %) ───────────────
  const handleStageSelect = (stage: ConstructionStage) => {
    setConstructionField('currentStage', stage);
    if (stage && STAGE_PROGRESS_MAP[stage as Exclude<ConstructionStage, ''>]) {
      setConstructionField(
        'progressPercent',
        STAGE_PROGRESS_MAP[stage as Exclude<ConstructionStage, ''>]
      );
    }
  };

  // ─── Auto-calc delay months when dates change ──────────────
  const calcDelayMonths = (original: string, revised: string): number => {
    if (!original || !revised) return 0;
    const o = new Date(original);
    const r = new Date(revised);
    if (isNaN(o.getTime()) || isNaN(r.getTime())) return 0;
    const months =
      (r.getFullYear() - o.getFullYear()) * 12 +
      (r.getMonth() - o.getMonth());
    return Math.max(0, months);
  };

  // Sync year built to top-level form field (backward compat)
  const handleYearBuiltChange = (val: number | '') => {
    setConstructionField('yearBuilt', val);
    setField('constructionYear', val);
  };

  const handleYearRenovatedChange = (val: number | '') => {
    setConstructionField('yearRenovated', val);
    setField('renovationYear', val);
  };

  return (
    <div className="space-y-6">

      {/* ─── STEP 1: Project Status ──────────────────────────── */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h4 className="text-sm font-bold text-[#004063]
            uppercase tracking-wider">
            Step 1: What&apos;s the project status?
          </h4>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PROJECT_STATUS_OPTIONS.map((opt) => {
            const isActive = construction.projectStatus === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleStatusChange(opt.value as ProjectStatus)}
                className={`text-left p-4 rounded-xl border-2
                  transition-all duration-150
                  ${isActive
                    ? 'shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                  }`}
                style={isActive ? {
                  borderColor: opt.color,
                  backgroundColor: `${opt.color}0d`,
                } : undefined}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span style={{ color: isActive ? opt.color : '#9ca3af' }}>
                    {opt.icon}
                  </span>
                  <p className={`font-semibold text-sm
                    ${isActive ? '' : 'text-gray-700'}`}
                    style={isActive ? { color: opt.color } : undefined}>
                    {opt.label}
                  </p>
                </div>
                <p className="text-xs text-gray-400">{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          BUILDING / FINISHING — Full Construction Tracking
         ═══════════════════════════════════════════════════════ */}
      {isBuildingOrFinishing && (
        <>
          {/* ─── STEP 2: Construction Stage ──────────────────── */}
          <div className="border-t border-gray-200 pt-5">
            <div className="flex items-baseline justify-between mb-3">
              <h4 className="text-sm font-bold text-[#004063]
                uppercase tracking-wider">
                Step 2: Current Construction Stage
              </h4>
              {construction.progressPercent !== '' && (
                <span className="text-xs font-semibold text-[#f59e0b]">
                  {construction.progressPercent}% Complete
                </span>
              )}
            </div>

            {/* Visual stage tracker */}
            <div className="space-y-2">
              {STAGE_ORDER.map((stage, idx) => {
                const details   = STAGE_DETAILS[stage];
                const isActive  = construction.currentStage === stage;
                const isPassed  = construction.currentStage &&
                  STAGE_ORDER.indexOf(construction.currentStage as Exclude<ConstructionStage, ''>) > idx;
                const isCurrent = isActive;

                return (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => handleStageSelect(stage)}
                    className={`w-full text-left p-3 rounded-xl border-2
                      transition-all duration-150 group
                      ${isCurrent
                        ? 'border-[#f59e0b] bg-[#fef3c7] shadow-md'
                      : isPassed
                        ? 'border-[#10b981] bg-[#f0fdf4]'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Stage number circle */}
                      <div className={`w-8 h-8 rounded-full flex items-center
                        justify-center text-sm font-bold flex-shrink-0
                        transition-all duration-150
                        ${isCurrent
                          ? 'bg-[#f59e0b] text-white'
                        : isPassed
                          ? 'bg-[#10b981] text-white'
                          : 'bg-gray-100 text-gray-400'
                        }`}>
                        {isPassed ? '✓' : idx + 1}
                      </div>

                      {/* Stage info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{details.icon}</span>
                          <span className={`text-sm font-semibold
                            ${isCurrent
                              ? 'text-[#92400e]'
                            : isPassed
                              ? 'text-[#065f46]'
                              : 'text-gray-700'
                            }`}>
                            {details.label}
                          </span>
                          {isCurrent && (
                            <span className="ml-auto text-xs px-2 py-0.5
                              rounded-full bg-[#f59e0b] text-white font-medium">
                              CURRENT
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {details.description} · {details.typicalDuration}
                        </p>
                      </div>

                      {/* Stage progress indicator */}
                      <div className="text-xs font-bold flex-shrink-0
                        text-gray-400">
                        {STAGE_PROGRESS_MAP[stage]}%
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Progress % override slider */}
            {construction.currentStage && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="progress-pct"
                    className="text-sm font-medium text-gray-700">
                    Override Progress %
                  </label>
                  <span className="text-sm font-bold text-[#f59e0b]">
                    {construction.progressPercent || 0}%
                  </span>
                </div>
                <input
                  id="progress-pct"
                  type="range" min="0" max="100" step="5"
                  value={construction.progressPercent || 0}
                  onChange={(e) =>
                    setConstructionField('progressPercent',
                      parseInt(e.target.value, 10))
                  }
                  className="w-full h-2 bg-gray-200 rounded-full appearance-none
                    cursor-pointer accent-[#f59e0b]"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  💡 Auto-filled from stage. Adjust if your project differs.
                </p>
              </div>
            )}
          </div>

          {/* ─── STEP 3: Timeline ────────────────────────────── */}
          <div className="border-t border-gray-200 pt-5">
            <h4 className="text-sm font-bold text-[#004063]
              uppercase tracking-wider mb-3">
              Step 3: Construction Timeline
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="con-start"
                  className="block text-sm font-medium text-gray-700 mb-1.5">
                  Construction Start
                </label>
                <input
                  id="con-start" type="date"
                  value={construction.constructionStart}
                  onChange={(e) =>
                    setConstructionField('constructionStart', e.target.value)
                  }
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                    focus:ring-2 focus:ring-[#f59e0b] focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="con-expected"
                  className="block text-sm font-medium text-gray-700 mb-1.5">
                  Expected Completion
                </label>
                <input
                  id="con-expected" type="date"
                  value={construction.expectedCompletion}
                  onChange={(e) =>
                    setConstructionField('expectedCompletion', e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                    focus:ring-2 focus:ring-[#f59e0b] focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="con-handover"
                  className="block text-sm font-medium text-gray-700 mb-1.5">
                  Handover Date
                </label>
                <input
                  id="con-handover" type="date"
                  value={construction.handoverDate}
                  onChange={(e) =>
                    setConstructionField('handoverDate', e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                    focus:ring-2 focus:ring-[#f59e0b] focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">
                  When keys delivered to buyer
                </p>
              </div>
              <div>
                <label htmlFor="con-movein"
                  className="block text-sm font-medium text-gray-700 mb-1.5">
                  Move-In Ready
                </label>
                <input
                  id="con-movein" type="date"
                  value={construction.moveInDate}
                  onChange={(e) =>
                    setConstructionField('moveInDate', e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                    focus:ring-2 focus:ring-[#f59e0b] focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">
                  When buyer can move in
                </p>
              </div>
            </div>

            {/* Duration calculator */}
            {construction.constructionStart && construction.expectedCompletion && (
              <div className="mt-3 bg-[#fef3c7] border-l-4 border-[#f59e0b]
                px-3 py-2 rounded-r-lg">
                <p className="text-xs text-amber-800">
                  <strong>Total Duration:</strong>{' '}
                  {(() => {
                    const s = new Date(construction.constructionStart);
                    const e = new Date(construction.expectedCompletion);
                    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 'invalid dates';
                    const months =
                      (e.getFullYear() - s.getFullYear()) * 12 +
                      (e.getMonth() - s.getMonth());
                    if (months < 0) return 'completion before start';
                    const years = Math.floor(months / 12);
                    const rem = months % 12;
                    return `${months} months${years > 0 ? ` (${years}y${rem > 0 ? ` ${rem}m` : ''})` : ''}`;
                  })()}
                </p>
              </div>
            )}
          </div>

          {/* ─── STEP 4: Schedule Status ─────────────────────── */}
          <div className="border-t border-gray-200 pt-5">
            <h4 className="text-sm font-bold text-[#004063]
              uppercase tracking-wider mb-3">
              Step 4: Schedule Status
            </h4>

            <div className="grid grid-cols-3 gap-3">
              {SCHEDULE_STATUS_OPTIONS.map((opt) => {
                const isActive = construction.scheduleStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setConstructionField('scheduleStatus', opt.value as ScheduleStatus)
                    }
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl
                      border-2 transition-all duration-150
                      ${isActive ? 'shadow-md' : 'border-gray-200 hover:border-gray-300'}`}
                    style={isActive ? {
                      borderColor: opt.color,
                      backgroundColor: opt.bg,
                    } : undefined}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <span className={`text-sm font-semibold
                      ${isActive ? '' : 'text-gray-600'}`}
                      style={isActive ? { color: opt.color } : undefined}>
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Delay details (if delayed) */}
            {construction.scheduleStatus === 'delayed' && (
              <div className="mt-4 bg-[#fef2f2] border-2 border-[#ef4444]
                rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-[#ef4444]
                    flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-[#ef4444]">
                      Delay Disclosure
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      Transparent disclosure earns the <strong>&quot;Honest Seller&quot;</strong>{' '}
                      trust badge — buyers value honesty over hidden delays.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="con-orig"
                      className="block text-xs font-medium text-gray-700 mb-1.5">
                      Original Completion Date
                    </label>
                    <input
                      id="con-orig" type="date"
                      value={construction.originalCompletion}
                      onChange={(e) => {
                        const val = e.target.value;
                        setConstructionField('originalCompletion', val);
                        if (val && construction.expectedCompletion) {
                          setConstructionField('delayMonths',
                            calcDelayMonths(val, construction.expectedCompletion));
                        }
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                        focus:ring-2 focus:ring-[#ef4444] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Delay Duration
                    </label>
                    <div className="w-full bg-white border border-[#ef4444]
                      rounded-lg px-3 py-2 text-sm font-bold text-[#ef4444]">
                      {construction.delayMonths || 0} months
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="con-delay-reason"
                    className="block text-xs font-medium text-gray-700 mb-1.5">
                    Reason for Delay
                  </label>
                  <textarea
                    id="con-delay-reason"
                    placeholder="e.g. Material price hike, worker shortage during economic situation, regulatory approvals..."
                    value={construction.delayReason}
                    onChange={(e) =>
                      setConstructionField('delayReason', e.target.value)
                    }
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                      resize-y focus:ring-2 focus:ring-[#ef4444] focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {/* On time / Ahead celebration banner */}
            {(construction.scheduleStatus === 'on_time' ||
              construction.scheduleStatus === 'ahead') && (
              <div className={`mt-4 px-4 py-3 rounded-xl border-l-4
                ${construction.scheduleStatus === 'ahead'
                  ? 'bg-[#f0fdf4] border-[#10b981]'
                  : 'bg-[#eff6ff] border-[#029bba]'
                }`}>
                <p className={`text-sm font-semibold
                  ${construction.scheduleStatus === 'ahead'
                    ? 'text-[#065f46]' : 'text-[#004063]'
                  }`}>
                  {construction.scheduleStatus === 'ahead'
                    ? '⚡ Excellent! Ahead-of-schedule projects earn premium trust badges.'
                    : '✅ Great! On-schedule projects build strong buyer confidence.'}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════
          READY — Year Built & Renovation
         ═══════════════════════════════════════════════════════ */}
      {construction.projectStatus === 'ready' && (
        <div className="border-t border-gray-200 pt-5">
          <h4 className="text-sm font-bold text-[#004063]
            uppercase tracking-wider mb-3">
            Step 2: Completion Details
          </h4>

          <div className="bg-[#f0fdf4] border-l-4 border-[#10b981]
            px-4 py-3 rounded-r-lg mb-4">
            <p className="text-sm text-[#065f46]">
              ✅ <strong>Ready property:</strong> Just tell buyers when it was built.
              Renovation year is optional but adds value.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="ready-year-built"
                className="block text-sm font-medium text-gray-700 mb-1.5">
                Year Built <span className="text-red-500">*</span>
              </label>
              <input
                id="ready-year-built" type="number"
                min="1900" max={CURRENT_YEAR}
                placeholder={`e.g. ${CURRENT_YEAR - 2}`}
                value={construction.yearBuilt === '' ?
                  (currentTopLevelYearBuilt === '' ? '' : currentTopLevelYearBuilt)
                  : construction.yearBuilt}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') { handleYearBuiltChange(''); return; }
                  const n = parseInt(raw, 10);
                  if (!isNaN(n) && n >= 1900 && n <= CURRENT_YEAR)
                    handleYearBuiltChange(n);
                }}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                  focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
              />
              {construction.yearBuilt !== '' && (
                <p className="text-xs text-gray-400 mt-1">
                  Property age:{' '}
                  <span className="font-medium text-[#004063]">
                    {CURRENT_YEAR - (construction.yearBuilt as number)} year
                    {CURRENT_YEAR - (construction.yearBuilt as number) !== 1 ? 's' : ''}
                  </span>
                </p>
              )}
            </div>

            <div>
              <label htmlFor="ready-year-renovated"
                className="block text-sm font-medium text-gray-700 mb-1.5">
                Last Renovated
              </label>
              <input
                id="ready-year-renovated" type="number"
                min="1900" max={CURRENT_YEAR}
                placeholder="Optional"
                value={construction.yearRenovated === '' ?
                  (currentTopLevelRenovationYear === '' ? '' : currentTopLevelRenovationYear)
                  : construction.yearRenovated}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') { handleYearRenovatedChange(''); return; }
                  const n = parseInt(raw, 10);
                  if (!isNaN(n) && n >= 1900 && n <= CURRENT_YEAR)
                    handleYearRenovatedChange(n);
                }}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                  focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
              />
              {construction.yearRenovated !== '' &&
               construction.yearBuilt !== '' &&
               (construction.yearRenovated as number) <
                 (construction.yearBuilt as number) && (
                <p className="text-xs text-[#ef4444] mt-1">
                  ⚠ Renovation cannot be before construction
                </p>
              )}
            </div>
          </div>

          {/* Quick year buttons */}
          <div className="mt-4">
            <p className="text-xs text-gray-400 mb-2">Quick select year built:</p>
            <div className="flex flex-wrap gap-2">
              {[
                CURRENT_YEAR,
                CURRENT_YEAR - 1,
                CURRENT_YEAR - 2,
                CURRENT_YEAR - 3,
                CURRENT_YEAR - 5,
                CURRENT_YEAR - 10,
                CURRENT_YEAR - 15,
                CURRENT_YEAR - 20,
              ].map((year) => {
                const isActive = construction.yearBuilt === year;
                return (
                  <button
                    key={year}
                    type="button"
                    onClick={() => handleYearBuiltChange(year)}
                    className={`px-3 py-1 rounded-full text-xs font-medium
                      transition-all duration-150
                      ${isActive
                        ? 'bg-[#10b981] text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                  >
                    {year}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          PLANNED — Pre-Launch Timeline
         ═══════════════════════════════════════════════════════ */}
      {construction.projectStatus === 'planned' && (
        <div className="border-t border-gray-200 pt-5">
          <h4 className="text-sm font-bold text-[#004063]
            uppercase tracking-wider mb-3">
            Step 2: Pre-Launch Timeline
          </h4>

          <div className="bg-[#eff6ff] border-l-4 border-[#4f46e5]
            px-4 py-3 rounded-r-lg mb-4">
            <p className="text-sm text-[#004063]">
              🚀 <strong>Pre-launch / Planning:</strong> Tell buyers when the
              project will launch and open for booking.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="plan-launch"
                className="block text-sm font-medium text-gray-700 mb-1.5">
                Expected Launch Date
              </label>
              <input
                id="plan-launch" type="date"
                value={construction.expectedLaunch}
                onChange={(e) =>
                  setConstructionField('expectedLaunch', e.target.value)
                }
                min={new Date().toISOString().split('T')[0]}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                  focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="plan-booking"
                className="block text-sm font-medium text-gray-700 mb-1.5">
                Booking Opens
              </label>
              <input
                id="plan-booking" type="date"
                value={construction.bookingOpens}
                onChange={(e) =>
                  setConstructionField('bookingOpens', e.target.value)
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                  focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
              />
            </div>
            <div className="col-span-2">
              <label htmlFor="plan-completion"
                className="block text-sm font-medium text-gray-700 mb-1.5">
                Expected Completion
              </label>
              <input
                id="plan-completion" type="date"
                value={construction.expectedCompletion}
                onChange={(e) =>
                  setConstructionField('expectedCompletion', e.target.value)
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                  focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
              />
            </div>
            <div className="col-span-2">
              <label htmlFor="plan-discount"
                className="block text-sm font-medium text-gray-700 mb-1.5">
                Pre-Launch Discount (%)
              </label>
              <div className="relative">
                <input
                  id="plan-discount" type="number" min="0" max="50" step="0.5"
                  placeholder="e.g. 15"
                  value={construction.preLaunchDiscount || ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setConstructionField('preLaunchDiscount', '');
                      return;
                    }
                    const n = parseFloat(raw);
                    if (!isNaN(n) && n >= 0 && n <= 50)
                      setConstructionField('preLaunchDiscount', n);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 pr-8
                    focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2
                  text-sm font-medium text-gray-400">%</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Discount % offered to early-bird buyers vs launch price
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          NO STATUS YET — Prompt
         ═══════════════════════════════════════════════════════ */}
      {!construction.projectStatus && (
        <div className="bg-[#eff6ff] border-l-4 border-[#029bba]
          px-4 py-3 rounded-r-lg">
          <p className="text-sm font-semibold text-[#004063]">
            👆 Select project status above to continue
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Fields will appear based on whether the project is planned,
            being built, finishing, or ready for possession
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TabSize({
  form,
  errors,
  setField,
  setResidentialField,
  setCommercialField,
  setConstructionField,
  fieldConfig: cfg,
}: TabSizeProps): React.ReactElement {
  const pt = form.propertyType as PropertyType | '';
  const con = form.construction;

  // Computed conversions
  const areaSqFt = form.areaSize !== '' && form.areaSize > 0
    ? convertToSqFt(form.areaSize, form.areaUnit) : 0;

  const coveredSqFt = form.coveredArea !== '' && form.coveredArea > 0
    ? convertToSqFt(form.coveredArea, form.coveredAreaUnit) : 0;

  const coveragePercent = areaSqFt > 0 && coveredSqFt > 0
    ? Math.round((coveredSqFt / areaSqFt) * 100) : 0;

  const areaUnits = getAreaUnits(pt);

  // ── Smart area label based on type
  const areaLabel = cfg.plotAreaLabel || 'Total Area';

  return (
    <div className="space-y-5">

      {/* ══════════════════════════════════════════════════════
          SECTION 1 — Primary Area (type-aware label)
         ══════════════════════════════════════════════════════ */}
      <FormSection
        id="size-area"
        title={areaLabel}
        icon={<Ruler className="w-5 h-5" />}
        defaultOpen={true}
        required
        description={
          pt === 'apartment' || pt === 'penthouse' || pt === 'room'
            ? 'Your unit\'s total covered/built-up area'
          : pt === 'shop' || pt === 'office' || pt === 'commercial'
            ? 'Total covered floor area'
          : pt === 'plot'
            ? 'Plot area as per society records'
          : pt === 'house' || pt === 'villa' || pt === 'farmhouse'
            ? 'Total land area (plot size)'
          : pt === 'warehouse' || pt === 'building'
            ? 'Total land area'
          : pt === 'other'
            ? 'Agricultural land area'
          : undefined
        }
        completionStatus={
          form.areaSize !== '' && (form.areaSize as number) > 0
            ? 'complete' : 'incomplete'
        }
      >
        <div className="space-y-4">
          {/* Quick size pills */}
          <QuickSizePills
            sizes={cfg.quickSizes}
            currentSize={form.areaSize}
            currentUnit={form.areaUnit}
            onSelect={(size, unit) => {
              setField('areaSize', size);
              setField('areaUnit', unit);
            }}
            propertyType={pt}
          />

          {/* Area input */}
          <AreaInput
            id="prop-area-size"
            label={areaLabel}
            sizeValue={form.areaSize}
            unitValue={form.areaUnit}
            onSizeChange={(val) => setField('areaSize', val)}
            onUnitChange={(val) => setField('areaUnit', val)}
            error={errors.areaSize}
            required
            availableUnits={areaUnits}
            hint={
              pt === 'apartment'
                ? '✓ This is your apartment\'s TOTAL covered area (walls + rooms + balcony). No separate plot area needed for apartments.'
              : pt === 'penthouse'
                ? '✓ Total covered area of your penthouse. Terrace area can be added separately below.'
              : pt === 'room'
                ? '✓ Total room area in square feet'
              : pt === 'shop'
                ? '✓ Total shop floor area. Mezzanine (if any) can be added separately below.'
              : pt === 'office'
                ? '✓ Total office covered area. Add carpet area below for transparency.'
              : pt === 'plot'
                ? '✓ Plot area as per allotment letter (1 Marla = 272.25 sq ft | 1 Kanal = 20 Marla)'
              : pt === 'house' || pt === 'villa'
                ? '✓ Land/plot area in Marla or Kanal. Covered area (sum of all floors) goes in the next section.'
              : pt === 'farmhouse'
                ? '✓ Total land area in Kanal or Acres. Covered area (constructed portion) goes below.'
              : pt === 'warehouse'
                ? '✓ Total land area including open yard. Covered shed area goes in next section.'
              : pt === 'building'
                ? '✓ Total plot area of the building. Floor plate area goes in next section.'
              : pt === 'other'
                ? '✓ Total agricultural land area in Acres or Kanal'
              : undefined
            }
          />

          {/* Type-specific area info banners */}
          {pt === 'apartment' && (
            <div className="bg-[#eff6ff] border-l-4 border-[#029bba]
              px-4 py-3 rounded-r-lg">
              <p className="text-xs text-[#004063]">
                <strong>Tip:</strong> For apartments, enter the total covered area
                (sq ft). Also fill in Carpet Area below for accurate
                comparison — carpet area is typically 70–80% of total area.
              </p>
            </div>
          )}

          {pt === 'plot' && (
            <div className="bg-[#f0fdf4] border-l-4 border-[#10b981]
              px-4 py-3 rounded-r-lg">
              <p className="text-xs text-[#065f46]">
                <strong>Pakistani standard:</strong> 1 Marla = 272.25 sq ft |
                1 Kanal = 20 Marla | 1 Acre = 8 Kanal.
                Enter the size as shown on your allotment letter or NOC.
              </p>
            </div>
          )}

          {pt === 'warehouse' && (
            <div className="bg-[#fef3c7] border-l-4 border-[#f59e0b]
              px-4 py-3 rounded-r-lg">
              <p className="text-xs text-amber-800">
                <strong>Note:</strong> Enter total land area here.
                Add covered built-up area and open yard area in the
                sections below.
              </p>
            </div>
          )}
        </div>
      </FormSection>

      {/* ══════════════════════════════════════════════════════
          SECTION 2 — Covered / Built-up Area
          (Only shown for types where Plot Area ≠ Covered Area:
           house, villa, farmhouse, warehouse, building)
         ══════════════════════════════════════════════════════ */}
      {cfg.showCoveredArea && (
        <FormSection
          id="size-covered"
          title="Covered / Built-up Area"
          icon={<span className="text-lg">🏗️</span>}
          defaultOpen={true}
          description={
            pt === 'house' || pt === 'villa'
              ? 'Sum of all floors (Ground + 1st + 2nd, etc.)'
            : pt === 'warehouse'
              ? 'Covered shed / factory floor area only'
            : pt === 'building'
              ? 'Total built-up area across all floors'
            : pt === 'farmhouse'
              ? 'Constructed portion of farmhouse'
            : 'Total constructed area'
          }
          completionStatus={
            form.coveredArea !== '' && (form.coveredArea as number) > 0
              ? 'complete' : 'optional'
          }
        >
          <div className="space-y-4">
            {/* Info banner explaining what to enter */}
            <div className="bg-[#eff6ff] border-l-4 border-[#029bba]
              px-4 py-3 rounded-r-lg">
              <p className="text-xs text-[#004063]">
                <strong>How to calculate:</strong>{' '}
                {pt === 'house' || pt === 'villa' ? (
                  <>Add up the covered area of EACH floor.
                  Example: 5 Marla house with Ground (1,000 sqft) + 1st Floor (900 sqft)
                  = <strong>1,900 sqft covered area</strong>.</>
                ) : pt === 'warehouse' ? (
                  <>Enter ONLY the covered/shed area (not the open yard).
                  Open yard area goes in a separate section below.</>
                ) : pt === 'building' ? (
                  <>Total constructed area across all floors including basements.</>
                ) : pt === 'farmhouse' ? (
                  <>Just the constructed living area (not the open farmland).</>
                ) : (
                  <>Total built-up / constructed area in square feet.</>
                )}
              </p>
            </div>

            <AreaInput
              id="prop-covered-area"
              label="Covered Area"
              sizeValue={form.coveredArea}
              unitValue={form.coveredAreaUnit}
              onSizeChange={(val) => setField('coveredArea', val)}
              onUnitChange={(val) => setField('coveredAreaUnit', val)}
              availableUnits={SQFT_AREA_UNITS}
              hint={
                pt === 'house' || pt === 'villa'
                  ? 'Sum of all floors\' covered area'
                : pt === 'warehouse'
                  ? 'Covered shed / factory floor area only'
                : 'Net usable built-up area'
              }
            />

            {/* Coverage ratio */}
            {coveragePercent > 0 && cfg.showPlotArea && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Coverage Ratio (built-up vs total area)</span>
                  <span className={`font-semibold ${
                    coveragePercent > 80 ? 'text-[#f59e0b]'
                    : coveragePercent > 60 ? 'text-[#10b981]'
                    : 'text-[#029bba]'
                  }`}>
                    {coveragePercent}%
                  </span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      coveragePercent > 80 ? 'bg-[#f59e0b]'
                      : coveragePercent > 60 ? 'bg-[#10b981]'
                      : 'bg-[#029bba]'
                    }`}
                    style={{ width: `${Math.min(coveragePercent, 100)}%` }}
                    role="progressbar"
                    aria-valuenow={coveragePercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
                <p className="text-xs text-gray-400">
                  Covered area is {coveragePercent}% of total area
                  {coveragePercent > 80 && (
                    <span className="text-[#f59e0b] ml-1">
                      — high coverage ratio
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </FormSection>
      )}

      {/* ══════════════════════════════════════════════════════
          SECTION 3 — Carpet Area (Apartment / Office / Penthouse)
         ══════════════════════════════════════════════════════ */}
      {cfg.showCarpetArea && (
        <FormSection
          id="size-carpet"
          title="Carpet Area (Net Usable)"
          icon={<span className="text-lg">📏</span>}
          defaultOpen={pt === 'apartment' || pt === 'office' || pt === 'penthouse'}
          description="Actual walkable floor space (optional but builds trust)"
          completionStatus={
            form.residential.carpetArea !== '' &&
            (form.residential.carpetArea as number) > 0
              ? 'complete' : 'optional'
          }
        >
          <div className="space-y-3">
            <div className="bg-[#f0fdf4] border-l-4 border-[#10b981]
              px-4 py-3 rounded-r-lg mb-3">
              <p className="text-xs text-[#065f46]">
                <strong>What is Carpet Area?</strong>{' '}
                The actual floor space you can walk on — excludes walls, balcony,
                lobby, and shared common areas. Typically{' '}
                <strong>70-80% of covered area</strong>.
                <br /><br />
                <strong>Example:</strong> If your apartment is{' '}
                {pt === 'apartment' ? '1,200 sq ft covered' : '1,500 sq ft covered'},
                carpet area is usually around{' '}
                {pt === 'apartment' ? '950 sq ft' : '1,200 sq ft'}.
                <br /><br />
                <strong>Why fill this?</strong> Listings with carpet area get
                a &quot;Transparent Seller&quot; trust badge — 2× more inquiries!
              </p>
            </div>

            <div className="grid grid-cols-5 gap-3">
              <div className="col-span-3">
                <label htmlFor="carpet-area"
                  className="block text-sm font-medium text-gray-700 mb-1.5">
                  Carpet Area
                </label>
                <input
                  id="carpet-area"
                  type="number" step="0.01" min="0"
                  placeholder="e.g. 900"
                  value={form.residential.carpetArea === ''
                    ? '' : form.residential.carpetArea}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setResidentialField('carpetArea', '');
                      return;
                    }
                    const n = parseFloat(raw);
                    if (!isNaN(n) && n >= 0)
                      setResidentialField('carpetArea', n);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                    focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                />
              </div>
              <div className="col-span-2 flex items-end">
                <div className="w-full bg-gray-50 rounded-lg px-3 py-2.5
                  border border-gray-200 text-sm text-gray-500">
                  sq ft
                </div>
              </div>
            </div>

            {/* Auto ratio */}
            {form.residential.carpetArea !== '' &&
             form.coveredArea !== '' &&
             (form.residential.carpetArea as number) > 0 &&
             (form.coveredArea as number) > 0 && (
              <p className="text-xs text-[#029bba] font-medium">
                Carpet ratio:{' '}
                {Math.round(
                  ((form.residential.carpetArea as number) /
                    convertToSqFt(form.coveredArea as number, form.coveredAreaUnit)
                  ) * 100
                )}% of covered area
              </p>
            )}
          </div>
        </FormSection>
      )}

      {/* ══════════════════════════════════════════════════════
          SECTION 4 — Terrace / Rooftop Area (Penthouse)
         ══════════════════════════════════════════════════════ */}
      {cfg.showTerraceArea && (
        <FormSection
          id="size-terrace"
          title="Private Terrace / Rooftop Area"
          icon={<span className="text-lg">🌆</span>}
          defaultOpen={true}
          description="Exclusive outdoor space for penthouse"
          completionStatus={
            form.residential.terraceArea !== '' &&
            (form.residential.terraceArea as number) > 0
              ? 'complete' : 'optional'
          }
        >
          <div className="space-y-3">
            <div className="grid grid-cols-5 gap-3">
              <div className="col-span-3">
                <label htmlFor="terrace-area"
                  className="block text-sm font-medium text-gray-700 mb-1.5">
                  Terrace / Rooftop Area (sq ft)
                </label>
                <input
                  id="terrace-area"
                  type="number" step="0.01" min="0"
                  placeholder="e.g. 500"
                  value={form.residential.terraceArea === ''
                    ? '' : form.residential.terraceArea}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setResidentialField('terraceArea', '');
                      return;
                    }
                    const n = parseFloat(raw);
                    if (!isNaN(n) && n >= 0)
                      setResidentialField('terraceArea', n);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                    focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                />
              </div>
              <div className="col-span-2 flex items-end">
                <div className="w-full bg-gray-50 rounded-lg px-3 py-2.5
                  border border-gray-200 text-sm text-gray-500">
                  sq ft
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              Private rooftop / terrace exclusive to this penthouse
            </p>
          </div>
        </FormSection>
      )}

      {/* ══════════════════════════════════════════════════════
          SECTION 5 — Mezzanine Area (Shop / Commercial)
         ══════════════════════════════════════════════════════ */}
      {cfg.showMezzanineArea && form.commercial.hasMezzanine && (
        <FormSection
          id="size-mezzanine"
          title="Mezzanine Floor Area"
          icon={<span className="text-lg">↕️</span>}
          defaultOpen={true}
          description="Upper half-floor inside the shop"
          completionStatus={
            form.commercial.mezzanineArea !== '' &&
            (form.commercial.mezzanineArea as number) > 0
              ? 'complete' : 'optional'
          }
        >
          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-3">
              <label htmlFor="mezzanine-area"
                className="block text-sm font-medium text-gray-700 mb-1.5">
                Mezzanine Area (sq ft)
              </label>
              <input
                id="mezzanine-area"
                type="number" step="0.01" min="0"
                placeholder="e.g. 150"
                value={form.commercial.mezzanineArea === ''
                  ? '' : form.commercial.mezzanineArea}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') {
                    setCommercialField('mezzanineArea', '');
                    return;
                  }
                  const n = parseFloat(raw);
                  if (!isNaN(n) && n >= 0)
                    setCommercialField('mezzanineArea', n);
                }}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                  focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
              />
            </div>
            <div className="col-span-2 flex items-end">
              <div className="w-full bg-gray-50 rounded-lg px-3 py-2.5
                border border-gray-200 text-sm text-gray-500">
                sq ft
              </div>
            </div>
          </div>
        </FormSection>
      )}

      {/* ══════════════════════════════════════════════════════
          SECTION 6 — Open Yard Area (Warehouse)
         ══════════════════════════════════════════════════════ */}
      {cfg.showOpenYardArea && (
        <FormSection
          id="size-yard"
          title="Open Yard / Parking Area"
          icon={<span className="text-lg">🏭</span>}
          defaultOpen={false}
          description="Uncovered outdoor area within compound"
          completionStatus={
            form.commercial.openYardArea !== '' &&
            (form.commercial.openYardArea as number) > 0
              ? 'complete' : 'optional'
          }
        >
          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-3">
              <label htmlFor="yard-area"
                className="block text-sm font-medium text-gray-700 mb-1.5">
                Open Yard Area (sq ft)
              </label>
              <input
                id="yard-area"
                type="number" step="0.01" min="0"
                placeholder="e.g. 2000"
                value={form.commercial.openYardArea === ''
                  ? '' : form.commercial.openYardArea}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') {
                    setCommercialField('openYardArea', '');
                    return;
                  }
                  const n = parseFloat(raw);
                  if (!isNaN(n) && n >= 0)
                    setCommercialField('openYardArea', n);
                }}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                  focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
              />
            </div>
            <div className="col-span-2 flex items-end">
              <div className="w-full bg-gray-50 rounded-lg px-3 py-2.5
                border border-gray-200 text-sm text-gray-500">
                sq ft
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Useful for truck parking, loading/unloading space
          </p>
        </FormSection>
      )}

      {/* ══════════════════════════════════════════════════════
          SECTION 7 — Floor Plate Area (Building)
         ══════════════════════════════════════════════════════ */}
      {cfg.showFloorPlateArea && (
        <FormSection
          id="size-floor-plate"
          title="Floor Plate Area"
          icon={<span className="text-lg">🏢</span>}
          defaultOpen={false}
          description="Area per single floor"
          completionStatus={
            form.commercial.floorPlateArea !== '' &&
            (form.commercial.floorPlateArea as number) > 0
              ? 'complete' : 'optional'
          }
        >
          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-3">
              <label htmlFor="floor-plate"
                className="block text-sm font-medium text-gray-700 mb-1.5">
                Area per Floor (sq ft)
              </label>
              <input
                id="floor-plate"
                type="number" step="0.01" min="0"
                placeholder="e.g. 3000"
                value={form.commercial.floorPlateArea === ''
                  ? '' : form.commercial.floorPlateArea}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') {
                    setCommercialField('floorPlateArea', '');
                    return;
                  }
                  const n = parseFloat(raw);
                  if (!isNaN(n) && n >= 0)
                    setCommercialField('floorPlateArea', n);
                }}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                  focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
              />
            </div>
            <div className="col-span-2 flex items-end">
              <div className="w-full bg-gray-50 rounded-lg px-3 py-2.5
                border border-gray-200 text-sm text-gray-500">
                sq ft
              </div>
            </div>
          </div>
          {/* Total building area estimate */}
          {form.commercial.floorPlateArea !== '' &&
           form.totalFloors !== '' &&
           (form.commercial.floorPlateArea as number) > 0 &&
           (form.totalFloors as number) > 0 && (
            <div className="mt-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  Estimated Total Building Area
                </span>
                <span className="font-semibold text-[#004063]">
                  {(
                    (form.commercial.floorPlateArea as number) *
                    (form.totalFloors as number)
                  ).toLocaleString('en-PK')}{' '}
                  sq ft
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {form.commercial.floorPlateArea} sq ft ×{' '}
                {form.totalFloors} floors
              </p>
            </div>
          )}
        </FormSection>
      )}

      {/* ══════════════════════════════════════════════════════
          SECTION 8 — Plot Dimensions (W × L)
         ══════════════════════════════════════════════════════ */}
      {cfg.showPlotDimensions && (
        <FormSection
          id="size-dimensions"
          title="Plot / Unit Dimensions"
          icon={<PenTool className="w-5 h-5" />}
          defaultOpen={pt === 'plot'}
          description="Width × Length in feet"
          completionStatus={
            form.plotWidth !== '' && form.plotLength !== ''
              ? 'complete' : 'optional'
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <NumberInput
                id="prop-width"
                label="Width (ft)"
                value={form.plotWidth}
                onChange={(val) => setField('plotWidth', val)}
                placeholder="e.g. 25"
                step={0.5}
                suffix="ft"
              />
              <NumberInput
                id="prop-length"
                label="Length / Depth (ft)"
                value={form.plotLength}
                onChange={(val) => setField('plotLength', val)}
                placeholder="e.g. 50"
                step={0.5}
                suffix="ft"
              />
            </div>

            {/* Computed area */}
            {form.plotWidth !== '' && form.plotLength !== '' &&
             (form.plotWidth as number) > 0 && (form.plotLength as number) > 0 && (
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Computed Area:
                  </span>
                  <span className="text-sm font-semibold text-[#004063]">
                    {form.plotWidth} × {form.plotLength} ={' '}
                    {(
                      (form.plotWidth as number) *
                      (form.plotLength as number)
                    ).toLocaleString('en-PK')}{' '}
                    sq ft
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-400">
                    In Marla:
                  </span>
                  <span className="text-xs font-medium text-[#029bba]">
                    {(
                      ((form.plotWidth as number) *
                        (form.plotLength as number)) / 272.25
                    ).toFixed(2)}{' '}
                    Marla
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs text-gray-400">In Kanal:</span>
                  <span className="text-xs font-medium text-[#004063]">
                    {(
                      ((form.plotWidth as number) *
                        (form.plotLength as number)) / 5445
                    ).toFixed(3)}{' '}
                    Kanal
                  </span>
                </div>
              </div>
            )}

            {/* Common plot dimension presets */}
            {pt === 'plot' && (
              <div>
                <p className="text-xs text-gray-400 mb-2">
                  Common plot dimensions:
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '25×45 (3M)', w: 25,  l: 45  },
                    { label: '25×50 (3M)', w: 25,  l: 50  },
                    { label: '30×60 (5M)', w: 30,  l: 60  },
                    { label: '35×70 (7M)', w: 35,  l: 70  },
                    { label: '40×80 (10M)',w: 40,  l: 80  },
                    { label: '50×90 (1K)', w: 50,  l: 90  },
                  ].map((preset) => {
                    const isActive =
                      form.plotWidth === preset.w &&
                      form.plotLength === preset.l;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setField('plotWidth', preset.w);
                          setField('plotLength', preset.l);
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium
                          transition-all duration-150
                          ${isActive
                            ? 'bg-[#029bba] text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                      >
                        {preset.label}
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
          SECTION 9 — Balconies (Apartment / Penthouse)
         ══════════════════════════════════════════════════════ */}
      {(pt === 'apartment' || pt === 'penthouse') && (
        <FormSection
          id="size-balcony"
          title="Balconies & View"
          icon={<span className="text-lg">🌅</span>}
          defaultOpen={false}
          completionStatus="optional"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Number of balconies */}
              <NumberInput
                id="prop-balconies"
                label="Number of Balconies"
                value={form.residential.balconies}
                onChange={(val) =>
                  setResidentialField('balconies', val)
                }
                placeholder="e.g. 2"
                min={0} max={10} step={1}
              />

              {/* View type */}
              <div>
                <label htmlFor="prop-view"
                  className="block text-sm font-medium text-gray-700 mb-1.5">
                  View Type
                </label>
                <select
                  id="prop-view"
                  value={form.residential.view}
                  onChange={(e) =>
                    setResidentialField('view', e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                    focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                >
                  <option value="">Select view...</option>
                  <option value="sea_view">Sea / Lake View</option>
                  <option value="garden_view">Garden / Park View</option>
                  <option value="city_view">City / Skyline View</option>
                  <option value="mountain_view">Mountain View</option>
                  <option value="golf_view">Golf Course View</option>
                  <option value="pool_view">Pool View</option>
                  <option value="street_view">Street View</option>
                  <option value="no_view">No Specific View</option>
                </select>
              </div>
            </div>
          </div>
        </FormSection>
      )}

      {/* ══════════════════════════════════════════════════════
          SECTION 10 — Construction Journey (Enterprise)
          Unified lifecycle tracking — replaces simple year input
         ══════════════════════════════════════════════════════ */}
      {cfg.showConstructionYear && (
        <FormSection
          id="size-construction-journey"
          title="Construction Journey"
          icon={<HardHat className="w-5 h-5" />}
          defaultOpen={true}
          description={
            con.projectStatus === 'ready'
              ? `Completed in ${con.yearBuilt || 'N/A'}`
            : con.projectStatus === 'building'
              ? `${con.progressPercent || '?'}% complete — ${
                  con.currentStage
                    ? STAGE_DETAILS[con.currentStage]?.label
                    : 'stage not set'
                }`
            : con.projectStatus === 'finishing'
              ? 'Near completion — finishing stage'
            : con.projectStatus === 'planned'
              ? 'Pre-launch / planning phase'
            : 'Tell buyers what stage your property is at'
          }
          completionStatus={con.projectStatus ? 'complete' : 'optional'}
          badge={
            con.scheduleStatus === 'delayed' ? 'Delayed' :
            con.scheduleStatus === 'ahead'   ? 'Ahead of Schedule' :
            con.scheduleStatus === 'on_time' ? 'On Schedule' :
            undefined
          }
          badgeColor={
            con.scheduleStatus === 'delayed' ? 'red' :
            con.scheduleStatus === 'ahead'   ? 'green' :
            con.scheduleStatus === 'on_time' ? 'blue' :
            undefined
          }
        >
          <ConstructionJourney
            construction={con}
            setConstructionField={setConstructionField}
            setField={setField}
            currentTopLevelYearBuilt={form.constructionYear}
            currentTopLevelRenovationYear={form.renovationYear}
          />
        </FormSection>
      )}

      {/* ══════════════════════════════════════════════════════
          SIZE SUMMARY CARD
         ══════════════════════════════════════════════════════ */}
      {form.areaSize !== '' && (form.areaSize as number) > 0 && (
        <div className="bg-gradient-to-r from-[#029bba] to-[#004063]
          rounded-xl p-4 text-white">
          <h4 className="font-semibold text-sm mb-3 opacity-90">
            📐 Size Summary
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

            {/* Primary Area */}
            <div className="bg-white bg-opacity-10 rounded-lg p-3">
              <p className="text-xs opacity-70">{areaLabel}</p>
              <p className="font-bold text-lg">
                {form.areaSize} {form.areaUnit}
              </p>
              {areaSqFt > 0 && form.areaUnit !== 'Square Feet' && (
                <p className="text-xs opacity-60">
                  {areaSqFt.toLocaleString('en-PK')} sq ft
                </p>
              )}
            </div>

            {/* Covered Area */}
            {cfg.showCoveredArea &&
             form.coveredArea !== '' &&
             (form.coveredArea as number) > 0 && (
              <div className="bg-white bg-opacity-10 rounded-lg p-3">
                <p className="text-xs opacity-70">Covered Area</p>
                <p className="font-bold text-lg">
                  {form.coveredArea} {form.coveredAreaUnit}
                </p>
                {coveragePercent > 0 && (
                  <p className="text-xs opacity-60">
                    {coveragePercent}% coverage
                  </p>
                )}
              </div>
            )}

            {/* Carpet Area */}
            {cfg.showCarpetArea &&
             form.residential.carpetArea !== '' &&
             (form.residential.carpetArea as number) > 0 && (
              <div className="bg-white bg-opacity-10 rounded-lg p-3">
                <p className="text-xs opacity-70">Carpet Area</p>
                <p className="font-bold text-lg">
                  {form.residential.carpetArea} sq ft
                </p>
              </div>
            )}

            {/* Terrace Area */}
            {cfg.showTerraceArea &&
             form.residential.terraceArea !== '' &&
             (form.residential.terraceArea as number) > 0 && (
              <div className="bg-white bg-opacity-10 rounded-lg p-3">
                <p className="text-xs opacity-70">Terrace Area</p>
                <p className="font-bold text-lg">
                  {form.residential.terraceArea} sq ft
                </p>
              </div>
            )}

            {/* Plot Dimensions */}
            {cfg.showPlotDimensions &&
             form.plotWidth !== '' && form.plotLength !== '' &&
             (form.plotWidth as number) > 0 &&
             (form.plotLength as number) > 0 && (
              <div className="bg-white bg-opacity-10 rounded-lg p-3">
                <p className="text-xs opacity-70">Dimensions</p>
                <p className="font-bold text-lg">
                  {form.plotWidth} × {form.plotLength}
                </p>
                <p className="text-xs opacity-60">feet (W × L)</p>
              </div>
            )}

            {/* Construction Year */}
            {cfg.showConstructionYear &&
             form.constructionYear !== '' && (
              <div className="bg-white bg-opacity-10 rounded-lg p-3">
                <p className="text-xs opacity-70">Year Built</p>
                <p className="font-bold text-lg">{form.constructionYear}</p>
                <p className="text-xs opacity-60">
                  {CURRENT_YEAR - (form.constructionYear as number)} yrs old
                </p>
              </div>
            )}

            {/* Open Yard */}
            {cfg.showOpenYardArea &&
             form.commercial.openYardArea !== '' &&
             (form.commercial.openYardArea as number) > 0 && (
              <div className="bg-white bg-opacity-10 rounded-lg p-3">
                <p className="text-xs opacity-70">Open Yard</p>
                <p className="font-bold text-lg">
                  {form.commercial.openYardArea} sq ft
                </p>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}