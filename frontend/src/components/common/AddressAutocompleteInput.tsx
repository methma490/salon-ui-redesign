import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import {
  searchOpenRouteAddresses,
  reverseGeocodeCoordinates,
  extractCityFromDetails,
  type OpenRouteAddressDetails,
  getOpenRouteApiKey,
} from '@/lib/openroute-geocoding';
import {
  extractPlaceDetails,
  type ExtractedAddressDetails,
  loadGoogleMapsScript,
} from '@/lib/google-maps';
import { findMatchingCity } from '@/lib/constants/cities';
import { cn } from '@/lib/utils';
import { MapPin, Loader2, X, Navigation, Search } from 'lucide-react';

export type { ExtractedAddressDetails, OpenRouteAddressDetails };

export interface AddressAutocompleteInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onCitySelect?: (city: string) => void;
  onPlaceSelect?: (place: ExtractedAddressDetails | OpenRouteAddressDetails) => void;
  className?: string;
  id?: string;
  placeholder?: string;
  showLocationButton?: boolean;
}

export const AddressAutocompleteInput: React.FC<AddressAutocompleteInputProps> = ({
  value,
  onChange,
  onCitySelect,
  onPlaceSelect,
  className,
  id = 'address-input',
  placeholder = 'Search address or street location...',
  disabled,
  showLocationButton = true,
  ...props
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<any>(null);

  const [suggestions, setSuggestions] = useState<OpenRouteAddressDetails[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isMapsLoaded, setIsMapsLoaded] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSelectedFromDropdownRef = useRef(false);

  // Check Google Maps support if configured
  useEffect(() => {
    let isMounted = true;
    loadGoogleMapsScript().then((loaded) => {
      if (isMounted && loaded) {
        setIsMapsLoaded(true);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Google Maps Places fallback if Google script is loaded
  useEffect(() => {
    if (!isMapsLoaded || !inputRef.current || autocompleteRef.current) {
      return;
    }

    try {
      const googleObj = typeof window !== 'undefined' ? (window as any).google : null;
      if (!googleObj?.maps?.places?.Autocomplete) return;

      const autocomplete = new googleObj.maps.places.Autocomplete(inputRef.current, {
        types: ['geocode', 'establishment'],
        componentRestrictions: { country: 'lk' },
        fields: ['formatted_address', 'geometry', 'name', 'address_components'],
      });

      const listener = autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place) return;

        const details = extractPlaceDetails(place);
        const chosenAddress = details.formattedAddress || inputRef.current?.value || '';

        isSelectedFromDropdownRef.current = true;
        onChange(chosenAddress);
        setIsOpen(false);

        if (onPlaceSelect) {
          onPlaceSelect(details);
        }

        if (details.city && onCitySelect) {
          const matched = findMatchingCity(details.city);
          onCitySelect(matched || details.city);
        }
      });

      autocompleteRef.current = autocomplete;

      return () => {
        if (googleObj?.maps?.event && listener) {
          googleObj.maps.event.removeListener(listener);
        }
        autocompleteRef.current = null;
      };
    } catch (err) {
      console.warn('Google Maps Autocomplete setup notice:', err);
    }
  }, [isMapsLoaded, onChange, onCitySelect, onPlaceSelect]);

  // OpenRoute / OpenStreetMap Search Handler with debounce
  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      if (!query || query.trim().length < 2) {
        setSuggestions([]);
        setIsOpen(false);
        setIsLoading(false);
        return;
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsLoading(true);

      try {
        const results = await searchOpenRouteAddresses(query, {
          countryCode: 'lk',
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setSuggestions(results);
          setIsOpen(results.length > 0);
          setHighlightedIndex(-1);
        }
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          console.warn('Address search error:', err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    []
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    isSelectedFromDropdownRef.current = false;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 300);
  };

  const handleSelectSuggestion = (item: OpenRouteAddressDetails) => {
    isSelectedFromDropdownRef.current = true;
    onChange(item.formattedAddress);
    setIsOpen(false);
    setSuggestions([]);

    if (onPlaceSelect) {
      onPlaceSelect(item);
    }

    const detectedCity = extractCityFromDetails(item);
    if (detectedCity && onCitySelect) {
      onCitySelect(detectedCity);
    }
  };

  // Locate current position with GPS + OpenRoute / OSM reverse geocoding
  const handleLocateCurrentPosition = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const result = await reverseGeocodeCoordinates(latitude, longitude);

          if (result && result.formattedAddress) {
            isSelectedFromDropdownRef.current = true;
            onChange(result.formattedAddress);

            if (onPlaceSelect) {
              onPlaceSelect(result);
            }

            const city = extractCityFromDetails(result);
            if (city && onCitySelect) {
              onCitySelect(city);
            }
          } else {
            onChange(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          }
        } catch (err) {
          console.warn('Reverse geocode error:', err);
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        console.warn('Geolocation failed:', err.message);
        setIsLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Keyboard navigation for dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'ArrowDown' && suggestions.length > 0) {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const hasOrsKey = Boolean(getOpenRouteApiKey());

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex w-full items-center">
        <Input
          {...props}
          ref={inputRef}
          id={id}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0 && !isSelectedFromDropdownRef.current) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled || isLocating}
          autoComplete="off"
          className={cn(
            'h-8 text-sm pr-16 pl-8 transition-colors',
            isOpen && 'ring-1 ring-primary/40',
            className
          )}
        />

        {/* Leading Search / Pin Icon */}
        <div className="pointer-events-none absolute left-2.5 flex items-center text-muted-foreground/70">
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          ) : (
            <Search className="h-3.5 w-3.5" />
          )}
        </div>

        {/* Action icons on right */}
        <div className="absolute right-2 flex items-center gap-1">
          {value && !disabled && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setSuggestions([]);
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground/60 hover:bg-muted hover:text-foreground transition-colors"
              title="Clear address"
            >
              <X className="h-3 w-3" />
            </button>
          )}

          {showLocationButton && !disabled && (
            <button
              type="button"
              onClick={handleLocateCurrentPosition}
              disabled={isLocating}
              className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground/70 hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50"
              title="Use current location (OpenRoute / GPS)"
            >
              {isLocating ? (
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
              ) : (
                <Navigation className="h-3 w-3" />
              )}
            </button>
          )}

          <div
            className="flex items-center text-muted-foreground/60"
            title={
              hasOrsKey
                ? 'OpenRouteService API address search active'
                : 'OpenStreetMap route & address search active'
            }
          >
            <MapPin className={cn('h-3.5 w-3.5', (hasOrsKey || isMapsLoaded) ? 'text-primary/70' : 'text-emerald-500/70')} />
          </div>
        </div>
      </div>

      {/* Autocomplete Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border/80 bg-popover/95 p-1 text-popover-foreground shadow-lg backdrop-blur-md animate-in fade-in-0 zoom-in-95 duration-100">
          <div className="px-2 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase flex items-center justify-between border-b border-border/40 mb-1">
            <span>Address Suggestions</span>
            <span className="text-[9px] font-normal lowercase opacity-75">
              via {hasOrsKey ? 'openrouteservice' : 'open route / osm'}
            </span>
          </div>
          <ul className="space-y-0.5">
            {suggestions.map((item, idx) => {
              const isSelected = idx === highlightedIndex;
              return (
                <li
                  key={`${item.formattedAddress}-${idx}`}
                  onClick={() => handleSelectSuggestion(item)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={cn(
                    'flex cursor-pointer items-start gap-2.5 rounded-md px-2.5 py-1.5 text-xs transition-colors select-none',
                    isSelected
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-muted/70 text-foreground'
                  )}
                >
                  <MapPin className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', isSelected ? 'text-primary' : 'text-muted-foreground/70')} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium leading-tight">
                      {item.name || item.street || item.formattedAddress}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground leading-tight mt-0.5">
                      {item.formattedAddress}
                    </p>
                  </div>
                  {item.city && (
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground font-normal">
                      {item.city}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
