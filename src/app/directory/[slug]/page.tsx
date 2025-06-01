'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { UserProfile, ROLE_INFO } from '@/types/auth'

interface RoleTag {
  id: number
  roleTagName: string
}

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null)
  const [targetProfile, setTargetProfile] = useState<UserProfile | null>(null)
  const [roleTags, setRoleTags] = useState<RoleTag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const getSessionAndProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setCurrentUser(session?.user ?? null)
      
      if (session?.user) {
        await fetchCurrentUserProfile(session.user.id)
      }
      
      setLoading(false)
    }

    getSessionAndProfile()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setCurrentUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchCurrentUserProfile(session.user.id)
        } else {
          setCurrentProfile(null)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (currentProfile && currentProfile.role !== 'no_membership') {
      fetchTargetProfile()
      fetchRoleTags()
    }
  }, [currentProfile, slug])

  const fetchCurrentUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching current user profile:', error)
        return
      }

      setCurrentProfile(data)
    } catch (error) {
      console.error('Error fetching current user profile:', error)
    }
  }

  const fetchTargetProfile = async () => {
    try {
      setLoading(true)
      setError(null)

      // First try to find by slug
      let { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('slug', slug)
        .single()

      // If no result found by slug, try by ID as fallback
      if (error && error.code === 'PGRST116') {
        const { data: idData, error: idError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', slug)
          .single()

        if (idError) {
          setError('User profile not found')
          setLoading(false)
          return
        }

        data = idData
      } else if (error) {
        console.error('Error fetching target profile:', error)
        setError('Error loading user profile')
        setLoading(false)
        return
      }

      // Check if the target profile should be visible to current user
      if (data.role === 'no_membership' || data.role === 'awaiting_match') {
        setError('This profile is not available')
        setLoading(false)
        return
      }

      setTargetProfile(data)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching target profile:', error)
      setError('Error loading user profile')
      setLoading(false)
    }
  }

  const fetchRoleTags = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profile_roleTagId_enum')
        .select('*')
        .order('id')

      if (error) {
        console.error('Error fetching role tags:', error)
      } else {
        setRoleTags(data || [])
      }
    } catch (error) {
      console.error('Error fetching role tags:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  // Check authentication
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-white mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-6">You need to be logged in to view user profiles.</p>
          <a 
            href="/sign-up-june" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Sign In
          </a>
        </div>
      </div>
    )
  }

  // Check membership access
  if (currentProfile?.role === 'no_membership') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-white mb-4">Access Restricted</h1>
          <p className="text-gray-400 mb-6">You need an active membership to view user profiles.</p>
          <a 
            href="/" 
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg"
          >
            Back to Home
          </a>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-white mb-4">Profile Not Found</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg mr-4"
          >
            Go Back
          </button>
          <a 
            href="/directory" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            View Directory
          </a>
        </div>
      </div>
    )
  }

  if (!targetProfile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">User profile not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-2">Member Profile</h1>
          <p className="text-gray-400">MVRK HAUS Directory</p>
        </div>

        {/* Profile Content */}
        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          <div className="bg-gray-900 rounded-lg p-8 mb-8">
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden">
                  {targetProfile.avatar_url ? (
                    <img 
                      src={targetProfile.avatar_url} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-bold">
                      {(targetProfile.mvrkName || targetProfile['june-ot-legalName'] || targetProfile.email)?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-3xl font-bold text-white mb-2">
                  {targetProfile.mvrkName || targetProfile['june-ot-legalName'] || 'Member'}
                </h2>
                
                {targetProfile.full_name && targetProfile.full_name !== (targetProfile.mvrkName || targetProfile['june-ot-legalName']) && (
                  <p className="text-xl text-gray-300 mb-2">{targetProfile.full_name}</p>
                )}
                
                <p className="text-gray-400 mb-4">{targetProfile.email}</p>

                {/* Role Badge */}
                <div className="mb-4">
                  <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                    targetProfile.role === 'admin' ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30' :
                    targetProfile.role === 'editor' ? 'bg-green-900/30 text-green-400 border border-green-500/30' :
                    targetProfile.role === 'general_member' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/30' :
                    'bg-red-900/30 text-red-400 border border-red-500/30'
                  }`}>
                    <span className="mr-2">{ROLE_INFO[targetProfile.role].emoji}</span>
                    {ROLE_INFO[targetProfile.role].label}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {ROLE_INFO[targetProfile.role].description}
                  </p>
                </div>

                <p className="text-sm text-gray-500">
                  Member since: {new Date(targetProfile.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Bio Section */}
          {targetProfile.bio && (
            <div className="bg-gray-900 rounded-lg p-8 mb-8">
              <h3 className="text-xl font-semibold text-white mb-4">About</h3>
              <p className="text-gray-300 leading-relaxed">{targetProfile.bio}</p>
            </div>
          )}

          {/* Role Tags */}
          {targetProfile.roleTagIds && targetProfile.roleTagIds.length > 0 && (
            <div className="bg-gray-900 rounded-lg p-8 mb-8">
              <h3 className="text-xl font-semibold text-white mb-4">Skills & Roles</h3>
              <div className="flex flex-wrap gap-3">
                {targetProfile.roleTagIds.map(tagId => {
                  const tag = roleTags.find(t => t.id === tagId)
                  return tag ? (
                    <span 
                      key={tagId} 
                      className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-full text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                    >
                      {tag.roleTagName}
                    </span>
                  ) : null
                })}
              </div>
            </div>
          )}

          {/* Social Links */}
          {targetProfile.instagramId && (
            <div className="bg-gray-900 rounded-lg p-8 mb-8">
              <h3 className="text-xl font-semibold text-white mb-4">Social Media</h3>
              <div className="flex space-x-4">
                <a
                  href={`https://instagram.com/${targetProfile.instagramId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-pink-400 hover:text-pink-300 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  <span>@{targetProfile.instagramId}</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="text-center mt-12 space-x-4">
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white transition-colors duration-200"
          >
            ← Go Back
          </button>
          <span className="text-gray-600">|</span>
          <a
            href="/directory"
            className="text-gray-400 hover:text-white transition-colors duration-200"
          >
            View All Members
          </a>
        </div>
      </div>
    </div>
  )
} 