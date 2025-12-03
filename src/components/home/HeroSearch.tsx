'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchStore } from '@/store/searchStore';

// Constants for validation
const MAX_LOCATION_LENGTH = 50;

// Validate if input looks like a zip code attempt (starts with digits)
const looksLikeZipCode = (value: string): boolean => {
  return /^\d+$/.test(value.trim());
};

// Validate zip code format - must be exactly 5 digits
const isValidZipCode = (zip: string): boolean => {
  return /^\d{5}$/.test(zip.trim());
};

// Sanitize location input - remove special characters that could cause issues
const sanitizeLocation = (value: string): string => {
  // Allow letters, numbers, spaces, commas, periods, and hyphens
  return value.replace(/[^a-zA-Z0-9\s,.-]/g, '').slice(0, MAX_LOCATION_LENGTH);
};

export default function HeroSearch() {
  const router = useRouter();
  const [professions, setProfessions] = useState<string[]>([]);
  const dropdownChangedRef = useRef(false); // Track if user changed the dropdown
  const [locationError, setLocationError] = useState('');

  // Use Zustand store for state management
  const location = useSearchStore((state) => state.location);
  const setLocation = useSearchStore((state) => state.setLocation);
  const parseLocation = useSearchStore((state) => state.parseLocation);
  const addZipCode = useSearchStore((state) => state.addZipCode);
  const setZipCode = useSearchStore((state) => state.setZipCode);
  const selectedProfessions = useSearchStore(
    (state) => state.selectedProfessions
  );
  const setSelectedProfessions = useSearchStore(
    (state) => state.setSelectedProfessions
  );
  const buildQueryParams = useSearchStore((state) => state.buildQueryParams);
  const setIsLoading = useSearchStore((state) => state.setIsLoading);

  // Derive dropdown value from store: only show if there's exactly one profession
  const selectedProfession =
    selectedProfessions.length === 1 ? selectedProfessions[0] : '';

  // Fetch professions on mount
  useEffect(() => {
    const fetchProfessions = async () => {
      try {
        const res = await fetch('/api/professions');
        const data = await res.json();
        setProfessions(data.data || []);
      } catch (error) {
        console.error('Error fetching professions:', error);
      }
    };
    fetchProfessions();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate location if it looks like a zip code
    const trimmedLocation = location.trim();
    if (trimmedLocation && looksLikeZipCode(trimmedLocation)) {
      if (!isValidZipCode(trimmedLocation)) {
        setLocationError('Please enter a valid 5-digit zip code');
        return;
      }
    }

    // Clear any previous error
    setLocationError('');

    // Only update profession filters if the user explicitly changed the dropdown
    // Don't touch professions if dropdown is in "ambiguous" state (multiple selected in sidebar)
    if (dropdownChangedRef.current) {
      if (selectedProfession) {
        // Replace any existing profession selection (hero search = single selection)
        setSelectedProfessions([selectedProfession]);
      } else {
        // Clear profession filter when user explicitly selected "Select Profession"
        setSelectedProfessions([]);
      }
      // Reset the flag after using it
      dropdownChangedRef.current = false;
    }
    // If dropdownChangedRef.current is false, leave selectedProfessions unchanged

    // Parse location before building query params
    parseLocation();

    // Small delay to ensure state updates
    setTimeout(() => {
      // Get the latest parsed values from store after parsing
      const currentZipCode = useSearchStore.getState().zipCode;
      const currentCity = useSearchStore.getState().city;
      const currentState = useSearchStore.getState().state;

      // If location was a zip code, add it to zipCodes array for tag display
      if (currentZipCode) {
        addZipCode(currentZipCode);
        // Clear the legacy single zipCode field to avoid conflicts
        setZipCode('');
        // Clear the location input since zip code becomes a tag
        setLocation('');
      } else if (currentCity || currentState) {
        // If it's a city or state, keep it displayed in the input
        // Don't clear it because it doesn't appear as a tag
        // User should see what they searched for
      } else {
        // If nothing was parsed, clear the input
        setLocation('');
      }

      // Build query params from store
      const params = buildQueryParams();
      const newSearch = params.toString();

      // Only show loading and navigate if the search is actually different
      const currentSearch = window.location.search.substring(1);
      if (newSearch !== currentSearch) {
        setIsLoading(true);
        router.push(`/?${newSearch}`);
      }
    }, 0);
  };

  return (
    <section className="relative bg-[#1e3a5f] text-white overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat h-[850px]"
        style={{ backgroundImage: 'url(/bg-hero1.jpg)' }}
      />

      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-black/50"></div>

      <div className="relative container mx-auto px-4 py-12 flex flex-col justify-end h-[600px]">
        {/* Text Content - Left Aligned */}
        <div className="max-w-2xl text-left mb-8 md:mb-12">
          {/* Small label */}
          <p className="text-sm md:text-base text-gray-200 mb-2 tracking-wide">
            Discover Talent
          </p>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-3 md:mb-4">
            Search Candidates
          </h1>

          {/* Subtitle */}
          <p className="text-base md:text-lg text-gray-200">
            Find the right Maintenance Professional to complete the job.
          </p>
        </div>

        {/* Search Form - Center Aligned, Full Width */}
        <div className="flex justify-center w-full">
          <form
            onSubmit={handleSearch}
            className="flex flex-col md:flex-row gap-3 md:gap-2 items-stretch w-full max-w-3xl md:bg-white md:rounded-full md:shadow-2xl md:p-2"
          >
            {/* Profession Dropdown */}
            <div className="flex-1 flex items-center px-4 py-3 min-w-0 bg-white rounded-full shadow-lg md:shadow-none">
              <svg
                className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <select
                value={selectedProfession}
                onChange={(e) => {
                  const value = e.target.value;
                  dropdownChangedRef.current = true; // Mark that user changed the dropdown
                  if (value) {
                    // Update store immediately when user selects from dropdown
                    setSelectedProfessions([value]);
                  } else {
                    // Clear profession filter when user selects "Select Profession"
                    setSelectedProfessions([]);
                  }
                }}
                className="flex-1 outline-none text-gray-800 placeholder-gray-400 bg-transparent text-sm md:text-base min-w-0"
              >
                <option value="">Select Profession</option>
                {professions.map((prof) => (
                  <option key={prof} value={prof}>
                    {prof}
                  </option>
                ))}
              </select>
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px h-8 bg-gray-300 self-center"></div>

            {/* Location Input */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center px-4 py-3 bg-white rounded-full md:rounded-none shadow-lg md:shadow-none">
                <svg
                  className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Zip, City or State"
                  value={location}
                  onChange={(e) => {
                    const sanitized = sanitizeLocation(e.target.value);
                    setLocation(sanitized);
                    if (locationError) setLocationError('');
                  }}
                  onBlur={() => {
                    // Validate on blur if it looks like a zip code
                    const trimmed = location.trim();
                    if (
                      trimmed &&
                      looksLikeZipCode(trimmed) &&
                      !isValidZipCode(trimmed)
                    ) {
                      setLocationError('Please enter a valid 5-digit zip code');
                    } else {
                      setLocationError('');
                      // Parse location immediately when user leaves the input field
                      if (trimmed) {
                        parseLocation();
                      }
                    }
                  }}
                  maxLength={MAX_LOCATION_LENGTH}
                  className={`flex-1 outline-none text-gray-800 placeholder-gray-400 text-sm md:text-base min-w-0 caret-gray-800 ${
                    locationError ? 'text-red-600' : ''
                  }`}
                />
              </div>
              {locationError && (
                <p className="mt-1 ml-4 text-xs text-red-400">
                  {locationError}
                </p>
              )}
            </div>

            {/* Search Button */}
            <button
              type="submit"
              className="bg-[#ef4444] hover:bg-[#dc2626] text-white font-semibold px-6 md:px-8 py-3 rounded-full transition-colors text-sm md:text-base whitespace-nowrap shadow-lg md:shadow-none"
            >
              Search
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
