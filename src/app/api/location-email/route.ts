/**
 * API Route: Get office email by location
 * Looks up email address from location_emails table
 * GET /api/location-email?location=Baltimore
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const location = searchParams.get('location');

    if (!location) {
      return NextResponse.json(
        { error: 'Location parameter is required' },
        { status: 400 }
      );
    }

    // Query location_emails table
    const { data, error } = await supabase
      .from('location_emails')
      .select('email')
      .ilike('location', location)
      .single();

    if (error || !data) {
      // Fallback to default email if location not found
      const { data: defaultData } = await supabase
        .from('location_emails')
        .select('email')
        .eq('location', 'Default')
        .single();

      return NextResponse.json({
        email: defaultData?.email || 'info@intersolutions.com',
        isDefault: true,
      });
    }

    return NextResponse.json({
      email: data.email,
      isDefault: false,
    });
  } catch (error) {
    console.error('Error fetching office email:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch office email',
        email: 'info@intersolutions.com',
      },
      { status: 500 }
    );
  }
}
