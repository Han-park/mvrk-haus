import { createBrowserClient } from '@supabase/ssr'

export const createClient = () => {
  const isProduction = process.env.NODE_ENV === 'production'
  const isVercel = process.env.VERCEL === '1'
  
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
        // Production-specific auth settings
        ...(isProduction && {
          flowType: 'pkce',
          storageKey: 'sb-auth-token',
        })
      },
      global: {
        headers: {
          'x-client-info': 'mvrk-haus@1.0.0',
          // Add Vercel-specific headers
          ...(isVercel && {
            'x-vercel-cache': 'no-cache',
            'Connection': 'keep-alive'
          })
        },
        // Enhanced fetch with retry logic for production
        fetch: async (url, options = {}) => {
          const maxRetries = isProduction ? 3 : 1
          const baseTimeout = isProduction ? 10000 : 6000
          
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            const controller = new AbortController()
            const timeout = baseTimeout + (attempt - 1) * 2000 // Progressive timeout
            const timeoutId = setTimeout(() => controller.abort(), timeout)
            
            try {
              const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: {
                  ...options.headers,
                  // Add environment-specific headers
                  ...(isProduction && {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                  })
                }
              })
              
              clearTimeout(timeoutId)
              
              // If successful, return immediately
              if (response.ok) {
                return response
              }
              
              // If server error and we have retries left, continue
              if (response.status >= 500 && attempt < maxRetries) {
                console.log(`🔄 Retry ${attempt}/${maxRetries} for ${url} (status: ${response.status})`)
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt)) // Exponential backoff
                continue
              }
              
              return response
            } catch (error) {
              clearTimeout(timeoutId)
              
              // If network error and we have retries left, continue
              if (attempt < maxRetries) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                console.log(`🔄 Retry ${attempt}/${maxRetries} for ${url} (error: ${errorMessage})`)
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt)) // Exponential backoff
                continue
              }
              
              throw error
            }
          }
          
          // This should never be reached, but TypeScript requires it
          throw new Error('Max retries exceeded')
        }
      }
    }
  )
}

export const supabase = createClient()

export default supabase 