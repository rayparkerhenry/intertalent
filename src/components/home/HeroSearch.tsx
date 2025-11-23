'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchStore } from '@/store/searchStore';

export default function HeroSearch() {
  const router = useRouter();
  const [professions, setProfessions] = useState<string[]>([]);

  // Use Zustand store for state management
  const profession = useSearchStore((state) => state.profession);
  const location = useSearchStore((state) => state.location);
  const setProfession = useSearchStore((state) => state.setProfession);
  const setLocation = useSearchStore((state) => state.setLocation);
  const parseLocation = useSearchStore((state) => state.parseLocation);
  const buildQueryParams = useSearchStore((state) => state.buildQueryParams);

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

    // Parse location before building query params
    parseLocation();

    // Build query params from store
    const params = buildQueryParams();
    router.push(`/?${params.toString()}`);
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
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
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
            <div className="flex-1 flex items-center px-4 py-3 min-w-0 bg-white rounded-full md:rounded-none shadow-lg md:shadow-none">
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
                onChange={(e) => setLocation(e.target.value)}
                className="flex-1 outline-none text-gray-800 placeholder-gray-400 text-sm md:text-base min-w-0"
              />
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
