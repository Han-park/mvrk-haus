'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { User, Session, Subscription } from '@supabase/supabase-js'
import { UserProfile } from '@/types/auth'
import Header from '@/components/Header'
import BlobHalftoneBackground from '@/components/BlobHalftoneBackground'
import Image from 'next/image'

// Utility types for better error handling
interface AsyncResult<T> {
  data: T | null
  error: string | null
  success: boolean
}

interface AsyncOptions {
  timeout?: number
  retries?: number
  signal?: AbortSignal
}

// Utility function for async operations with timeout and retry
async function withAsyncRetry<T>(
  operation: (signal?: AbortSignal) => Promise<T>,
  options: AsyncOptions = {}
): Promise<AsyncResult<T>> {
  const { timeout = 10000, retries = 2 } = options
  let lastError: string = ''
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    const abortController = new AbortController()
    
    // If external signal is aborted, abort this operation
    if (options.signal?.aborted) {
      return { data: null, error: 'Operation was cancelled', success: false }
    }
    
    // Listen for external signal abort
    const onExternalAbort = () => abortController.abort('External signal aborted')
    if (options.signal) {
      options.signal.addEventListener('abort', onExternalAbort)
    }
    
    try {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        abortController.abort('Operation timed out')
      }, timeout)
      
      const result = await operation(abortController.signal)
      clearTimeout(timeoutId)
      
      return { data: result, error: null, success: true }
    } catch (error: unknown) {
      if (abortController.signal.aborted) {
        lastError = attempt === retries ? 'Operation timed out' : 'Timeout, retrying...'
      } else {
        lastError = error instanceof Error ? error.message : 'Unknown error occurred'
      }
      
      console.warn(`Attempt ${attempt + 1}/${retries + 1} failed:`, lastError)
      
      // Don't retry on certain types of errors
      if (error instanceof Error && (
        error.message.includes('JWT') ||
        error.message.includes('unauthorized') ||
        error.message.includes('forbidden')
      )) {
        break
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < retries && !options.signal?.aborted) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      }
    } finally {
      if (options.signal) {
        options.signal.removeEventListener('abort', onExternalAbort)
      }
    }
  }
  
  return { data: null, error: lastError, success: false }
}

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
  console.log('[DEBUG] Directory component function body executing...');

  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [registeredUsers, setRegisteredUsers] = useState<UserProfile[]>([])
  const [preparatoryUsers, setPreparatoryUsers] = useState<PrepUser[]>([])
  const [roleTags, setRoleTags] = useState<RoleTag[]>([])
  const [selectedRoleTags, setSelectedRoleTags] = useState<number[]>([])

  // Refs for cleanup and race condition prevention
  const abortControllerRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    console.log('[DEBUG] Main useEffect hook: START');
    
    const controller = new AbortController()
    abortControllerRef.current = controller

    const getSessionAndProfile = async () => {
      console.log('[DEBUG] getSessionAndProfile: START');
      
      if (!mountedRef.current || controller.signal.aborted) return
      
      const result = await withAsyncRetry(async (signal) => {
        if (signal?.aborted) throw new Error('Operation aborted')
        
        const { data: { session: initialSession }, error: initialSessionError } = await supabase.auth.getSession()

        if (initialSessionError) {
          throw new Error(`Error fetching initial session: ${initialSessionError.message}`)
        }
        
        if (initialSession?.user) {
          console.log('getSessionAndProfile: Initial session received, user ID:', initialSession.user.id)
          
          if (mountedRef.current && !signal?.aborted) {
            setUser(initialSession.user)
            
            const profileResult = await fetchUserProfile(initialSession, signal)
            if (profileResult.success && profileResult.data) {
              setProfile(profileResult.data)
            } else {
              console.error('Failed to fetch profile:', profileResult.error)
              setProfile(null)
            }
          }
        } else {
          console.log('getSessionAndProfile: No initial session or user.')
          if (mountedRef.current && !signal?.aborted) {
            setUser(null)
            setProfile(null)
          }
        }
        
        return initialSession
      }, { signal: controller.signal, timeout: 15000, retries: 2 })

      if (mountedRef.current && !controller.signal.aborted) {
        if (!result.success) {
          console.error('getSessionAndProfile failed:', result.error)
          setUser(null)
          setProfile(null)
        }
        setLoading(false)
      }
      
      console.log('[DEBUG] getSessionAndProfile: END');
    }

    getSessionAndProfile()

    console.log('[DEBUG] Main useEffect hook: After getSessionAndProfile() call');

    let activeSubscription: Subscription | undefined = undefined

    try {
      console.log('[DEBUG] Main useEffect hook: Attempting to set up onAuthStateChange listener...');
      const handlerResult = supabase.auth.onAuthStateChange(
        async (event, authChangeEventSession) => {
          if (!mountedRef.current || controller.signal.aborted) return
          
          console.log('[DEBUG] onAuthStateChange: Async callback triggered. Event:', event)
              
          try {
            if (authChangeEventSession?.user) {
              console.log('[DEBUG] onAuthStateChange: User found, setting user & fetching profile. User ID:', authChangeEventSession.user.id)
              
              if (mountedRef.current) {
                setUser(authChangeEventSession.user)
                
                const profileResult = await fetchUserProfile(authChangeEventSession, controller.signal)
                if (mountedRef.current && !controller.signal.aborted) {
                  if (profileResult.success && profileResult.data) {
                    setProfile(profileResult.data)
                  } else {
                    console.error('Failed to fetch profile on auth change:', profileResult.error)
                    setProfile(null)
                  }
                }
              }
            } else {
              console.log('[DEBUG] onAuthStateChange: No user in session, clearing user/profile.')
              if (mountedRef.current) {
                setUser(null)
                setProfile(null)
              }
            }
            
            if (!authChangeEventSession) {
              console.log('[DEBUG] onAuthStateChange: No session (e.g., sign out), ensuring loading is false.')
              if (mountedRef.current) {
                setLoading(false)
              }
            }
          } catch (error) {
            if (mountedRef.current && !controller.signal.aborted) {
              console.error('Error in auth state change:', error)
              setUser(null)
              setProfile(null)
              setLoading(false)
            }
          }
        }
      )
      
      if (handlerResult && handlerResult.data && handlerResult.data.subscription) {
        activeSubscription = handlerResult.data.subscription
        console.log('[DEBUG] Main useEffect hook: onAuthStateChange listener SUCCEEDED and subscription obtained.')
      } else {
        console.error('[DEBUG] Main useEffect hook: onAuthStateChange listener FAILED to return expected data structure (subscription missing). Handler response:', handlerResult)
      }
    } catch (error) {
      console.error('[DEBUG] Main useEffect hook: CRITICAL ERROR setting up onAuthStateChange listener:', error)
    }

    console.log('[DEBUG] Main useEffect hook: END SYNC WORK')

    return () => {
      console.log('[DEBUG] Main useEffect hook: Cleanup function running.')
      mountedRef.current = false
      controller.abort('Component unmounting')
      
      if (activeSubscription && typeof activeSubscription.unsubscribe === 'function') {
        console.log('[DEBUG] Main useEffect hook: Attempting to unsubscribe.')
        activeSubscription.unsubscribe()
        console.log('[DEBUG] Main useEffect hook: Unsubscribe called.')
      } else {
        console.log('[DEBUG] Main useEffect hook: No valid subscription to unsubscribe from.')
      }
    }
  }, [])

  useEffect(() => {
    console.log('Profile state changed in /directory/page.tsx. Current profile:', profile)
    
    if (profile && profile.role !== 'no_membership') {
      console.log('Profile is valid, fetching directory data and role tags.')
      
      // Use Promise.all for concurrent operations
      Promise.all([
        fetchDirectoryData(),
        fetchRoleTags()
      ]).then(() => {
        if (mountedRef.current) {
          setLoading(false)
        }
      }).catch((error) => {
        console.error('Error fetching directory data or role tags:', error)
        if (mountedRef.current) {
          setLoading(false)
        }
      })
    } else if (profile) {
      console.log('Profile exists but role is no_membership or invalid. Role:', profile.role)
      setLoading(false)
    } else {
      console.log('Profile is null. Not fetching directory data.')
    }
  }, [profile])

  const fetchUserProfile = async (currentSession: Session | null, signal?: AbortSignal): Promise<AsyncResult<UserProfile>> => {
    const operation = async (abortSignal?: AbortSignal) => {
      if (!currentSession || !currentSession.user) {
        throw new Error('No session or user provided')
      }
      
      const userId = currentSession.user.id
      console.log('Fetching user profile for user ID:', userId, 'in /directory/page.tsx, using provided session.')

      if (abortSignal?.aborted) throw new Error('Operation aborted')

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase URL or Anon Key is not defined in environment variables')
      }

      console.log('[DEBUG] Environment variables (URL/Key) appear valid.')

      const profileUrl = `${supabaseUrl}/rest/v1/user_profiles?id=eq.${userId}&select=*`
      
      console.log('Attempting direct fetch to:', profileUrl)

      if (abortSignal?.aborted) throw new Error('Operation aborted')

      const response = await fetch(profileUrl, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${currentSession.access_token}`,
          'Content-Type': 'application/json'
        },
        signal: abortSignal
      })

      console.log('Direct fetch response status:', response.status)

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Error fetching user profile via direct fetch: ${response.status} ${errorData}`)
      }

      const profiles = await response.json()

      if (profiles && profiles.length > 0) {
        console.log('Successfully fetched user profile data via direct fetch:', profiles[0])
        return profiles[0]
      } else {
        throw new Error('No user profile data found or profiles array is empty')
      }
    }

    return await withAsyncRetry(operation, { signal, timeout: 15000, retries: 2 })
  }

  const fetchDirectoryData = async (): Promise<AsyncResult<{ users: UserProfile[], prepUsers: PrepUser[] }>> => {
    const operation = async (signal?: AbortSignal) => {
      console.log('Fetching directory data...')
      
      if (signal?.aborted) throw new Error('Operation aborted')

      // Fetch both registered and preparatory users concurrently
      const [registeredResult, prepResult] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('*')
          .in('role', ['admin', 'editor', 'general_member']),
        supabase
          .from('june-otp')
          .select('*')
      ])

      if (signal?.aborted) throw new Error('Operation aborted')

      if (registeredResult.error) {
        throw new Error(`Error fetching registered users: ${registeredResult.error.message}`)
      }

      if (prepResult.error) {
        throw new Error(`Error fetching preparatory users: ${prepResult.error.message}`)
      }

      const users = registeredResult.data || []
      const prepUsers = prepResult.data || []

      console.log('Directory data fetched successfully. Users:', users.length, 'Prep users:', prepUsers.length)

      if (mountedRef.current && !signal?.aborted) {
        setRegisteredUsers(users)
        setPreparatoryUsers(prepUsers)
      }

      return { users, prepUsers }
    }

    return await withAsyncRetry(operation, { 
      signal: abortControllerRef.current?.signal, 
      timeout: 15000, 
      retries: 2 
    })
  }

  const fetchRoleTags = async (): Promise<AsyncResult<RoleTag[]>> => {
    const operation = async (signal?: AbortSignal) => {
      console.log('Fetching role tags...')
      
      if (signal?.aborted) throw new Error('Operation aborted')

      const { data, error } = await supabase
        .from('role_tags')
        .select('*')
        .order('roleTagName')

      if (error) {
        throw new Error(`Error fetching role tags: ${error.message}`)
      }

      const tags = data || []
      console.log('Role tags fetched successfully:', tags.length)

      if (mountedRef.current && !signal?.aborted) {
        setRoleTags(tags)
      }

      return tags
    }

    return await withAsyncRetry(operation, { 
      signal: abortControllerRef.current?.signal, 
      timeout: 10000, 
      retries: 2 
    })
  }

  const toggleRoleTag = (tagId: number) => {
    if (!mountedRef.current) return
    
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