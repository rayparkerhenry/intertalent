'use client';

import { useState } from 'react';
import type { Profile } from '@/lib/db/supabase';
import { useSearchStore } from '@/store/searchStore';

interface ProfileCardProps {
  profile: Profile;
  variant?: 'grid' | 'list';
}

export default function ProfileCard({
  profile,
  variant = 'grid',
}: ProfileCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Bookmark state from Zustand store
  const bookmarkedIds = useSearchStore((state) => state.bookmarkedIds);
  const toggleBookmark = useSearchStore((state) => state.toggleBookmark);
  const isBookmarked = bookmarkedIds.includes(profile.id);

  // Determine color based on profession type (default) or orange when expanded
  const getColorClass = (professionType: string, expanded: boolean) => {
    if (expanded) return 'border-l-orange-500'; // Orange when expanded per Figma

    const hash = professionType
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      'border-l-blue-400',
      'border-l-green-500',
      'border-l-red-500',
      'border-l-purple-500',
    ];
    return colors[hash % colors.length];
  };

  const colorClass = getColorClass(
    profile.profession_type || 'default',
    isExpanded
  );

  // Strip HTML tags from bio text
  const stripHtml = (html: string) => {
    if (!html) return '';
    // Remove HTML tags but preserve text content
    return html
      .replace(/<[^>]*>/g, ' ') // Replace tags with space
      .replace(/\s+/g, ' ') // Normalize multiple spaces
      .trim();
  };

  // Truncate bio to ~2 sentences for collapsed state
  const getBioSnippet = (bio: string, maxLength: number = 120) => {
    const cleanBio = stripHtml(bio);
    if (!cleanBio) return '';
    if (cleanBio.length <= maxLength) return cleanBio;

    // Try to cut at sentence end
    const snippet = cleanBio.substring(0, maxLength);
    const lastPeriod = snippet.lastIndexOf('.');
    if (lastPeriod > 60) {
      return snippet.substring(0, lastPeriod + 1);
    }
    return snippet + '...';
  };

  const bioSnippet = getBioSnippet(profile.professional_summary || '');
  const cleanFullBio = stripHtml(profile.professional_summary || '');
  const fullName = `${profile.first_name} ${profile.last_initial}.`;
  const firstInitial = profile.first_name?.[0]?.toUpperCase() || 'P';

  // List view layout with expandable bio
  if (variant === 'list') {
    return (
      <div
        className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-all p-6 border-l-4 ${colorClass} ${
          isExpanded ? 'ring-2 ring-orange-200' : ''
        }`}
      >
        {/* Top Row: Name/Profession/Location AND Buttons */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6 mb-4">
          {/* Right on desktop, first on mobile: Bookmark and Request Button side by side */}
          <div className="flex items-center gap-3 w-full md:w-auto md:items-start md:flex-shrink-0 md:self-start md:order-2">
            {/* Bookmark Button */}
            <button
              onClick={() => toggleBookmark(profile.id)}
              className={`w-12 md:w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors ${
                isBookmarked
                  ? 'border-[#1e3a5f] bg-[#1e3a5f] hover:bg-[#2d5a8f]'
                  : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
              }`}
              aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
              title={
                isBookmarked
                  ? `Remove ${fullName} from bookmarks`
                  : `Bookmark ${fullName}`
              }
            >
              <svg
                className={`w-5 h-5 transition-colors ${
                  isBookmarked ? 'text-white' : 'text-gray-600'
                }`}
                fill={isBookmarked ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
            </button>

            {/* Request Associate Button */}
            <button className="px-5 py-2.5 bg-[#1e3a5f] hover:bg-[#2d5a8f] text-white rounded-lg font-semibold text-sm transition-colors whitespace-nowrap w-full md:w-auto">
              Request Associate
            </button>
          </div>

          {/* Left on desktop, second on mobile: Name, Profession, Location */}
          <div className="flex-1 min-w-0 md:order-1">
            <h3 className="text-xl font-bold text-gray-900 mb-1">{fullName}</h3>
            <p className="text-sm text-gray-600 mb-2">
              {profile.profession_type?.toLowerCase() || 'property maintenance'}
            </p>
            <div className="flex items-center text-sm text-gray-600">
              <svg
                className="w-4 h-4 mr-1 flex-shrink-0"
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
              {profile.city}, {profile.state} • {profile.zip_code}
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="text-sm text-gray-700 mb-4">
          <p className="leading-relaxed">
            {isExpanded ? cleanFullBio : bioSnippet}
          </p>
        </div>

        {/* Stats (show when expanded) */}
        {isExpanded && profile.office && (
          <div className="text-sm text-gray-700 mb-4">
            <span className="font-semibold">Office:</span>{' '}
            <span className="text-gray-600">{profile.office}</span>
          </div>
        )}

        {/* Read More/Less Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[#1e3a5f] hover:text-[#2d5a8f] font-medium text-sm inline-flex items-center gap-1 transition-colors"
        >
          {isExpanded ? (
            <>
              Read Less
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 15l7-7 7 7"
                />
              </svg>
            </>
          ) : (
            <>
              Read More About {fullName}
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </>
          )}
        </button>
      </div>
    );
  }

  // Grid view layout with expandable bio

  return (
    <div
      className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-all p-6 border-l-4 ${colorClass} ${
        isExpanded ? 'ring-2 ring-orange-200' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Profile Info (no avatar per Figma) */}
        <div className="flex-1 min-w-0">
          {/* Name and Profession */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {fullName}
              </h3>
              <p className="text-sm text-gray-600">
                {profile.profession_type?.toLowerCase() ||
                  'property maintenance'}
              </p>
            </div>
            <button
              className="shrink-0 w-10 h-10 rounded-full bg-[#3b5a7e] text-white flex items-center justify-center hover:bg-[#2d4a6e] transition-colors text-sm font-semibold"
              aria-label="Bookmark"
              title={`Bookmark ${fullName}`}
            >
              {firstInitial}
            </button>
          </div>

          {/* Location */}
          <div className="flex items-center text-sm text-gray-600 mb-4">
            <svg
              className="w-4 h-4 mr-1"
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
            {profile.city}, {profile.state} • {profile.zip_code}
          </div>

          {/* Bio Snippet or Full Bio */}
          <div className="text-sm text-gray-700 mb-4">
            <p className="leading-relaxed">
              {isExpanded ? cleanFullBio : bioSnippet}
            </p>
          </div>

          {/* Stats Row */}
          {isExpanded && (
            <div className="flex flex-wrap gap-4 text-sm text-gray-700 mb-4 pb-3 border-b border-gray-200">
              <div>
                <span className="font-semibold">Office:</span>{' '}
                <span className="text-gray-600">{profile.office}</span>
              </div>
              {profile.skills && profile.skills.length > 0 && (
                <div>
                  <span className="font-semibold">Skills:</span>{' '}
                  <span className="text-gray-600">
                    {profile.skills.join(', ')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Read More / Read Less Link */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[#1e3a5f] hover:text-[#2d5a8f] font-medium text-sm inline-flex items-center gap-1 transition-colors"
            >
              {isExpanded ? (
                <>
                  Read Less
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                </>
              ) : (
                <>
                  Read More About {fullName}
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </>
              )}
            </button>

            {/* Request Associate Button (show when expanded) */}
            {isExpanded && (
              <button className="px-4 py-2 bg-[#1e3a5f] hover:bg-[#2d5a8f] text-white rounded-lg font-medium text-sm transition-colors">
                Request Associate
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
