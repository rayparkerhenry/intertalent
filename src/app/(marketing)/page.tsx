import HeroSearch from '@/components/home/HeroSearch';
import BlueBanner from '@/components/home/BlueBanner';
import SearchFilters from '@/components/search/SearchFilters';
import ProfileResults from '@/components/search/ProfileResults';
import EmptyState from '@/components/ui/EmptyState';
import SearchParamsSyncer from '@/components/search/SearchParamsSyncer';
import ScrollToTop from '@/components/ui/ScrollToTop';
import LoadingManager from '@/components/ui/LoadingManager';
import RequestTalentClient from '@/app/(marketing)/request-talent/request-talent-client';
import InjectTalentModal from '@/components/search/InjectTalentModal';
import WelcomeMessage from '../../components/WelcomeMessage';
import { db } from '@/lib/db';

// 🔒 Force this page to always fetch fresh data (server-rendered)
export const dynamic = 'force-dynamic';

// Helper: split comma-separated string into a clean string[]
function toList(value?: string): string[] | undefined {
  if (!value) return undefined;
  const list = value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  return list.length > 0 ? list : undefined;
}

// Helper: normalize a string param (treat empty/whitespace as undefined)
function clean(value?: string): string | undefined {
  if (!value) return undefined;
  const v = value.trim();
  return v.length > 0 ? v : undefined;
}

// Helper function to build search params string for API calls
function buildSearchParams(params: {
  keywords?: string;
  zipCodes?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  radius?: number;
  professions?: string;
  office?: string;
  sortBy?: string;
  sortDirection?: string;
}): string {
  const searchParams = new URLSearchParams();

  if (params.keywords) searchParams.set('keywords', params.keywords);
  if (params.zipCodes) searchParams.set('zipCodes', params.zipCodes);
  if (params.city) searchParams.set('city', params.city);
  if (params.state) searchParams.set('state', params.state);
  if (params.zipCode) searchParams.set('zip', params.zipCode);
  if (params.radius) searchParams.set('radius', params.radius.toString());
  if (params.professions) searchParams.set('professions', params.professions);
  if (params.office) searchParams.set('office', params.office);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortDirection)
    searchParams.set('sortDirection', params.sortDirection);

  return searchParams.toString();
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  // Extract + normalize search parameters (EMPTY STRINGS => undefined)
  const keywordsRaw = typeof params.keywords === 'string' ? params.keywords : undefined;
  const zipCodesRaw = typeof params.zipCodes === 'string' ? params.zipCodes : undefined;
  const city = clean(typeof params.city === 'string' ? params.city : undefined);
  const state = clean(typeof params.state === 'string' ? params.state : undefined);
  const zipCode = clean(typeof params.zip === 'string' ? params.zip : undefined);

  const radius =
    typeof params.radius === 'string' && params.radius.trim() !== ''
      ? Number.parseInt(params.radius, 10)
      : undefined;
  const safeRadius = Number.isFinite(radius) && (radius as number) > 0 ? (radius as number) : undefined;

  const professionsRaw = typeof params.professions === 'string' ? params.professions : undefined;
  const office = clean(typeof params.office === 'string' ? params.office : undefined);

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

  // Parse lists (empty => undefined)
  const keywordsArray = toList(clean(keywordsRaw));
  const zipCodesArray = toList(clean(zipCodesRaw));
  const professionsArray = toList(clean(professionsRaw));

  // ✅ IMPORTANT FIX:
  // Only treat as "has filters" if there is *real* filter content updated on 1/5/26 MS
  const hasFilters =
    (keywordsArray && keywordsArray.length > 0) ||
    (zipCodesArray && zipCodesArray.length > 0) ||
    !!city ||
    !!state ||
    !!zipCode ||
    (professionsArray && professionsArray.length > 0) ||
    !!office ||
    !!safeRadius;

  // Fetch
  const result = hasFilters
    ? await db.searchProfiles({
        keywords: keywordsArray,
        zipCodes: zipCodesArray,
        city,
        state,
        zipCode,
        radius: safeRadius,
        professionTypes: professionsArray,
        office,
        page: 1,
        limit: 1000,
        sortBy,
        sortDirection,
      })
    : await db.getAllProfiles(1, 1000, sortBy, sortDirection);

  // Generate a unique key based on search parameters to force ProfileResults reset
  const searchKey = JSON.stringify({
    keywords: keywordsArray?.join(',') ?? '',
    zipCodes: zipCodesArray?.join(',') ?? '',
    city: city ?? '',
    state: state ?? '',
    zipCode: zipCode ?? '',
    radius: safeRadius ?? '',
    professions: professionsArray?.join(',') ?? '',
    office: office ?? '',
    sortBy,
    sortDirection,
  });


  return (
    <div className="bg-gray-50">
      {/* Loading Overlay */}
      <LoadingManager />

      {/* Sync URL params with Zustand store */}
      <SearchParamsSyncer />

      {/* 🔥 ADDED 4/6/26 to have request talent overlay base page */}
      <RequestTalentClient />

      {/* Hero Section with Search */}
      <HeroSearch />

      {/* Blue Banner Divider */}
      <BlueBanner />

      {/* Main Content */}
      <section id="results-section" className="container mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:w-80 shrink-0">
            <SearchFilters />
          </aside>

          {/* Results Area */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="mb-6">
              <WelcomeMessage />
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Recommended Candidates
              </h2>
              <p className="text-gray-600">
                {result.total > 0 ? (
                  <>
                    Found{' '}
                    <span className="font-bold text-gray-900">
                      {result.total}
                    </span>{' '}
                    {result.total === 1 ? 'candidate' : 'candidates'}
                  </>
                ) : (
                  'No candidates found'
                )}
              </p>
            </div>

            {/* Profile Cards or Empty State */}
            {result.profiles.length > 0 ? (
              <ProfileResults
                key={searchKey}
                profiles={result.profiles}
                totalCount={result.total}
                initialDisplay={5}
                searchParams={buildSearchParams({
                  keywords: keywordsArray?.join(','),
                  zipCodes: zipCodesArray?.join(','),
                  city,
                  state,
                  zipCode,
                  radius: safeRadius,
                  professions: professionsArray?.join(','),
                  office,
                  sortBy,
                  sortDirection,
                })}
              />
            ) : (
              <InjectTalentModal>
                <EmptyState
                  title="No candidates available"
                  message={
                    hasFilters
                      ? "It looks like all available talent in this area is currently assisting other properties. Try adjusting your filters, or submit a request and our team will contact you shortly."
                      : "Submit a request and our team will contact you shortly."
                  }
                  actionLabel="Clear all filters"
                  actionHref="/"
                />
              </InjectTalentModal>
            )}
          </div>
        </div>
      </section>

      {/* Scroll to Top Button */}
      <ScrollToTop />
    </div>
  );
}
