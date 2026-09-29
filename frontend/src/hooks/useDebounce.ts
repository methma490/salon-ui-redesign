import { useEffect, useState } from 'react';

/**
 * Custom hook to debounce any value (e.g. search term, input text)
 * @param value The raw input value
 * @param delay Debounce delay in milliseconds (default: 400ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay = 400): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Custom hook specialized for API search inputs.
 * Ensures:
 * 1. Debouncing (default: 400ms)
 * 2. Minimum character threshold (default: 2 characters) before sending to query,
 *    unless string is empty (which resets search).
 * 3. Prevents premature single-character queries.
 *
 * @param search The raw search string
 * @param delay Debounce delay in ms (default: 400ms)
 * @param minChars Minimum characters required for a search query (default: 2)
 */
export function useDebouncedSearch(search: string, delay = 400, minChars = 2): string {
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = search.trim();
      if (!trimmed) {
        setDebouncedQuery('');
      } else if (trimmed.length >= minChars) {
        setDebouncedQuery(trimmed);
      }
      // If 1 <= trimmed.length < minChars, we do not update debouncedQuery to prevent wasteful queries
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [search, delay, minChars]);

  return debouncedQuery;
}
