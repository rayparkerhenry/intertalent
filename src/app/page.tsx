import HeroSearch from '@/components/home/HeroSearch';
import SearchFilters from '@/components/search/SearchFilters';
import SortControls from '@/components/search/SortControls';
import ProfileResults from '@/components/search/ProfileResults';
import Pagination from '@/components/search/Pagination';
import EmptyState from '@/components/ui/EmptyState';
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
  const office = typeof params.office === 'string' ? params.office : undefined;
  const page = typeof params.page === 'string' ? parseInt(params.page) : 1;
  const sortBy =
    typeof params.sortBy === 'string' &&
    ['name', 'location', 'profession'].includes(params.sortBy)
      ? (params.sortBy as 'name' | 'location' | 'profession')
      : 'name';
  const sortDirection =
    typeof params.sortDirection === 'string' &&
    ['asc', 'desc'].includes(params.sortDirection)
      ? (params.sortDirection as 'asc' | 'desc')
      : 'asc';
  const limit = 5; // Changed from 20 to match Figma design (Phase 1)

  // Fetch profiles - either search or get all
  let result;
  const hasFilters = keywords || city || state || professionType || office;

  if (hasFilters) {
    result = await db.searchProfiles({
      query: keywords,
      city,
      state,
      professionType,
      office,
      page,
      limit,
      sortBy,
      sortDirection,
    });
  } else {
    result = await db.getAllProfiles(page, limit, sortBy, sortDirection);
  }

  return (
    <div className="bg-gray-50">
      {/* Hero Section with Search */}
      <HeroSearch />

      {/* Main Content */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:w-80 shrink-0">
            <SearchFilters />
          </aside>

          {/* Results Area */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {hasFilters ? 'Search Results' : 'Recommended Candidates'}
              </h2>
              <p className="text-gray-600">
                {result.total > 0 ? (
                  <>
                    Found{' '}
                    <span className="font-semibold text-gray-900">
                      {result.total}
                    </span>{' '}
                    {result.total === 1 ? 'candidate' : 'candidates'}
                  </>
                ) : (
                  'No candidates found'
                )}
              </p>
            </div>

            {/* Sort Controls */}
            {result.profiles.length > 0 && <SortControls />}

            {/* Profile Cards or Empty State */}
            {result.profiles.length > 0 ? (
              <>
                <ProfileResults profiles={result.profiles} />

                {/* Pagination */}
                <Pagination
                  currentPage={result.page}
                  totalPages={result.totalPages}
                  totalResults={result.total}
                  resultsPerPage={result.limit}
                />
              </>
            ) : (
              <EmptyState
                title="No candidates found"
                message={
                  hasFilters
                    ? "We couldn't find any candidates matching your search criteria. Try adjusting your filters or search terms."
                    : 'No candidates are currently available in our database.'
                }
                actionLabel="Clear all filters"
                actionHref="/"
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
