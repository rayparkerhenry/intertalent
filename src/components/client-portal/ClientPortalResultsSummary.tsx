'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchStore } from '@/store/searchStore';

interface ClientPortalResultsSummaryProps {
  bookmarksQuery: boolean;
  serverTotal: number;
  profileIds: string[];
}

export default function ClientPortalResultsSummary({
  bookmarksQuery,
  serverTotal,
  profileIds,
}: ClientPortalResultsSummaryProps) {
  const bookmarkedIds = useSearchStore((s) => s.bookmarkedIds);
  const showBookmarksOnly = useSearchStore((s) => s.showBookmarksOnly);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const bookmarkedInResults = useMemo(
    () => profileIds.filter((id) => bookmarkedIds.includes(id)).length,
    [profileIds, bookmarkedIds]
  );

  const inBookmarkView = bookmarksQuery || showBookmarksOnly;

  if (inBookmarkView) {
    if (!mounted) {
      return (
        <p className="text-gray-600" aria-hidden>
          Loading results summary…
        </p>
      );
    }
    return (
      <p className="text-gray-600">
        {bookmarkedInResults > 0 ? (
          <>
            Showing{' '}
            <span className="font-bold text-gray-900">
              {bookmarkedInResults}
            </span>{' '}
            bookmarked{' '}
            {bookmarkedInResults === 1 ? 'candidate' : 'candidates'} in these
            results
          </>
        ) : (
          'No bookmarked candidates in these results. Use the bookmark icon on a profile card to save candidates.'
        )}
      </p>
    );
  }

  return (
    <p className="text-gray-600">
      {serverTotal > 0 ? (
        <>
          Found{' '}
          <span className="font-bold text-gray-900">{serverTotal}</span>{' '}
          {serverTotal === 1 ? 'candidate' : 'candidates'}
        </>
      ) : (
        'No candidates found'
      )}
    </p>
  );
}
