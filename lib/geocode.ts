// lib/geocode.ts

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeocodeResult {
  coordinates: Coordinates | null;
  formattedAddress: string | null;
  error?: string;
}

/**
 * Convert address to coordinates using Google Geocoding API
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error('Google Maps API key not found');
    return {
      coordinates: null,
      formattedAddress: null,
      error: 'API key not configured',
    };
  }

  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}&region=pk`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0];
      return {
        coordinates: {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
        },
        formattedAddress: result.formatted_address,
      };
    } else if (data.status === 'ZERO_RESULTS') {
      return {
        coordinates: null,
        formattedAddress: null,
        error: 'Address not found',
      };
    } else {
      console.error('Geocoding error:', data.status, data.error_message);
      return {
        coordinates: null,
        formattedAddress: null,
        error: data.error_message || data.status,
      };
    }
  } catch (error: any) {
    console.error('Geocoding request failed:', error);
    return {
      coordinates: null,
      formattedAddress: null,
      error: error.message,
    };
  }
}

/**
 * Build full address string from property fields
 */
export function buildAddressString(
  streetNumber?: string,
  block?: string,
  phase?: string,
  society?: string,
  city?: string
): string {
  const parts = [];

  if (streetNumber) parts.push(streetNumber);
  if (block) parts.push(block);
  if (phase) parts.push(phase);
  if (society) parts.push(society);
  if (city) parts.push(city);

  // Always add Pakistan for better accuracy
  parts.push('Pakistan');

  return parts.join(', ');
}

// ═══════════════════════════════════════════════════════════════
// V6.8.11: MAP URL BUILDERS & VALIDATION HELPERS
// Extends existing geocoding with Google Maps URL utilities
// ═══════════════════════════════════════════════════════════════

/**
 * Validate coordinates are within acceptable range
 */
export function isValidCoordinates(lat: unknown, lng: unknown): boolean {
  const latNum = Number(lat);
  const lngNum = Number(lng);
  return (
    Number.isFinite(latNum) &&
    Number.isFinite(lngNum) &&
    latNum >= -90 && latNum <= 90 &&
    lngNum >= -180 && lngNum <= 180
  );
}

/**
 * Check if coordinates are within Pakistan bounds
 * Pakistan bounding box:
 *   • North: 37.084 (Chitral)
 *   • South: 23.694 (Karachi/Gwadar coast)
 *   • East:  77.837 (Kashmir)
 *   • West:  60.878 (Balochistan/Iran border)
 */
export function isInPakistan(lat: number, lng: number): boolean {
  return lat >= 23.694 && lat <= 37.084 && lng >= 60.878 && lng <= 77.837;
}

/**
 * Build Google Maps directions URL
 * Opens in Google Maps app on mobile, web on desktop
 *
 * @param lat - Destination latitude
 * @param lng - Destination longitude
 * @param label - Optional destination label (address)
 */
export function buildDirectionsUrl(
  lat: number,
  lng: number,
  label?: string
): string {
  if (label) {
    // With label — better display in Google Maps
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodeURIComponent(label)}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/**
 * Build Google Maps "view location" URL
 * Just shows the location without directions
 */
export function buildViewLocationUrl(
  lat: number,
  lng: number,
  label?: string
): string {
  if (label) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`;
  }
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

/**
 * Build Google Static Maps API URL
 * Returns image URL showing map with pin at given coordinates
 *
 * @param lat - Latitude
 * @param lng - Longitude
 * @param options - Map customization options
 * @returns Static map image URL
 *
 * Requires: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable
 * Cost: FREE up to 28,000 requests/month, then $2 per 1000
 */
export function buildStaticMapUrl(
  lat: number,
  lng: number,
  options: {
    zoom?:      number;   // 1-20 (10=city, 15=street, 18=building)
    width?:     number;   // Max 640 without premium
    height?:    number;   // Max 640 without premium
    marker?:    boolean;  // Show pin at location
    mapType?:   'roadmap' | 'satellite' | 'hybrid' | 'terrain';
    scale?:     1 | 2;    // 2 = retina display
  } = {}
): string {
  const {
    zoom     = 15,
    width    = 600,
    height   = 300,
    marker   = true,
    mapType  = 'roadmap',
    scale    = 2,
  } = options;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn('[Static Map] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY missing');
    return '';
  }

  const params = new URLSearchParams({
    center:   `${lat},${lng}`,
    zoom:     String(Math.max(1, Math.min(20, zoom))),
    size:     `${Math.min(640, width)}x${Math.min(640, height)}`,
    scale:    String(scale),
    maptype:  mapType,
    key:      apiKey,
  });

  // Add custom marker (Highrise brand color: teal)
  if (marker) {
    params.set('markers', `color:0x029bba|size:mid|${lat},${lng}`);
  }

  return `https://maps.googleapis.com/maps/api/staticmap?${params}`;
}

/**
 * Build Google Maps embed URL (for iframes if needed later)
 */
export function buildEmbedMapUrl(
  lat: number,
  lng: number,
  zoom: number = 15
): string {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return '';
  return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${lat},${lng}&zoom=${zoom}`;
}
