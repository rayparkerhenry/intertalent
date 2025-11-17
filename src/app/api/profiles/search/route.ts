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
 *   - keywords: Search in biography, skills, certifications
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

    const query = searchParams.get('keywords');
    if (query) params.query = query;

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
          query: params.query || null,
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
