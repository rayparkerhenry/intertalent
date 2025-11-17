import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/profiles/[id]
 * Returns a single profile by ID
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Fetch profile using abstraction layer (ID is string)
    const profile = await db.getProfileById(id);

    if (!profile) {
      return NextResponse.json(
        {
          success: false,
          error: 'Profile not found',
          message: `No profile found with ID ${id}`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
