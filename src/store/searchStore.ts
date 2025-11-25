/**
 * Centralized Search & Filter State Management
 * Using Zustand for simple, performant state sharing across components
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// US State name to code mapping
const STATE_NAME_TO_CODE: Record<string, string> = {
  ALABAMA: 'AL',
  ALASKA: 'AK',
  ARIZONA: 'AZ',
  ARKANSAS: 'AR',
  CALIFORNIA: 'CA',
  COLORADO: 'CO',
  CONNECTICUT: 'CT',
  DELAWARE: 'DE',
  FLORIDA: 'FL',
  GEORGIA: 'GA',
  HAWAII: 'HI',
  IDAHO: 'ID',
  ILLINOIS: 'IL',
  INDIANA: 'IN',
  IOWA: 'IA',
  KANSAS: 'KS',
  KENTUCKY: 'KY',
  LOUISIANA: 'LA',
  MAINE: 'ME',
  MARYLAND: 'MD',
  MASSACHUSETTS: 'MA',
  MICHIGAN: 'MI',
  MINNESOTA: 'MN',
  MISSISSIPPI: 'MS',
  MISSOURI: 'MO',
  MONTANA: 'MT',
  NEBRASKA: 'NE',
  NEVADA: 'NV',
  'NEW HAMPSHIRE': 'NH',
  'NEW JERSEY': 'NJ',
  'NEW MEXICO': 'NM',
  'NEW YORK': 'NY',
  'NORTH CAROLINA': 'NC',
  'NORTH DAKOTA': 'ND',
  OHIO: 'OH',
  OKLAHOMA: 'OK',
  OREGON: 'OR',
  PENNSYLVANIA: 'PA',
  'RHODE ISLAND': 'RI',
  'SOUTH CAROLINA': 'SC',
  'SOUTH DAKOTA': 'SD',
  TENNESSEE: 'TN',
  TEXAS: 'TX',
  UTAH: 'UT',
  VERMONT: 'VT',
  VIRGINIA: 'VA',
  WASHINGTON: 'WA',
  'WEST VIRGINIA': 'WV',
  WISCONSIN: 'WI',
  WYOMING: 'WY',
  'DISTRICT OF COLUMBIA': 'DC',
};

export interface SearchFilters {
  // Hero search fields
  profession: string;
  location: string; // Combined city/state/zip input from hero

  // Parsed location fields (synced with hero)
  city: string;
  state: string;
  zipCode: string;

  // Filter sidebar fields
  keywords: string[]; // Array of keywords for multiple tags
  zipCodes: string[]; // Array of zip codes for multiple tags
  radius: number;
  radiusEnabled: boolean; // Toggle for radius search
  selectedProfessions: string[];

  // Bookmarks (Phase 6)
  bookmarkedIds: string[];
  showBookmarksOnly: boolean;

  // Loading state
  isLoading: boolean;
}

interface SearchStore extends SearchFilters {
  // Actions
  setProfession: (profession: string) => void;
  setLocation: (location: string) => void;
  setCity: (city: string) => void;
  setState: (state: string) => void;
  setZipCode: (zipCode: string) => void;
  addKeyword: (keyword: string) => void;
  removeKeyword: (keyword: string) => void;
  clearKeywords: () => void;
  addZipCode: (zipCode: string) => void;
  removeZipCode: (zipCode: string) => void;
  clearZipCodes: () => void;
  setRadius: (radius: number) => void;
  setRadiusEnabled: (enabled: boolean) => void;
  setSelectedProfessions: (professions: string[]) => void;
  toggleProfession: (profession: string) => void;

  // Bookmark actions
  toggleBookmark: (profileId: string) => void;
  setShowBookmarksOnly: (show: boolean) => void;

  // Loading actions
  setIsLoading: (loading: boolean) => void;

  // Utility
  clearFilters: () => void;
  parseLocation: () => void; // Parse location string into city/state/zip
  buildQueryParams: () => URLSearchParams;
}

const initialState: SearchFilters = {
  profession: '',
  location: '',
  city: '',
  state: '',
  zipCode: '',
  keywords: [],
  zipCodes: [],
  radius: 10,
  radiusEnabled: false, // Disabled by default for exact match
  selectedProfessions: [],
  bookmarkedIds: [],
  showBookmarksOnly: false,
  isLoading: false,
};

export const useSearchStore = create<SearchStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setProfession: (profession) => set({ profession }),

      setLocation: (location) => set({ location }),

      setCity: (city) => set({ city }),
      setState: (state) => set({ state }),
      setZipCode: (zipCode) => set({ zipCode }),

      addKeyword: (keyword) =>
        set((state) => ({
          keywords:
            keyword.trim() && !state.keywords.includes(keyword.trim())
              ? [...state.keywords, keyword.trim()]
              : state.keywords,
        })),

      removeKeyword: (keyword) =>
        set((state) => ({
          keywords: state.keywords.filter((k) => k !== keyword),
        })),

      clearKeywords: () => set({ keywords: [] }),

      addZipCode: (zipCode) =>
        set((state) => ({
          zipCodes:
            zipCode.trim() && !state.zipCodes.includes(zipCode.trim())
              ? [...state.zipCodes, zipCode.trim()]
              : state.zipCodes,
        })),

      removeZipCode: (zipCode) =>
        set((state) => ({
          zipCodes: state.zipCodes.filter((z) => z !== zipCode),
        })),

      clearZipCodes: () => set({ zipCodes: [] }),

      setRadius: (radius) => set({ radius }),
      setRadiusEnabled: (enabled) => set({ radiusEnabled: enabled }),
      setSelectedProfessions: (professions) =>
        set({ selectedProfessions: professions }),

      toggleProfession: (profession) =>
        set((state) => ({
          selectedProfessions: state.selectedProfessions.includes(profession)
            ? state.selectedProfessions.filter((p) => p !== profession)
            : [...state.selectedProfessions, profession],
        })),

      toggleBookmark: (profileId) =>
        set((state) => ({
          bookmarkedIds: state.bookmarkedIds.includes(profileId)
            ? state.bookmarkedIds.filter((id) => id !== profileId)
            : [...state.bookmarkedIds, profileId],
        })),

      setShowBookmarksOnly: (show) => set({ showBookmarksOnly: show }),

      setIsLoading: (loading) => set({ isLoading: loading }),

      clearFilters: () =>
        set({
          ...initialState,
          bookmarkedIds: get().bookmarkedIds, // Keep bookmarks when clearing filters
        }),

      /**
       * Parse location string to extract city, state, or zip
       * Examples:
       * - "60007" -> zipCode: "60007"
       * - "Chicago" -> city: "Chicago"
       * - "IL" or "Illinois" -> state: "IL"
       * - "CA" or "California" -> state: "CA"
       * - "Chicago, IL" -> city: "Chicago", state: "IL"
       */
      parseLocation: () => {
        const location = get().location.trim();

        if (!location) {
          set({ city: '', state: '', zipCode: '' });
          return;
        }

        // Check if it's a zip code (5 digits)
        const zipMatch = location.match(/^\d{5}$/);
        if (zipMatch) {
          set({ zipCode: location, city: '', state: '' });
          return;
        }

        // Check if it's a state code (2 letters) or state name
        const upperLocation = location.toUpperCase();
        const stateCodeMatch = location.match(/^[A-Z]{2}$/i);

        if (stateCodeMatch) {
          // Direct state code (e.g., "CA", "IL")
          set({ state: upperLocation, city: '', zipCode: '' });
          return;
        }

        // Check if it's a full state name (e.g., "California", "Illinois")
        if (STATE_NAME_TO_CODE[upperLocation]) {
          set({
            state: STATE_NAME_TO_CODE[upperLocation],
            city: '',
            zipCode: '',
          });
          return;
        }

        // Check for "City, State" pattern
        const cityStateMatch = location.match(/^([^,]+),\s*([A-Za-z\s]{2,})$/i);
        if (cityStateMatch) {
          const cityPart = cityStateMatch[1].trim();
          const statePart = cityStateMatch[2].trim().toUpperCase();

          // Try to convert state name to code if it's a full name
          const stateCode = STATE_NAME_TO_CODE[statePart] || statePart;

          set({
            city: cityPart,
            state: stateCode,
            zipCode: '',
          });
          return;
        }

        // Default: treat as city name
        set({ city: location, state: '', zipCode: '' });
      },

      /**
       * Build URL query parameters from current filters
       */
      buildQueryParams: () => {
        const state = get();
        const params = new URLSearchParams();

        if (state.profession) params.set('profession', state.profession);
        if (state.city) params.set('city', state.city);
        if (state.state) params.set('state', state.state);
        if (state.zipCode) params.set('zip', state.zipCode);

        // Handle multiple keywords - join with comma
        if (state.keywords.length > 0) {
          params.set('keywords', state.keywords.join(','));
        }

        // Handle multiple zip codes - join with comma
        if (state.zipCodes.length > 0) {
          params.set('zipCodes', state.zipCodes.join(','));
        }

        // Only add radius if it's enabled
        if (state.radiusEnabled && state.radius > 0) {
          params.set('radius', state.radius.toString());
        }

        if (state.selectedProfessions.length > 0) {
          params.set('professions', state.selectedProfessions.join(','));
        }
        if (state.showBookmarksOnly) params.set('bookmarks', 'true');

        return params;
      },
    }),
    {
      name: 'search-filters', // Cookie/localStorage key
      partialize: (state) => ({
        // Only persist bookmarks and radius preference
        bookmarkedIds: state.bookmarkedIds,
        radius: state.radius,
      }),
    }
  )
);
