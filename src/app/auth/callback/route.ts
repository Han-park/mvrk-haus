import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/sign-up-june'

  console.log('OAuth callback received:', { 
    hasCode: !!code, 
    next, 
    origin,
    allParams: Object.fromEntries(searchParams.entries())
  })

  if (code) {
    const cookieStore = await cookies()
    
    // Create Supabase client with cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              console.log('Cookie set error:', error)
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
              console.log('Cookie remove error:', error)
            }
          },
        },
      }
    )

    try {
      console.log('Exchanging code for session...')
      
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Code exchange error:', error)
        const errorMessage = encodeURIComponent(`OAuth Error: ${error.message}`)
        const errorResponse = NextResponse.redirect(`${origin}/sign-up-june?error=${errorMessage}`)
        errorResponse.headers.set('Cache-Control', 'no-store')
        return errorResponse
      }

      if (!data?.session || !data?.user) {
        console.error('No session/user data returned:', { 
          hasSession: !!data?.session, 
          hasUser: !!data?.user 
        })
        const errorMessage = encodeURIComponent('Authentication completed but no session created')
        const errorResponse = NextResponse.redirect(`${origin}/sign-up-june?error=${errorMessage}`)
        errorResponse.headers.set('Cache-Control', 'no-store')
        return errorResponse
      }

      console.log('OAuth successful:', {
        userId: data.user.id,
        email: data.user.email,
        hasSession: !!data.session
      })

      // Successful authentication - redirect with success
      const successResponse = NextResponse.redirect(`${origin}${next}`)
      successResponse.headers.set('Cache-Control', 'no-store')
      return successResponse

    } catch (error) {
      console.error('OAuth callback exception:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown OAuth error'
      const encodedError = encodeURIComponent(`Callback Error: ${errorMessage}`)
      const errorResponse = NextResponse.redirect(`${origin}/sign-up-june?error=${encodedError}`)
      errorResponse.headers.set('Cache-Control', 'no-store')
      return errorResponse
    }
  }

  // No code parameter
  console.log('No authorization code in callback')
  const errorResponse = NextResponse.redirect(`${origin}/sign-up-june?error=${encodeURIComponent('No authorization code received')}`)
  errorResponse.headers.set('Cache-Control', 'no-store')
  return errorResponse
} 