import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/professions
 * Returns list of all available profession types
 */
export async function GET() {
  try {
    // Fetch profession types using abstraction layer
    const professions = await db.getProfessionTypes();

    return NextResponse.json({
      success: true,
      data: professions,
      meta: {
        count: professions.length,
      },
    });
  } catch (error) {
    console.error('Error fetching professions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch professions',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
