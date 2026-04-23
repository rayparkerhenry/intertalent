/**
 * SearchParamsSyncer Component
 * Syncs URL search params with Zustand store on page load
 * This ensures store state matches URL when user navigates back/forward or shares link
 */

'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSearchStore } from '@/store/searchStore';
import { useCampaignStore } from '@/store/campaignStore'

export default function SearchParamsSyncer() {
  const searchParams = useSearchParams();

  // Extract only setters (stable references)
  const setCity = useSearchStore((state) => state.setCity);
  const setState = useSearchStore((state) => state.setState);
  const setZipCode = useSearchStore((state) => state.setZipCode);
  const addKeyword = useSearchStore((state) => state.addKeyword);
  const clearKeywords = useSearchStore((state) => state.clearKeywords);
  const addZipCode = useSearchStore((state) => state.addZipCode);
  const clearZipCodes = useSearchStore((state) => state.clearZipCodes);
  const setRadius = useSearchStore((state) => state.setRadius);
  const setRadiusEnabled = useSearchStore((state) => state.setRadiusEnabled);
  const setSelectedProfessions = useSearchStore(
    (state) => state.setSelectedProfessions
  );
  const setLocation = useSearchStore((state) => state.setLocation);
  const setShowBookmarksOnly = useSearchStore(
    (state) => state.setShowBookmarksOnly
  );

  // added on 4/15 by MS for TT campaign param pasthrough 
  const setCampaign = useCampaignStore((s) => s.setCampaign);
  const setHydrated = useCampaignStore((s) => s.setHydrated);
  //merged on 4/16 by MS 
  const setOffice = useSearchStore((state) => state.setOffice);
  const setPropertyId = useSearchStore((state) => state.setPropertyId);

  useEffect(() => {
    // Only sync once on mount or when URL changes

    // Sync URL params to store
    const city = searchParams.get('city') || '';
    const state = searchParams.get('state') || '';
    const zip = searchParams.get('zip') || '';
    const keywordsParam = searchParams.get('keywords') || '';
    const zipCodesParam = searchParams.get('zipCodes') || '';
    const radiusParam = searchParams.get('radius');
    const parsedRadius = radiusParam ? parseInt(radiusParam, 10) : NaN;
    const radius = Number.isFinite(parsedRadius) && parsedRadius > 0 ? parsedRadius : 15;
    const radiusEnabled = radiusParam !== null; // If radius in URL, it's enabled
    const professionsParam = searchParams.get('professions') || '';
    const professions = professionsParam
      ? professionsParam
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
      : [];
    const showBookmarks = searchParams.get('bookmarks') === 'true';
    const officeParam = searchParams.get('office') || '';
    const propertyIdParam = searchParams.get('propertyId');
    const propertyId =
      propertyIdParam && /^\d+$/.test(propertyIdParam)
        ? Number(propertyIdParam)
        : null;

    // added on 4/15 by MS for TT campaign param pasthrough 
    const contactName = searchParams.get('contactName');
    const customerName = searchParams.get('customerName');
    const department = searchParams.get('department');
    const campaignLocation = searchParams.get('location');

    const hasCampaignParams =
      contactName || customerName || department || campaignLocation;

    // 👇 THEN session fallback
    if (!hasCampaignParams) {
      const stored = sessionStorage.getItem('campaignData');

      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setCampaign(parsed);
        } catch {
          console.warn('Failed to parse session campaign data');
        }
      }
    }


    // Update store (these are stable functions)
    setCity(city);
    setState(state);
    setZipCode(zip);
    setOffice(officeParam);

    // Clear and rebuild keywords from URL
    clearKeywords();
    if (keywordsParam) {
      const keywords = keywordsParam
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0);
      keywords.forEach((keyword) => addKeyword(keyword));
    }

    // Clear and rebuild zip codes from URL
    clearZipCodes();
    if (zipCodesParam) {
      const zipCodes = zipCodesParam
        .split(',')
        .map((z) => z.trim())
        .filter((z) => z.length > 0);
      zipCodes.forEach((zipCode) => addZipCode(zipCode));
    }

    setRadius(radius);
    setRadiusEnabled(radiusEnabled);
    setSelectedProfessions(professions);
    setShowBookmarksOnly(showBookmarks);
    setPropertyId(propertyId);

    // added on 4/15 by MS for TT campaign param pasthrough 
    if (contactName || customerName || department || campaignLocation) {
      setCampaign({
        contactName,
        customerName,
        department,
        location: campaignLocation,
      });
    }

    // Reconstruct location string for hero search (marketing hero; client portal hero uses property/profession selects)
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
    } else {
      setLocation('');
    }

    // Auto-scroll to results section if there are search filters
    const hasSearchFilters =
      !!keywordsParam ||
      !!zipCodesParam ||
      !!city ||
      !!state ||
      !!zip ||
      !!professionsParam ||
      !!radiusParam ||
      !!officeParam ||
      showBookmarks;

    if (hasSearchFilters) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) {
          resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
    setHydrated(true);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]); // Only depend on params string

  return null; // This component doesn't render anything
}
