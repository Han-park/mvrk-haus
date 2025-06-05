'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User, Session } from '@supabase/supabase-js'
import { UserProfile, ROLE_INFO } from '@/types/auth'
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

export default function SignUpJuneClient() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [passcode, setPasscode] = useState<string[]>(new Array(8).fill(''))
  const [passcodeLoading, setPasscodeLoading] = useState(false)
  const [urlMessage, setUrlMessage] = useState<string | null>(null)
  const [urlError, setUrlError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  
  // Refs for cleanup and race condition prevention
  const abortControllerRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)

  // Handle URL parameters for messages and errors
  useEffect(() => {
    if (mounted) {
      const message = searchParams.get('message')
      const error = searchParams.get('error')
      
      if (message) {
        setUrlMessage(message)
        // Clear message after 5 seconds
        setTimeout(() => {
          if (mountedRef.current) setUrlMessage(null)
        }, 5000)
      }
      
      if (error) {
        setUrlError(error)
        // Clear error after 5 seconds
        setTimeout(() => {
          if (mountedRef.current) setUrlError(null)
        }, 5000)
      }
    }
  }, [mounted, searchParams])

  const createUserProfile = useCallback(async (userId: string, signal?: AbortSignal): Promise<AsyncResult<UserProfile>> => {
    const operation = async (abortSignal?: AbortSignal) => {
      console.log('[Supabase] supabase.auth.getUser in createUserProfile');
      
      if (abortSignal?.aborted) throw new Error('Operation aborted')
      
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not found')
      }

      if (abortSignal?.aborted) throw new Error('Operation aborted')

      console.log('Checking for existing profile by email:', user.email);
      const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', user.email)
        .single()

      if (abortSignal?.aborted) throw new Error('Operation aborted')

      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error(`Profile check failed: ${checkError.message}`)
      }
      
      if (existingProfile) {
        if (existingProfile.id !== userId) {
          console.log('[Supabase] Updating existing profile with new user ID');
          const { data: updatedProfile, error: updateError } = await supabase
            .from('user_profiles')
            .update({ id: userId })
            .eq('email', user.email)
            .select()
            .single()
            
          if (updateError) {
            throw new Error(`Profile update failed: ${updateError.message}`)
          }
          
          return updatedProfile
        } else {
          return existingProfile
        }
      }
      
      console.log('[Supabase] Creating new user profile');
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          email: user.email || '',
          role: 'awaiting_match'
        })
        .select()
        .single()

      if (error) {
        if (error.message?.includes('foreign key') || error.message?.includes('does not exist')) {
          throw new Error('Account data reset required - please sign in again')
        }
        throw new Error(`Profile creation failed: ${error.message}`)
      }

      return data
    }

    return await withAsyncRetry(operation, { signal, timeout: 15000, retries: 2 })
  }, [])

  const fetchUserProfile = useCallback(async (userId: string, existingSession?: Session | null, signal?: AbortSignal): Promise<AsyncResult<UserProfile>> => {
    const operation = async (abortSignal?: AbortSignal) => {
      let session = existingSession
      if (!session) {
        console.log('[Supabase] supabase.auth.getSession in fetchUserProfile');
        if (abortSignal?.aborted) throw new Error('Operation aborted')
        
        const { data: { session: newSession } } = await supabase.auth.getSession()
        session = newSession
      }
      
      if (abortSignal?.aborted) throw new Error('Operation aborted')
      
      console.log('[Supabase] Fetching user profile');
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, create it
          const createResult = await createUserProfile(userId, abortSignal)
          if (!createResult.success || !createResult.data) {
            throw new Error(createResult.error || 'Failed to create user profile')
          }
          return createResult.data
        }
        throw new Error(`Profile fetch failed: ${error.message}`)
      }

      return data
    }

    return await withAsyncRetry(operation, { signal, timeout: 15000, retries: 2 })
  }, [createUserProfile])

  useEffect(() => {
    const controller = new AbortController()
    abortControllerRef.current = controller
    
    const getSessionAndProfile = async () => {
      if (!mountedRef.current) return
      
      try {
        // First check for any hash parameters (implicit flow)
        if (typeof window !== 'undefined' && window.location.hash) {
          console.log('Found hash params, waiting for session detection...')
          // Give Supabase time to process the hash params
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        
        if (controller.signal.aborted) return
        
        console.log('[Supabase] supabase.auth.getSession in useEffect/getSessionAndProfile');
        const { data: { session } } = await supabase.auth.getSession()
        console.log('Initial session check:', !!session)
        
        if (controller.signal.aborted) return
        
        if (session) {
          if (mountedRef.current) {
            setUser(session.user)
          }
          
          const profileResult = await fetchUserProfile(session.user.id, session, controller.signal)
          
          if (mountedRef.current) {
            if (profileResult.success && profileResult.data) {
              setProfile(profileResult.data)
            } else {
              console.error('Failed to fetch profile:', profileResult.error)
              // Handle specific errors
              if (profileResult.error?.includes('sign in again')) {
                console.log('[Supabase] Signing out due to corrupted session');
                await supabase.auth.signOut()
                setUser(null)
                setProfile(null)
              }
            }
            setLoading(false)
          }
        } else {
          if (mountedRef.current) {
            setUser(null)
            setProfile(null)
            setLoading(false)
          }
        }
      } catch (error: unknown) {
        if (!controller.signal.aborted && mountedRef.current) {
          console.error('Critical error in getSessionAndProfile:', error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          
          if (errorMessage.includes('JWT') || errorMessage.includes('user not found')) {
            console.log('[Supabase] Signing out due to JWT/user error');
            try {
              await supabase.auth.signOut()
            } catch {
              // Ignore sign out errors
            }
            setUser(null)
            setProfile(null)
          }
          setLoading(false)
        }
      }
    }

    getSessionAndProfile()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current || controller.signal.aborted) return
        
        console.log('Auth state change:', event)
        
        try {
          if (session?.user) {
            setUser(session.user)
            
            const profileResult = await fetchUserProfile(session.user.id, session, controller.signal)
            
            if (mountedRef.current && !controller.signal.aborted) {
              if (profileResult.success && profileResult.data) {
                setProfile(profileResult.data)
              } else {
                console.error('Failed to fetch profile on auth change:', profileResult.error)
                setProfile(null)
              }
            }
          } else {
            if (mountedRef.current) {
              setUser(null)
              setProfile(null)
            }
          }
        } catch (error) {
          if (mountedRef.current && !controller.signal.aborted) {
            console.error('Error in auth state change:', error)
            setUser(null)
            setProfile(null)
          }
        } finally {
          if (mountedRef.current && !controller.signal.aborted) {
            setLoading(false)
          }
        }
      }
    )

    return () => {
      controller.abort('Component unmounting')
      subscription.unsubscribe()
    }
  }, [fetchUserProfile])

  const signInWithGoogle = async (): Promise<AsyncResult<void>> => {
    if (!mounted || !mountedRef.current) {
      return { data: null, error: 'Component not mounted', success: false }
    }
    
    const operation = async () => {
      setLoading(true)
      
      const currentOrigin = window.location.origin
      const hostname = window.location.hostname
      
      let baseUrl: string
      if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
        baseUrl = currentOrigin
      } else if (hostname.includes('vercel.app')) {
        baseUrl = currentOrigin // For Vercel preview and production
      } else if (hostname === 'mvrk.haus') {
        baseUrl = 'https://www.mvrk.haus' 
      } else if (hostname === 'www.mvrk.haus') {
        baseUrl = currentOrigin
      } else {
        baseUrl = currentOrigin
      }
      
      const fullRedirectUrl = `${baseUrl}/auth/callback?next=/sign-up-june`
      
      console.log('[Supabase] supabase.auth.signInWithOAuth (google), redirectTo:', fullRedirectUrl);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: fullRedirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) {
        throw new Error(`Google Sign-In Failed: ${error.message}`)
      }
      
      return undefined
    }

    const result = await withAsyncRetry(operation, { timeout: 30000, retries: 1 })
    
    if (mountedRef.current) {
      if (!result.success) {
        setUrlError(result.error || 'Google Sign-In failed')
        setLoading(false)
      }
    }
    
    return result
  }

  const signOut = async (): Promise<AsyncResult<void>> => {
    const operation = async () => {
      setLoading(true)
      console.log('[Supabase] supabase.auth.signOut()')
      
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw new Error(`Sign out failed: ${error.message}`)
      }
      
      return undefined
    }

    const result = await withAsyncRetry(operation, { timeout: 10000, retries: 1 })
    
    if (mountedRef.current) {
      if (result.success) {
        setUser(null)
        setProfile(null)
        setPasscode(new Array(8).fill(''))
      }
      setLoading(false)
    }
    
    return result
  }

  const submitPasscode = async (): Promise<AsyncResult<void>> => {
    if (!user) {
      return { data: null, error: 'User not found. Please sign in.', success: false }
    }
    
    const fullPasscode = passcode.join('')
    if (fullPasscode.length !== 8) {
      return { data: null, error: 'Please enter all 8 digits', success: false }
    }
    
    const operation = async (signal?: AbortSignal) => {
      setPasscodeLoading(true)
      
      if (signal?.aborted) throw new Error('Operation cancelled')
      
      console.log('Verifying passcode:', fullPasscode, 'for user:', user.email);
      const { data: juneOtpEntry, error: otpError } = await supabase
        .from('june-otp')
        .select('*')
        .eq('passcode', fullPasscode)
        .single()
      
      if (signal?.aborted) throw new Error('Operation cancelled')
      
      if (otpError || !juneOtpEntry) {
        throw new Error('Invalid passcode. Please check and try again.')
      }

      // Check if passcode is already registered
      if (juneOtpEntry.is_register && juneOtpEntry.registered_user_id) {
        if (signal?.aborted) throw new Error('Operation cancelled')
        
        console.log('[Supabase] Checking existing registered user');
        const { data: existingAuthUser, error: authCheckError } = await supabase.auth.admin.getUserById(juneOtpEntry.registered_user_id)
        
        if (!authCheckError && existingAuthUser.user) {
          if (juneOtpEntry.registered_user_id !== user!.id) {
            throw new Error('이 인증번호는 다른 계정에서 이미 사용중입니다. 문의해주세요.')
          }
          throw new Error('이 인증번호는 이미 사용되었습니다.')
        }
      } else if (juneOtpEntry.is_register && !juneOtpEntry.registered_user_id) {
        throw new Error('이 인증번호는 이미 사용되었습니다. 다른 인증번호를 사용하거나 문의해주세요.')
      }

      if (juneOtpEntry.registered_user_id && juneOtpEntry.registered_user_id !== user!.id) {
        throw new Error('이 인증번호는 다른 계정에서 이미 사용중입니다. 문의해주세요.')
      }

      if (signal?.aborted) throw new Error('Operation cancelled')

      console.log('[Supabase] Checking existing profile');
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('user_profiles')
        .select('role, "june-ot-legalName"')
        .eq('id', user!.id)
        .single()

      if (profileCheckError) {
        throw new Error('Error checking profile. Please try again.')
      }

      if (existingProfile.role === 'general_member' && existingProfile['june-ot-legalName']) {
        throw new Error('이 계정은 이미 다른 인증번호로 등록되어 있습니다.')
      }

      if (signal?.aborted) throw new Error('Operation cancelled')

      // Update user_profiles table
      console.log('Updating user profile role based on passcode for user ID:', user.id);
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          role: 'general_member',
          'june-ot-katalkName': juneOtpEntry.kaTalkName,
          'june-ot-legalName': juneOtpEntry.legalName,
          '1a': juneOtpEntry['1a'],
          '2a': juneOtpEntry['2a'],
          '3a': juneOtpEntry['3a'],
          '4a': juneOtpEntry['4a'],
          '1b': juneOtpEntry['1b'],
          '2b': juneOtpEntry['2b'],
          '3b': juneOtpEntry['3b'],
          '4b': juneOtpEntry['4b'],
          '5b': juneOtpEntry['5b'],
          '6b': juneOtpEntry['6b']
        })
        .eq('id', user!.id)

      if (profileError) {
        throw new Error('Error updating profile. Please try again.')
      }

      if (signal?.aborted) throw new Error('Operation cancelled')

      // Mark passcode as used in june-otp table
      console.log('Marking passcode as registered in june-otp for passcode:', fullPasscode);
      const { error: updateOtpError } = await supabase
        .from('june-otp')
        .update({ is_register: true, user_id: user.id })
        .eq('passcode', fullPasscode)

      if (updateOtpError) {
        console.warn('OTP update error:', updateOtpError)
        // Don't throw here as the main operation succeeded
      }

      if (signal?.aborted) throw new Error('Operation cancelled')

      // Refresh user profile
      const profileResult = await fetchUserProfile(user!.id, null, signal)
      if (profileResult.success && profileResult.data && mountedRef.current) {
        setProfile(profileResult.data)
      }
      
      return undefined
    }

    const result = await withAsyncRetry(operation, { timeout: 30000, retries: 2 })
    
    if (mountedRef.current) {
      if (result.success) {
        setPasscode(new Array(8).fill(''))
        // Show success message
        setTimeout(() => {
          if (mountedRef.current) {
            alert('Passcode verified successfully! Welcome to MVRK HAUS!')
          }
        }, 100)
      } else {
        alert(result.error || 'Error verifying passcode. Please try again.')
      }
      setPasscodeLoading(false)
    }
    
    return result
  }

  const handlePasscodeChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return
    
    const newPasscode = [...passcode]
    newPasscode[index] = value
    setPasscode(newPasscode)
    
    if (mountedRef.current && value && index < 7) {
      const nextInput = document.getElementById(`passcode-${index + 1}`)
      nextInput?.focus()
    }
  }

  const handlePasscodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (mountedRef.current && e.key === 'Backspace' && !passcode[index] && index > 0) {
      const prevInput = document.getElementById(`passcode-${index - 1}`)
      prevInput?.focus()
    }
  }

  const handlePasscodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 8)
    const newPasscode = new Array(8).fill('')
    
    for (let i = 0; i < pastedData.length; i++) {
      newPasscode[i] = pastedData[i]
    }
    
    setPasscode(newPasscode)
    
    if (mountedRef.current) {
      const nextEmptyIndex = pastedData.length < 8 ? pastedData.length : 7
      const nextInput = document.getElementById(`passcode-${nextEmptyIndex}`)
      nextInput?.focus()
    }
  }

  useEffect(() => {
    setMounted(true)
    return () => {
      mountedRef.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort('Component cleanup')
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-black text-xl mb-4">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="container mx-auto px-4 py-16 pt-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-2">MVRK HAUS</h1>
          <p className="text-gray-600">members only</p>
        </div>

        {/* Display URL messages and errors */}
        {urlMessage && (
          <div className="max-w-lg mx-auto mb-6 p-4 bg-blue-50 border border-blue-200 text-blue-800 text-center rounded-lg">
            {urlMessage}
          </div>
        )}
        
        {urlError && (
          <div className="max-w-lg mx-auto mb-6 p-4 bg-red-50 border border-red-200 text-red-800 text-center rounded-lg">
            {urlError}
          </div>
        )}

        <div className="max-w-lg mx-auto">
          {user && profile ? (
            <div className="bg-gray-100 p-8 text-center border border-gray-300">
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
                {profile.role === 'awaiting_match' && (
                  <div className="bg-white border border-gray-300 p-4">
                    <div className="text-center mb-6">
                      <h4 className="text-lg font-semibold text-black mb-2">Enter Passcode</h4>
                      <p className="text-gray-600 text-sm">
                        카카오톡으로 전달받은 8자리 숫자를 입력하세요.
                      </p>
                    </div>
                    
                    <div className="flex justify-center space-x-1 mb-6">
                      {passcode.map((digit, index) => (
                        <input
                          key={index}
                          id={`passcode-${index}`}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handlePasscodeChange(index, e.target.value)}
                          onKeyDown={(e) => handlePasscodeKeyDown(index, e)}
                          onPaste={index === 0 ? handlePasscodePaste : undefined}
                          className="w-8 h-10 text-center text-xl font-mono bg-white border-2 border-gray-300 rounded-lg text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                          autoComplete="off"
                          disabled={passcodeLoading}
                        />
                      ))}
                    </div>
                    
                    <button
                      onClick={submitPasscode}
                      disabled={passcodeLoading || passcode.some(digit => !digit)}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 transition-colors duration-200"
                    >
                      {passcodeLoading ? 'Verifying...' : 'Verify Passcode'}
                    </button>
                    
                    <p className="text-xs text-gray-500 text-center mt-4">
                      일회용 비밀번호를 모르거나 인증에 문제가 있다면 Mvrk Crafts &quot;박종한&quot;에게 문의 부탁드립니다.
                    </p>
                  </div>
                )}
                
                {profile.role !== 'awaiting_match' && (
                  <a
                    href="/profile/edit"
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 transition-colors duration-200 flex items-center justify-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>프로필 수정</span>
                  </a>
                )}
                
                <button
                  onClick={signOut}
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 transition-colors duration-200"
                >
                  {loading ? '로그아웃 중' : '로그아웃'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 p-8 border border-gray-200">
              <div className="text-center mb-8">
                <h3 className="text-xl font-semibold mb-2">Get Started</h3>
                <p className="text-gray-600">Sign up with your Google account</p>
              </div>

              <button
                onClick={signInWithGoogle}
                disabled={loading || !mounted}
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
                  {loading ? 'Connecting...' : (!mounted ? 'Loading...' : 'Continue with Google')}
                </span>
              </button>

              <div className="mt-6 text-center">
                <p className="text-gray-600 text-sm">
                  Already have an account?{' '}
                  <Link 
                    href="/sign-in" 
                    className="text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Sign in here
                  </Link>
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="text-center mt-12">
          {user && profile && profile.role !== 'awaiting_match' && profile.role !== 'no_membership' ? (
            <Link
            href="/directory"
            className="inline-block w-full max-w-lg mx-auto bg-black py-3 px-6 text-white font-semibold transition-colors duration-200"
          >
            Mvrk Directory →
          </Link>
          ) : (
            <Link
              href="/"
              className="text-gray-600 hover:text-black transition-colors duration-200"
            >
              ← Back to Home
            </Link>
          )}
        </div>
      </div>
    </div>
  )
} 