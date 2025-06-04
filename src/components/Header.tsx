'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { UserProfile } from '@/types/auth'

export default function Header() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const getSessionAndProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      
      if (session?.user) {
        await fetchUserProfile(session.user.id)
      }
    }

    getSessionAndProfile()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchUserProfile(session.user.id)
        } else {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (!error) {
        setProfile(data)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setIsDropdownOpen(false)
    router.push('/')
  }

  if (!user) {
    return null
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <Link href="/directory" className="text-black font-bold text-xl hover:text-gray-700 transition-colors">
            <Image 
              src="/img/mvrk-logo-traced.svg" 
              alt="MVRK HAUS" 
              width={120}
              height={32}
              className="h-8 w-auto"
              style={{
                width: '120px',
                height: '32px',
              }}
              priority
            />
          </Link>

          {/* Profile Button */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-2 text-black hover:text-gray-700 transition-colors"
            >
              {/* Avatar */}
              <div className="w-8 h-8 bg-gray-300 flex items-center justify-center overflow-hidden border border-gray-200">
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url} 
                    alt="Profile" 
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-bold text-gray-700">
                    {(profile?.mvrkName || profile?.['june-ot-legalName'] || user.email)?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              
              {/* Username */}
              <span className="hidden sm:block text-sm">
                {profile?.mvrkName || profile?.['june-ot-legalName'] || 'Profile'}
              </span>
              
              {/* Dropdown arrow */}
              <svg 
                className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-black shadow-lg">
                <div className="py-1">
                  <Link
                    href="/profile/edit"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-black transition-colors"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    프로필 수정
                  </Link>
                  <Link
                    href="/directory"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-black transition-colors md:hidden"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    Directory
                  </Link>
                  <hr className="border-black my-1" />
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-black transition-colors"
                  >
                    로그아웃
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
} 