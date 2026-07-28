// components/property/forms/tabs/TabCharges.tsx

import { useState } from 'react';
import { Receipt, Building2, Banknote, Shield, Wrench, AlertTriangle, X, Plus } from 'lucide-react';
import FormSection from '../shared/FormSection';
import {
  PropertyFormState,
  TabErrors,
  UsePropertyFormReturn,
  formatPKR,
  formatPKRNumeric,
} from '../shared/usePropertyForm';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TabChargesProps {
  form: PropertyFormState;
  errors: TabErrors;
  setField: UsePropertyFormReturn['setField'];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeNum(val: number | '' | undefined): number {
  if (val === '' || val === undefined || val === null) return 0;
  const n = typeof val === 'string' ? parseFloat(val) : val;
  return isNaN(n) ? 0 : n;
}

// ─── Error Label Component ────────────────────────────────────────────────────

function FieldError({ error }: { error?: string }): React.ReactElement | null {
  if (!error) return null;
  return (
    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
      <span>⚠</span>
      <span>{error}</span>
    </p>
  );
}

// ─── Charge Input Component ──────────────────────────────────────────────────

interface ChargeInputProps {
  id: string;
  label: string;
  value: number | '';
  onChange: (val: number | '') => void;
  error?: string;
  hint?: string;
  placeholder?: string;
}

function ChargeInput({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  placeholder = '0',
}: ChargeInputProps): React.ReactElement {
  const numVal = safeNum(value);

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-medium text-gray-600 mb-1"
      >
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
          Rs.
        </span>
        <input
          id={id}
          type="number"
          min="0"
          step="1"
          placeholder={placeholder}
          value={value === '' ? '' : value}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') {
              onChange('');
              return;
            }
            const n = parseFloat(raw);
            if (!isNaN(n) && n >= 0) onChange(n);
          }}
          className={`
            w-full border rounded-lg pl-9 pr-3 py-2 text-sm
            focus:ring-2 focus:ring-[#029bba] focus:border-transparent
            ${error ? 'border-red-500' : 'border-gray-300'}
          `}
        />
      </div>
      {numVal > 0 && (
        <p className="text-xs text-[#029bba] mt-0.5">
          {formatPKR(numVal)}
        </p>
      )}
      <FieldError error={error} />
      {hint && !error && (
        <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
      )}
    </div>
  );
}

// ─── Nested Field Setter Helpers ──────────────────────────────────────────────

type GovTaxKey = keyof PropertyFormState['governmentTaxes'];
type TransferKey = keyof PropertyFormState['transferCharges'];
type ExtraKey = keyof PropertyFormState['extraCharges'];
type PossessionKey = keyof PropertyFormState['possessionCharges'];
type MaintenanceKey = keyof PropertyFormState['maintenance'];

function useNestedSetters(
  form: PropertyFormState,
  setField: UsePropertyFormReturn['setField']
) {
  const setGovTax = (key: GovTaxKey, value: number | '') => {
    setField('governmentTaxes', {
      ...form.governmentTaxes,
      [key]: value,
    });
  };

  const setTransfer = (key: TransferKey, value: number | '') => {
    setField('transferCharges', {
      ...form.transferCharges,
      [key]: value,
    });
  };

  const setExtra = (key: ExtraKey, value: number | '' | string) => {
    setField('extraCharges', {
      ...form.extraCharges,
      [key]: value,
    });
  };

  const setPossession = (key: PossessionKey, value: number | '' | string) => {
    setField('possessionCharges', {
      ...form.possessionCharges,
      [key]: value,
    });
  };

  const setMaintenance = (key: MaintenanceKey, value: number | '' | string[]) => {
    setField('maintenance', {
      ...form.maintenance,
      [key]: value,
    });
  };

  return { setGovTax, setTransfer, setExtra, setPossession, setMaintenance };
}

// ─── Maintenance Includes Options ─────────────────────────────────────────────

