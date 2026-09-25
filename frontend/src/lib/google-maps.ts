let googleMapsLoadingPromise: Promise<boolean> | null = null;

export function getGoogleMapsApiKey(): string {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
}

export function loadGoogleMapsScript(apiKey?: string): Promise<boolean> {
  const key = apiKey || getGoogleMapsApiKey();
  if (!key) {
    return Promise.resolve(false);
  }

  if (typeof window !== 'undefined' && (window as any).google?.maps?.places) {
    return Promise.resolve(true);
  }

  if (googleMapsLoadingPromise) {
    return googleMapsLoadingPromise;
  }

  googleMapsLoadingPromise = new Promise<boolean>((resolve) => {
    // Check if already injected
    const existingScript = document.querySelector('script[data-google-maps-script]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-google-maps-script', 'true');

    script.onload = () => {
      resolve(true);
    };

    script.onerror = () => {
      console.warn('Failed to load Google Maps Places API script.');
      resolve(false);
    };

    document.head.appendChild(script);
  });

  return googleMapsLoadingPromise;
}

export interface ExtractedAddressDetails {
  formattedAddress: string;
  city?: string;
  stateOrProvince?: string;
  postalCode?: string;
  country?: string;
  lat?: number;
  lng?: number;
}

export function extractPlaceDetails(place: any): ExtractedAddressDetails {
  const details: ExtractedAddressDetails = {
    formattedAddress: place.formatted_address || place.name || '',
  };

  if (place.geometry?.location) {
    details.lat = place.geometry.location.lat();
    details.lng = place.geometry.location.lng();
  }

  if (place.address_components) {
    for (const comp of place.address_components) {
      const types = comp.types;
      if (types.includes('locality') || types.includes('postal_town') || types.includes('sublocality_level_1')) {
        if (!details.city) {
          details.city = comp.long_name;
        }
      } else if (types.includes('administrative_area_level_2')) {
        if (!details.city) {
          details.city = comp.long_name;
        }
      } else if (types.includes('administrative_area_level_1')) {
        details.stateOrProvince = comp.long_name;
      } else if (types.includes('postal_code')) {
        details.postalCode = comp.long_name;
      } else if (types.includes('country')) {
        details.country = comp.long_name;
      }
    }
  }

  return details;
}
