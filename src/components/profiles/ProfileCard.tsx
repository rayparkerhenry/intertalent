import Link from 'next/link';
import type { Profile } from '@/lib/db/supabase';

interface ProfileCardProps {
  profile: Profile;
  variant?: 'grid' | 'list';
}

export default function ProfileCard({
  profile,
  variant = 'grid',
}: ProfileCardProps) {
  // Determine color based on profession type
  const getColorClass = (professionType: string) => {
    const hash = professionType
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      'border-l-orange-400',
      'border-l-green-500',
      'border-l-red-500',
      'border-l-blue-500',
    ];
    return colors[hash % colors.length];
  };

  const colorClass = getColorClass(profile.profession_type || 'default');

  // List view layout
  if (variant === 'list') {
    return (
      <div
        className={`bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 border-l-4 ${colorClass}`}
      >
        <div className="flex items-center gap-4">
          {/* Profile Info - Horizontal Layout (no avatar per Figma) */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Name and Location */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {profile.first_name} {profile.last_initial}.
              </h3>
              <p className="text-sm text-gray-600 mb-1">
                {profile.profession_type || 'Property Maintenance'}
              </p>
              <div className="flex items-center text-sm text-gray-600">
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
                {profile.city}, {profile.state}
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-col gap-2 text-sm">
              <div>
                <span className="font-semibold text-gray-700">Office:</span>{' '}
                <span className="text-gray-600">{profile.office}</span>
              </div>
              {profile.skills && profile.skills.length > 0 && (
                <div>
                  <span className="font-semibold text-gray-700">Skills:</span>{' '}
                  <span className="text-gray-600">
                    {profile.skills.slice(0, 3).join(', ')}
                  </span>
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="flex justify-end">
              <Link
                href={`/profiles/${profile.id}`}
                className="px-6 py-2 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
              >
                View Profile
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
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid view layout (original)

  return (
    <div
      className={`bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 border-l-4 ${colorClass}`}
    >
      <div className="flex items-start gap-2">
        {/* Profile Info (no avatar per Figma) */}
        <div className="flex-1 min-w-0">
          {/* Name and Profession */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {profile.first_name} {profile.last_initial}.
              </h3>
              <p className="text-sm text-gray-600">
                {profile.profession_type || 'Property Maintenance'}
              </p>
            </div>
            <button className="shrink-0 w-8 h-8 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center hover:bg-[#2d5a8f] transition-colors">
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
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          {/* Location */}
          <div className="flex items-center text-sm text-gray-600 mb-3">
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
            {profile.city}, {profile.state}
          </div>

          {/* Stats Row */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-700">
            <div>
              <span className="font-semibold">Office:</span>{' '}
              <span className="text-gray-600">{profile.office}</span>
            </div>
            {profile.skills && profile.skills.length > 0 && (
              <div>
                <span className="font-semibold">Skills:</span>{' '}
                <span className="text-gray-600">
                  {profile.skills.slice(0, 2).join(', ')}
                </span>
              </div>
            )}
          </div>

          {/* View Profile Link */}
          <div className="mt-4">
            <Link
              href={`/profiles/${profile.id}`}
              className="text-[#1e3a5f] hover:text-[#2d5a8f] font-medium text-sm inline-flex items-center gap-1"
            >
              View Full Profile
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
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
