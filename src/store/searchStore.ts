/**
 * Centralized Search & Filter State Management
 * Using Zustand for simple, performant state sharing across components
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SearchFilters {
  // Hero search fields
  profession: string;
  location: string; // Combined city/state/zip input from hero

  // Parsed location fields (synced with hero)
  city: string;
  state: string;
  zipCode: string;

  // Filter sidebar fields
  keywords: string;
  radius: number;
  selectedProfessions: string[];

  // Bookmarks (Phase 6)
  bookmarkedIds: string[];
  showBookmarksOnly: boolean;
}

interface SearchStore extends SearchFilters {
  // Actions
  setProfession: (profession: string) => void;
  setLocation: (location: string) => void;
  setCity: (city: string) => void;
  setState: (state: string) => void;
  setZipCode: (zipCode: string) => void;
  setKeywords: (keywords: string) => void;
  setRadius: (radius: number) => void;
  setSelectedProfessions: (professions: string[]) => void;
  toggleProfession: (profession: string) => void;

  // Bookmark actions
  toggleBookmark: (profileId: string) => void;
  setShowBookmarksOnly: (show: boolean) => void;

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
  keywords: '',
  radius: 10,
  selectedProfessions: [],
  bookmarkedIds: [],
  showBookmarksOnly: false,
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
      setKeywords: (keywords) => set({ keywords }),
      setRadius: (radius) => set({ radius }),
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
       * - "IL" -> state: "IL"
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

        // Check if it's a state code (2 letters)
        const stateMatch = location.match(/^[A-Z]{2}$/i);
        if (stateMatch) {
          set({ state: location.toUpperCase(), city: '', zipCode: '' });
          return;
        }

        // Check for "City, State" pattern
        const cityStateMatch = location.match(/^([^,]+),\s*([A-Z]{2})$/i);
        if (cityStateMatch) {
          set({
            city: cityStateMatch[1].trim(),
            state: cityStateMatch[2].toUpperCase(),
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
        if (state.keywords) params.set('keywords', state.keywords);
        if (state.radius !== 10) params.set('radius', state.radius.toString());
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
