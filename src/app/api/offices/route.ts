import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/offices
 * Returns list of all offices with profile counts
 */
export async function GET() {
  try {
    // Fetch offices using abstraction layer
    const offices = await db.getOffices();

    return NextResponse.json({
      success: true,
      data: offices,
      meta: {
        count: offices.length,
      },
    });
  } catch (error) {
    console.error('Error fetching offices:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch offices',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
