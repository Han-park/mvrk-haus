'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { UserProfile, ROLE_INFO } from '@/types/auth'

export default function SignIn() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const router = useRouter()

  // Ensure component is mounted before accessing browser APIs
  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
        return
      }

      setProfile(data)
    } catch (error) {
      console.error('Exception in fetchUserProfile:', error)
    }
  }, [])

  const getSessionAndProfile = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        setUser(session.user)
        await fetchUserProfile(session.user.id)
      }
    } catch (error) {
      console.error('Error getting session:', error)
    } finally {
      setLoading(false)
    }
  }, [fetchUserProfile])

  useEffect(() => {
    getSessionAndProfile()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          await fetchUserProfile(session.user.id)
          setLoading(false)
          
          // Redirect based on user role
          if (profile) {
            if (profile.role === 'awaiting_match') {
              router.push('/sign-up-june')
            } else if (profile.role !== 'no_membership') {
              router.push('/directory')
            }
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [getSessionAndProfile, fetchUserProfile, profile, router])

  const signInWithGoogle = async () => {
    if (!mounted) {
      return // Prevent execution before mount
    }
    
    setSigningIn(true)
    try {
      const currentOrigin = window.location.origin
      const hostname = window.location.hostname
      
      // Handle domain variants
      let baseUrl: string
      if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
        baseUrl = currentOrigin
      } else if (hostname.includes('vercel.app')) {
        baseUrl = currentOrigin
      } else if (hostname === 'mvrk.haus') {
        baseUrl = 'https://www.mvrk.haus'
      } else if (hostname === 'www.mvrk.haus') {
        baseUrl = currentOrigin
      } else {
        baseUrl = currentOrigin
      }
      
      const fullRedirectUrl = `${baseUrl}/auth/callback?next=/sign-in`
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: fullRedirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account', // Allow users to select which account to use
          },
        }
      })
      
      if (error) {
        console.error('Error signing in with Google:', error)
        alert('Error signing in: ' + error.message)
      }
    } catch (error) {
      console.error('Unexpected error during Google OAuth:', error)
      alert('An unexpected error occurred')
    } finally {
      setSigningIn(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out:', error.message)
        alert('Error signing out: ' + error.message)
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      alert('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-black text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">MVRK HAUS</h1>
          <p className="text-gray-600">Welcome back</p>
        </div>

        {/* Main Content */}
        <div className="max-w-lg mx-auto">
          {user && profile ? (
            // User is signed in - show profile summary and navigation
            <div className="bg-gray-50 p-8 text-center border border-gray-200">
              <div className="mb-6">
                <div className="w-20 h-20 bg-gray-300 mx-auto mb-4 flex items-center justify-center overflow-hidden border border-gray-200">
                  {profile.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-medium text-gray-700">
                      {(profile.mvrkName || profile['june-ot-legalName'] || user.email)?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-3">{user.email}</p>
                
                {/* Display mvrkName or legalName for members */}
                {(profile.role === 'admin' || profile.role === 'editor' || profile.role === 'general_member' || profile.role === 'no_membership') && (
                  <p className="text-lg text-black font-medium mb-2">
                    {profile.mvrkName || profile['june-ot-legalName'] || 'Member'}
                  </p>
                )}
                
                {/* Role Information */}
                <div className="mb-4">
                  <div className={`inline-flex items-center px-3 py-1 text-sm font-medium ${
                    profile.role === 'admin' ? 'bg-blue-100 text-blue-600 border border-blue-300' :
                    profile.role === 'editor' ? 'bg-green-100 text-green-600 border border-green-300' :
                    profile.role === 'general_member' ? 'bg-yellow-100 text-yellow-600 border border-yellow-300' :
                    'bg-red-100 text-red-600 border border-red-300'
                  }`}>
                    <span className="mr-2">{ROLE_INFO[profile.role].emoji}</span>
                    {ROLE_INFO[profile.role].label}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {ROLE_INFO[profile.role].description}
                  </p>
                </div>

                <p className="text-sm text-gray-500">
                  Member since: {new Date(profile.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="space-y-4">
                {/* Action buttons based on role - Go to Directory button removed from here */}
                {profile.role === 'awaiting_match' ? (
                  <Link
                    href="/sign-up-june"
                    className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 transition-colors duration-200"
                  >
                    Complete Registration
                  </Link>
                ) : null}
                
                {/* Edit Profile Button - Show for all members except awaiting_match */}
                {profile.role !== 'awaiting_match' && (
                  <Link
                    href="/profile/edit"
                    className="block w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 transition-colors duration-200"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Edit Profile</span>
                    </div>
                  </Link>
                )}
                
                <button
                  onClick={signOut}
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 transition-colors duration-200"
                >
                  {loading ? 'Signing out...' : 'Sign Out'}
                </button>
              </div>
            </div>
          ) : (
            // User is not signed in - show sign in form
            <div className="bg-gray-50 p-8 border border-gray-200">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-semibold mb-2">Sign In</h3>
                <p className="text-gray-600">Sign in to your MVRK HAUS account</p>
              </div>

              <button
                onClick={signInWithGoogle}
                disabled={signingIn || !mounted}
                className="w-full bg-black hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 transition-colors duration-200 flex items-center justify-center space-x-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>
                  {signingIn ? 'Signing in...' : (!mounted ? 'Loading...' : 'Continue with Google')}
                </span>
              </button>

              <div className="mt-6 text-center">
                <p className="text-gray-600 text-sm">
                  Don&apos;t have an account?{' '}
                  <Link 
                    href="/sign-up-june" 
                    className="text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Sign up here
                  </Link>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Go to Directory button moved to bottom navigation position */}
        <div className="text-center mt-8 max-w-lg mx-auto">
          {user && profile && profile.role !== 'awaiting_match' && profile.role !== 'no_membership' ? (
            <Link
              href="/directory"
              className="inline-block w-full bg-black py-3 px-6 text-white font-semibold transition-colors duration-200"
            >
              Mvrk Directory →
            </Link>
          ) : (
            <Link
              href="/"
              className="text-gray-600 hover:text-black w-full py-3 px-6 transition-colors duration-200"
            >
              ← Back to Home
            </Link>
          )}
        </div>
      </div>
    </div>
  )
} 