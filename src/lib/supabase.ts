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

// TEMPORARY TEST 1: Supabase client query
console.log('[DEBUG] Attempting Supabase client query in supabase.ts');
(async () => {
  try {
    const { data, error } = await supabase.from('user_profiles').select('id').limit(1);
    if (error) {
      console.error('[DEBUG] Supabase client query ERROR in supabase.ts:', error);
    } else {
      console.log('[DEBUG] Supabase client query SUCCESS in supabase.ts. Data:', data);
    }
  } catch (catchError: unknown) {
    console.error('[DEBUG] Supabase client query CATCH block in supabase.ts:', catchError);
  }
})();

// TEMPORARY TEST 2: Manual fetch to Supabase endpoint
console.log('[DEBUG] Attempting manual fetch in supabase.ts');
(async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[DEBUG] Manual fetch: Supabase URL or Anon Key is missing.');
    return;
  }
  const fetchUrl = `${supabaseUrl}/rest/v1/user_profiles?select=id&limit=1`;
  try {
    console.log(`[DEBUG] Manual fetch URL: ${fetchUrl}`);
    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('[DEBUG] Manual fetch response status:', response.status);
    if (response.ok) {
      const data = await response.json();
      console.log('[DEBUG] Manual fetch SUCCESS in supabase.ts. Data:', data);
    } else {
      const errorText = await response.text();
      console.error('[DEBUG] Manual fetch ERROR in supabase.ts. Status:', response.status, 'Text:', errorText);
    }
  } catch (catchError: unknown) {
    console.error('[DEBUG] Manual fetch CATCH block in supabase.ts:', catchError);
  }
})();

export default supabase 