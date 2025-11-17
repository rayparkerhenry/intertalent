import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/states
 * Returns list of all states with profile counts
 */
export async function GET() {
  try {
    // Fetch states using abstraction layer
    const states = await db.getStates();

    return NextResponse.json({
      success: true,
      data: states,
      meta: {
        count: states.length,
      },
    });
  } catch (error) {
    console.error('Error fetching states:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch states',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
