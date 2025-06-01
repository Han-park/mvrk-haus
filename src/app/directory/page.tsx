'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { UserProfile } from '@/types/auth'

interface PrepUser {
  id: number
  kaTalkName: string
  legalName: string
  passcode: string
  is_register: boolean
}

interface RoleTag {
  id: number
  roleTagName: string
}

export default function Directory() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [registeredUsers, setRegisteredUsers] = useState<UserProfile[]>([])
  const [preparatoryUsers, setPreparatoryUsers] = useState<PrepUser[]>([])
  const [roleTags, setRoleTags] = useState<RoleTag[]>([])
  const [selectedRoleTags, setSelectedRoleTags] = useState<number[]>([])

  useEffect(() => {
    // Get initial session and profile
    const getSessionAndProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      
      if (session?.user) {
        await fetchUserProfile(session.user.id)
      }
      
      setLoading(false)
    }

    getSessionAndProfile()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchUserProfile(session.user.id)
        } else {
          setProfile(null)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (profile && profile.role !== 'no_membership') {
      fetchDirectoryData()
      fetchRoleTags()
    }
  }, [profile])

  const fetchUserProfile = async (userId: string) => {
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
      console.error('Error fetching user profile:', error)
    }
  }

  const fetchDirectoryData = async () => {
    try {
      // Fetch registered users (excluding no_membership)
      const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select('*')
        .neq('role', 'no_membership')

      if (usersError) {
        console.error('Error fetching users:', usersError)
      } else {
        setRegisteredUsers(users || [])
      }

      // Fetch preparatory users (is_register = false)
      const { data: prepUsers, error: prepError } = await supabase
        .from('june-otp')
        .select('*')
        .eq('is_register', false)

      if (prepError) {
        console.error('Error fetching preparatory users:', prepError)
      } else {
        setPreparatoryUsers(prepUsers || [])
      }
    } catch (error) {
      console.error('Error fetching directory data:', error)
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

  const toggleRoleTag = (tagId: number) => {
    setSelectedRoleTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }

  // Filter registered users by selected role tags
  const filteredRegisteredUsers = selectedRoleTags.length === 0 
    ? registeredUsers 
    : registeredUsers.filter(user => 
        user.roleTagIds?.some(tagId => selectedRoleTags.includes(tagId))
      )

  // Only show preparatory users when no filters are applied
  const filteredPreparatoryUsers = selectedRoleTags.length === 0 ? preparatoryUsers : []

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  // Redirect if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-white mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-6">You need to be logged in to view the directory.</p>
          <a 
            href="/sign-up-june" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
          >
            Sign In
          </a>
        </div>
      </div>
    )
  }

  // Redirect if no_membership
  if (profile?.role === 'no_membership') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-white mb-4">Access Restricted</h1>
          <p className="text-gray-400 mb-6">You need an active membership to view the directory.</p>
          <a 
            href="/" 
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2"
          >
            Back to Home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">MVRK HAUS Directory</h1>
          <p className="text-gray-400">Community members and preparatory users</p>
        </div>

        {/* Role Tag Filters */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Filter by Role Tags</h2>
          <div className="flex flex-wrap gap-2">
            {roleTags.map(tag => (
              <button
                key={tag.id}
                onClick={() => toggleRoleTag(tag.id)}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  selectedRoleTags.includes(tag.id)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {tag.roleTagName}
              </button>
            ))}
            {selectedRoleTags.length > 0 && (
              <button
                onClick={() => setSelectedRoleTags([])}
                className="px-3 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-900 p-4">
            <h3 className="text-lg font-semibold mb-2">Registered Members</h3>
            <p className="text-2xl text-blue-400">{filteredRegisteredUsers.length}</p>
          </div>
          <div className="bg-gray-900 p-4">
            <h3 className="text-lg font-semibold mb-2">Preparatory Users</h3>
            <p className="text-2xl text-yellow-400">{filteredPreparatoryUsers.length}</p>
          </div>
          <div className="bg-gray-900 p-4">
            <h3 className="text-lg font-semibold mb-2">Total</h3>
            <p className="text-2xl text-green-400">{filteredRegisteredUsers.length + filteredPreparatoryUsers.length}</p>
          </div>
        </div>

        {/* User Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Registered Users */}
          {filteredRegisteredUsers.map(user => (
            <a 
              key={user.id} 
              href={`/directory/${user.slug || user.id}`}
              className="bg-gray-900 p-6 border-l-4 border-green-500 hover:bg-gray-800 transition-colors duration-200 cursor-pointer block"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden mr-3">
                  {user.avatar_url ? (
                    <img 
                      src={user.avatar_url} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-bold">
                      {(user.mvrkName || user['june-ot-legalName'] || user.email)?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white">
                    {user.mvrkName || user['june-ot-legalName'] || 'Member'}
                  </h3>
                  <p className="text-sm text-gray-400">{user.email}</p>
                </div>
              </div>
              
              <div className="mb-3">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  user.role === 'admin' ? 'bg-blue-900/30 text-blue-400' :
                  user.role === 'editor' ? 'bg-green-900/30 text-green-400' :
                  user.role === 'general_member' ? 'bg-yellow-900/30 text-yellow-400' :
                  'bg-red-900/30 text-red-400'
                }`}>
                  {user.role === 'general_member' ? 'member' : user.role}
                </span>
              </div>

              {user.bio && (
                <p className="text-sm text-gray-300 mb-3 line-clamp-2">{user.bio}</p>
              )}

              {user.roleTagIds && user.roleTagIds.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {user.roleTagIds.slice(0, 3).map(tagId => {
                    const tag = roleTags.find(t => t.id === tagId)
                    return tag ? (
                      <span key={tagId} className="px-2 py-1 bg-gray-800 text-xs rounded text-gray-300">
                        {tag.roleTagName}
                      </span>
                    ) : null
                  })}
                  {user.roleTagIds.length > 3 && (
                    <span className="px-2 py-1 bg-gray-800 text-xs rounded text-gray-400">
                      +{user.roleTagIds.length - 3} more
                    </span>
                  )}
                </div>
              )}
              
              <div className="mt-3 text-xs text-gray-500">
                Click to view full profile →
              </div>
            </a>
          ))}

          {/* Preparatory Users */}
          {filteredPreparatoryUsers.map(prepUser => (
            <div key={`prep-${prepUser.id}`} className="bg-gray-900 p-6 border-l-4 border-yellow-500">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center mr-3">
                  <span className="text-lg font-bold">
                    {prepUser.legalName?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white">{prepUser.legalName}</h3>
                  <p className="text-sm text-gray-400">{prepUser.kaTalkName}</p>
                </div>
              </div>
              
              <div className="mb-3">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-900/30 text-yellow-400">
                  preparatory
                </span>
              </div>

              <p className="text-sm text-gray-400">Awaiting registration</p>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredRegisteredUsers.length === 0 && filteredPreparatoryUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No users found matching your criteria.</p>
          </div>
        )}

        {/* Back to home */}
        <div className="text-center mt-12">
          <a
            href="/"
            className="text-gray-400 hover:text-white transition-colors duration-200"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  )
} 