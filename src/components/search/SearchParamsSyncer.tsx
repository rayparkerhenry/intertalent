/**
 * SearchParamsSyncer Component
 * Syncs URL search params with Zustand store on page load
 * This ensures store state matches URL when user navigates back/forward or shares link
 */

'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSearchStore } from '@/store/searchStore';

export default function SearchParamsSyncer() {
  const searchParams = useSearchParams();
  const hasInitialized = useRef(false);

  // Extract only setters (stable references)
  const setProfession = useSearchStore((state) => state.setProfession);
  const setCity = useSearchStore((state) => state.setCity);
  const setState = useSearchStore((state) => state.setState);
  const setZipCode = useSearchStore((state) => state.setZipCode);
  const setKeywords = useSearchStore((state) => state.setKeywords);
  const setRadius = useSearchStore((state) => state.setRadius);
  const setSelectedProfessions = useSearchStore(
    (state) => state.setSelectedProfessions
  );
  const setLocation = useSearchStore((state) => state.setLocation);
  const setShowBookmarksOnly = useSearchStore(
    (state) => state.setShowBookmarksOnly
  );

  useEffect(() => {
    // Only sync once on mount or when URL changes
    const paramsString = searchParams.toString();

    // Sync URL params to store
    const profession = searchParams.get('profession') || '';
    const city = searchParams.get('city') || '';
    const state = searchParams.get('state') || '';
    const zip = searchParams.get('zip') || '';
    const keywords = searchParams.get('keywords') || '';
    const radius = parseInt(searchParams.get('radius') || '10');
    const professions =
      searchParams.get('professions')?.split(',').filter(Boolean) || [];
    const showBookmarks = searchParams.get('bookmarks') === 'true';

    // Update store (these are stable functions)
    setProfession(profession);
    setCity(city);
    setState(state);
    setZipCode(zip);
    setKeywords(keywords);
    setRadius(radius);
    setSelectedProfessions(professions);
    setShowBookmarksOnly(showBookmarks);

    // Reconstruct location string for hero search
    let locationStr = '';
    if (zip) {
      locationStr = zip;
    } else if (city && state) {
      locationStr = `${city}, ${state}`;
    } else if (city) {
      locationStr = city;
    } else if (state) {
      locationStr = state;
    }

    if (locationStr) {
      setLocation(locationStr);
    }

    hasInitialized.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]); // Only depend on params string

  return null; // This component doesn't render anything
}
