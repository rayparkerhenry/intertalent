'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HeroSearch() {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    // Build query params
    const params = new URLSearchParams();
    if (keyword) params.set('keywords', keyword);
    if (location) params.set('city', location);

    // Navigate to search results (for now, we'll reload the page with filters)
    // Later we can create a dedicated /search page
    router.push(`/?${params.toString()}`);
  };

  return (
    <section className="relative bg-linear-to-br from-[#1e3a5f] to-[#2d5a8f] text-white">
      {/* Background overlay pattern (optional) */}
      <div className="absolute inset-0 bg-black/20"></div>

      <div className="relative container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Title */}
          <h1 className="text-5xl font-bold mb-4">Search Candidates</h1>

          {/* Subtitle */}
          <p className="text-xl text-gray-200 mb-12">
            Find the right Maintenance Professional for employers to hire.
          </p>

          {/* Search Form */}
          <form
            onSubmit={handleSearch}
            className="bg-white rounded-full shadow-2xl p-2 flex flex-col md:flex-row gap-2 items-center"
          >
            {/* Keyword Input */}
            <div className="flex-1 flex items-center px-4 py-3 w-full">
              <svg
                className="w-5 h-5 text-gray-400 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Job Title or Keyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="flex-1 outline-none text-gray-800 placeholder-gray-400"
              />
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px h-8 bg-gray-300"></div>

            {/* Location Input */}
            <div className="flex-1 flex items-center px-4 py-3 w-full">
              <svg
                className="w-5 h-5 text-gray-400 mr-3"
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
                placeholder="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="flex-1 outline-none text-gray-800 placeholder-gray-400"
              />
            </div>

            {/* Search Button */}
            <button
              type="submit"
              className="bg-[#ef4444] hover:bg-[#dc2626] text-white font-semibold px-8 py-3 rounded-full transition-colors w-full md:w-auto"
            >
              Search
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
