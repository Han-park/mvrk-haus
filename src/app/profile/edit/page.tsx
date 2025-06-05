'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { UserProfile } from '@/types/auth'
import Header from '@/components/Header'
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

interface RoleTag {
  id: number
  roleTagName: string
}

interface Question {
  id: number
  question_id: string
  question_name: string
}

// Static fallback for questions in case database fetch fails
const FALLBACK_QUESTIONS: Record<string, string> = {
  '1a': '당신에게 \'나다운 삶\'이란 어떤 삶인가요?',
  '2a': '당신은 당신의 어떤 모습을 가장 사랑하시나요?',
  '3a': '당신에게 가장 큰 의미를 지닌 가치는 무엇인가요?',
  '4a': '당신은 어떤 사람인가요?',
  '1b': '당신에게 \'나만의 방식과 속도대로 산다\'는 건 어떤 의미인가요?',
  '2b': '당신을 계속해서 앞으로 나아가게 만드는 것은 무엇인가요?',
  '3b': '당신은 어떤 삶을 살고 싶나요?',
  '4b': '당신은 어떤 사람인가요?',
  '5b': '메버릭 하우스를 통해 당신은 어떤 경험을 하고 싶나요?',
  '6b': '메버릭 하우스와 함께 하면서 이루고 싶은 당신의 비전은 무엇인가요?'
}

