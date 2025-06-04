'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { UserProfile, ROLE_INFO } from '@/types/auth'
import Image from 'next/image'

export default function SignIn() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Component mounted - no longer need mounted state since we removed Google login
  }, [])

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        return
      }

      setProfile(data)
    } catch {
      // Handle error silently
    }
  }, [])

  const getSessionAndProfile = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        setUser(session.user)
        await fetchUserProfile(session.user.id)
      }
    } catch {
      // Handle error silently
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

  const signOut = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        alert('Error signing out: ' + error.message)
      }
    } catch {
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
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">MVRK HAUS</h1>
          <p className="text-gray-600">Welcome back</p>
        </div>

        <div className="max-w-lg mx-auto">
          {user && profile ? (
            <div className="bg-gray-50 p-8 text-center border border-gray-200">
              <div className="mb-6">
                <div className="w-20 h-20 bg-gray-300 mx-auto mb-4 flex items-center justify-center overflow-hidden border border-gray-200">
                  {profile.avatar_url ? (
                    <Image 
                      src={profile.avatar_url} 
                      alt="Profile" 
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-medium text-gray-700">
                      {(profile.mvrkName || profile['june-ot-legalName'] || user.email)?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-3">{user.email}</p>
                
                {(profile.role === 'admin' || profile.role === 'editor' || profile.role === 'general_member' || profile.role === 'no_membership') && (
                  <p className="text-lg text-black font-medium mb-2">
                    {profile.mvrkName || profile['june-ot-legalName'] || 'Member'}
                  </p>
                )}
                
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
                {profile.role === 'awaiting_match' ? (
                  <Link
                    href="/sign-up-june"
                    className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 transition-colors duration-200"
                  >
                    Complete Registration
                  </Link>
                ) : null}
                
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
            <div className="bg-gray-50 p-8 border border-gray-200">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-semibold mb-2">Sign In</h3>
                <p className="text-gray-600">Please contact support to access your account</p>
              </div>

              <div className="text-center">
                <p className="text-gray-600 text-sm">
                  Need an account?{' '}
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