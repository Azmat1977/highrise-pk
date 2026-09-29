// components/OfficeLocationPicker.tsx
// ═══════════════════════════════════════════════════════════════
// OFFICE LOCATION PICKER - Highrise.pk
// 🗺️ Interactive Google Map with GUARANTEED visible pin
// V6.8.14 — Uses OverlayView for bulletproof pin rendering
// ═══════════════════════════════════════════════════════════════

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  MapPin,
  Search,
  Loader2,
  AlertTriangle,
  Check,
  Info,
  Crosshair,
} from "lucide-react";
import {
  GoogleMap,
  Marker,
  OverlayView,
  OverlayViewF,
  useJsApiLoader,
  Autocomplete,
} from "@react-google-maps/api";
import {
  geocodeAddress,
  isValidCoordinates,
  isInPakistan,
} from "@/lib/geocode";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface LocationData {
  address: string;
  city:    string;
  lat:     number;
  lng:     number;
}

interface OfficeLocationPickerProps {
  initialAddress?: string;
  initialCity?:    string;
  initialLat?:     number;
  initialLng?:     number;
  onLocationChange: (location: LocationData) => void;
  height?:         number;
  showGpsButton?:  boolean;
  showSearchBox?:  boolean;
  compact?:        boolean;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const GOOGLE_MAPS_LIBRARIES: ("places")[] = ["places"];
const DEFAULT_CENTER = { lat: 33.6844, lng: 73.0479 };

const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI:   false,
  zoomControl:        true,
  streetViewControl:  false,
  mapTypeControl:     true, // Enables Map/Satellite toggle
  fullscreenControl:  true,
  clickableIcons:     false,
  gestureHandling:    "greedy",
  // V6.8.16: Intuitive cursors
  //   • On empty map = pointer (click to place pin)
  //   • While dragging map = grabbing
  //   • On pin (handled below in SVG) = move
  draggableCursor:    "pointer",
  draggingCursor:     "grabbing",
};

