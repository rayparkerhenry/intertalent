'use client';

import Link from 'next/link';
import { useSearchStore } from '@/store/searchStore';

export default function BlueBanner() {
  const bookmarkedIds = useSearchStore((state) => state.bookmarkedIds);
  const bookmarkCount = bookmarkedIds.length;

  return (
    <div className="bg-[#042A4A] text-white border-b-2 border-[rgba(255,255,255,0.2)]">
      <div className="mx-auto px-20 py-6 max-w-[1440px] min-h-[62px] flex items-center justify-between">
        <p className="text-center text-lg font-medium flex-1">
          Find the right Maintenance Professional to complete the job.
        </p>

        {/* My Bookmarks Link */}
        <Link
          href="/?bookmarks=true"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium whitespace-nowrap"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          My Bookmarks
          {bookmarkCount > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-orange-500 rounded-full text-xs font-bold">
              {bookmarkCount}
            </span>
          )}
        </Link>
      </div>
    </div>
  );
}