export default function ProfileEdit() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [roleTags, setRoleTags] = useState<RoleTag[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isPageRefresh, setIsPageRefresh] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  
  // Refs for cleanup and race condition prevention
  const abortControllerRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)
  
  // Form state
  const [formData, setFormData] = useState({
    mvrkName: '',
    bio: '',
    instagramId: '',
    slug: '',
    roleTagIds: [] as number[],
    avatar_url: '',
    '1a': '',
    '2a': '',
    '3a': '',
    '4a': '',
    '1b': '',
    '2b': '',
    '3b': '',
    '4b': '',
    '5b': '',
    '6b': ''
  })

  // Detect if this is a page refresh (vs client-side navigation)
  useEffect(() => {
    setIsPageRefresh(performance.navigation?.type === 1 || !window.history.state);
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    abortControllerRef.current = controller

    const getSessionAndProfile = async () => {
      if (!mountedRef.current || controller.signal.aborted) return
      
      const result = await withAsyncRetry(async (signal) => {
        if (signal?.aborted) throw new Error('Operation aborted')
        
        console.log('Fetching session and profile')
        
        // For SSR/page refresh, give more time for session to be established
        let session = null
        let attempts = 0
        const maxAttempts = isPageRefresh ? 8 : 3
        
        // Retry session fetch to handle SSR timing issues
        while (!session && attempts < maxAttempts && !signal?.aborted) {
          console.log(`Session attempt ${attempts + 1}/${maxAttempts} (Page refresh: ${isPageRefresh})`)
          const { data: { session: currentSession } } = await supabase.auth.getSession()
          session = currentSession
          
          if (!session && attempts < maxAttempts - 1) {
            const delay = isPageRefresh ? 800 : 300
            await new Promise(resolve => setTimeout(resolve, delay))
          }
          attempts++
        }
        
        if (signal?.aborted) throw new Error('Operation aborted')
        
        if (session?.user) {
          console.log('Session established successfully:', session.user.id)
          
          if (mountedRef.current && !signal?.aborted) {
            setUser(session.user)
            
            const profileResult = await fetchUserProfile(session.user.id, signal)
            if (profileResult.success && profileResult.data) {
              setProfile(profileResult.data)
            } else {
              console.error('Failed to fetch profile:', profileResult.error)
              setProfile(null)
            }
          }
        } else {
          console.log('No session found after retries')
          if (mountedRef.current && !signal?.aborted) {
            setUser(null)
            setProfile(null)
          }
        }
        
        return session
      }, { signal: controller.signal, timeout: 20000, retries: 2 })

      // Always fetch role tags and questions regardless of user state
      console.log('Fetching role tags and questions...')
      await Promise.all([
        fetchRoleTags(),
        fetchQuestions()
      ])
      console.log('Completed fetching role tags and questions.')

      if (mountedRef.current && !controller.signal.aborted) {
        if (!result.success) {
          console.error('Session establishment failed:', result.error)
        }
        setIsInitialLoad(false)
        setLoading(false)
      }
    }

    getSessionAndProfile()

    console.log('Setting up auth state change listener')
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current || controller.signal.aborted || isInitialLoad) {
          console.log('Ignoring auth state change during initial load or if unmounted')
          return
        }
        
        console.log('Auth state change:', event, 'Session:', !!session, 'Initial load:', isInitialLoad)
        
        try {
          if (mountedRef.current && !controller.signal.aborted) {
            setUser(session?.user ?? null)
            
            if (session?.user) {
              const profileResult = await fetchUserProfile(session.user.id, controller.signal)
              if (mountedRef.current && !controller.signal.aborted) {
                if (profileResult.success && profileResult.data) {
                  setProfile(profileResult.data)
                } else {
                  console.error('Failed to fetch profile on auth change:', profileResult.error)
                  setProfile(null)
                }
              }
            } else {
              setProfile(null)
            }
          }
        } catch (error) {
          if (mountedRef.current && !controller.signal.aborted) {
            console.error('Error in auth state change:', error)
            setUser(null)
            setProfile(null)
          }
        }
      }
    )

    return () => {
      mountedRef.current = false
      controller.abort('Component unmounting')
      subscription.unsubscribe()
    }
  }, [isPageRefresh, isInitialLoad])

  useEffect(() => {
    if (profile) {
      setFormData({
        mvrkName: profile.mvrkName || '',
        bio: profile.bio || '',
        instagramId: profile.instagramId || '',
        slug: profile.slug || '',
        roleTagIds: profile.roleTagIds || [],
        avatar_url: profile.avatar_url || '',
        '1a': profile['1a'] || '',
        '2a': profile['2a'] || '',
        '3a': profile['3a'] || '',
        '4a': profile['4a'] || '',
        '1b': profile['1b'] || '',
        '2b': profile['2b'] || '',
        '3b': profile['3b'] || '',
        '4b': profile['4b'] || '',
        '5b': profile['5b'] || '',
        '6b': profile['6b'] || ''
      })
    }
  }, [profile])

  // Check if we should redirect to sign-up page due to failed authentication
  useEffect(() => {
    // Add a safety net: if still loading after 10 seconds and no user, something is wrong
    const safetyTimer = setTimeout(() => {
      if (loading && !user && mountedRef.current) {
        console.log('Safety timeout: No user found after 10 seconds, redirecting to sign-up')
        window.location.href = '/sign-up-june?error=' + encodeURIComponent('Session expired. Please sign in again.')
      }
    }, 10000)

    return () => clearTimeout(safetyTimer)
  }, [loading, user])

  const fetchUserProfile = async (userId: string, signal?: AbortSignal): Promise<AsyncResult<UserProfile>> => {
    const operation = async (abortSignal?: AbortSignal) => {
      console.log('Fetching user profile for user ID:', userId)
      
      if (abortSignal?.aborted) throw new Error('Operation aborted')

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        throw new Error(`Failed to fetch user profile: ${error.message}`)
      }

      if (!data) {
        throw new Error('User profile not found')
      }

      return data
    }

    return await withAsyncRetry(operation, { signal, timeout: 15000, retries: 2 })
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
        throw new Error(`Failed to fetch role tags: ${error.message}`)
      }

      const tags = data || []
      
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

  const fetchQuestions = async (): Promise<AsyncResult<Question[]>> => {
    const operation = async (signal?: AbortSignal) => {
      console.log('Fetching questions...')
      
      if (signal?.aborted) throw new Error('Operation aborted')

      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('question_id')

      if (error) {
        console.warn('Failed to fetch questions from database:', error.message)
        // Use fallback questions if database fetch fails
        return []
      }

      const questions = data || []
      
      if (mountedRef.current && !signal?.aborted) {
        setQuestions(questions)
      }

      return questions
    }

    return await withAsyncRetry(operation, { 
      signal: abortControllerRef.current?.signal, 
      timeout: 10000, 
      retries: 1 // Only retry once for questions since we have fallbacks
    })
  }

  const getQuestionName = (questionId: string): string => {
    const question = questions.find(q => q.question_id === questionId)
    return question?.question_name || FALLBACK_QUESTIONS[questionId] || questionId
  }

  const handleInputChange = (field: string, value: string | number) => {
    if (!mountedRef.current) return
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const validateSlug = (slug: string): boolean => {
    // Allow letters, numbers, hyphens, and underscores
    return /^[a-zA-Z0-9_-]+$/.test(slug) && slug.length >= 3 && slug.length <= 30
  }

  const handleSlugChange = (value: string) => {
    if (!mountedRef.current) return
    
    // Convert to lowercase and replace spaces with hyphens
    const cleanSlug = value.toLowerCase().replace(/\s+/g, '-')
    setFormData(prev => ({
      ...prev,
      slug: cleanSlug
    }))
  }

  const toggleRoleTag = (tagId: number) => {
    if (!mountedRef.current) return
    
    setFormData(prev => ({
      ...prev,
      roleTagIds: prev.roleTagIds.includes(tagId)
        ? prev.roleTagIds.filter(id => id !== tagId)
        : [...prev.roleTagIds, tagId]
    }))
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!mountedRef.current) return
    
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB')
      return
    }

    setAvatarFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      if (mountedRef.current) {
        setAvatarPreview(e.target?.result as string)
      }
    }
    reader.readAsDataURL(file)
  }

  const removeAvatar = () => {
    if (!mountedRef.current) return
    
    setAvatarFile(null)
    setAvatarPreview(null)
    setFormData(prev => ({ ...prev, avatar_url: '' }))
  }

  const uploadAvatar = async (): Promise<AsyncResult<string>> => {
    if (!avatarFile || !user) {
      return { data: null, error: 'No file or user available', success: false }
    }

    const operation = async (signal?: AbortSignal) => {
      if (signal?.aborted) throw new Error('Upload cancelled')
      
      const fileExt = avatarFile.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(filePath, avatarFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw new Error(`Avatar upload failed: ${uploadError.message}`)
      }

      if (signal?.aborted) throw new Error('Upload cancelled')

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(filePath)

      if (!urlData.publicUrl) {
        throw new Error('Failed to get avatar URL')
      }

      return urlData.publicUrl
    }

    return await withAsyncRetry(operation, { 
      signal: abortControllerRef.current?.signal, 
      timeout: 30000, 
      retries: 2 
    })
  }

  const handleSubmit = async (e: React.FormEvent): Promise<AsyncResult<void>> => {
    e.preventDefault()

    if (!user || !profile || !mountedRef.current) {
      return { data: null, error: 'Missing user or profile data', success: false }
    }

    // Basic validation
    if (!formData.mvrkName.trim()) {
      return { data: null, error: 'MVRK Name is required', success: false }
    }

    if (formData.slug && !validateSlug(formData.slug)) {
      return { data: null, error: 'Slug must be 3-30 characters long and contain only letters, numbers, hyphens, and underscores', success: false }
    }

    const operation = async (signal?: AbortSignal) => {
      setSaving(true)

      if (signal?.aborted) throw new Error('Save cancelled')

      let avatarUrl = formData.avatar_url

      // Upload avatar if there's a new file
      if (avatarFile) {
        setUploading(true)
        
        const uploadResult = await uploadAvatar()
        
        if (!uploadResult.success || !uploadResult.data) {
          throw new Error(uploadResult.error || 'Avatar upload failed')
        }
        
        avatarUrl = uploadResult.data
        setUploading(false)
      }

      if (signal?.aborted) throw new Error('Save cancelled')

      // Update profile
      const { error } = await supabase
        .from('user_profiles')
        .update({
          mvrkName: formData.mvrkName.trim(),
          bio: formData.bio.trim(),
          instagramId: formData.instagramId.trim(),
          slug: formData.slug.trim() || null,
          roleTagIds: formData.roleTagIds,
          avatar_url: avatarUrl,
          '1a': formData['1a'].trim(),
          '2a': formData['2a'].trim(),
          '3a': formData['3a'].trim(),
          '4a': formData['4a'].trim(),
          '1b': formData['1b'].trim(),
          '2b': formData['2b'].trim(),
          '3b': formData['3b'].trim(),
          '4b': formData['4b'].trim(),
          '5b': formData['5b'].trim(),
          '6b': formData['6b'].trim(),
        })
        .eq('id', user.id)

      if (error) {
        throw new Error(`Profile update failed: ${error.message}`)
      }

      if (signal?.aborted) throw new Error('Save cancelled')

      // Refresh profile data
      const profileResult = await fetchUserProfile(user.id, signal)
      if (profileResult.success && profileResult.data && mountedRef.current) {
        setProfile(profileResult.data)
      }

      return undefined
    }

    const result = await withAsyncRetry(operation, { 
      signal: abortControllerRef.current?.signal, 
      timeout: 45000, 
      retries: 2 
    })

    if (mountedRef.current) {
      setSaving(false)
      setUploading(false)
      
      if (result.success) {
        // Clear avatar file state after successful upload
        setAvatarFile(null)
        setAvatarPreview(null)
        
        // Show success message
        setTimeout(() => {
          if (mountedRef.current) {
            alert('Profile updated successfully!')
          }
        }, 100)
        
        // Navigate back after a short delay
        setTimeout(() => {
          if (mountedRef.current) {
            router.push('/directory')
          }
        }, 1000)
      } else {
        alert(result.error || 'Failed to update profile. Please try again.')
      }
    }

    return result
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-black text-xl">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-black mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">로그인한 메버릭 멤버만 프로필을 수정할 수 있습니다.</p>
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

  if (profile?.role === 'no_membership' || profile?.role === 'awaiting_match') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-black mb-4">Profile Editing Restricted</h1>
          <p className="text-gray-600 mb-6">Complete your membership to edit your profile.</p>
          <a 
            href="/sign-up-june" 
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2"
          >
            Complete Membership
          </a>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-black text-xl">Profile not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <Header />
      <div className="container mx-auto px-4 py-16 pt-24">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-2">Edit Profile</h1>
          <p className="text-gray-600">Update your MVRK HAUS profile information</p>
        </div>

        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8">
          {/* Profile Image */}
          <div className="bg-gray-100 p-8 border border-gray-300">
            <h2 className="text-xl font-semibold text-black mb-6">Profile Image</h2>
            
            <div className="flex flex-col items-center space-y-4">
              {/* Current Avatar Display */}
              <div className="w-32 h-32 bg-gray-300 flex items-center justify-center overflow-hidden border border-gray-200">
                {avatarPreview ? (
                  <Image
                    src={avatarPreview} 
                    alt="Avatar preview" 
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                  />
                ) : formData.avatar_url ? (
                  <Image
                    src={formData.avatar_url} 
                    alt="Current avatar" 
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl font-medium text-gray-700">
                    {(formData.mvrkName || profile?.['june-ot-legalName'] || user?.email)?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex flex-col items-center space-y-2">
                <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 transition-colors duration-200">
                  <span>{uploading ? 'Uploading...' : 'Choose Image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
                
                {(avatarPreview || formData.avatar_url) && (
                  <button
                    type="button"
                    onClick={removeAvatar}
                    className="text-red-600 hover:text-red-700 text-sm transition-colors duration-200"
                  >
                    Remove Image
                  </button>
                )}
                
                <p className="text-xs text-gray-500 text-center">
                  Max size: 5MB • Supported: JPG, PNG, GIF
                </p>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-gray-100 p-8 border border-gray-300">
            <h2 className="text-xl font-semibold text-black mb-6">Basic Information</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  MVRK Name
                </label>
                <input
                  type="text"
                  value={formData.mvrkName}
                  onChange={(e) => handleInputChange('mvrkName', e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-300 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  placeholder="Enter your preferred name"
                  maxLength={20}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Max 20 characters.
                  {formData.mvrkName && ` (${formData.mvrkName.length}/20)`}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-white border border-gray-300 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors resize-none"
                  placeholder="Tell others about yourself..."
                  maxLength={100}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Max 100 characters.
                  {formData.bio && ` (${formData.bio.length}/100)`}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instagram Username
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 bg-gray-200 border border-r-0 border-gray-300 text-gray-600 text-sm">
                    @
                  </span>
                  <input
                    type="text"
                    value={formData.instagramId}
                    onChange={(e) => handleInputChange('instagramId', e.target.value)}
                    className="flex-1 px-4 py-3 bg-white border border-gray-300 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    placeholder="your_instagram_handle"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profile URL Slug
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 bg-gray-200 border border-r-0 border-gray-300 text-gray-600 text-sm">
                    /directory/
                  </span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className="flex-1 px-4 py-3 bg-white border border-gray-300 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    placeholder="your_custom_url"
                    maxLength={20}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Only lowercase letters, numbers, and underscores allowed. Max 20 characters.
                  {formData.slug && ` (${formData.slug.length}/20)`}
                </p>
              </div>
            </div>
          </div>

          {/* Role Tags */}
          <div className="bg-gray-100 p-8 border border-gray-300">
            <h2 className="text-xl font-semibold text-black mb-6">Skills & Roles</h2>
            <p className="text-gray-600 text-sm mb-4">
              Select up to 5 tags that best describe your skills and interests 
              <span className="text-blue-600 ml-2">({formData.roleTagIds.length}/5 selected)</span>
            </p>
            
            <div className="flex flex-wrap gap-3">
              {roleTags.map(tag => {
                const isSelected = formData.roleTagIds.includes(tag.id)
                const isDisabled = !isSelected && formData.roleTagIds.length >= 5
                
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleRoleTag(tag.id)}
                    disabled={isDisabled}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white border border-blue-500'
                        : isDisabled
                        ? 'bg-gray-200 text-gray-500 border border-gray-300 cursor-not-allowed opacity-50'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {tag.roleTagName}
                  </button>
                )
              })}
            </div>
          </div>

          {/* OPENHAUS Questions */}
            <div className="bg-gray-100 p-8 border border-gray-300">
            <h2 className="text-xl font-semibold text-black mb-6">OPENHAUS 답변</h2>
            <p className="text-gray-600 text-sm mb-6">멤버십 최초 가입 시점에 따라 질문에 차이가 있습니다.</p>
            
            <div className="space-y-8">
              {/* 24년 11월 이후 신청 */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-black border-b border-gray-300 pb-2">24년 11월 이후 신청</h3>
                {['1b', '2b', '3b', '4b', '5b', '6b'].map(questionId => (
                  <div key={questionId}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {getQuestionName(questionId)}
                    </label>
                    <textarea
                      value={formData[questionId as keyof typeof formData] as string}
                      onChange={(e) => handleInputChange(questionId, e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-white border border-gray-300 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors resize-none"
                      placeholder="Share your thoughts..."
                    />
                  </div>
                ))}
              </div>

              {/* 24년 10월 이전 신청 */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-black border-b border-gray-300 pb-2">24년 10월 이전 신청</h3>
                {['1a', '2a', '3a', '4a'].map(questionId => (
                  <div key={questionId}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {getQuestionName(questionId)}
                    </label>
                    <textarea
                      value={formData[questionId as keyof typeof formData] as string}
                      onChange={(e) => handleInputChange(questionId, e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-white border border-gray-300 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors resize-none"
                      placeholder="Share your thoughts..."
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 transition-colors duration-200"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Navigation */}
        {/* <div className="text-center mt-12 space-y-4">
          <div className="max-w-lg mx-auto">
            <a
              href="/directory"
              className="inline-block w-full bg-black py-3 px-6 text-white font-semibold transition-colors duration-200"
            >
              Mvrk Directory →
            </a>
          </div>
          <a
            href="/sign-up-june"
            className="text-gray-600 hover:text-black transition-colors duration-200"
          >
            ← Back to Profile
          </a>
        </div> */}
      </div>
    </div>
  )
} 