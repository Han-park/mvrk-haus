'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { User, Session } from '@supabase/supabase-js'
import { UserProfile, ROLE_INFO } from '@/types/auth'
import { debugLog, debugHydration, debugMountState } from '@/lib/debug'

export default function SignUpJune() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [passcode, setPasscode] = useState<string[]>(new Array(8).fill(''))
  const [passcodeLoading, setPasscodeLoading] = useState(false)
  
  // 🐛 DEBUGGING: Toggle to test hydration issues
  const [debugHydrationError, setDebugHydrationError] = useState(false)

  // Ensure component is mounted before accessing browser APIs
  useEffect(() => {
    debugHydration('SignUpJune')
    setMounted(true)
    debugMountState('SignUpJune', true)
  }, [])

  const createUserProfile = useCallback(async (userId: string) => {
    console.log('🔨 createUserProfile called for:', userId)
    console.log('📍 CREATE STEP 1: Starting createUserProfile...')
    
    try {
      console.log('📍 CREATE STEP 2: Getting user from session...')
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.error('❌ No user found in session')
        console.log('📍 CREATE EXITING: No user in session, setting loading to false')
        setLoading(false)
        return
      }

      console.log('📍 CREATE STEP 2 COMPLETE: User found:', user.email)
      console.log('📍 CREATE STEP 3: Checking if profile already exists for email...')
      
      // 🔧 NEW: Check if a profile with this email already exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', user.email)
        .single()

      console.log('📍 CREATE STEP 3 COMPLETE: Existing profile check done')
      
      if (checkError && checkError.code !== 'PGRST116') {
        // Real error (not just "no rows found")
        console.error('❌ Error checking existing profile:', checkError)
        console.log('📍 CREATE EXITING: Check error, setting loading to false')
        setLoading(false)
        return
      }
      
      if (existingProfile) {
        console.log('✅ Profile already exists for email:', user.email)
        console.log('📍 CREATE STEP 4a: Using existing profile instead of creating new one')
        console.log('📍 CREATE STEP 4a: Existing profile role:', existingProfile.role)
        
        // Update the existing profile with the current userId if needed
        if (existingProfile.id !== userId) {
          console.log('📍 CREATE STEP 4b: Updating existing profile with new userId...')
          const { data: updatedProfile, error: updateError } = await supabase
            .from('user_profiles')
            .update({ id: userId })
            .eq('email', user.email)
            .select()
            .single()
            
          if (updateError) {
            console.error('❌ Error updating profile userId:', updateError)
            console.log('📍 CREATE EXITING: Update error, setting loading to false')
            setLoading(false)
            return
          }
          
          console.log('📍 CREATE STEP 4b COMPLETE: Profile userId updated')
          setProfile(updatedProfile)
        } else {
          console.log('📍 CREATE STEP 4a: Profile userId already matches, using as-is')
          setProfile(existingProfile)
        }
        
        console.log('📍 CREATE STEP 5: Setting loading to false (existing profile)...')
        setLoading(false)
        console.log('📍 CREATE STEP 5 COMPLETE: Loading set to false - EXISTING PROFILE SUCCESS!')
        return
      }
      
      console.log('📍 CREATE STEP 4: No existing profile found, proceeding with insert...')
      console.log('📝 Creating profile for user:', user.email)
      
      console.log('📍 CREATE STEP 5: Executing insert query...')
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          email: user.email || '',
          role: 'awaiting_match'
        })
        .select()
        .single()

      console.log('📍 CREATE STEP 5 COMPLETE: Insert query completed')

      if (error) {
        console.error('❌ Error creating user profile:', error)
        console.log('📍 CREATE STEP 6a: Error path - profile creation failed')
        
        // 🔧 NEW: Handle case where user was deleted but session still exists
        if (error.message?.includes('foreign key') || error.message?.includes('does not exist')) {
          console.log('🚨 DETECTED: User deleted from auth but session still exists')
          console.log('🔧 SOLUTION: Signing out user to clear corrupted session')
          alert('Your account data was reset. Please sign in again.')
          await supabase.auth.signOut()
          setLoading(false)
          return
        }
        
        // If we can't create a profile, sign the user out
        alert('Profile creation failed. Please sign in again.')
        console.log('📍 CREATE STEP 6b: Signing out user...')
        await supabase.auth.signOut()
        console.log('📍 CREATE STEP 6c: Sign out complete')
        // 🔧 IMPORTANT: Set loading to false even when signing out
        console.log('📍 CREATE EXITING: Error case, setting loading to false')
        setLoading(false)
        return
      }

      console.log('📍 CREATE STEP 6: Success path - profile created')
      console.log('✅ Profile created successfully:', data.role)
      
      console.log('📍 CREATE STEP 7: Setting profile state...')
      setProfile(data)
      console.log('📍 CREATE STEP 7 COMPLETE: Profile state set')
      
      console.log('📍 CREATE STEP 8: Setting loading to false...')
      // 🔧 CRITICAL FIX: Set loading to false when profile is successfully created
      setLoading(false)
      console.log('📍 CREATE STEP 8 COMPLETE: Loading set to false - CREATE SUCCESS!')
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('💥 Exception in createUserProfile:', errorMessage)
      console.log('📍 CREATE EXCEPTION: Caught in outer try-catch')
      
      // 🔧 NEW: Handle deleted user scenario
      if (errorMessage.includes('JWT') || errorMessage.includes('user not found')) {
        console.log('🚨 DETECTED: User deleted but session corrupted')
        console.log('🔧 SOLUTION: Clearing corrupted session')
        alert('Your session is corrupted. Please sign in again.')
        await supabase.auth.signOut()
        setLoading(false)
        return
      }
      
      // If profile creation fails, sign the user out
      alert('Profile creation failed. Please sign in again.')
      console.log('📍 CREATE EXCEPTION: Signing out user...')
      await supabase.auth.signOut()
      console.log('📍 CREATE EXCEPTION: Sign out complete')
      
      // 🔧 IMPORTANT: Set loading to false even when signing out
      console.log('📍 CREATE EXITING: Exception case, setting loading to false')
      setLoading(false)
    }
  }, [])

  const fetchUserProfile = useCallback(async (userId: string, existingSession?: Session | null) => {
    console.log('📝 fetchUserProfile called for:', userId)
    console.log('🔍 Starting database query...')
    
    try {
      console.log('📍 STEP 1: Using provided session or getting new session...')
      
      // 🔧 FIX: Use existing session if provided, otherwise get a new one
      let session = existingSession
      if (!session) {
        console.log('📍 STEP 1a: No session provided, getting session from Supabase...')
        const { data: { session: newSession } } = await supabase.auth.getSession()
        session = newSession
        console.log('📍 STEP 1a COMPLETE: Session retrieved from Supabase')
      } else {
        console.log('📍 STEP 1a: Using provided session')
      }
      
      console.log('📍 STEP 1 COMPLETE: Session ready')
      console.log('🔐 Current session exists:', !!session)
      console.log('🔐 Session user ID:', session?.user?.id)
      console.log('🔐 Session access token exists:', !!session?.access_token)
      
      console.log('📍 STEP 2 COMPLETE: Network check done')
      
      console.log('📍 STEP 3: Starting CORS test...')
      
      // 🔧 CORS TEST: Try a simple connection test first
      console.log('🧪 Testing CORS with simple query...')
      try {
        console.log('📍 STEP 3a: Creating CORS test query...')
        const corsTestStart = Date.now()
        
        console.log('📍 STEP 3b: Executing CORS test query...')
        
        // 🔧 Add timeout to CORS test to prevent hanging
        const corsTestPromise = supabase
          .from('user_profiles')
          .select('count')
          .limit(1)
        
        const corsTimeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('CORS test timeout')), 5000)
        )
        
        const { data: corsTest, error: corsError } = await Promise.race([corsTestPromise, corsTimeoutPromise])
        const corsTestEnd = Date.now()
        
        console.log('📍 STEP 3c: CORS test query completed')
        console.log(`🧪 CORS test completed in ${corsTestEnd - corsTestStart}ms`)
        console.log('🧪 CORS test data:', corsTest)
        console.log('🧪 CORS test error:', corsError ? corsError.message : 'None')
        console.log('🧪 CORS test success:', !corsError)
        
        if (corsError) {
          console.error('🚫 CORS test failed:', JSON.stringify(corsError, null, 2))
          console.log('📍 EXITING: CORS test failed, setting loading to false')
          setLoading(false)
          return
        }
        
        console.log('📍 STEP 3 COMPLETE: CORS test passed')
      } catch (corsTestError) {
        console.error('💥 CORS test exception:', corsTestError)
        
        // If it's a timeout, continue anyway but log it
        if (corsTestError instanceof Error && corsTestError.message === 'CORS test timeout') {
          console.log('⏰ CORS test timed out, but continuing with profile fetch...')
          console.log('📍 STEP 3 TIMEOUT: Proceeding despite CORS test timeout')
        } else {
          console.log('📍 EXITING: CORS test exception, setting loading to false')
          setLoading(false)
          return
        }
      }
      
      console.log('📍 STEP 4: Starting RLS permissions test...')
      
      // 🔧 RLS PERMISSIONS TEST: Test database access with different approaches
      console.log('🔒 Testing RLS permissions...')
      try {
        console.log('📍 STEP 4a: RLS test 1 - table access...')
        
        // Test 1: Check if we can access the table at all
        const rls1Start = Date.now()
        
        // 🔧 Add timeout to RLS test 1
        const rls1Promise = supabase
          .from('user_profiles')
          .select('id')
          .limit(1)
        
        const rls1TimeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('RLS test 1 timeout')), 5000)
        )
        
        const { data: rls1Data, error: rls1Error } = await Promise.race([rls1Promise, rls1TimeoutPromise])
        const rls1End = Date.now()
        
        console.log('📍 STEP 4a COMPLETE: RLS test 1 done')
        console.log(`🔒 RLS test 1 (table access) completed in ${rls1End - rls1Start}ms`)
        console.log('🔒 RLS test 1 error:', rls1Error ? rls1Error.message : 'None')
        console.log('🔒 RLS test 1 data count:', rls1Data ? rls1Data.length : 0)
        
        console.log('📍 STEP 4b: RLS test 2 - user filter...')
        
        // Test 2: Check if we can access our specific user ID
        const rls2Start = Date.now()
        
        // 🔧 Add timeout to RLS test 2
        const rls2Promise = supabase
          .from('user_profiles')
          .select('id, role')
          .eq('id', userId)
        
        const rls2TimeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('RLS test 2 timeout')), 5000)
        )
        
        const { data: rls2Data, error: rls2Error } = await Promise.race([rls2Promise, rls2TimeoutPromise])
        const rls2End = Date.now()
        
        console.log('📍 STEP 4b COMPLETE: RLS test 2 done')
        console.log(`🔒 RLS test 2 (user filter) completed in ${rls2End - rls2Start}ms`)
        console.log('🔒 RLS test 2 error:', rls2Error ? rls2Error.message : 'None')
        console.log('🔒 RLS test 2 data:', rls2Data)
        
        console.log('📍 STEP 4c: Auth context check...')
        
        // Test 3: Check authentication context
        console.log('🔒 Auth context check:', {
          userId: session?.user?.id,
          userEmail: session?.user?.email,
          aud: session?.user?.aud,
          appMetadata: session?.user?.app_metadata,
          userMetadata: session?.user?.user_metadata
        })
        
        console.log('📍 STEP 4c COMPLETE: Auth context logged')
        
        if (rls1Error && rls1Error.message !== 'RLS test 1 timeout' || 
            rls2Error && rls2Error.message !== 'RLS test 2 timeout') {
          console.error('🚫 RLS permission issue detected')
          console.error('🚫 RLS error details:', {
            tableAccess: rls1Error ? rls1Error.message : 'OK',
            userFilter: rls2Error ? rls2Error.message : 'OK'
          })
          
          // Don't exit on timeout errors, only real permission errors
          if (rls1Error?.message !== 'RLS test 1 timeout' && rls2Error?.message !== 'RLS test 2 timeout') {
            console.log('📍 EXITING: RLS permission issue, setting loading to false')
            setLoading(false)
            return
          } else {
            console.log('⏰ RLS tests timed out, but continuing with main query...')
          }
        }
        
        console.log('📍 STEP 4 COMPLETE: RLS tests passed')
        
      } catch (rlsError) {
        console.error('💥 RLS test exception:', rlsError)
        
        // If it's a timeout, continue anyway but log it
        if (rlsError instanceof Error && (rlsError.message === 'RLS test 1 timeout' || rlsError.message === 'RLS test 2 timeout')) {
          console.log('⏰ RLS test timed out, but continuing with main query...')
          console.log('📍 STEP 4 TIMEOUT: Proceeding despite RLS test timeout')
        } else {
          console.log('📍 EXITING: RLS test exception, setting loading to false')
          setLoading(false)
          return
        }
      }
      
      console.log('📍 STEP 5: Preparing main query...')
      
      // Add a timeout to the query to prevent hanging
      const queryPromise = supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 8000)
      )

      console.log('📍 STEP 5 COMPLETE: Query and timeout promises created')
      console.log('⏱️ Executing main query with timeout...')
      
      console.log('📍 STEP 6: Executing main query...')
      
      // 🔧 IMPROVED: Add more detailed logging
      const startTime = Date.now()
      const { data, error } = await Promise.race([queryPromise, timeoutPromise])
      const endTime = Date.now()
      
      console.log('📍 STEP 6 COMPLETE: Main query completed')
      console.log(`📊 Query completed in ${endTime - startTime}ms`)
      console.log('📊 Query error:', error ? error.message : 'None')
      console.log('📊 Query error code:', error ? error.code : 'None')
      console.log('📊 Query data:', data ? 'Found' : 'Not found')

      console.log('📍 STEP 7: Processing query results...')

      if (error) {
        console.log('📍 STEP 7a: Error detected, checking error code...')
        
        // If no profile found (PGRST116), create a new one
        if (error.code === 'PGRST116') {
          console.log('❌ No profile found, creating new profile...')
          console.log('📍 CALLING: createUserProfile')
          await createUserProfile(userId)
          console.log('📍 RETURNED FROM: createUserProfile')
          return
        }
        console.error('❌ Error fetching user profile:', error)
        console.error('❌ Full error object:', JSON.stringify(error, null, 2))
        
        // 🔧 IMPORTANT: Set loading to false even on error
        console.log('🔧 Setting loading to false due to error')
        console.log('📍 EXITING: Query error, setting loading to false')
        setLoading(false)
        return
      }

      console.log('📍 STEP 7b: Success path - profile found')
      console.log('✅ Profile fetched successfully:', data.role)
      
      console.log('📍 STEP 8: Setting profile state...')
      setProfile(data)
      console.log('📍 STEP 8 COMPLETE: Profile state set')
      
      console.log('📍 STEP 9: Setting loading to false...')
      // 🔧 CRITICAL FIX: Set loading to false when profile is successfully fetched
      setLoading(false)
      console.log('📍 STEP 9 COMPLETE: Loading set to false - SUCCESS!')
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('💥 Exception in fetchUserProfile:', errorMessage)
      console.log('📍 EXCEPTION: Caught in outer try-catch')
      
      // If it's a timeout, try creating a new profile
      if (errorMessage === 'Query timeout') {
        console.log('⏰ Query timed out, attempting to create new profile...')
        console.log('📍 CALLING: createUserProfile (timeout)')
        await createUserProfile(userId)
        console.log('📍 RETURNED FROM: createUserProfile (timeout)')
      } else {
        // 🔧 IMPORTANT: Set loading to false on any exception
        console.log('🔧 Setting loading to false due to exception')
        console.log('📍 EXITING: Exception, setting loading to false')
        setLoading(false)
      }
    }
  }, [createUserProfile])

  useEffect(() => {
    // Get initial session and profile
    const getSessionAndProfile = async () => {
      console.log('🔄 Starting getSessionAndProfile...')
      try {
        const { data: { session } } = await supabase.auth.getSession()
        console.log('📊 Session result:', session ? 'Session found' : 'No session')
        setUser(session?.user ?? null)
        
        if (session?.user) {
          console.log('👤 User found, fetching profile for:', session.user.id)
          await fetchUserProfile(session.user.id, session)
        }
      } catch (error) {
        console.error('💥 Error in getSessionAndProfile:', error)
      } finally {
        console.log('✅ Setting loading to false')
        setLoading(false)
      }
    }

    getSessionAndProfile()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 Auth state change:', event, session ? 'Session exists' : 'No session')
        setUser(session?.user ?? null)
        
        try {
          if (session?.user) {
            console.log('👤 Auth change - fetching profile for:', session.user.id)
            await fetchUserProfile(session.user.id, session)
          } else {
            setProfile(null)
          }
        } catch (error) {
          console.error('💥 Error in auth state change:', error)
        } finally {
          console.log('✅ Auth change - setting loading to false')
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchUserProfile])

  // TEMPORARY: Create a version that reproduces the hydration issue
  const signInWithGoogleBROKEN = async () => {
    // This will cause hydration errors in desktop Chrome
    setLoading(true)
    try {
      const isProduction = process.env.NODE_ENV === 'production'
      // ❌ This line causes the hydration error - accessing window during SSR
      const baseUrl = isProduction ? 'https://mvrk.haus' : window.location.origin
      
      console.log('🔗 Google OAuth Debug Info:', {
        isProduction,
        baseUrl,
        currentOrigin: window.location.origin, // ❌ Another hydration error
        redirectTo: `${baseUrl}/auth/callback?next=/sign-up-june`
      })
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${baseUrl}/auth/callback?next=/sign-up-june`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      })
      
      if (error) {
        console.error('❌ Error signing in with Google:', error)
        alert('Error signing in: ' + error.message)
      } else {
        console.log('✅ Google OAuth redirect initiated successfully')
      }
    } catch (error) {
      console.error('💥 Unexpected error during Google OAuth:', error)
      alert('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const signInWithGoogle = async () => {
    debugLog('SignUpJune', 'signInWithGoogle called', { mounted })
    
    if (!mounted) {
      debugLog('SignUpJune', 'signInWithGoogle blocked - component not mounted')
      return // Prevent execution before mount
    }
    
    setLoading(true)
    try {
      // 🔧 FIXED: Dynamic URL configuration based on actual environment
      const currentOrigin = window.location.origin
      const isLocalhost = currentOrigin.includes('localhost') || currentOrigin.includes('127.0.0.1')
      
      // Use actual current origin instead of hardcoded production URL
      const baseUrl = isLocalhost ? currentOrigin : 'https://www.mvrk.haus'
      const fullRedirectUrl = `${baseUrl}/auth/callback?next=/sign-up-june`
      
      debugLog('SignUpJune', 'OAuth configuration', {
        currentOrigin,
        isLocalhost,
        baseUrl,
        redirectTo: fullRedirectUrl
      })
      
      console.log('🔗 Google OAuth Debug Info:', {
        currentOrigin,
        isLocalhost,
        baseUrl,
        fullRedirectUrl,
        windowLocationHref: window.location.href,
        windowLocationPathname: window.location.pathname
      })
      
      // 🔧 EXTRA DEBUG: Log exactly what we're sending to Supabase
      console.log('🚀 About to call signInWithOAuth with:', {
        provider: 'google',
        redirectTo: fullRedirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      })
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: fullRedirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      })
      
      if (error) {
        console.error('❌ Error signing in with Google:', error)
        debugLog('SignUpJune', 'OAuth error', error)
        alert('Error signing in: ' + error.message)
      } else {
        console.log('✅ Google OAuth redirect initiated successfully')
        debugLog('SignUpJune', 'OAuth redirect initiated successfully')
      }
    } catch (error) {
      console.error('💥 Unexpected error during Google OAuth:', error)
      debugLog('SignUpJune', 'OAuth unexpected error', error)
      alert('An unexpected error occurred')
    } finally {
      setLoading(false)
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

  const handlePasscodeChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return
    
    const newPasscode = [...passcode]
    newPasscode[index] = value
    setPasscode(newPasscode)
    
    // Auto-focus next input - only after component is mounted
    if (mounted && value && index < 7) {
      const nextInput = document.getElementById(`passcode-${index + 1}`)
      nextInput?.focus()
    }
  }

  const handlePasscodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Handle backspace - only after component is mounted
    if (mounted && e.key === 'Backspace' && !passcode[index] && index > 0) {
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
    
    // Focus the next empty input or the last input - only after component is mounted
    if (mounted) {
      const nextEmptyIndex = pastedData.length < 8 ? pastedData.length : 7
      const nextInput = document.getElementById(`passcode-${nextEmptyIndex}`)
      nextInput?.focus()
    }
  }

  const submitPasscode = async () => {
    const code = passcode.join('')
    if (code.length !== 8) {
      alert('Please enter all 8 digits')
      return
    }
    
    setPasscodeLoading(true)
    try {
      // Search for matching passcode in june-otp table
      const { data: otpData, error: otpError } = await supabase
        .from('june-otp')
        .select('*')
        .eq('passcode', code)
        .single()
      
      if (otpError || !otpData) {
        alert('Invalid passcode. Please check and try again.')
        setPasscodeLoading(false)
        return
      }

      console.log('Found OTP data:', otpData)

      // Enhanced validation: Check if passcode is registered and user still exists
      if (otpData.is_register && otpData.registered_user_id) {
        // Check if the registered user still exists in auth.users
        const { data: existingAuthUser, error: authCheckError } = await supabase.auth.admin.getUserById(otpData.registered_user_id)
        
        if (!authCheckError && existingAuthUser.user) {
          // User exists - check if it's the same user or different user
          if (otpData.registered_user_id !== user!.id) {
            alert('이 인증번호는 다른 계정에서 이미 사용중입니다. 문의해주세요.')
            setPasscodeLoading(false)
            return
          }
          // Same user trying to register again
          alert('이 인증번호는 이미 사용되었습니다.')
          setPasscodeLoading(false)
          return
        } else {
          // User was deleted from auth - allow reclaim but log it
          console.log('Registered user was deleted from auth, allowing passcode reclaim:', {
            passcode: code,
            deletedUserId: otpData.registered_user_id,
            deletedEmail: otpData.registered_email,
            newUserId: user!.id,
            newEmail: user!.email
          })
        }
      } else if (otpData.is_register && !otpData.registered_user_id) {
        // Legacy registered entry without user tracking - block it
        alert('이 인증번호는 이미 사용되었습니다. 다른 인증번호를 사용하거나 문의해주세요.')
        setPasscodeLoading(false)
        return
      }

      // Check if this passcode is already claimed by another user (redundant check but kept for safety)
      if (otpData.registered_user_id && otpData.registered_user_id !== user!.id) {
        alert('이 인증번호는 다른 계정에서 이미 사용중입니다. 문의해주세요.')
        setPasscodeLoading(false)
        return
      }

      // Check if current user already used a different passcode
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('user_profiles')
        .select('role, "june-ot-legalName"')
        .eq('id', user!.id)
        .single()

      if (profileCheckError) {
        console.error('Error checking existing profile:', profileCheckError)
        alert('Error checking profile. Please try again.')
        setPasscodeLoading(false)
        return
      }

      // If user already has general_member role, they've already used a passcode
      if (existingProfile.role === 'general_member' && existingProfile['june-ot-legalName']) {
        alert('이 계정은 이미 다른 인증번호로 등록되어 있습니다.')
        setPasscodeLoading(false)
        return
      }

      // Update user profile with new role and OTP data
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          role: 'general_member',
          'june-ot-katalkName': otpData.kaTalkName,
          'june-ot-legalName': otpData.legalName,
          '1a': otpData['1a'],
          '2a': otpData['2a'],
          '3a': otpData['3a'],
          '4a': otpData['4a'],
          '1b': otpData['1b'],
          '2b': otpData['2b'],
          '3b': otpData['3b'],
          '4b': otpData['4b'],
          '5b': otpData['5b'],
          '6b': otpData['6b']
        })
        .eq('id', user!.id)

      if (updateError) {
        console.error('Error updating user profile:', updateError)
        alert('Error updating profile. Please try again.')
        setPasscodeLoading(false)
        return
      }

      // Mark the passcode as registered and link it to this user
      console.log('Attempting to update june-otp table with passcode:', code)
      const { data: updateData, error: otpUpdateError } = await supabase
        .from('june-otp')
        .update({ 
          is_register: true,
          registered_user_id: user!.id,
          registered_email: user!.email,
          registered_at: new Date().toISOString()
        })
        .eq('passcode', code)
        .select()

      if (otpUpdateError) {
        console.error('Error updating OTP registration status:', otpUpdateError)
        console.error('Error details:', JSON.stringify(otpUpdateError, null, 2))
        // Don't fail the process if this update fails, just log it
        alert('Profile updated successfully, but there was an issue updating the passcode status. Please contact support if you encounter any issues.')
      } else {
        console.log('Successfully updated june-otp table:', updateData)
      }

      // Refresh the user profile to show updated role
      await fetchUserProfile(user!.id)
      
      // Clear the passcode inputs
      setPasscode(new Array(8).fill(''))
      
      alert('Passcode verified successfully! Welcome to MVRK HAUS!')
      
    } catch (error) {
      console.error('Error verifying passcode:', error)
      alert('Error verifying passcode. Please try again.')
    } finally {
      setPasscodeLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">MVRK HAUS</h1>
          <p className="text-gray-400">members only</p>
          
          {/* 🐛 DEBUGGING CONTROLS - Only show in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-4 bg-red-900/20 border border-red-500/30 rounded">
              <h3 className="text-red-400 font-semibold mb-2">🐛 Hydration Debug Mode</h3>
              <button
                onClick={() => setDebugHydrationError(!debugHydrationError)}
                className={`px-4 py-2 rounded text-sm font-medium ${
                  debugHydrationError 
                    ? 'bg-red-600 text-white' 
                    : 'bg-green-600 text-white'
                }`}
              >
                {debugHydrationError ? '❌ Using BROKEN version (hydration errors)' : '✅ Using FIXED version (safe)'}
              </button>
              <p className="text-xs text-gray-400 mt-2">
                Toggle to test hydration issues. BROKEN version will fail on desktop Chrome.
              </p>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="max-w-lg mx-auto">
          {user && profile ? (
            // User is signed in
            <div className="bg-gray-900 p-8 text-center">
              <div className="mb-6">
                <div className="w-20 h-20 bg-gray-600 mx-auto mb-4 flex items-center justify-center overflow-hidden">
                  {profile.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-medium">
                      {(profile.mvrkName || profile['june-ot-legalName'] || user.email)?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400 mb-3">{user.email}</p>
                
                {/* Display mvrkName or legalName for members */}
                {(profile.role === 'admin' || profile.role === 'editor' || profile.role === 'general_member' || profile.role === 'no_membership') && (
                  <p className="text-lg text-white font-medium mb-2">
                    {profile.mvrkName || profile['june-ot-legalName'] || 'Member'}
                  </p>
                )}
                
                {/* Role Information */}
                <div className="mb-4">
                  <div className={`inline-flex items-center px-3 py-1 text-sm font-medium ${
                    profile.role === 'admin' ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30' :
                    profile.role === 'editor' ? 'bg-green-900/30 text-green-400 border border-green-500/30' :
                    profile.role === 'general_member' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/30' :
                    'bg-red-900/30 text-red-400 border border-red-500/30'
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
                  <div className="bg-gray-800 border border-gray-600 p-6">
                    <div className="text-center mb-6">
                      <h4 className="text-lg font-semibold text-white mb-2">Enter Passcode</h4>
                      <p className="text-gray-400 text-sm">
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
                          className="w-10 h-12 text-center text-xl font-mono bg-gray-900 border-1 border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
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
                
                {/* Edit Profile Button - Show for all members except awaiting_match */}
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
            // User is not signed in
            <div className="bg-gray-900 p-8">
              <div className="text-center mb-8">
                <h3 className="text-xl font-semibold mb-2">Get Started</h3>
                <p className="text-gray-400">Sign up with your Google account</p>
              </div>

              <button
                onClick={debugHydrationError ? signInWithGoogleBROKEN : signInWithGoogle}
                disabled={loading || !mounted}
                className="w-full bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-3 px-6 transition-colors duration-200 flex items-center justify-center space-x-3"
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
                  {debugHydrationError && ' (⚠️ BROKEN)'}
                </span>
              </button>

              <div className="mt-6 text-center">
              </div>
            </div>
          )}
        </div>

        {/* Back to home link */}
        <div className="text-center mt-12">
          {user && profile && profile.role !== 'awaiting_match' && profile.role !== 'no_membership' ? (
            <Link
              href="/directory"
              className="text-gray-400 hover:text-white transition-colors duration-200"
            >
              Mvrk Directory →
            </Link>
          ) : (
            <Link
              href="/"
              className="text-gray-400 hover:text-white transition-colors duration-200"
            >
              ← Back to Home
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}