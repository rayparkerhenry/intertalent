import ClientPortalHero from '@/components/client-portal/ClientPortalHero';
import ClientPortalContactCard from '@/components/client-portal/ClientPortalContactCard';
import ClientPortalBlueBanner from '@/components/client-portal/ClientPortalBlueBanner';
import ClientPortalSearchFilters from '@/components/client-portal/ClientPortalSearchFilters';
import ClientPortalProfileResults from '@/components/client-portal/ClientPortalProfileResults';
import ClientPortalEmptyState from '@/components/client-portal/ClientPortalEmptyState';
import ClientPortalResultsSummary from '@/components/client-portal/ClientPortalResultsSummary';
import SearchParamsSyncer from '@/components/search/SearchParamsSyncer';
import ClientPortalScrollToTop from '@/components/client-portal/ClientPortalScrollToTop';
import LoadingManager from '@/components/ui/LoadingManager';
import ClientPortalInjectTalentModal from '@/components/client-portal/ClientPortalInjectTalentModal';
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

interface ClientPortalPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ClientPortalPage({
  params,
  searchParams,
}: ClientPortalPageProps) {
  await params;

  const sp = await searchParams;

  // Extract + normalize search parameters (EMPTY STRINGS => undefined)
  const keywordsRaw = typeof sp.keywords === 'string' ? sp.keywords : undefined;
  const zipCodesRaw = typeof sp.zipCodes === 'string' ? sp.zipCodes : undefined;
  const city = clean(typeof sp.city === 'string' ? sp.city : undefined);
  const state = clean(typeof sp.state === 'string' ? sp.state : undefined);
  const zipCode = clean(typeof sp.zip === 'string' ? sp.zip : undefined);

  const radius =
    typeof sp.radius === 'string' && sp.radius.trim() !== ''
      ? Number.parseInt(sp.radius, 10)
      : undefined;
  const safeRadius =
    Number.isFinite(radius) && (radius as number) > 0 ? (radius as number) : undefined;

  const professionsRaw =
    typeof sp.professions === 'string' ? sp.professions : undefined;
  const office = clean(typeof sp.office === 'string' ? sp.office : undefined);

  const bookmarksQuery =
    typeof sp.bookmarks === 'string' && sp.bookmarks.trim() === 'true';

  const sortBy =
    typeof sp.sortBy === 'string' &&
    ['name', 'location', 'profession'].includes(sp.sortBy)
      ? (sp.sortBy as 'name' | 'location' | 'profession')
      : 'name';

  const sortDirection =
    typeof sp.sortDirection === 'string' &&
    ['asc', 'desc'].includes(sp.sortDirection)
      ? (sp.sortDirection as 'asc' | 'desc')
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

      {/* Hero Section with Search */}
      <ClientPortalHero />

      {/* Blue Banner Divider */}
      <ClientPortalBlueBanner />

      {/* Main Content */}
      <section id="results-section" className="container mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:w-80 shrink-0">
            <ClientPortalSearchFilters />
          </aside>

          {/* Results Area */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Recommended Candidates
              </h2>
              <ClientPortalResultsSummary
                bookmarksQuery={bookmarksQuery}
                serverTotal={result.total}
                profileIds={result.profiles.map((p) => p.id)}
              />
            </div>

            {/* Profile Cards or Empty State */}
            {result.profiles.length > 0 ? (
              <ClientPortalProfileResults
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
              <ClientPortalInjectTalentModal>
                <ClientPortalEmptyState
                  title="No candidates available"
                  message={
                    hasFilters
                      ? "It looks like all available talent in this area is currently assisting other properties. Try adjusting your filters, or submit a request and our team will contact you shortly."
                      : "Submit a request and our team will contact you shortly."
                  }
                  actionLabel="Clear all filters"
                  actionHref="/"
                />
              </ClientPortalInjectTalentModal>
            )}
          </div>

          {/* Contacts Sidebar */}
          <aside className="lg:w-72 shrink-0">
            <ClientPortalContactCard />
          </aside>
        </div>
      </section>

      {/* Scroll to Top Button */}
      <ClientPortalScrollToTop />
    </div>
  );
}
