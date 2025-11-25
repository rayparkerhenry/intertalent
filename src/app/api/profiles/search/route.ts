import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { ProfileSearchParams } from '@/lib/db';

/**
 * GET /api/profiles/search
 * Search profiles with filters
 * Query params:
 *   - profession: Filter by profession type (e.g., "RN", "CNA")
 *   - state: Filter by state code (e.g., "FL", "CA")
 *   - city: Filter by city name
 *   - keywords: Comma-separated keywords for OR search (e.g., "HVAC,plumber")
 *   - zipCodes: Comma-separated zip codes for OR search (e.g., "60007,60016")
 *   - zip: Single zip code (legacy support)
 *   - radius: Search radius in miles
 *   - office: Filter by office
 *   - page: Page number (default: 1)
 *   - limit: Results per page (default: 20, max: 100)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Build search parameters
    const params: ProfileSearchParams = {
      page: Math.max(1, parseInt(searchParams.get('page') || '1')),
      limit: Math.min(
        100,
        Math.max(1, parseInt(searchParams.get('limit') || '20'))
      ),
    };

    // Add optional filters
    const professionType = searchParams.get('profession');
    if (professionType) params.professionType = professionType;

    const state = searchParams.get('state');
    if (state) params.state = state;

    const city = searchParams.get('city');
    if (city) params.city = city;

    const office = searchParams.get('office');
    if (office) params.office = office;

    // Handle keywords - comma-separated string becomes array
    const keywordsParam = searchParams.get('keywords');
    if (keywordsParam) {
      params.keywords = keywordsParam
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k);
    }

    // Handle zipCodes - comma-separated string becomes array
    const zipCodesParam = searchParams.get('zipCodes');
    if (zipCodesParam) {
      params.zipCodes = zipCodesParam
        .split(',')
        .map((z) => z.trim())
        .filter((z) => z);
    }

    // Legacy single keyword support (from hero search)
    const query = searchParams.get('query');
    if (query) params.query = query;

    // Legacy single zip code support (from hero search)
    const zipCode = searchParams.get('zip');
    if (zipCode) params.zipCode = zipCode;

    // Radius search
    const radius = searchParams.get('radius');
    if (radius) params.radius = parseInt(radius);

    // Search profiles using abstraction layer
    const result = await db.searchProfiles(params);

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        filters: {
          professionType: params.professionType || null,
          state: params.state || null,
          city: params.city || null,
          office: params.office || null,
          keywords: params.keywords || null,
          zipCodes: params.zipCodes || null,
          query: params.query || null,
          zipCode: params.zipCode || null,
          radius: params.radius || null,
        },
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    console.error('Error searching profiles:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search profiles',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
