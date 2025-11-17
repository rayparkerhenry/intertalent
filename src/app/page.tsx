import HeroSearch from '@/components/home/HeroSearch';
import ProfileCard from '@/components/profiles/ProfileCard';
import { db } from '@/lib/db';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  // Extract search parameters
  const keywords =
    typeof params.keywords === 'string' ? params.keywords : undefined;
  const city = typeof params.city === 'string' ? params.city : undefined;
  const state = typeof params.state === 'string' ? params.state : undefined;
  const professionType =
    typeof params.profession === 'string' ? params.profession : undefined;

  // Fetch profiles - either search or get all
  let result;
  if (keywords || city || state || professionType) {
    result = await db.searchProfiles({
      query: keywords,
      city,
      state,
      professionType,
      page: 1,
      limit: 20,
    });
  } else {
    result = await db.getAllProfiles(1, 20);
  }

  return (
    <div className="bg-gray-50">
      {/* Hero Section with Search */}
      <HeroSearch />

      {/* Recommended Candidates Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Recommended Candidates
          </h2>
          <p className="text-gray-600">
            Based on your criteria, we found{' '}
            <span className="font-semibold text-gray-900">{result.total}</span>{' '}
            talented professionals
          </p>
        </div>

        {/* Profile Cards Grid */}
        <div className="space-y-4">
          {result.profiles.map((profile) => (
            <ProfileCard key={profile.id} profile={profile} />
          ))}
        </div>

        {/* Pagination Info */}
        {result.total > result.limit && (
          <div className="mt-8 text-center text-gray-600">
            Showing {result.profiles.length} of {result.total} candidates
          </div>
        )}
      </section>
    </div>
  );
}
