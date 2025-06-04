import { createBrowserClient } from '@supabase/ssr'

export const createClient = () => {
  // const isProduction = process.env.NODE_ENV === 'production' // Removed as it's no longer used
  // const isVercel = process.env.VERCEL === '1' // Commented out as it's no longer used
  
  // console.log('[mvrk-haus-debug] Initializing Supabase client:');
  // console.log('[mvrk-haus-debug] NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  // console.log('[mvrk-haus-debug] NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Loaded (******)' : 'MISSING or UNDEFINED');
  
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: {
        schema: 'public',
      },
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        debug: true,
      },
      // global: {  // Temporarily comment out this entire block
      //   headers: {
      //     'x-client-info': 'mvrk-haus@1.0.0',
      //     ...(isVercel && {
      //       'x-vercel-cache': 'no-cache',
      //       'Connection': 'keep-alive'
      //     })
      //   },
      //   fetch: async (url, options = {}) => {
      //     const maxRetries = isProduction ? 3 : 1
      //     const baseTimeout = isProduction ? 10000 : 6000
      //     
      //     for (let attempt = 1; attempt <= maxRetries; attempt++) {
      //       const controller = new AbortController()
      //       const timeout = baseTimeout + (attempt - 1) * 2000
      //       const timeoutId = setTimeout(() => controller.abort(), timeout)
      //       
      //       try {
      //         const response = await fetch(url, {
      //           ...options,
      //           signal: controller.signal,
      //           headers: {
      //             ...options.headers,
      //             ...(isProduction && {
      //               'Cache-Control': 'no-cache, no-store, must-revalidate',
      //               'Pragma': 'no-cache',
      //               'Expires': '0'
      //             })
      //           }
      //         })
      //         
      //         clearTimeout(timeoutId)
      //         
      //         if (response.ok) {
      //           return response
      //         }
      //         
      //         if (response.status >= 500 && attempt < maxRetries) {
      //           console.log(`🔄 Retry ${attempt}/${maxRetries} for ${url} (status: ${response.status})`)
      //           await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      //           continue
      //         }
      //         
      //         return response
      //       } catch (error) {
      //         clearTimeout(timeoutId)
      //         
      //         if (attempt < maxRetries) {
      //           const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      //           console.log(`🔄 Retry ${attempt}/${maxRetries} for ${url} (error: ${errorMessage})`)
      //           await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      //           continue
      //         }
      //         
      //         throw error
      //       }
      //     }
      //     throw new Error('Max retries exceeded')
      //   }
      // }
    }
  )
}

export const supabase = createClient()

export default supabase 