import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
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
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// Helper to get user session on server side
export async function getServerSession() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Error getting server session:', error)
      return { user: null, error }
    }
    
    return { user, error: null }
  } catch (error) {
    console.error('Exception getting server session:', error)
    return { user: null, error }
  }
}

// Helper to get user profile on server side
export async function getServerUserProfile(userId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) {
      console.error('Error getting server user profile:', error)
      return { profile: null, error }
    }
    
    return { profile: data, error: null }
  } catch (error) {
    console.error('Exception getting server user profile:', error)
    return { profile: null, error }
  }
} 