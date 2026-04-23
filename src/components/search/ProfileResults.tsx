'use client';

import { useState, useCallback } from 'react';
import ProfileCard from '@/components/profiles/ProfileCard';
import ShowMoreButton from './ShowMoreButton';
import { useSearchStore } from '@/store/searchStore';
import type { Profile } from '@/lib/db';

interface ProfileResultsProps {
  profiles: Profile[];
  totalCount: number; // Total from server (e.g., 7181)
  initialDisplay?: number;
  searchParams?: string; // Query string for fetching more
}

export default function ProfileResults({
  profiles: initialProfiles,
  totalCount,
  initialDisplay = 5,
  searchParams = '',
}: ProfileResultsProps) {
  // Fixed to list view only per Figma design
  const viewMode = 'list';

  // Get bookmarked IDs from store
  const bookmarkedIds = useSearchStore((state) => state.bookmarkedIds);
  const showBookmarksOnly = useSearchStore((state) => state.showBookmarksOnly);

  // Track all loaded profiles (initially from server, more fetched via API)
  const [allProfiles, setAllProfiles] = useState<Profile[]>(initialProfiles);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Filter profiles if showing bookmarks only
  const filteredProfiles = showBookmarksOnly
    ? allProfiles.filter((p) => bookmarkedIds.includes(p.id))
    : allProfiles;

  // Manage how many profiles to display from loaded profiles
  const [displayCount, setDisplayCount] = useState(initialDisplay);

  // Determine actual total for display purposes
  const effectiveTotal = showBookmarksOnly
    ? filteredProfiles.length
    : totalCount;

  // Batch size for loading from server
  const BATCH_SIZE = 100;

  const handleShowMore = useCallback(async () => {
    // If showing bookmarks only, just show more from already loaded
    if (showBookmarksOnly) {
      setDisplayCount((prev) => Math.min(prev + 5, filteredProfiles.length));
      return;
    }

    // If we have more profiles loaded than displayed, show more
    if (displayCount + 5 <= allProfiles.length) {
      setDisplayCount((prev) => prev + 5);
      return;
    }

    // If we need to fetch more from server
    if (allProfiles.length < totalCount) {
      setIsLoadingMore(true);
      try {
        // Calculate next page based on how many we've loaded
        const nextPage = Math.floor(allProfiles.length / BATCH_SIZE) + 1;

        // Build URL with existing search params
        const url = `/api/profiles/search?${searchParams}&page=${nextPage}&limit=${BATCH_SIZE}`;

        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data.profiles.length > 0) {
            // Append new profiles, avoiding duplicates
            const existingIds = new Set(allProfiles.map((p) => p.id));
            const newProfiles = data.data.profiles.filter(
              (p: Profile) => !existingIds.has(p.id)
            );
            setAllProfiles((prev) => [...prev, ...newProfiles]);
          }
        }
      } catch (error) {
        console.error('Error loading more profiles:', error);
      } finally {
        setIsLoadingMore(false);
      }
    }

    // Show 5 more after loading
    setDisplayCount((prev) => Math.min(prev + 5, totalCount));
  }, [
    displayCount,
    allProfiles,
    totalCount,
    searchParams,
    showBookmarksOnly,
    filteredProfiles.length,
  ]);

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
        totalCount={effectiveTotal}
        onShowMore={handleShowMore}
        loading={isLoadingMore}
      />
    </>
  );
}
