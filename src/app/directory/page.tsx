'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { User, Session } from '@supabase/supabase-js'
import { UserProfile } from '@/types/auth'
import Header from '@/components/Header'
import BlobHalftoneBackground from '@/components/BlobHalftoneBackground'
import Image from 'next/image'

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
  console.log('[DEBUG] Directory component function body executing...'); // Early log

  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [registeredUsers, setRegisteredUsers] = useState<UserProfile[]>([])
  const [preparatoryUsers, setPreparatoryUsers] = useState<PrepUser[]>([])
  const [roleTags, setRoleTags] = useState<RoleTag[]>([])
  const [selectedRoleTags, setSelectedRoleTags] = useState<number[]>([])

  useEffect(() => {
    console.log('[DEBUG] Main useEffect hook running...'); // This should still appear

    // Get initial session and profile
    const getSessionAndProfile = async () => {
      console.log('[DEBUG] getSessionAndProfile: Attempting to fetch initial session and profile...'); // New first log inside async fn
      const { data: { session: initialSession }, error: initialSessionError } = await supabase.auth.getSession()

      if (initialSessionError) {
        console.error('getSessionAndProfile: Error fetching initial session:', initialSessionError);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      
      if (initialSession?.user) {
        console.log('getSessionAndProfile: Initial session received, user ID:', initialSession.user.id);
        setUser(initialSession.user); 
        await fetchUserProfile(initialSession); 
      } else {
        console.log('getSessionAndProfile: No initial session or user.');
        setUser(null);
        setProfile(null);
        setLoading(false); 
      }
    }

    getSessionAndProfile() // Call the async function

    // Listen for auth changes
    console.log('[DEBUG] Attempting to set up auth state change listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, authChangeEventSession) => {
        console.log('[DEBUG] onAuthStateChange: Async callback triggered. Event:', event);
            
        if (authChangeEventSession?.user) {
          console.log('[DEBUG] onAuthStateChange: User found in session, setting user and fetching profile. User ID:', authChangeEventSession.user.id);
          setUser(authChangeEventSession.user); 
          await fetchUserProfile(authChangeEventSession); 
        } else {
          console.log('[DEBUG] onAuthStateChange: No user in session, clearing user and profile.');
          setUser(null);
          setProfile(null);
        }
            
        // If there's no session after an auth change (e.g., user signs out), ensure loading stops.
        if (!authChangeEventSession) {
            console.log('[DEBUG] onAuthStateChange: No session (e.g., sign out), ensuring loading is false.');
            setLoading(false);
        }
      }
    )

    return () => {
      console.log('[DEBUG] Cleaning up auth state change subscription.');
      subscription.unsubscribe();
    }
  }, [])

  useEffect(() => {
    console.log('Profile state changed in /directory/page.tsx. Current profile:', profile);
    if (profile && profile.role !== 'no_membership') {
      console.log('Profile is valid, fetching directory data and role tags.');
      fetchDirectoryData()
      fetchRoleTags()
    } else if (profile) {
      console.log('Profile exists but role is no_membership or invalid. Role:', profile.role);
      setLoading(false); // Stop loading if profile is fetched but not authorized to see directory
    } else {
      console.log('Profile is null. Not fetching directory data.');
    }
  }, [profile])

  const fetchUserProfile = async (currentSession: Session | null) => {
    try {
      if (!currentSession || !currentSession.user) {
        console.log('fetchUserProfile called with no session or no user.');
        setProfile(null);
        setLoading(false); // Stop loading if no session/user
        return;
      }
      const userId = currentSession.user.id;
      console.log('Fetching user profile for user ID:', userId, 'in /directory/page.tsx, using provided session.');
      console.log('Supabase client object in fetchUserProfile:', supabase);

      console.log('[DEBUG] Using provided session. Access token exists:', !!currentSession.access_token);
      console.log('[DEBUG] Session appears valid, proceeding to check env vars.');

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Supabase URL or Anon Key is not defined in environment variables.');
        setProfile(null);
        setLoading(false);
        return;
      }

      console.log('[DEBUG] Environment variables (URL/Key) appear valid.');

      const profileUrl = `${supabaseUrl}/rest/v1/user_profiles?id=eq.${userId}&select=*`;
      
      console.log('Attempting direct fetch to:', profileUrl);

      const response = await fetch(profileUrl, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${currentSession.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Direct fetch response status:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error fetching user profile via direct fetch:', response.status, errorData);
        setProfile(null);
        setLoading(false);
        return;
      }

      const profiles = await response.json();

      if (profiles && profiles.length > 0) {
        console.log('Successfully fetched user profile data via direct fetch:', profiles[0]);
        setProfile(profiles[0]);
      } else {
        console.log('No user profile data found via direct fetch or profiles array is empty.');
        setProfile(null);
      }
    } catch (error) {
      console.error('Catch block error in fetchUserProfile in /directory/page.tsx:', error);
      setProfile(null); 
      setLoading(false);
    }
  }

  const fetchDirectoryData = async () => {
    try {
      // Fetch registered users (excluding no_membership)
      console.log('Fetching registered users from user_profiles');
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
      console.log('Fetching preparatory users from june-otp');
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
      console.log('Fetching role tags from user_profile_roleTagId_enum');
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-black text-xl">Loading...</div>
      </div>
    )
  }

  // Redirect if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-black mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">로그인한 메버릭 멤버만 디렉토리를 볼 수 있습니다.</p>
          <Link 
            href="/sign-up-june" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  // Redirect if no_membership
  if (profile?.role === 'no_membership') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-black mb-4">Access Restricted</h1>
          <p className="text-gray-600 mb-6">디렉토리를 보기 위해서는 멤버십을 구독해야만 합니다.</p>
          <Link 
            href="/" 
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2"
          >
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative">
      {/* Blob Halftone Background */}
      <div className="fixed inset-0 w-full h-full">
        <BlobHalftoneBackground 
          layerCount={8}
          autoRefresh={false}
          className="w-full h-full"
        />
      </div>
      
      {/* Content overlay with semi-transparent background */}
      <div className="relative z-10 min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-16 pt-24">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold mb-4 text-black">Directory</h1>
            <p className="text-green-600">메버릭 동료들에 대해 알아보고 협업을 요청해보세요.</p>
          </div>

          {/* Role Tag Filters */}
          <div className="mb-8 bg-white border border-black p-4 text-black">
            <h2 className="text-xl font-semibold mb-4">Filter by Tags</h2>
            <div className="flex flex-wrap gap-2">
              {roleTags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => toggleRoleTag(tag.id)}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    selectedRoleTags.includes(tag.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
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

          {/* Stats - Admin Only */}
          {profile?.role === 'admin' && (
            <div className="mb-8 bg-red-200 p-4 border border-black text-black">
              <div className="mb-4">
                <p className="text-sm text-gray-900 italic">
                  This status dashboard is only shown to administrators for community management purposes. Current admin users: {(() => {
                    const adminUsers = registeredUsers.filter(user => user.role === 'admin');
                    return adminUsers.map(user => user.mvrkName || user['june-ot-legalName'] || 'Unnamed').join(', ');
                  })()}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 border border-gray-200">
                  <h3 className="text-lg font-semibold mb-2">Registered Members</h3>
                  <p className="text-2xl text-blue-600">{filteredRegisteredUsers.length}</p>
                </div>
                <div className="bg-gray-50 p-4 border border-gray-200">
                  <h3 className="text-lg font-semibold mb-2">Preparatory Users</h3>
                  <p className="text-2xl text-yellow-600">{filteredPreparatoryUsers.length}</p>
                </div>
                <div className="bg-gray-50 p-4 border border-gray-200">
                  <h3 className="text-lg font-semibold mb-2">Total</h3>
                  <p className="text-2xl text-green-600">{filteredRegisteredUsers.length + filteredPreparatoryUsers.length}</p>
                </div>
              </div>
            </div>
          )}

          {/* User Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {/* Registered Users */}
            {filteredRegisteredUsers.map(user => (
              <Link 
                key={user.id} 
                href={`/directory/${user.slug || user.id}`}
                className="bg-gray-50 p-4 hover:bg-gray-100 transition-colors duration-200 cursor-pointer block border border-black"
              >
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden mr-3">
                    {user.avatar_url ? (
                      <Image
                        src={user.avatar_url} 
                        alt="Profile" 
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-bold text-white">
                        {(user.mvrkName || user['june-ot-legalName'] || user.email)?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-black">
                      {user.mvrkName || user['june-ot-legalName'] || 'Member'}
                    </h3>
                    <p className="text-sm text-gray-600">{user.instagramId ? `@${user.instagramId}` : ''}</p>
                  </div>
                </div>

                {user.bio && (
                  <p className="text-sm text-black mb-3 line-clamp-2">{user.bio}</p>
                )}

                {user.roleTagIds && user.roleTagIds.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {user.roleTagIds.slice(0, 3).map(tagId => {
                      const tag = roleTags.find(t => t.id === tagId)
                      return tag ? (
                        <span key={tagId} className="px-2 py-1 bg-gray-200 text-xs text-black border border-gray-300">
                          {tag.roleTagName}
                        </span>
                      ) : null
                    })}
                    {user.roleTagIds.length > 3 && (
                      <span className="px-2 py-1 bg-gray-200 text-xs rounded text-gray-600 border border-gray-300">
                        +{user.roleTagIds.length - 3} more
                      </span>
                    )}
                  </div>
                )}
                
              </Link>
            ))}

            {/* Preparatory Users */}
            {filteredPreparatoryUsers.map(prepUser => (
              <div key={`prep-${prepUser.id}`} className="bg-gray-200 p-4 border border-gray-400">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-gray-300 flex items-center justify-center mr-3">
                    <span className="text-lg font-bold text-gray-700">
                      {prepUser.legalName?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-black">{prepUser.legalName}</h3>
                    <p className="text-sm text-gray-600">{prepUser.kaTalkName}</p>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600">인증 대기중...</p>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredRegisteredUsers.length === 0 && filteredPreparatoryUsers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">No users found matching your criteria.</p>
            </div>
          )}

          {/* Back to home */}
          <div className="text-center mt-12">
            <Link
              href="/"
              className="text-gray-600 hover:text-black transition-colors duration-200"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 