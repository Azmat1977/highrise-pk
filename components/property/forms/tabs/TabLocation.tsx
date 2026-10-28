// components/property/forms/tabs/TabLocation.tsx

import { useState } from 'react';
import { MapPin, Navigation, Globe, Building2, X, Plus } from 'lucide-react';
import FormSection from '../shared/FormSection';
import {
  PropertyFormState,
  PAKISTAN_CITIES,
  TabErrors,
  UsePropertyFormReturn,
} from '../shared/usePropertyForm';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TabLocationProps {
  form: PropertyFormState;
  errors: TabErrors;
  setField: UsePropertyFormReturn['setField'];
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

// ─── Popular Cities (shown as quick-select pills) ─────────────────────────────

const POPULAR_CITIES = [
  'Islamabad', 'Lahore', 'Karachi', 'Rawalpindi',
  'Faisalabad', 'Multan', 'Peshawar', 'Quetta',
];

// ─── Known Societies by City (top suggestions) ───────────────────────────────

const SOCIETIES_BY_CITY: Record<string, string[]> = {
  Lahore: [
    'DHA', 'Bahria Town', 'Lake City', 'Wapda Town', 'Johar Town',
    'Gulberg', 'Model Town', 'Garden Town', 'Askari', 'Valencia',
    'Paragon City', 'Canal Gardens', 'PCSIR', 'Izmir Town',
  ],
  Islamabad: [
    'DHA', 'Bahria Town', 'B-17', 'D-12', 'E-11', 'F-6', 'F-7', 'F-8',
    'F-10', 'F-11', 'G-9', 'G-10', 'G-11', 'G-13', 'G-14', 'G-15',
    'I-8', 'I-10', 'I-14', 'I-16', 'Gulberg Greens', 'Top City',
    'Capital Smart City', 'Park View City', 'Blue World City',
  ],
  Rawalpindi: [
    'Bahria Town', 'DHA', 'Askari', 'Gulraiz', 'Chaklala',
    'Satellite Town', 'Westridge', 'Media Town',
  ],
  Karachi: [
    'DHA', 'Bahria Town', 'Gulshan-e-Iqbal', 'Gulistan-e-Jauhar',
    'North Nazimabad', 'Clifton', 'PECHS', 'Malir Cantt',
    'Scheme 33', 'Askari', 'Navy Housing', 'Korangi',
  ],
  Faisalabad: [
    'Citi Housing', 'Eden Valley', 'Canal Gardens',
  ],
  Multan: [
    'DHA', 'Buch Villas', 'Royal Orchard',
  ],
  Peshawar: [
    'DHA', 'Regi Model Town', 'Hayatabad',
  ],
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TabLocation({
  form,
  errors,
  setField,
}: TabLocationProps): React.ReactElement {
  const [landmarkInput, setLandmarkInput] = useState('');
  const [showAllCities, setShowAllCities] = useState(false);

  // Get society suggestions for selected city
  const societySuggestions = form.city ? (SOCIETIES_BY_CITY[form.city] ?? []) : [];

  // ── Add landmark handler (supports comma / newline / semicolon separated)
  const addLandmark = (): void => {
    const raw = landmarkInput.trim();
    if (!raw) return;

    // Split on commas, newlines, OR semicolons → trim → dedupe
    const candidates = raw
      .split(/[,\n;]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length <= 100);

    if (candidates.length === 0) return;

    // Case-insensitive dedupe against existing landmarks
    const existingLower = new Set(
      form.nearbyLandmarks.map((l) => l.toLowerCase())
    );

    const newOnes: string[] = [];
    const seen = new Set<string>();
    for (const c of candidates) {
      const lower = c.toLowerCase();
      if (existingLower.has(lower)) continue;
      if (seen.has(lower)) continue;
      seen.add(lower);
      newOnes.push(c);
    }

    if (newOnes.length === 0) {
      setLandmarkInput('');
      return;
    }

    setField('nearbyLandmarks', [...form.nearbyLandmarks, ...newOnes]);
    setLandmarkInput('');
  };

  // ── Add suggestion landmark instantly (one click — no input typing)
  const addSuggestionDirect = (suggestion: string): void => {
    const exists = form.nearbyLandmarks.some(
      (l) => l.toLowerCase() === suggestion.toLowerCase()
    );
    if (exists) return;
    setField('nearbyLandmarks', [...form.nearbyLandmarks, suggestion]);
  };

  // ── Clear all landmarks
  const clearAllLandmarks = (): void => {
    setField('nearbyLandmarks', []);
  };

  // ── Remove landmark handler
  const removeLandmark = (index: number): void => {
    const updated = form.nearbyLandmarks.filter((_, i) => i !== index);
    setField('nearbyLandmarks', updated);
  };

  return (
    <div className="space-y-5">

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1: City
         ══════════════════════════════════════════════════════════════════════ */}
      <FormSection
        id="location-city"
        title="City"
        icon={<MapPin className="w-5 h-5" />}
        defaultOpen={true}
        required
        completionStatus={form.city ? 'complete' : 'incomplete'}
      >
        <div className="space-y-4">
          {/* Popular cities — quick select pills */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Popular Cities
            </p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_CITIES.map((city) => {
                const isActive = form.city === city;
                return (
                  <button
                    key={city}
                    type="button"
                    onClick={() => {
                      setField('city', isActive ? '' : city);
                      // Clear society when city changes
                      if (!isActive && form.city !== city) {
                        setField('societyName', '');
                        setField('phase', '');
                        setField('block', '');
                        setField('sector', '');
                      }
                    }}
                    className={`
                      px-4 py-2 rounded-full text-sm font-medium
                      transition-all duration-150
                      ${isActive
                        ? 'bg-[#029bba] text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }
                    `}
                  >
                    {city}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Full city dropdown */}
          <div>
            <label
              htmlFor="prop-city"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              {form.city && POPULAR_CITIES.includes(form.city)
                ? 'Selected City'
                : 'All Cities'
              }
              <span className="text-red-500 ml-1">*</span>
            </label>

            {!showAllCities && form.city && POPULAR_CITIES.includes(form.city) ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#029bba]">
                  📍 {form.city}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAllCities(true)}
                  className="text-xs text-gray-400 hover:text-[#029bba] underline transition-colors duration-150"
                >
                  Change city
                </button>
              </div>
            ) : (
              <select
                id="prop-city"
                value={form.city}
                onChange={(e) => {
                  setField('city', e.target.value);
                  setField('societyName', '');
                  setField('phase', '');
                  setField('block', '');
                  setField('sector', '');
                  setShowAllCities(false);
                }}
                className={`
                  w-full border rounded-lg px-4 py-2.5
                  focus:ring-2 focus:ring-[#029bba] focus:border-transparent
                  ${errors.city ? 'border-red-500' : 'border-gray-300'}
                `}
              >
                <option value="">Select a city...</option>
                {PAKISTAN_CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            )}
            <FieldError error={errors.city} />
          </div>
        </div>
      </FormSection>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2: Society / Project Details
         ══════════════════════════════════════════════════════════════════════ */}
      <FormSection
        id="location-society"
        title="Society / Housing Scheme"
        icon={<Building2 className="w-5 h-5" />}
        defaultOpen={!!form.city}
        description="DHA, Bahria Town, etc."
        completionStatus={
          form.societyName ? 'complete' : 'optional'
        }
      >
        <div className="space-y-4">
          {/* Society suggestions — pills */}
          {societySuggestions.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Popular in {form.city}
              </p>
              <div className="flex flex-wrap gap-2">
                {societySuggestions.map((soc) => {
                  const isActive = form.societyName === soc;
                  return (
                    <button
                      key={soc}
                      type="button"
                      onClick={() =>
                        setField('societyName', isActive ? '' : soc)
                      }
                      className={`
                        px-3 py-1.5 rounded-full text-xs font-medium
                        transition-all duration-150
                        ${isActive
                          ? 'bg-[#029bba] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }
                      `}
                    >
                      {soc}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Society name input */}
          <div>
            <label
              htmlFor="prop-society"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Society / Scheme Name
            </label>
            <input
              id="prop-society"
              type="text"
              placeholder="e.g. DHA, Bahria Town, Gulberg"
              value={form.societyName}
              onChange={(e) => setField('societyName', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
            />
          </div>

          {/* Phase / Block / Sector — inline row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="prop-phase"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Phase
              </label>
              <input
                id="prop-phase"
                type="text"
                placeholder="e.g. Phase 6"
                value={form.phase}
                onChange={(e) => setField('phase', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
              />
            </div>
            <div>
              <label
                htmlFor="prop-block"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Block
              </label>
              <input
                id="prop-block"
                type="text"
                placeholder="e.g. Block D"
                value={form.block}
                onChange={(e) => setField('block', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
              />
            </div>
            <div>
              <label
                htmlFor="prop-sector"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Sector
              </label>
              <input
                id="prop-sector"
                type="text"
                placeholder="e.g. Sector C"
                value={form.sector}
                onChange={(e) => setField('sector', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </FormSection>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 3: Address Details
         ══════════════════════════════════════════════════════════════════════ */}
      <FormSection
        id="location-address"
        title="Address Details"
        icon={<Navigation className="w-5 h-5" />}
        defaultOpen={true}
        required
        completionStatus={
          form.address.trim()
            ? (errors.address ? 'incomplete' : 'complete')
            : 'incomplete'
        }
      >
        <div className="space-y-4">
          {/* Area */}
          <div>
            <label
              htmlFor="prop-area"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Area / Locality
            </label>
            <input
              id="prop-area"
              type="text"
              placeholder="e.g. DHA Phase 6, Model Town, F-8"
              value={form.area}
              onChange={(e) => setField('area', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
            />
          </div>

          {/* Street */}
          <div>
            <label
              htmlFor="prop-street"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Street / Road
            </label>
            <input
              id="prop-street"
              type="text"
              placeholder="e.g. Street 5, Main Boulevard"
              value={form.street}
              onChange={(e) => setField('street', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
            />
          </div>

          {/* Full Address */}
          <div>
            <label
              htmlFor="prop-address"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Full Address <span className="text-red-500">*</span>
            </label>
            <textarea
              id="prop-address"
              placeholder="Complete address for property identification (this helps with verification)"
              value={form.address}
              onChange={(e) => setField('address', e.target.value)}
              rows={3}
              className={`
                w-full border rounded-lg px-4 py-2.5 resize-y min-h-[80px]
                focus:ring-2 focus:ring-[#029bba] focus:border-transparent
                ${errors.address ? 'border-red-500' : 'border-gray-300'}
              `}
            />
            <FieldError error={errors.address} />
            <p className="text-xs text-gray-400 mt-1">
              Exact address is kept private — only area shown publicly
            </p>
          </div>
        </div>
      </FormSection>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 4: Map & Coordinates
         ══════════════════════════════════════════════════════════════════════ */}
      <FormSection
        id="location-map"
        title="Map & Coordinates"
        icon={<Globe className="w-5 h-5" />}
        defaultOpen={false}
        description="Optional — helps buyers find location"
        completionStatus={
          form.googleMapLink || (form.latitude !== '' && form.longitude !== '')
            ? 'complete'
            : 'optional'
        }
      >
        <div className="space-y-4">
          {/* Google Map Link */}
          <div>
            <label
              htmlFor="prop-map-link"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Google Maps Link
            </label>
            <input
              id="prop-map-link"
              type="url"
              placeholder="https://maps.google.com/..."
              value={form.googleMapLink}
              onChange={(e) => setField('googleMapLink', e.target.value)}
              className={`
                w-full border rounded-lg px-4 py-2.5
                focus:ring-2 focus:ring-[#029bba] focus:border-transparent
                ${errors.googleMapLink ? 'border-red-500' : 'border-gray-300'}
              `}
            />
            <FieldError error={errors.googleMapLink} />
            <p className="text-xs text-gray-400 mt-1">
              Open Google Maps → search location → Share → Copy link
            </p>
          </div>

          {/* Coordinates */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Coordinates
              <span className="text-xs text-gray-400 font-normal ml-2">
                (Pakistan: Lat 23–37.5, Lng 60–77.5)
              </span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="prop-lat"
                  className="block text-xs text-gray-500 mb-1"
                >
                  Latitude
                </label>
                <input
                  id="prop-lat"
                  type="number"
                  step="0.000001"
                  placeholder="e.g. 31.5204"
                  value={form.latitude === '' ? '' : form.latitude}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setField('latitude', '');
                      return;
                    }
                    const n = parseFloat(raw);
                    if (!isNaN(n)) setField('latitude', n);
                  }}
                  className={`
                    w-full border rounded-lg px-4 py-2.5 text-sm
                    focus:ring-2 focus:ring-[#029bba] focus:border-transparent
                    ${errors.latitude ? 'border-red-500' : 'border-gray-300'}
                  `}
                />
                <FieldError error={errors.latitude} />
              </div>
              <div>
                <label
                  htmlFor="prop-lng"
                  className="block text-xs text-gray-500 mb-1"
                >
                  Longitude
                </label>
                <input
                  id="prop-lng"
                  type="number"
                  step="0.000001"
                  placeholder="e.g. 74.3587"
                  value={form.longitude === '' ? '' : form.longitude}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setField('longitude', '');
                      return;
                    }
                    const n = parseFloat(raw);
                    if (!isNaN(n)) setField('longitude', n);
                  }}
                  className={`
                    w-full border rounded-lg px-4 py-2.5 text-sm
                    focus:ring-2 focus:ring-[#029bba] focus:border-transparent
                    ${errors.longitude ? 'border-red-500' : 'border-gray-300'}
                  `}
                />
                <FieldError error={errors.longitude} />
              </div>
            </div>
          </div>

          {/* Coordinates help box */}
          <div className="bg-[#eff6ff] border-l-4 border-[#029bba] px-4 py-3 rounded-r-lg">
            <p className="text-xs text-[#004063]">
              <strong>How to find coordinates:</strong> Open Google Maps →
              Right-click on your property → Click the coordinates that appear →
              They are copied to clipboard. Paste latitude and longitude separately.
            </p>
          </div>
        </div>
      </FormSection>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 5: Nearby Landmarks (Multi-Add Support)
         ══════════════════════════════════════════════════════════════════════ */}
      <FormSection
        id="location-landmarks"
        title="Nearby Landmarks"
        icon={<span className="text-lg">🏫</span>}
        defaultOpen={false}
        description="Schools, hospitals, markets near property"
        completionStatus={
          form.nearbyLandmarks.length > 0 ? 'complete' : 'optional'
        }
      >
        <div className="space-y-3">
          {/* Input + Add button */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type one or many: Hospital, School, Mosque, Park"
              value={landmarkInput}
              onChange={(e) => setLandmarkInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addLandmark();
                }
              }}
              maxLength={500}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5
                focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
            />
            <button
              type="button"
              onClick={addLandmark}
              disabled={!landmarkInput.trim()}
              className="flex items-center gap-1 px-4 py-2.5 rounded-lg
                bg-[#029bba] text-white text-sm font-medium
                hover:bg-[#004063] transition-colors duration-150
                disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add</span>
            </button>
          </div>

          {/* Helper tip — multi-add support */}
          <div className="bg-[#eff6ff] border-l-4 border-[#029bba]
            px-3 py-2 rounded-r-lg">
            <p className="text-xs text-[#004063]">
              💡 <strong>Add multiple at once:</strong> separate with commas
              <code className="mx-1 px-1.5 py-0.5 bg-white rounded text-[10px]
                font-mono text-[#029bba]">
                Hospital, School, Mall
              </code>
              or click pills below to add instantly
            </p>
          </div>

          {/* Landmark count + clear all */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {form.nearbyLandmarks.length === 0
                ? 'No landmarks added yet'
                : `${form.nearbyLandmarks.length} landmark${form.nearbyLandmarks.length !== 1 ? 's' : ''} added`}
            </p>
            {form.nearbyLandmarks.length > 1 && (
              <button
                type="button"
                onClick={clearAllLandmarks}
                className="text-xs text-gray-400 hover:text-red-500
                  underline transition-colors duration-150"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Landmark tags */}
          {form.nearbyLandmarks.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.nearbyLandmarks.map((lm, idx) => (
                <span
                  key={`${lm}-${idx}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5
                    bg-[#10b981] bg-opacity-10 text-[#065f46] text-sm
                    rounded-full border border-[#10b981] border-opacity-30
                    hover:bg-opacity-20 transition-colors duration-150"
                >
                  <span className="text-[#10b981]">📍</span>
                  <span className="truncate max-w-[200px]">{lm}</span>
                  <button
                    type="button"
                    onClick={() => removeLandmark(idx)}
                    className="text-[#065f46] opacity-50 hover:opacity-100
                      hover:text-red-500 transition-all duration-150 flex-shrink-0"
                    aria-label={`Remove ${lm}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Quick-add suggestion pills (always visible — one click adds) */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2 font-medium">
              Quick add (click to add instantly):
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                'Hospital', 'School', 'University', 'Market',
                'Metro Station', 'Park', 'Mosque', 'Airport',
                'Motorway', 'Mall', 'Bank', 'Restaurant',
                'Gym', 'Pharmacy', 'Petrol Pump', 'ATM',
              ].map((suggestion) => {
                const isAlreadyAdded = form.nearbyLandmarks.some(
                  (l) => l.toLowerCase() === suggestion.toLowerCase()
                );

                return (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => addSuggestionDirect(suggestion)}
                    disabled={isAlreadyAdded}
                    title={isAlreadyAdded ? 'Already added' : `Add "${suggestion}"`}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium
                      transition-all duration-150
                      ${isAlreadyAdded
                        ? 'bg-[#10b981] bg-opacity-10 text-[#10b981] cursor-not-allowed border border-[#10b981] border-opacity-30'
                        : 'bg-[#eff6ff] text-[#004063] hover:bg-[#029bba] hover:text-white border border-transparent hover:shadow-sm'
                      }`}
                  >
                    {isAlreadyAdded && <span className="mr-1">✓</span>}
                    {suggestion}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </FormSection>

    </div>
  );
}