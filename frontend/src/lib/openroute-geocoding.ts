import { findMatchingCity } from './constants/cities';

export interface OpenRouteAddressDetails {
  formattedAddress: string;
  name?: string;
  street?: string;
  city?: string;
  stateOrProvince?: string;
  postalCode?: string;
  country?: string;
  lat?: number;
  lng?: number;
  provider?: 'openroute' | 'osm-photon' | 'osm-nominatim' | 'google';
}

export function getOpenRouteApiKey(): string {
  return (
    import.meta.env.VITE_OPENROUTESERVICE_API_KEY ||
    import.meta.env.VITE_OPENROUTE_API_KEY ||
    import.meta.env.VITE_ORS_API_KEY ||
    ''
  );
}

/**
 * Parses OpenRouteService Pelias GeoJSON feature
 */
function parseOpenRouteFeature(feature: any): OpenRouteAddressDetails {
  const props = feature.properties || {};
  const [lng, lat] = feature.geometry?.coordinates || [undefined, undefined];

  const streetPart = props.housenumber
    ? `${props.housenumber} ${props.street || ''}`.trim()
    : props.street || '';

  const cityName = props.locality || props.county || props.region || '';
  const formatted = props.label || [props.name, streetPart, cityName, props.country].filter(Boolean).join(', ');

  return {
    formattedAddress: formatted,
    name: props.name || undefined,
    street: streetPart || undefined,
    city: cityName || undefined,
    stateOrProvince: props.region || undefined,
    postalCode: props.postalcode || undefined,
    country: props.country || undefined,
    lat,
    lng,
    provider: 'openroute',
  };
}

/**
 * Parses Photon (OpenStreetMap) feature
 */
function parsePhotonFeature(feature: any): OpenRouteAddressDetails {
  const props = feature.properties || {};
  const [lng, lat] = feature.geometry?.coordinates || [undefined, undefined];

  const parts: string[] = [];
  if (props.name) parts.push(props.name);
  if (props.housenumber && props.street) {
    parts.push(`${props.housenumber} ${props.street}`);
  } else if (props.street) {
    parts.push(props.street);
  }
  if (props.city && props.city !== props.name) parts.push(props.city);
  if (props.state) parts.push(props.state);
  if (props.country) parts.push(props.country);

  const formatted = parts.length > 0 ? parts.join(', ') : props.name || 'Unknown Address';

  return {
    formattedAddress: formatted,
    name: props.name || undefined,
    street: props.street || undefined,
    city: props.city || props.town || props.village || props.district || undefined,
    stateOrProvince: props.state || undefined,
    postalCode: props.postcode || undefined,
    country: props.country || undefined,
    lat,
    lng,
    provider: 'osm-photon',
  };
}

/**
 * Parses OSM Nominatim search result
 */
function parseNominatimItem(item: any): OpenRouteAddressDetails {
  const addr = item.address || {};
  const lat = item.lat ? parseFloat(item.lat) : undefined;
  const lng = item.lon ? parseFloat(item.lon) : undefined;

  const cityName =
    addr.city ||
    addr.town ||
    addr.suburb ||
    addr.village ||
    addr.municipality ||
    addr.county ||
    '';

  return {
    formattedAddress: item.display_name || '',
    name: item.name || addr.amenity || addr.building || undefined,
    street: addr.road || undefined,
    city: cityName || undefined,
    stateOrProvince: addr.state || addr.province || undefined,
    postalCode: addr.postcode || undefined,
    country: addr.country || undefined,
    lat,
    lng,
    provider: 'osm-nominatim',
  };
}

/**
 * Searches addresses using OpenRouteService API when key is available,
 * and falls back cleanly to OpenStreetMap (Photon / Nominatim)
 */
