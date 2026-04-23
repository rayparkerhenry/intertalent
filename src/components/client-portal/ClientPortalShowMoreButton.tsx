'use client';

interface ClientPortalShowMoreButtonProps {
  currentCount: number;
  totalCount: number;
  onShowMore: () => void;
  loading?: boolean;
}

export default function ClientPortalShowMoreButton({
  currentCount,
  totalCount,
  onShowMore,
  loading = false,
}: ClientPortalShowMoreButtonProps) {
  // Don't show button if all results are displayed
  if (currentCount >= totalCount) return null;

  const remaining = totalCount - currentCount;
  const willShow = Math.min(remaining, 5);

  return (
    <div className="flex flex-col items-center gap-4 mt-8 pt-6 border-t border-gray-200">
      {/* Results info */}
      <div className="text-sm text-gray-600">
        Showing{' '}
        <span className="font-semibold text-gray-900">{currentCount}</span> of{' '}
        <span className="font-semibold text-gray-900">{totalCount}</span>{' '}
        candidates
      </div>

      {/* Show More button */}
      <button
        onClick={onShowMore}
        disabled={loading}
        className="px-8 py-3 bg-[var(--color-primary)] hover:opacity-90 text-white rounded-lg font-medium transition-opacity disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Loading...
          </>
        ) : (
          <>
            Show {willShow} More
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
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </>
        )}
      </button>
    </div>
  );
}
