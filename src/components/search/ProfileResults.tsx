'use client';

import { useState } from 'react';
import ProfileCard from '@/components/profiles/ProfileCard';
import ShowMoreButton from './ShowMoreButton';
import { useSearchStore } from '@/store/searchStore';
import type { Profile } from '@/lib/db/supabase';

interface ProfileResultsProps {
  profiles: Profile[];
  initialDisplay?: number;
}

export default function ProfileResults({
  profiles,
  initialDisplay = 5,
}: ProfileResultsProps) {
  // Fixed to list view only per Figma design
  const viewMode = 'list';

  // Get bookmarked IDs from store
  const bookmarkedIds = useSearchStore((state) => state.bookmarkedIds);
  const showBookmarksOnly = useSearchStore((state) => state.showBookmarksOnly);

  // Filter profiles if showing bookmarks only
  const filteredProfiles = showBookmarksOnly
    ? profiles.filter((p) => bookmarkedIds.includes(p.id))
    : profiles;

  // Manage how many profiles to show (start with initialDisplay, load 5 more each time)
  const [displayCount, setDisplayCount] = useState(initialDisplay);

  const handleShowMore = () => {
    setDisplayCount((prev) => Math.min(prev + 5, filteredProfiles.length));
  };

  const displayedProfiles = filteredProfiles.slice(0, displayCount);

  return (
    <>
      {/* Profile List */}
      <div className="space-y-4">
        {displayedProfiles.map((profile) => (
          <ProfileCard key={profile.id} profile={profile} variant={viewMode} />
        ))}
      </div>

      {/* Show More Button */}
      <ShowMoreButton
        currentCount={displayCount}
        totalCount={filteredProfiles.length}
        onShowMore={handleShowMore}
      />
    </>
  );
}
