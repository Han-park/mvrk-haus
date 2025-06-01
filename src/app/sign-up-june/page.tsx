'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { UserProfile, ROLE_INFO } from '@/types/auth'

export default function SignUpJune() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [passcode, setPasscode] = useState<string[]>(new Array(8).fill(''))
  const [passcodeLoading, setPasscodeLoading] = useState(false)

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

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        // If no profile found (PGRST116), create a new one
        if (error.code === 'PGRST116') {
          console.log('No profile found for user, creating new profile...')
          await createUserProfile(userId)
          return
        }
        console.error('Error fetching user profile:', error)
        return
      }

      setProfile(data)
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const createUserProfile = async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('No user found in session')
        return
      }

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
        console.error('Error creating user profile:', error)
        // If we can't create a profile, sign the user out
        alert('Profile creation failed. Please sign in again.')
        await signOut()
        return
      }

      setProfile(data)
    } catch (error) {
      console.error('Error creating user profile:', error)
      // If profile creation fails, sign the user out
      alert('Profile creation failed. Please sign in again.')
      await signOut()
    }
  }

  const signInWithGoogle = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/sign-up-june`
        }
      })
      if (error) {
        console.error('Error signing in:', error.message)
        alert('Error signing in: ' + error.message)
      }
    } catch (error) {
      console.error('Unexpected error:', error)
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
    
    // Auto-focus next input
    if (value && index < 7) {
      const nextInput = document.getElementById(`passcode-${index + 1}`)
      nextInput?.focus()
    }
  }

  const handlePasscodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Handle backspace
    if (e.key === 'Backspace' && !passcode[index] && index > 0) {
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
    
    // Focus the next empty input or the last input
    const nextEmptyIndex = pastedData.length < 8 ? pastedData.length : 7
    const nextInput = document.getElementById(`passcode-${nextEmptyIndex}`)
    nextInput?.focus()
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

      // Mark the passcode as registered in june-otp table
      console.log('Attempting to update june-otp table with passcode:', code)
      const { data: updateData, error: otpUpdateError } = await supabase
        .from('june-otp')
        .update({ is_register: true })
        .eq('passcode', code)
        .select()

      if (otpUpdateError) {
        console.error('Error updating OTP registration status:', otpUpdateError)
        console.error('Error details:', JSON.stringify(otpUpdateError, null, 2))
        // Don't fail the process if this update fails, just log it
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
          <h2 className="text-2xl mb-2">메버릭 웹 계정 만들기</h2>
          <p className="text-gray-400">members only</p>
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
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
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
                  <div className="bg-gray-800 border border-gray-600 rounded-lg p-6">
                    <div className="text-center mb-6">
                      <h4 className="text-lg font-semibold text-white mb-2">Enter Passcode</h4>
                      <p className="text-gray-400 text-sm">
                        Enter the 8-digit passcode to complete your membership
                      </p>
                    </div>
                    
                    <div className="flex justify-center space-x-2 mb-6">
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
                          className="w-12 h-14 text-center text-xl font-mono bg-gray-900 border-2 border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                          autoComplete="off"
                          disabled={passcodeLoading}
                        />
                      ))}
                    </div>
                    
                    <button
                      onClick={submitPasscode}
                      disabled={passcodeLoading || passcode.some(digit => !digit)}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                    >
                      {passcodeLoading ? 'Verifying...' : 'Verify Passcode'}
                    </button>
                    
                    <p className="text-xs text-gray-500 text-center mt-4">
                      Contact support if you don't have a passcode
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Edit Profile</span>
                  </a>
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
            // User is not signed in
            <div className="bg-gray-900 rounded-lg p-8">
              <div className="text-center mb-8">
                <h3 className="text-xl font-semibold mb-2">Get Started</h3>
                <p className="text-gray-400">Sign up with your Google account</p>
              </div>

              <button
                onClick={signInWithGoogle}
                disabled={loading}
                className="w-full bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-3"
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
                <span>{loading ? 'Connecting...' : 'Continue with Google'}</span>
              </button>

              <div className="mt-6 text-center">
                <p className="text-xs text-gray-500">
                  By signing up, you agree to our Terms of Service and Privacy Policy
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Back to home link */}
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