import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create a Supabase client with service role key to bypass RLS
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

export async function POST(request: NextRequest) {
  try {
    const { passcode } = await request.json()

    if (!passcode) {
      return NextResponse.json(
        { error: 'Passcode is required' },
        { status: 400 }
      )
    }

    // Update the june-otp table using service role
    const { data, error } = await supabaseAdmin
      .from('june-otp')
      .update({ is_register: true })
      .eq('passcode', passcode)
      .select()

    if (error) {
      console.error('Service role update error:', error)
      return NextResponse.json(
        { error: 'Failed to update OTP status', details: error },
        { status: 500 }
      )
    }

    console.log('Service role update successful:', data)
    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('API route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 