const MAINTENANCE_INCLUDES_OPTIONS = [
  'Security',
  'Cleaning',
  'Lift/Elevator',
  'Water Supply',
  'Sewerage',
  'Garbage Collection',
  'Common Area Electricity',
  'Generator Backup',
  'Pest Control',
  'Landscaping',
  'Fire Safety',
  'CCTV Monitoring',
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TabCharges({
  form,
  errors,
  setField,
}: TabChargesProps): React.ReactElement {
  const { setGovTax, setTransfer, setExtra, setPossession, setMaintenance } =
    useNestedSetters(form, setField);

  const [maintenanceInput, setMaintenanceInput] = useState('');

  // ── Compute totals ──
  const govTotal =
    safeNum(form.governmentTaxes.stampDuty) +
    safeNum(form.governmentTaxes.registrationFee) +
    safeNum(form.governmentTaxes.cgt) +
    safeNum(form.governmentTaxes.withHoldingTax) +
    safeNum(form.governmentTaxes.cvt) +
    safeNum(form.governmentTaxes.advanceTax);

  const transferTotal =
    safeNum(form.transferCharges.noc) +
    safeNum(form.transferCharges.transfer) +
    safeNum(form.transferCharges.agent) +
    safeNum(form.transferCharges.legal);

  const extraTotal =
    safeNum(form.extraCharges.cornerCharges) +
    safeNum(form.extraCharges.developmentCharges) +
    safeNum(form.extraCharges.electricityConnectionCharges) +
    safeNum(form.extraCharges.gasConnectionCharges) +
    safeNum(form.extraCharges.waterConnectionCharges) +
    safeNum(form.extraCharges.parkingCharges) +
    safeNum(form.extraCharges.floorPremium) +
    safeNum(form.extraCharges.viewPremium) +
    safeNum(form.extraCharges.otherCharges);

  const possessionTotal = safeNum(form.possessionCharges.total);

  const grandTotal = govTotal + transferTotal + extraTotal + possessionTotal;

  const hasAnyCharges = grandTotal > 0;

  // ── Add maintenance include
  const addMaintenanceItem = (item: string): void => {
    const trimmed = item.trim();
    if (!trimmed) return;
    if (form.maintenance.includes.length >= 15) return;
    if (form.maintenance.includes.includes(trimmed)) return;
    setMaintenance('includes', [...form.maintenance.includes, trimmed]);
    setMaintenanceInput('');
  };

  const removeMaintenanceItem = (index: number): void => {
    const updated = form.maintenance.includes.filter((_, i) => i !== index);
    setMaintenance('includes', updated);
  };

  return (
    <div className="space-y-5">

      {/* ── Info banner ── */}
      <div className="bg-[#eff6ff] border-l-4 border-[#029bba] px-4 py-3 rounded-r-lg">
        <p className="text-sm text-[#004063]">
          <strong>Transparency builds trust.</strong> Disclosing all charges
          upfront helps buyers make informed decisions and improves your
          listing&apos;s trust score on Highrise.pk.
        </p>
        <p className="text-xs text-gray-500 mt-1">
          All charge fields are optional — fill only what applies.
        </p>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1: Government Taxes
         ══════════════════════════════════════════════════════════════════════ */}
      <FormSection
        id="charges-gov"
        title="Government Taxes"
        icon={<Receipt className="w-5 h-5" />}
        defaultOpen={false}
        description="Stamp duty, CGT, WHT, etc."
        completionStatus={govTotal > 0 ? 'complete' : 'optional'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ChargeInput
              id="tax-stamp-duty"
              label="Stamp Duty"
              value={form.governmentTaxes.stampDuty}
              onChange={(val) => setGovTax('stampDuty', val)}
              hint="Usually 1-3% of property value"
            />
            <ChargeInput
              id="tax-registration"
              label="Registration Fee"
              value={form.governmentTaxes.registrationFee}
              onChange={(val) => setGovTax('registrationFee', val)}
              hint="Sub-registrar office fee"
            />
            <ChargeInput
              id="tax-cgt"
              label="Capital Gains Tax (CGT)"
              value={form.governmentTaxes.cgt}
              onChange={(val) => setGovTax('cgt', val)}
              hint="Tax on profit from property sale"
            />
            <ChargeInput
              id="tax-wht"
              label="Withholding Tax (WHT)"
              value={form.governmentTaxes.withHoldingTax}
              onChange={(val) => setGovTax('withHoldingTax', val)}
              hint="FBR advance tax on property transactions"
            />
            <ChargeInput
              id="tax-cvt"
              label="Capital Value Tax (CVT)"
              value={form.governmentTaxes.cvt}
              onChange={(val) => setGovTax('cvt', val)}
              hint="Applicable in certain areas"
            />
            <ChargeInput
              id="tax-advance"
              label="Advance Tax"
              value={form.governmentTaxes.advanceTax}
              onChange={(val) => setGovTax('advanceTax', val)}
              hint="Section 236C/236K advance tax"
            />
          </div>

          {/* Gov total */}
          {govTotal > 0 && (
            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
              <span className="text-sm font-medium text-gray-700">
                Total Government Taxes
              </span>
              <span className="text-sm font-bold text-[#004063]">
                Rs. {formatPKRNumeric(govTotal)}
              </span>
            </div>
          )}
        </div>
      </FormSection>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2: Transfer Charges
         ══════════════════════════════════════════════════════════════════════ */}
      <FormSection
        id="charges-transfer"
        title="Transfer Charges"
        icon={<Banknote className="w-5 h-5" />}
        defaultOpen={false}
        description="NOC, transfer, agent, legal fees"
        completionStatus={transferTotal > 0 ? 'complete' : 'optional'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ChargeInput
              id="transfer-noc"
              label="NOC Charges"
              value={form.transferCharges.noc}
              onChange={(val) => setTransfer('noc', val)}
              hint="No Objection Certificate from society/authority"
            />
            <ChargeInput
              id="transfer-transfer"
              label="Transfer Fee"
              value={form.transferCharges.transfer}
              onChange={(val) => setTransfer('transfer', val)}
              hint="Society/authority transfer charges"
            />
            <ChargeInput
              id="transfer-agent"
              label="Agent Commission"
              value={form.transferCharges.agent}
              onChange={(val) => setTransfer('agent', val)}
              hint="Real estate agent/broker fee"
            />
            <ChargeInput
              id="transfer-legal"
              label="Legal Charges"
              value={form.transferCharges.legal}
              onChange={(val) => setTransfer('legal', val)}
              hint="Lawyer/documentation fees"
            />
          </div>

          {/* Transfer total */}
          {transferTotal > 0 && (
            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
              <span className="text-sm font-medium text-gray-700">
                Total Transfer Charges
              </span>
              <span className="text-sm font-bold text-[#004063]">
                Rs. {formatPKRNumeric(transferTotal)}
              </span>
            </div>
          )}
        </div>
      </FormSection>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 3: Extra / Development Charges
         ══════════════════════════════════════════════════════════════════════ */}
      <FormSection
        id="charges-extra"
        title="Extra / Development Charges"
        icon={<Building2 className="w-5 h-5" />}
        defaultOpen={false}
        description="Corner, development, utility connections"
        completionStatus={extraTotal > 0 ? 'complete' : 'optional'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ChargeInput
              id="extra-corner"
              label="Corner Plot Premium"
              value={form.extraCharges.cornerCharges}
              onChange={(val) => setExtra('cornerCharges', val)}
              hint="Additional cost for corner position"
            />
            <ChargeInput
              id="extra-development"
              label="Development Charges"
              value={form.extraCharges.developmentCharges}
              onChange={(val) => setExtra('developmentCharges', val)}
              hint="Infrastructure development by society"
            />
            <ChargeInput
              id="extra-electricity"
              label="Electricity Connection"
              value={form.extraCharges.electricityConnectionCharges}
              onChange={(val) => setExtra('electricityConnectionCharges', val)}
            />
            <ChargeInput
              id="extra-gas"
              label="Gas Connection"
              value={form.extraCharges.gasConnectionCharges}
              onChange={(val) => setExtra('gasConnectionCharges', val)}
            />
            <ChargeInput
              id="extra-water"
              label="Water Connection"
              value={form.extraCharges.waterConnectionCharges}
              onChange={(val) => setExtra('waterConnectionCharges', val)}
            />
            <ChargeInput
              id="extra-parking"
              label="Parking Charges"
              value={form.extraCharges.parkingCharges}
              onChange={(val) => setExtra('parkingCharges', val)}
            />
            <ChargeInput
              id="extra-floor-premium"
              label="Floor Premium"
              value={form.extraCharges.floorPremium}
              onChange={(val) => setExtra('floorPremium', val)}
              hint="Higher floors may cost more"
            />
            <ChargeInput
              id="extra-view-premium"
              label="View Premium"
              value={form.extraCharges.viewPremium}
              onChange={(val) => setExtra('viewPremium', val)}
              hint="Sea/mountain/park facing premium"
            />
          </div>

          {/* Other charges with description */}
          <div className="border-t border-gray-100 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ChargeInput
                id="extra-other"
                label="Other Charges"
                value={form.extraCharges.otherCharges}
                onChange={(val) => setExtra('otherCharges', val)}
              />
              <div>
                <label
                  htmlFor="extra-other-desc"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  Other Charges Description
                </label>
                <input
                  id="extra-other-desc"
                  type="text"
                  placeholder="Describe other charges..."
                  value={form.extraCharges.otherChargesDescription}
                  onChange={(e) =>
                    setExtra('otherChargesDescription', e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Extra total */}
          {extraTotal > 0 && (
            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
              <span className="text-sm font-medium text-gray-700">
                Total Extra Charges
              </span>
              <span className="text-sm font-bold text-[#004063]">
                Rs. {formatPKRNumeric(extraTotal)}
              </span>
            </div>
          )}
        </div>
      </FormSection>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 4: Possession Charges
         ══════════════════════════════════════════════════════════════════════ */}
      <FormSection
        id="charges-possession"
        title="Possession Charges"
        icon={<Shield className="w-5 h-5" />}
        defaultOpen={false}
        description="Charges payable at possession time"
        completionStatus={possessionTotal > 0 ? 'complete' : 'optional'}
      >
        <div className="space-y-4">
          <ChargeInput
            id="possession-total"
            label="Total Possession Charges"
            value={form.possessionCharges.total}
            onChange={(val) => setPossession('total', val)}
            hint="Total charges due at time of possession/handover"
          />
          <div>
            <label
              htmlFor="possession-desc"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              Possession Charges Description
            </label>
            <textarea
              id="possession-desc"
              placeholder="Describe what is included in possession charges..."
              value={form.possessionCharges.description}
              onChange={(e) => setPossession('description', e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y min-h-[60px] focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
            />
          </div>
        </div>
      </FormSection>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 5: Hidden Charges Disclosure
         ══════════════════════════════════════════════════════════════════════ */}
      <FormSection
        id="charges-hidden"
        title="Hidden Charges Disclosure"
        icon={<AlertTriangle className="w-5 h-5" />}
        defaultOpen={false}
        description="Disclose any additional costs buyers should know"
        badge="Trust Builder"
        badgeColor="green"
        completionStatus={
          form.hiddenChargesDisclosure.trim() ? 'complete' : 'optional'
        }
      >
        <div className="space-y-3">
          <div className="bg-[#f0fdf4] border-l-4 border-[#10b981] px-4 py-3 rounded-r-lg">
            <p className="text-sm text-[#10b981] font-medium">
              🛡️ Transparency Score Boost
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Listings that disclose all charges rank higher in search results
              and earn a &quot;Transparent Pricing&quot; badge.
            </p>
          </div>

          <div>
            <label
              htmlFor="hidden-disclosure"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              Hidden / Additional Charges Disclosure
            </label>
            <textarea
              id="hidden-disclosure"
              placeholder="Any charges not listed above that the buyer should be aware of? e.g., annual society maintenance, car parking allocation fees, club membership, etc."
              value={form.hiddenChargesDisclosure}
              onChange={(e) =>
                setField('hiddenChargesDisclosure', e.target.value)
              }
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y min-h-[80px] focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
            />
          </div>
        </div>
      </FormSection>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 6: Maintenance Fees
         ══════════════════════════════════════════════════════════════════════ */}
      <FormSection
        id="charges-maintenance"
        title="Maintenance Fees"
        icon={<Wrench className="w-5 h-5" />}
        defaultOpen={false}
        description="Monthly/annual maintenance by society"
        completionStatus={
          safeNum(form.maintenance.monthlyFee) > 0 ||
          safeNum(form.maintenance.annualFee) > 0
            ? 'complete'
            : 'optional'
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ChargeInput
              id="maint-monthly"
              label="Monthly Maintenance Fee"
              value={form.maintenance.monthlyFee}
              onChange={(val) => setMaintenance('monthlyFee', val)}
              hint="Regular monthly society/building charges"
            />
            <ChargeInput
              id="maint-annual"
              label="Annual Maintenance Fee"
              value={form.maintenance.annualFee}
              onChange={(val) => setMaintenance('annualFee', val)}
              hint="Yearly one-time maintenance charge"
            />
          </div>

          {/* Annual cost estimate */}
          {safeNum(form.maintenance.monthlyFee) > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Annual Cost (monthly × 12)</span>
                <span className="font-semibold text-[#004063]">
                  Rs.{' '}
                  {formatPKRNumeric(safeNum(form.maintenance.monthlyFee) * 12)}
                </span>
              </div>
              {safeNum(form.maintenance.annualFee) > 0 && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-600">Total Annual Cost</span>
                  <span className="font-bold text-[#029bba]">
                    Rs.{' '}
                    {formatPKRNumeric(
                      safeNum(form.maintenance.monthlyFee) * 12 +
                        safeNum(form.maintenance.annualFee)
                    )}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Maintenance includes */}
          <div className="border-t border-gray-100 pt-4">
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Maintenance Includes
            </label>

            {/* Quick select options */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {MAINTENANCE_INCLUDES_OPTIONS.map((item) => {
                const isSelected = form.maintenance.includes.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        const idx = form.maintenance.includes.indexOf(item);
                        removeMaintenanceItem(idx);
                      } else {
                        addMaintenanceItem(item);
                      }
                    }}
                    className={`
                      px-2.5 py-1 rounded-full text-xs font-medium
                      transition-all duration-150
                      ${isSelected
                        ? 'bg-[#029bba] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }
                    `}
                  >
                    {isSelected ? '✓ ' : ''}{item}
                  </button>
                );
              })}
            </div>

            {/* Custom input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add custom item..."
                value={maintenanceInput}
                onChange={(e) => setMaintenanceInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addMaintenanceItem(maintenanceInput);
                  }
                }}
                maxLength={50}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => addMaintenanceItem(maintenanceInput)}
                disabled={
                  !maintenanceInput.trim() ||
                  form.maintenance.includes.length >= 15
                }
                className="
                  flex items-center gap-1 px-3 py-2 rounded-lg
                  bg-[#029bba] text-white text-xs font-medium
                  hover:bg-[#004063] transition-colors duration-150
                  disabled:opacity-40 disabled:cursor-not-allowed
                "
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add</span>
              </button>
            </div>

            {/* Selected items tags (custom ones only — suggestions handled inline) */}
            {form.maintenance.includes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {form.maintenance.includes
                  .filter(
                    (item) => !MAINTENANCE_INCLUDES_OPTIONS.includes(item)
                  )
                  .map((item, idx) => {
                    const actualIdx = form.maintenance.includes.indexOf(item);
                    return (
                      <span
                        key={`${item}-${idx}`}
                        className="
                          inline-flex items-center gap-1 px-2.5 py-1
                          bg-[#029bba] bg-opacity-10 text-[#029bba] text-xs rounded-full
                          font-medium
                        "
                      >
                        {item}
                        <button
                          type="button"
                          onClick={() => removeMaintenanceItem(actualIdx)}
                          className="text-[#029bba] hover:text-red-500 transition-colors duration-150"
                          aria-label={`Remove ${item}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
              </div>
            )}

            <p className="text-xs text-gray-400 mt-2">
              {form.maintenance.includes.length}/15 items selected
            </p>
          </div>
        </div>
      </FormSection>

      {/* ══════════════════════════════════════════════════════════════════════
          CHARGES SUMMARY CARD
         ══════════════════════════════════════════════════════════════════════ */}
      {hasAnyCharges && (
        <div className="bg-gradient-to-r from-[#029bba] to-[#004063] rounded-xl p-4 text-white">
          <h4 className="font-semibold text-sm mb-3 opacity-90">
            🧾 Charges Summary
          </h4>

          <div className="space-y-2">
            {govTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="opacity-80">Government Taxes</span>
                <span className="font-medium">
                  Rs. {formatPKRNumeric(govTotal)}
                </span>
              </div>
            )}
            {transferTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="opacity-80">Transfer Charges</span>
                <span className="font-medium">
                  Rs. {formatPKRNumeric(transferTotal)}
                </span>
              </div>
            )}
            {extraTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="opacity-80">Extra / Dev Charges</span>
                <span className="font-medium">
                  Rs. {formatPKRNumeric(extraTotal)}
                </span>
              </div>
            )}
            {possessionTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="opacity-80">Possession Charges</span>
                <span className="font-medium">
                  Rs. {formatPKRNumeric(possessionTotal)}
                </span>
              </div>
            )}

            <div className="border-t border-white border-opacity-20 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="font-semibold">Total Additional Charges</span>
                <span className="font-bold text-lg">
                  Rs. {formatPKRNumeric(grandTotal)}
                </span>
              </div>
              <p className="text-xs opacity-60 mt-1 text-center">
                {formatPKR(grandTotal)}
              </p>
            </div>
          </div>

          {/* Maintenance row (separate from lump sum charges) */}
          {(safeNum(form.maintenance.monthlyFee) > 0 ||
            safeNum(form.maintenance.annualFee) > 0) && (
            <div className="border-t border-white border-opacity-20 pt-2 mt-2">
              <div className="flex justify-between text-sm">
                <span className="opacity-80">Recurring Maintenance</span>
                <span className="font-medium">
                  {safeNum(form.maintenance.monthlyFee) > 0 && (
                    <span>
                      Rs. {formatPKRNumeric(form.maintenance.monthlyFee)}/mo
                    </span>
                  )}
                  {safeNum(form.maintenance.monthlyFee) > 0 &&
                    safeNum(form.maintenance.annualFee) > 0 && (
                      <span className="mx-1">+</span>
                    )}
                  {safeNum(form.maintenance.annualFee) > 0 && (
                    <span>
                      Rs. {formatPKRNumeric(form.maintenance.annualFee)}/yr
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}