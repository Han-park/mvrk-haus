import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create both regular and admin clients for testing
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const passcode = searchParams.get('passcode')

    if (!passcode) {
      return NextResponse.json(
        { error: 'Passcode parameter is required' },
        { status: 400 }
      )
    }

    // Test 1: Try to read the record with regular client
    const { data: readData, error: readError } = await supabase
      .from('june-otp')
      .select('*')
      .eq('passcode', passcode)
      .single()

    // Test 2: Try to read the record with admin client
    const { data: adminReadData, error: adminReadError } = await supabaseAdmin
      .from('june-otp')
      .select('*')
      .eq('passcode', passcode)
      .single()

    // Test 3: Try to update with regular client
    const { data: updateData, error: updateError } = await supabase
      .from('june-otp')
      .update({ is_register: true })
      .eq('passcode', passcode)
      .select()

    // Test 4: Try to update with admin client
    const { data: adminUpdateData, error: adminUpdateError } = await supabaseAdmin
      .from('june-otp')
      .update({ is_register: true })
      .eq('passcode', passcode)
      .select()

    return NextResponse.json({
      passcode,
      tests: {
        regularRead: { data: readData, error: readError },
        adminRead: { data: adminReadData, error: adminReadError },
        regularUpdate: { data: updateData, error: updateError },
        adminUpdate: { data: adminUpdateData, error: adminUpdateError }
      }
    })

  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    )
  }
} 