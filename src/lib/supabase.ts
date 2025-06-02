import { createBrowserClient } from '@supabase/ssr'

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: {
        schema: 'public',
      },
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      },
      global: {
        // Optimize for Fluid Compute performance
        headers: {
          'x-client-info': 'mvrk-haus@1.0.0'
        }
      }
    }
  )

export const supabase = createClient()

export default supabase 