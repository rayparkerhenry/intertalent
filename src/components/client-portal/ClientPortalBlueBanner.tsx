'use client';

import { useRouter } from 'next/navigation';
import { useSearchStore } from '@/store/searchStore';
import { useClientPortal } from '@/contexts/ClientPortalContext';

export default function ClientPortalBlueBanner() {
  const router = useRouter();
  const { client } = useClientPortal();
  const bookmarkedIds = useSearchStore((state) => state.bookmarkedIds);
  const showBookmarksOnly = useSearchStore((state) => state.showBookmarksOnly);
  const bookmarkCount = bookmarkedIds.length;

  const getPortalBase = () => {
    if (typeof window === 'undefined') return '/';
    const hostname = window.location.hostname;
    const isSubdomain =
      hostname.includes('.') &&
      ![
        'localhost',
        'intertalent.intersolutions.com',
        'talenttesting.intersolutions.com',
      ].includes(hostname);

    if (isSubdomain) return '/';
    return `/client-portal/${client.slug}`;
  };

  const pushBookmarksView = () => {
    const params = new URLSearchParams(
      typeof window !== 'undefined' ? window.location.search : ''
    );
    params.set('bookmarks', 'true');
    const base = getPortalBase();
    router.push(`${base}?${params.toString()}`);
  };

  const pushShowAllProfiles = () => {
    const params = new URLSearchParams(
      typeof window !== 'undefined' ? window.location.search : ''
    );
    params.delete('bookmarks');
    const qs = params.toString();
    const base = getPortalBase();
    router.push(qs ? `${base}?${qs}` : base);
  };

  return (
    <div className="bg-[var(--color-primary)] text-white border-b-2 border-[rgba(255,255,255,0.2)]">
      <div className="mx-auto px-4 md:px-20 py-6 md:py-6 max-w-[1440px] min-h-[62px] flex flex-col md:flex-row items-center justify-center md:justify-between gap-4">
        <p className="text-center text-base md:text-lg font-medium md:flex-1">
          {showBookmarksOnly ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              My Bookmarked Professionals
            </span>
          ) : (
            'Find the right Professional to complete the job.'
          )}
        </p>

        {/* Toggle between All Profiles and Bookmarks */}
        {showBookmarksOnly ? (
          <button
            type="button"
            onClick={pushShowAllProfiles}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium whitespace-nowrap"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Show All Profiles
          </button>
        ) : (
          <button
            type="button"
            onClick={pushBookmarksView}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium whitespace-nowrap"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            My Bookmarks
            {bookmarkCount > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-[var(--color-secondary)] rounded-full text-xs font-bold">
                {bookmarkCount}
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