export async function searchOpenRouteAddresses(
  query: string,
  options?: {
    countryCode?: string;
    signal?: AbortSignal;
  }
): Promise<OpenRouteAddressDetails[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) {
    return [];
  }

  const apiKey = getOpenRouteApiKey();
  const countryCode = options?.countryCode || 'lk';

  // 1. If OpenRouteService API key is present, try OpenRouteService Geocoding Autocomplete
  if (apiKey) {
    try {
      const url = new URL('https://api.openrouteservice.org/geocode/autocomplete');
      url.searchParams.set('api_key', apiKey);
      url.searchParams.set('text', trimmed);
      if (countryCode) {
        url.searchParams.set('boundary.country', countryCode.toUpperCase());
      }
      url.searchParams.set('size', '6');

      const response = await fetch(url.toString(), {
        signal: options?.signal,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.features && Array.isArray(data.features) && data.features.length > 0) {
          return data.features.map(parseOpenRouteFeature);
        }
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') throw err;
      console.warn('OpenRouteService request failed, falling back to OpenStreetMap:', err);
    }
  }

  // 2. OpenStreetMap Photon Autocomplete (Fast, global OpenStreetMap search with bias to Sri Lanka)
  try {
    const photonUrl = new URL('https://photon.komoot.io/api/');
    photonUrl.searchParams.set('q', trimmed);
    photonUrl.searchParams.set('limit', '6');
    // Location bias for Sri Lanka
    photonUrl.searchParams.set('lat', '6.9271');
    photonUrl.searchParams.set('lon', '79.8612');

    const res = await fetch(photonUrl.toString(), {
      signal: options?.signal,
    });

    if (res.ok) {
      const data = await res.json();
      if (data.features && Array.isArray(data.features) && data.features.length > 0) {
        return data.features.map(parsePhotonFeature);
      }
    }
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err;
    console.warn('Photon OSM search failed, trying Nominatim fallback:', err);
  }

  // 3. OpenStreetMap Nominatim Fallback
  try {
    const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search');
    nominatimUrl.searchParams.set('format', 'json');
    nominatimUrl.searchParams.set('addressdetails', '1');
    nominatimUrl.searchParams.set('limit', '6');
    nominatimUrl.searchParams.set('q', trimmed);
    if (countryCode) {
      nominatimUrl.searchParams.set('countrycodes', countryCode.toLowerCase());
    }

    const res = await fetch(nominatimUrl.toString(), {
      signal: options?.signal,
    });

    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        return list.map(parseNominatimItem);
      }
    }
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err;
    console.warn('Nominatim search failed:', err);
  }

  return [];
}

/**
 * Reverse geocode latitude and longitude to an address
 */
export async function reverseGeocodeCoordinates(
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<OpenRouteAddressDetails | null> {
  const apiKey = getOpenRouteApiKey();

  // Try OpenRouteService reverse
  if (apiKey) {
    try {
      const url = new URL('https://api.openrouteservice.org/geocode/reverse');
      url.searchParams.set('api_key', apiKey);
      url.searchParams.set('point.lat', lat.toString());
      url.searchParams.set('point.lon', lng.toString());
      url.searchParams.set('size', '1');

      const res = await fetch(url.toString(), { signal });
      if (res.ok) {
        const data = await res.json();
        if (data.features && data.features[0]) {
          return parseOpenRouteFeature(data.features[0]);
        }
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') throw err;
    }
  }

  // Fallback to OSM Nominatim reverse
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'json');
    url.searchParams.set('lat', lat.toString());
    url.searchParams.set('lon', lng.toString());
    url.searchParams.set('addressdetails', '1');

    const res = await fetch(url.toString(), { signal });
    if (res.ok) {
      const item = await res.json();
      if (item && item.display_name) {
        return parseNominatimItem(item);
      }
    }
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err;
  }

  return null;
}

/**
 * Resolves best matching Sri Lankan city from address details
 */
export function extractCityFromDetails(details: OpenRouteAddressDetails): string | null {
  if (details.city) {
    const match = findMatchingCity(details.city);
    if (match) return match;
  }

  if (details.formattedAddress) {
    const match = findMatchingCity(details.formattedAddress);
    if (match) return match;
  }

  return details.city || null;
}
