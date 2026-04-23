'use client';

import Link from 'next/link';
import { useClientPortal } from '@/contexts/ClientPortalContext';

interface ClientPortalEmptyStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  extraAction?: React.ReactNode; // ⭐ Button injected from page
}
// created Request Talent Button for Modal 12/12/25 by MS
export default function ClientPortalEmptyState({
  title = 'No results found',
  message = "We couldn't find any candidates matching your criteria.",
  actionLabel = 'Clear filters',
  actionHref,
  onAction,
  extraAction,
}: ClientPortalEmptyStateProps) {
  const { client } = useClientPortal();

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

  const resolvedActionHref =
    actionHref === '/' || actionHref === undefined
      ? getPortalBase()
      : actionHref;

  return (
    <div className="text-center py-4 px-4">
      {/* Icon */}
      <div className="mx-auto w-16 h-16 mb-4 flex items-center justify-center rounded-full bg-gray-100">
        <svg
          className="w-8 h-8 text-gray-400"
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
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>

      <p className="text-gray-600 mb-6 max-w-md mx-auto">{message}</p>

      {/* Suggestions */}
      <div className="mb-6 text-sm text-gray-600">
        <p className="mb-2">Try:</p>
        <ul className="space-y-1">
          <li>• Using different keywords</li>
          <li>• Removing some filters</li>
          <li>• Checking your spelling</li>
          <li>• Using more general search terms</li>
        </ul>
      </div>

      {/* Clear Filters Button */}
      {(actionHref || onAction) && (
        <div className="flex flex-col items-center space-y-2">
          {actionHref ? (
            <Link
              href={resolvedActionHref}
              className="inline-flex items-center px-6 py-3 bg-[var(--color-primary)] hover:opacity-90 text-white font-semibold rounded-lg transition-opacity"
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              onClick={onAction}
              className="inline-flex items-center px-6 py-3 bg-[var(--color-primary)] hover:opacity-90 text-white font-semibold rounded-lg transition-opacity"
            >
              {actionLabel}
            </button>
          )}

          {/* ⭐ Request Talent Button (tight spacing) */}
          {extraAction && <div>{extraAction}</div>}
        </div>
      )}
    </div>
  );
}
