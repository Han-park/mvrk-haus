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
        },
        // 🔧 FIX: Add fetch options to prevent hanging requests
        fetch: (url, options = {}) => {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 6000) // 6 second timeout (reduced from 8s)
          
          return fetch(url, {
            ...options,
            signal: controller.signal,
          }).finally(() => clearTimeout(timeoutId))
        }
      }
    }
  )

export const supabase = createClient()

export default supabase 