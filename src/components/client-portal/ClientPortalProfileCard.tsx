'use client';

import { useState } from 'react';
import type { Profile } from '@/lib/db';
import { useSearchStore } from '@/store/searchStore';
import ClientPortalRequestTalentModal from '@/components/client-portal/ClientPortalRequestTalentModal';
import { highlightKeywords } from '@/utils/highlightText';

interface ClientPortalProfileCardProps {
  profile: Profile;
  variant?: 'grid' | 'list';
}

export default function ClientPortalProfileCard({
  profile,
  variant = 'grid',
}: ClientPortalProfileCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  const capitalizeFirst = (value?: string) => {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};

  // Bookmark state from Zustand store
  const bookmarkedIds = useSearchStore((state) => state.bookmarkedIds);
  const toggleBookmark = useSearchStore((state) => state.toggleBookmark);
  const keywords = useSearchStore((state) => state.keywords); // Get keywords for highlighting
  const isBookmarked = bookmarkedIds.includes(profile.id);
  const getColorClass = (_professionType: string, expanded: boolean) => {
    if (expanded) return 'border-l-[var(--color-secondary)]';
    return 'border-l-[var(--color-primary)]';
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
      <>
        <div
          className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-all p-6 border-l-4 ${colorClass} ${
            isExpanded ? 'ring-2 ring-[var(--color-secondary)]/30' : ''
          }`}
        >
          {/* Top Row: Name/Profession/Location AND Buttons */}
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6 mb-4">
            {/* Right on desktop, first on mobile: Bookmark and Request Button side by side */}
            <div className="flex items-center gap-3 w-full md:w-auto md:items-start md:flex-shrink-0 md:self-start md:order-2">
              {/* Bookmark Button */}
              <button
                onClick={() => toggleBookmark(profile.id)}
                className={`w-12 md:w-10 h-10 rounded-full border-2 flex items-center justify-center ${
                  isBookmarked
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)] hover:opacity-90 transition-opacity'
                    : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 transition-colors'
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
              <button
                onClick={() => setIsRequestModalOpen(true)}
                className="px-5 py-2.5 bg-[var(--color-primary)] hover:opacity-90 text-white rounded-lg font-semibold text-sm transition-opacity whitespace-nowrap w-full md:w-auto"
              >
                Request Associate
              </button>
            </div>

            {/* Left on desktop, second on mobile: Name, Profession, Location */}
            <div className="flex-1 min-w-0 md:order-1">
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                {fullName}
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                {capitalizeFirst(profile.profession_type) || 'Property maintenance'}
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
                {profile.city}, {profile.state} {/* • {profile.zip_code}  commented out 12/10/25 MS */}
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="text-sm text-gray-700 mb-4">
            <p className="leading-relaxed">
              {isExpanded
                ? highlightKeywords(cleanFullBio, keywords)
                : highlightKeywords(bioSnippet, keywords)}
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
            className="text-[var(--color-primary)] hover:opacity-90 font-medium text-sm inline-flex items-center gap-1 transition-opacity"
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

        {/* Request Talent Modal */}
        {isRequestModalOpen && (
          <ClientPortalRequestTalentModal
            onClose={() => setIsRequestModalOpen(false)}

            // context from profile
            location={profile.office ?? undefined}
            associateId={profile.id}
            associateName={`${profile.first_name} ${profile.last_initial}.`}
            personId={profile.id}

            requestMode="ASSOCIATE"
            campaign="Generic"
          />
        )}
      </>
    );
  }

  // Grid view layout with expandable bio

  return (
    <div
      className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-all p-6 border-l-4 ${colorClass} ${
        isExpanded ? 'ring-2 ring-[var(--color-secondary)]/30' : ''
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
                {capitalizeFirst(profile.profession_type) || 'Property maintenance'}
              </p>
            </div>
            <button
              className="shrink-0 w-10 h-10 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center hover:opacity-90 transition-opacity text-sm font-semibold"
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
            {profile.city}, {profile.state}  {/*• {profile.zip_code} commented out 12/10/25 MS */}
          </div>

          {/* Bio Snippet or Full Bio */}
          <div className="text-sm text-gray-700 mb-4">
            <p className="leading-relaxed">
              {isExpanded
                ? highlightKeywords(cleanFullBio, keywords)
                : highlightKeywords(bioSnippet, keywords)}
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
              className="text-[var(--color-primary)] hover:opacity-90 font-medium text-sm inline-flex items-center gap-1 transition-opacity"
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
              <button
                onClick={() => setIsRequestModalOpen(true)}
                className="px-4 py-2 bg-[var(--color-primary)] hover:opacity-90 text-white rounded-lg font-medium text-sm transition-opacity"
              >
                Request Associate
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Request Talent Modal */}
      {isRequestModalOpen && (
        <ClientPortalRequestTalentModal
          onClose={() => setIsRequestModalOpen(false)}

          // context from profile
          location={profile.office ?? undefined}
          associateId={profile.id}
          associateName={`${profile.first_name} ${profile.last_initial}.`}
          personId={profile.id}

          requestMode="ASSOCIATE"
          campaign="Generic"
        />
      )}
    </div>
  );
}
