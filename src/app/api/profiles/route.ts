import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/profiles
 * Returns paginated list of all profiles
 * Query params:
 *   - page: Page number (default: 1)
 *   - limit: Results per page (default: 20, max: 100)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse pagination params
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('limit') || '20'))
    );

    // Fetch profiles using abstraction layer
    const result = await db.getAllProfiles(page, limit);

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching profiles:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch profiles',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
