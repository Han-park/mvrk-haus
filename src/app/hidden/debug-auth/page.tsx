'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Session, User } from '@supabase/supabase-js'

export default function DebugAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function getSession() {
      try {
        // Get current session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        console.log('Session data:', sessionData)
        console.log('Session error:', sessionError)
        
        if (sessionError) {
          setError(`Session error: ${sessionError.message}`)
        } else {
          setSession(sessionData.session)
        }

        // Get current user
        const { data: userData, error: userError } = await supabase.auth.getUser()
        console.log('User data:', userData)
        console.log('User error:', userError)
        
        if (userError) {
          setError(prev => `${prev || ''} User error: ${userError.message}`)
        } else {
          setUser(userData.user)
        }
        
      } catch (err) {
        console.error('Debug error:', err)
        setError(`Exception: ${err instanceof Error ? err.message : 'Unknown error'}`)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const timestamp = new Date().toLocaleTimeString()
      console.log(`🔄 [${timestamp}] Auth state change:`, event, session ? {
        userId: session.user.id,
        email: session.user.email,
        expiresAt: session.expires_at
      } : 'No session')
      
      setSession(session)
      setUser(session?.user || null)
      
      if (session) {
        setError(null) // Clear errors on successful auth
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const testGoogleSignIn = async () => {
    try {
      console.log('🚀 Starting Google OAuth flow...')
      setError(null) // Clear previous errors
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/debug-auth`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      })
      
      if (error) {
        console.error('❌ Google sign in error:', error)
        setError(`Google sign in error: ${error.message}`)
      } else {
        console.log('✅ OAuth redirect initiated successfully')
      }
    } catch (err) {
      console.error('❌ Google sign in exception:', err)
      setError(`Google sign in exception: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Sign out error:', error)
        setError(`Sign out error: ${error.message}`)
      }
    } catch (err) {
      console.error('Sign out exception:', err)
      setError(`Sign out exception: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const clearStorage = () => {
    try {
      if (typeof window !== 'undefined') {
        // Clear localStorage
        localStorage.clear()
        // Clear sessionStorage
        sessionStorage.clear()
        // Reload page
        window.location.reload()
      }
    } catch (err) {
      console.error('Clear storage error:', err)
      setError(`Clear storage error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const checkStorage = () => {
    if (typeof window !== 'undefined') {
      const authTokens = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.includes('supabase') || key?.includes('auth')) {
          authTokens.push({
            key,
            value: localStorage.getItem(key)
          })
        }
      }
      console.log('Auth-related storage items:', authTokens)
      setError(`Found ${authTokens.length} auth-related storage items. Check console for details.`)
    }
  }

  if (loading) {
    return <div className="p-8">Loading debug info...</div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Authentication Debug</h1>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Session Info</h2>
          <div className="p-4 bg-gray-100 rounded">
            <pre className="text-sm overflow-auto">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">User Info</h2>
          <div className="p-4 bg-gray-100 rounded">
            <pre className="text-sm overflow-auto">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      <div className="mt-8 space-x-4 space-y-4">
        <button
          onClick={testGoogleSignIn}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Test Google Sign In
        </button>
        
        <button
          onClick={signOut}
          className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Sign Out
        </button>

        <button
          onClick={clearStorage}
          className="px-6 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
        >
          Clear Storage & Reload
        </button>

        <button
          onClick={checkStorage}
          className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Check Storage
        </button>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Environment Check</h2>
        <div className="space-y-2 text-sm">
          <div>
            <strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}
          </div>
          <div>
            <strong>Supabase Anon Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}
          </div>
          <div>
            <strong>Current URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'N/A'}
          </div>
        </div>
      </div>
    </div>
  )
} 