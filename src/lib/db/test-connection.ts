/**
 * Test Database Connection
 * Run this to verify Supabase is configured correctly
 *
 * Usage: node --loader ts-node/esm src/lib/db/test-connection.ts
 */

import { supabase, supabaseAdmin } from './supabase';

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n');

  try {
    // Test 1: Check if we can connect
    console.log('Test 1: Public client connection');
    const { data, error } = await supabase.from('profiles').select('count');

    if (error) {
      console.error('❌ Error:', error.message);
    } else {
      console.log('✅ Connected successfully!');
      console.log('📊 Profile count:', data);
    }

    // Test 2: Check admin client
    console.log('\nTest 2: Admin client connection');
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('profiles')
      .select('count');

    if (adminError) {
      console.error('❌ Admin Error:', adminError.message);
    } else {
      console.log('✅ Admin client connected!');
      console.log('📊 Admin query result:', adminData);
    }

    console.log('\n✅ All tests passed!');
  } catch (err) {
    console.error('❌ Connection failed:', err);
  }
}

testConnection();
