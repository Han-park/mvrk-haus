import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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
    const response = NextResponse.redirect(`${origin}/sign-up-june?error=oauth_error&message=${encodeURIComponent(errorDescription || error)}`)
    // Add no-cache headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    return response
  }

  if (code) {
    try {
      const cookieStore = await cookies()
      
      // Create the server client with proper cookie handling for PKCE
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll: () => cookieStore.getAll(),
            setAll: (cookiesToSet) => {
              try {
                cookiesToSet.forEach(({ name, value, options }) =>
                  cookieStore.set(name, value, options)
                )
              } catch {
                // Ignore errors from server components
              }
            },
          },
        }
      )

      console.log('Attempting to exchange code for session...')
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (!exchangeError && data.session) {
        console.log('Successfully exchanged code for session')
        const forwardedHost = request.headers.get('x-forwarded-host')
        const isLocalEnv = process.env.NODE_ENV === 'development'
        
        let redirectUrl: string
        if (isLocalEnv) {
          redirectUrl = `${origin}${next}`
        } else if (forwardedHost) {
          redirectUrl = `https://${forwardedHost}${next}`
        } else {
          redirectUrl = `${origin}${next}`
        }
        
        console.log('Redirecting to:', redirectUrl)
        const response = NextResponse.redirect(redirectUrl)
        
        // Add no-cache headers
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
        response.headers.set('Pragma', 'no-cache')
        response.headers.set('Expires', '0')
        return response
      } else {
        console.error('Error exchanging code for session:', exchangeError)
        
        // More specific error handling for PKCE issues
        let errorMessage = exchangeError?.message || 'Unknown error'
        if (errorMessage.includes('code verifier') || errorMessage.includes('PKCE')) {
          errorMessage = 'Authentication session expired. Please try signing in again.'
        }
        
        const response = NextResponse.redirect(`${origin}/sign-up-june?error=auth_error&message=${encodeURIComponent(errorMessage)}`)
        // Add no-cache headers
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
        response.headers.set('Pragma', 'no-cache')
        response.headers.set('Expires', '0')
        return response
      }
    } catch (error) {
      console.error('Unexpected error during auth callback:', error)
      
      // Better error message for PKCE-related issues
      let errorMessage = String(error)
      if (errorMessage.includes('code verifier') || errorMessage.includes('PKCE')) {
        errorMessage = 'Authentication session expired. Please try signing in again.'
      }
      
      const response = NextResponse.redirect(`${origin}/sign-up-june?error=unexpected_error&message=${encodeURIComponent(errorMessage)}`)
      // Add no-cache headers
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      response.headers.set('Pragma', 'no-cache')
      response.headers.set('Expires', '0')
      return response
    }
  }

  // Return the user to an error page with instructions
  console.error('No code received in callback')
  const response = NextResponse.redirect(`${origin}/sign-up-june?error=missing_code&message=No+authorization+code+received`)
  // Add no-cache headers
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
  return response
} 