const AUTOCOMPLETE_OPTIONS: google.maps.places.AutocompleteOptions = {
  componentRestrictions: { country: "pk" },
  fields: ["formatted_address", "geometry", "address_components", "name"],
  types:  ["establishment", "geocode"],
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function OfficeLocationPicker({
  initialAddress = "",
  initialCity    = "",
  initialLat,
  initialLng,
  onLocationChange,
  height          = 400,
  showGpsButton   = true,
  showSearchBox   = true,
  compact         = false,
}: OfficeLocationPickerProps): React.ReactElement {

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries:        GOOGLE_MAPS_LIBRARIES,
  });

  const [center, setCenter] = useState<google.maps.LatLngLiteral>(() => {
    if (isValidCoordinates(initialLat, initialLng)) {
      return { lat: Number(initialLat), lng: Number(initialLng) };
    }
    return DEFAULT_CENTER;
  });

  const [markerPosition, setMarkerPosition] = useState<google.maps.LatLngLiteral>(() => {
    if (isValidCoordinates(initialLat, initialLng)) {
      return { lat: Number(initialLat), lng: Number(initialLng) };
    }
    return DEFAULT_CENTER;
  });

  const [addressInput, setAddressInput] = useState(initialAddress);
  const [cityInput, setCityInput]       = useState(initialCity);
  const [isGeocoding, setIsGeocoding]   = useState(false);
  const [isLocatingMe, setIsLocatingMe] = useState(false);
  const [warning, setWarning]           = useState<string | null>(null);
  const [hasSetInitial, setHasSetInitial] = useState(
    isValidCoordinates(initialLat, initialLng)
  );

  const mapRef                  = useRef<google.maps.Map | null>(null);
  const autocompleteRef         = useRef<google.maps.places.Autocomplete | null>(null);
  const isFirstRender           = useRef(true);

  // V6.8.14: Skip firing onLocationChange on FIRST render
  // This prevents "unsaved changes" false positive on page load
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
  }, []);

  // ═══════════════════════════════════════════════════════════
  // V6.8.26: SYNC internal state when initialLat/initialLng props change
  // ═══════════════════════════════════════════════════════════
  // CRITICAL FIX: useState() initializer only runs ONCE on mount.
  // When parent's contextProfile loads AFTER mount (async), the new
  // initialLat/initialLng props arrive but useState never re-runs.
  // Result: map shows DEFAULT_CENTER instead of saved coordinates.
  //
  // This effect watches prop changes and syncs marker + center + zoom.
  // Uses ref to prevent infinite loops when user drags pin (state changes
  // but props don't, so we only sync on ACTUAL prop change).
  useEffect(() => {
    if (!isValidCoordinates(initialLat, initialLng)) return;

    const newPos = { lat: Number(initialLat), lng: Number(initialLng) };

    // Only sync if props differ from current state (prevents pin-drag loop)
    const positionChanged =
      Math.abs(markerPosition.lat - newPos.lat) > 0.000001 ||
      Math.abs(markerPosition.lng - newPos.lng) > 0.000001;

    if (positionChanged) {
      setMarkerPosition(newPos);
      setCenter(newPos);
      setHasSetInitial(true);  // Prevents auto-geocode from overwriting

      // Pan map to new position if map is loaded
      if (mapRef.current) {
        mapRef.current.panTo(newPos);
        mapRef.current.setZoom(16);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLat, initialLng]);

  // ═══════════════════════════════════════════════════════════
  // V6.8.26: Auto-geocode ONLY when NO saved coordinates exist
  // ═══════════════════════════════════════════════════════════
  // CRITICAL FIX: Previously this effect would fire whenever initialAddress
  // changed, OVERWRITING saved GPS coordinates with an approximate geocode.
  // That's why the pin snapped back to a slightly different location on refresh.
  //
  // Now it strictly respects saved coordinates:
  //   - If initialLat/initialLng exist → skip geocoding (use exact saved pin)
  //   - If they don't exist → geocode address as best-guess starting point
  //
  // The prop-sync effect above handles updating position when coordinates
  // arrive later (async load from context).
  useEffect(() => {
    // ✅ HARD GUARD: If ANY valid initial coordinates exist, NEVER geocode.
    // The saved GPS pin is always more accurate than a text-address lookup.
    if (isValidCoordinates(initialLat, initialLng)) {
      setHasSetInitial(true);
      return;
    }

    // Skip if already handled
    if (hasSetInitial || !initialAddress || initialAddress.trim().length < 3) {
      return;
    }

    setIsGeocoding(true);
    const fullAddress = initialCity
      ? `${initialAddress}, ${initialCity}, Pakistan`
      : initialAddress.includes("Pakistan")
      ? initialAddress
      : `${initialAddress}, Pakistan`;

    geocodeAddress(fullAddress)
      .then((result) => {
        if (result.coordinates) {
          const newPos = {
            lat: result.coordinates.lat,
            lng: result.coordinates.lng,
          };
          setCenter(newPos);
          setMarkerPosition(newPos);
          setHasSetInitial(true);
        }
        setIsGeocoding(false);
      })
      .catch(() => setIsGeocoding(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAddress, initialCity, hasSetInitial, initialLat, initialLng]);

  // Notify parent of location change (skipped on first render)
  const notifyChange = useCallback(
    (address: string, city: string, lat: number, lng: number) => {
      if (!isInPakistan(lat, lng)) {
        setWarning("⚠️ Location is outside Pakistan. Please choose a location within Pakistan.");
      } else {
        setWarning(null);
      }
      onLocationChange({ address, city, lat, lng });
    },
    [onLocationChange]
  );

  const handleMarkerDragEnd = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setMarkerPosition(newPos);
      notifyChange(addressInput, cityInput, newPos.lat, newPos.lng);
    },
    [addressInput, cityInput, notifyChange]
  );

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setMarkerPosition(newPos);
      notifyChange(addressInput, cityInput, newPos.lat, newPos.lng);
    },
    [addressInput, cityInput, notifyChange]
  );

  const handlePlaceSelected = useCallback(() => {
    const autocomplete = autocompleteRef.current;
    if (!autocomplete) return;

    const place = autocomplete.getPlace();
    if (!place.geometry?.location) {
      setWarning("Could not find location for this address.");
      return;
    }

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const newPos = { lat, lng };

    setCenter(newPos);
    setMarkerPosition(newPos);

    const formattedAddress = place.formatted_address ?? place.name ?? "";
    let extractedCity = cityInput;

    if (place.address_components) {
      const cityComponent = place.address_components.find((c) =>
        c.types.includes("locality") || c.types.includes("administrative_area_level_2")
      );
      if (cityComponent) {
        extractedCity = cityComponent.long_name;
      }
    }

    setAddressInput(formattedAddress);
    setCityInput(extractedCity);

    if (mapRef.current) {
      mapRef.current.setZoom(17);
    }

    notifyChange(formattedAddress, extractedCity, lat, lng);
  }, [cityInput, notifyChange]);

  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setWarning("Your browser doesn't support GPS location.");
      return;
    }

    setIsLocatingMe(true);
    setWarning(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newPos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCenter(newPos);
        setMarkerPosition(newPos);

        if (mapRef.current) {
          mapRef.current.panTo(newPos);
          mapRef.current.setZoom(17);
        }

        notifyChange(addressInput, cityInput, newPos.lat, newPos.lng);
        setIsLocatingMe(false);
      },
      (err) => {
        setIsLocatingMe(false);
        if (err.code === err.PERMISSION_DENIED) {
          setWarning("Location access denied. Please allow location permission and try again.");
        } else if (err.code === err.TIMEOUT) {
          setWarning("Getting your location took too long. Try again.");
        } else {
          setWarning("Could not get your location. Try dragging the pin instead.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout:            10000,
        maximumAge:         0,
      }
    );
  }, [addressInput, cityInput, notifyChange]);

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const handleAutocompleteLoad = useCallback(
    (autocomplete: google.maps.places.Autocomplete) => {
      autocompleteRef.current = autocomplete;
    },
    []
  );

  // ─── Loading State ───────────────────────────────────────────
  if (loadError) {
    return (
      <div
        className="rounded-2xl border-2 border-red-200 bg-red-50 flex items-center justify-center p-6"
        style={{ height: `${height}px` }}
      >
        <div className="text-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-sm font-bold text-red-800 mb-1">
            Failed to load Google Maps
          </p>
          <p className="text-xs text-red-700">
            Please check your internet connection and refresh the page.
          </p>
          {process.env.NODE_ENV === "development" && (
            <p className="text-[10px] text-red-600 mt-2 font-mono">
              {loadError.message}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center"
        style={{ height: `${height}px` }}
      >
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#029bba] animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">Loading Google Maps...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* Header instructions — V6.8.16 */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-xs font-bold text-blue-900 mb-0.5">
            📍 Pin Your Exact Office Location
          </p>
          <p className="text-[11px] text-blue-800 leading-relaxed">
            {showSearchBox ? "Search below OR " : ""}
            <strong>click anywhere on the map</strong> to place the pin at your exact office door.
            You can zoom in for better accuracy.
          </p>
        </div>
      </div>

      {/* Search box */}
      {showSearchBox && (
        <Autocomplete
          onLoad={handleAutocompleteLoad}
          onPlaceChanged={handlePlaceSelected}
          options={AUTOCOMPLETE_OPTIONS}
        >
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="🔍 Search for your office (e.g. 'Rehman Center F-10 Islamabad')"
              className="w-full h-11 pl-10 pr-4 rounded-xl border-2 border-gray-200
                         focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20
                         text-sm outline-none transition-all"
            />
          </div>
        </Autocomplete>
      )}

      {/* Map container */}
      <div
        className="relative rounded-2xl overflow-hidden border-2 border-gray-200 shadow-md bg-gray-100"
        style={{ height: `${height}px` }}
      >
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={center}
          zoom={hasSetInitial ? 16 : 12}
          options={MAP_OPTIONS}
          onLoad={handleMapLoad}
          onClick={handleMapClick}
        >
          {/* V6.8.16: Removed invisible draggable marker */}
          {/* Click-to-move UX is cleaner + works better on mobile */}
          {/* Users click anywhere on map to reposition the pin */}

          {/* V6.8.15: BULLETPROOF SVG PIN using OverlayView */}
          {/* Uses inline SVG — cannot fail to render (no image loading) */}
          {/* This CSS-only pin is guaranteed visible on all browsers */}
          <OverlayViewF
            position={markerPosition}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={(width, height) => ({
              x: -(width / 2),
              y: -height,
            })}
          >
            {/* V6.8.16: Pin is display-only — click anywhere on map to move it */}
            {/* Simpler UX, works on mobile, no drag confusion */}
            <div
              className="relative group pointer-events-none"
              style={{ zIndex: 999 }}
            >
              {/* Pin Body */}
              <svg
                width="42"
                height="54"
                viewBox="0 0 42 54"
                xmlns="http://www.w3.org/2000/svg"
                style={{
                  filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.35))",
                  animation: "pinBounce 0.6s ease-out",
                  transition: "transform 0.2s ease-out",
                }}
                className="group-hover:scale-110"
              >
                {/* Pin outline (white) */}
                <path
                  d="M21 2C10.507 2 2 10.507 2 21c0 14.25 19 31 19 31s19-16.75 19-31C40 10.507 31.493 2 21 2z"
                  fill="#ffffff"
                  stroke="#ffffff"
                  strokeWidth="4"
                />
                {/* Pin body (red) */}
                <path
                  d="M21 2C10.507 2 2 10.507 2 21c0 14.25 19 31 19 31s19-16.75 19-31C40 10.507 31.493 2 21 2z"
                  fill="#ef4444"
                />
                {/* Inner circle (white) */}
                <circle
                  cx="21"
                  cy="20"
                  r="7"
                  fill="#ffffff"
                />
                {/* Center dot (red) */}
                <circle
                  cx="21"
                  cy="20"
                  r="3"
                  fill="#ef4444"
                />
              </svg>

              {/* V6.8.16: Tooltip updated for click-to-move UX */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2
                              bg-gray-900 text-white text-[10px] font-bold px-2.5 py-1 rounded
                              opacity-0 group-hover:opacity-100 transition-opacity
                              pointer-events-none whitespace-nowrap">
                📍 Your office location
              </div>

              {/* Animation keyframes */}
              <style>{`
                @keyframes pinBounce {
                  0%   { transform: translateY(-30px) scale(0.5); opacity: 0; }
                  60%  { transform: translateY(4px)   scale(1.05); opacity: 1; }
                  100% { transform: translateY(0)     scale(1);    opacity: 1; }
                }
              `}</style>
            </div>
          </OverlayViewF>
        </GoogleMap>

        {/* Loading overlay */}
        {isGeocoding && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center pointer-events-none">
            <div className="bg-white rounded-xl px-4 py-3 shadow-lg flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-[#029bba] animate-spin" />
              <span className="text-sm font-medium text-gray-700">
                Locating address...
              </span>
            </div>
          </div>
        )}

        {/* GPS button */}
        {showGpsButton && (
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocatingMe}
            className="absolute top-3 right-3 bg-white rounded-xl shadow-md hover:shadow-lg
                       transition-all p-2.5 flex items-center gap-2
                       disabled:opacity-50 disabled:cursor-not-allowed
                       border border-gray-200 group z-10"
            title="Use my current location"
          >
            {isLocatingMe ? (
              <Loader2 className="w-4 h-4 text-[#029bba] animate-spin" />
            ) : (
              <Crosshair className="w-4 h-4 text-[#029bba] group-hover:scale-110 transition-transform" />
            )}
            <span className="text-xs font-bold text-gray-700 hidden sm:inline">
              {isLocatingMe ? "Locating..." : "Use My Location"}
            </span>
          </button>
        )}

        {/* Fallback visual pin indicator (in case marker doesn't render) */}
        {/* Shows a red dot at center of map as visual fallback */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-20"
          style={{ display: hasSetInitial ? "none" : "block" }}
        >
          <div className="relative">
            <MapPin className="w-8 h-8 text-red-500 fill-red-500 drop-shadow-lg" />
          </div>
        </div>

        {/* Instructions */}
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm rounded-lg
                        shadow-md px-3 py-1.5 flex items-center gap-1.5
                        border border-gray-100 pointer-events-none z-10">
          <MapPin className="w-3.5 h-3.5 text-red-500 fill-red-500" />
          <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">
            Click anywhere to move pin
          </span>
        </div>
      </div>

      {/* V6.8.17: Clear instruction card below map */}
      <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border-2 border-emerald-100 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-emerald-900 mb-1">
              How to mark your office:
            </p>
            <ol className="text-xs text-emerald-800 space-y-1 leading-relaxed list-decimal ml-4">
              <li>
                <strong>Click anywhere</strong> on the map above to place the pin
              </li>
              <li>
                Use <strong>+ / − buttons</strong> to zoom in for better accuracy
              </li>
              <li>
                Click again on your <strong>exact office building</strong> to fine-tune
              </li>
            </ol>
            <p className="text-[11px] text-emerald-700 mt-2 flex items-center gap-1">
              💡 <span className="italic">Tip: Zoom in maximum before clicking for pin-point accuracy</span>
            </p>
          </div>
        </div>
      </div>

      {/* Warning banner */}
      {warning && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 font-medium leading-relaxed">
            {warning}
          </p>
        </div>
      )}

      {/* Coordinates display */}
      {!compact && (
        <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              📍 Selected Coordinates
            </h4>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <Check className="w-3 h-3" />
              Live
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Latitude
              </label>
              <div className="bg-white rounded-lg px-3 py-2 border border-gray-200 font-mono text-sm text-gray-900">
                {markerPosition.lat.toFixed(6)}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Longitude
              </label>
              <div className="bg-white rounded-lg px-3 py-2 border border-gray-200 font-mono text-sm text-gray-900">
                {markerPosition.lng.toFixed(6)}
              </div>
            </div>
          </div>

          <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
            <Info className="w-2.5 h-2.5" />
            Zoom in and click on the exact spot for best accuracy
          </p>
        </div>
      )}
    </div>
  );
}