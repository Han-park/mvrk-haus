import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  const next = searchParams.get('next') ?? '/sign-up-june'

  // Log all parameters for debugging
  console.log('Callback received:', {
    code: code ? 'present' : 'missing',
    error,
    errorDescription,
    next,
    allParams: Object.fromEntries(searchParams.entries())
  })

  // If there's an error from Google OAuth
  if (error) {
    console.error('OAuth error from Google:', { error, errorDescription })
    return NextResponse.redirect(`${origin}/sign-up-june?error=oauth_error&message=${encodeURIComponent(errorDescription || error)}`)
  }

  if (code) {
    try {
      const supabase = await createClient()
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (!exchangeError && data.session) {
        console.log('Successfully exchanged code for session')
        const forwardedHost = request.headers.get('x-forwarded-host')
        const isLocalEnv = process.env.NODE_ENV === 'development'
        
        if (isLocalEnv) {
          return NextResponse.redirect(`${origin}${next}`)
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${next}`)
        } else {
          return NextResponse.redirect(`${origin}${next}`)
        }
      } else {
        console.error('Error exchanging code for session:', exchangeError)
        return NextResponse.redirect(`${origin}/sign-up-june?error=auth_error&message=${encodeURIComponent(exchangeError?.message || 'Unknown error')}`)
      }
    } catch (error) {
      console.error('Unexpected error during auth callback:', error)
      return NextResponse.redirect(`${origin}/sign-up-june?error=unexpected_error&message=${encodeURIComponent(String(error))}`)
    }
  }

  // Return the user to an error page with instructions
  console.error('No code received in callback')
  return NextResponse.redirect(`${origin}/sign-up-june?error=missing_code&message=No+authorization+code+received`)
} 