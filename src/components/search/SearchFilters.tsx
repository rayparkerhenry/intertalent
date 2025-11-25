'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSearchStore } from '@/store/searchStore';

interface SearchFiltersProps {
  className?: string;
}

export default function SearchFilters({ className = '' }: SearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [professions, setProfessions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Use Zustand store for filter state
  const keywords = useSearchStore((state) => state.keywords);
  const zipCode = useSearchStore((state) => state.zipCode);
  const radius = useSearchStore((state) => state.radius);
  const radiusEnabled = useSearchStore((state) => state.radiusEnabled);
  const selectedProfessions = useSearchStore(
    (state) => state.selectedProfessions
  );

  const setKeywords = useSearchStore((state) => state.setKeywords);
  const setZipCode = useSearchStore((state) => state.setZipCode);
  const setRadius = useSearchStore((state) => state.setRadius);
  const setRadiusEnabled = useSearchStore((state) => state.setRadiusEnabled);
  const toggleProfession = useSearchStore((state) => state.toggleProfession);
  const clearFilters = useSearchStore((state) => state.clearFilters);
  const buildQueryParams = useSearchStore((state) => state.buildQueryParams);
  const setIsLoading = useSearchStore((state) => state.setIsLoading);

  // Fetch filter options on mount
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const professionsRes = await fetch('/api/professions');
        const professionsData = await professionsRes.json();
        setProfessions(professionsData.data || []);
      } catch (error) {
        console.error('Error fetching professions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFilters();
  }, []);

  const applyFilters = () => {
    setIsLoading(true);
    const params = buildQueryParams();
    router.push(`/?${params.toString()}`);
  };

  const handleClearFilters = () => {
    setIsLoading(true);
    clearFilters();
    router.push('/');
  };

  const removeKeyword = () => {
    setKeywords('');
  };

  const removeZipCode = () => {
    setZipCode('');
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}
    >
      <div className="space-y-6">
        {/* Keyword Search */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Keyword Search
          </label>
          <input
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            placeholder="Keyword"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-gray-900 caret-gray-900"
          />
          {/* Keyword Pill */}
          {keywords && (
            <div className="mt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1e3a5f] text-white text-xs font-medium rounded-full">
                {keywords}
                <button
                  onClick={removeKeyword}
                  className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                  aria-label="Remove keyword"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </span>
            </div>
          )}
        </div>

        {/* Zip Code */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Zip Code
          </label>
          <input
            type="text"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            placeholder="Zip Code"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-gray-900 caret-gray-900"
          />
          {/* Zip Code Pill */}
          {zipCode && (
            <div className="mt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1e3a5f] text-white text-xs font-medium rounded-full">
                {zipCode}
                <button
                  onClick={removeZipCode}
                  className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                  aria-label="Remove zip code"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </span>
            </div>
          )}
        </div>

        {/* Radius Slider with Toggle */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label
              className={`text-sm font-semibold ${radiusEnabled ? 'text-gray-900' : 'text-gray-400'}`}
            >
              Radius ({radius} mi.)
            </label>
            {/* Toggle Switch */}
            <button
              onClick={() => setRadiusEnabled(!radiusEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:ring-offset-2 ${
                radiusEnabled ? 'bg-[#1e3a5f]' : 'bg-gray-300'
              }`}
              role="switch"
              aria-checked={radiusEnabled}
              aria-label="Toggle radius search"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  radiusEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div
            className={`px-1 ${!radiusEnabled && 'opacity-40 pointer-events-none'}`}
          >
            <div className="relative">
              {/* Background track */}
              <div className="absolute top-1/2 -translate-y-1/2 w-full h-1 bg-gray-300 rounded-full" />
              {/* Filled track */}
              <div
                className="absolute top-1/2 -translate-y-1/2 h-1 bg-[#1e3a5f] rounded-full"
                style={{ width: `${((radius - 5) / 20) * 100}%` }}
              />
              {/* Range input */}
              <input
                type="range"
                min="5"
                max="25"
                step="1"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                disabled={!radiusEnabled}
                className="relative w-full appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#1e3a5f] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#1e3a5f] [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer disabled:cursor-not-allowed"
                style={{ zIndex: 10 }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-2">
              <span>5</span>
              <span>10</span>
              <span>15</span>
              <span>20</span>
              <span>25</span>
            </div>
          </div>
        </div>

        {/* Profession Checkboxes */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Profession
          </label>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-5 bg-gray-200 rounded animate-pulse"
                ></div>
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
              {professions.slice(0, 5).map((profession) => (
                <label
                  key={profession}
                  className="flex items-center cursor-pointer group"
                >
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedProfessions.includes(profession)}
                      onChange={() => toggleProfession(profession)}
                      className="peer w-5 h-5 rounded-md border-2 border-gray-300 appearance-none cursor-pointer checked:bg-[#1e3a5f] checked:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f] focus:ring-offset-0 transition-colors"
                    />
                    {/* Checkmark icon */}
                    <svg
                      className="absolute left-0.5 w-4 h-4 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span className="ml-2.5 text-sm text-gray-700 group-hover:text-gray-900">
                    {profession}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Apply Filter Button */}
        <button
          onClick={applyFilters}
          className="w-full bg-[#1e3a5f] hover:bg-[#2d5a8f] text-white font-semibold py-3 rounded-lg transition-colors text-base"
        >
          Apply Filter
        </button>
      </div>
    </div>
  );
}
