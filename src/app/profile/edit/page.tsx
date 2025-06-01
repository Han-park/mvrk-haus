'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { UserProfile } from '@/types/auth'

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

  useEffect(() => {
    const getSessionAndProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      
      if (session?.user) {
        await fetchUserProfile(session.user.id)
      }
      
      await fetchRoleTags()
      await fetchQuestions()
      setLoading(false)
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
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

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

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('openhaus_questions_enum')
        .select('*')
        .order('question_id')

      if (error) {
        console.error('Error fetching questions:', error)
      } else {
        setQuestions(data || [])
      }
    } catch (error) {
      console.error('Error fetching questions:', error)
    }
  }

  const getQuestionName = (questionId: string): string => {
    const question = questions.find(q => q.question_id === questionId)
    return question?.question_name || FALLBACK_QUESTIONS[questionId] || questionId
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const validateSlug = (slug: string): boolean => {
    // Allow only lowercase letters, numbers, and underscores
    const slugRegex = /^[a-z0-9_]*$/
    return slug.length <= 20 && slugRegex.test(slug)
  }

  const handleSlugChange = (value: string) => {
    // Convert to lowercase and validate
    const lowercaseValue = value.toLowerCase()
    if (validateSlug(lowercaseValue)) {
      handleInputChange('slug', lowercaseValue)
    }
  }

  const toggleRoleTag = (tagId: number) => {
    setFormData(prev => {
      const isCurrentlySelected = prev.roleTagIds.includes(tagId)
      
      // If trying to add a new tag but already have 3, don't allow it
      if (!isCurrentlySelected && prev.roleTagIds.length >= 3) {
        alert('You can select up to 3 role tags only.')
        return prev
      }
      
      return {
        ...prev,
        roleTagIds: isCurrentlySelected
          ? prev.roleTagIds.filter(id => id !== tagId)
          : [...prev.roleTagIds, tagId]
      }
    })
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB')
      return
    }

    setAvatarFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const removeAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview(null)
    setFormData(prev => ({ ...prev, avatar_url: '' }))
  }

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return null

    setUploading(true)
    try {
      // Delete existing avatar if it exists
      if (formData.avatar_url) {
        const oldPath = formData.avatar_url.split('/').pop()
        if (oldPath) {
          await supabase.storage
            .from('avatars')
            .remove([`${user.id}/${oldPath}`])
        }
      }

      // Upload new avatar
      const fileExt = avatarFile.name.split('.').pop()
      const fileName = `avatar-${Date.now()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile)

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (error) {
      console.error('Error uploading avatar:', error)
      alert('Error uploading image. Please try again.')
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !profile) return

    setSaving(true)
    try {
      let avatarUrl = formData.avatar_url

      // Upload new avatar if one was selected
      if (avatarFile) {
        const newAvatarUrl = await uploadAvatar()
        if (newAvatarUrl) {
          avatarUrl = newAvatarUrl
        } else {
          // If upload failed, don't proceed with form submission
          setSaving(false)
          return
        }
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({
          mvrkName: formData.mvrkName,
          bio: formData.bio,
          instagramId: formData.instagramId,
          slug: formData.slug,
          roleTagIds: formData.roleTagIds,
          avatar_url: avatarUrl,
          '1a': formData['1a'],
          '2a': formData['2a'],
          '3a': formData['3a'],
          '4a': formData['4a'],
          '1b': formData['1b'],
          '2b': formData['2b'],
          '3b': formData['3b'],
          '4b': formData['4b'],
          '5b': formData['5b'],
          '6b': formData['6b']
        })
        .eq('id', user.id)

      if (error) {
        console.error('Error updating profile:', error)
        alert('Error updating profile. Please try again.')
        return
      }

      alert('Profile updated successfully!')
      router.push('/sign-up-june')
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Error updating profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-white mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-6">You need to be logged in to edit your profile.</p>
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-white mb-4">Profile Editing Restricted</h1>
          <p className="text-gray-400 mb-6">Complete your membership to edit your profile.</p>
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Profile not found</div>
      </div>
    )
  }

  const questionIds = ['1a', '2a', '3a', '4a', '1b', '2b', '3b', '4b', '5b', '6b']

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-2">Edit Profile</h1>
          <p className="text-gray-400">Update your MVRK HAUS profile information</p>
        </div>

        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8">
          {/* Profile Image */}
          <div className="bg-gray-900 p-8">
            <h2 className="text-xl font-semibold text-white mb-6">Profile Image</h2>
            
            <div className="flex flex-col items-center space-y-4">
              {/* Current Avatar Display */}
              <div className="w-32 h-32 bg-gray-600 flex items-center justify-center overflow-hidden">
                {avatarPreview ? (
                  <img 
                    src={avatarPreview} 
                    alt="Avatar preview" 
                    className="w-full h-full object-cover"
                  />
                ) : formData.avatar_url ? (
                  <img 
                    src={formData.avatar_url} 
                    alt="Current avatar" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl font-medium">
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
                    className="text-red-400 hover:text-red-300 text-sm transition-colors duration-200"
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
          <div className="bg-gray-900 p-8">
            <h2 className="text-xl font-semibold text-white mb-6">Basic Information</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  MVRK Name
                </label>
                <input
                  type="text"
                  value={formData.mvrkName}
                  onChange={(e) => handleInputChange('mvrkName', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  placeholder="Enter your preferred name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Bio
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors resize-none"
                  placeholder="Tell others about yourself..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Instagram Username
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 bg-gray-800 border border-r-0 border-gray-600 text-gray-400 text-sm">
                    @
                  </span>
                  <input
                    type="text"
                    value={formData.instagramId}
                    onChange={(e) => handleInputChange('instagramId', e.target.value)}
                    className="flex-1 px-4 py-3 bg-gray-800 border border-gray-600 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    placeholder="your_instagram_handle"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Profile URL Slug
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 bg-gray-800 border border-r-0 border-gray-600 text-gray-400 text-sm">
                    /directory/
                  </span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className="flex-1 px-4 py-3 bg-gray-800 border border-gray-600 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
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
          <div className="bg-gray-900 p-8">
            <h2 className="text-xl font-semibold text-white mb-6">Skills & Roles</h2>
            <p className="text-gray-400 text-sm mb-4">
              Select up to 3 tags that best describe your skills and interests 
              <span className="text-blue-400 ml-2">({formData.roleTagIds.length}/3 selected)</span>
            </p>
            
            <div className="flex flex-wrap gap-3">
              {roleTags.map(tag => {
                const isSelected = formData.roleTagIds.includes(tag.id)
                const isDisabled = !isSelected && formData.roleTagIds.length >= 3
                
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
                        ? 'bg-gray-700 text-gray-500 border border-gray-600 cursor-not-allowed opacity-50'
                        : 'bg-gray-800 text-gray-300 border border-gray-600 hover:bg-gray-700'
                    }`}
                  >
                    {tag.roleTagName}
                  </button>
                )
              })}
            </div>
          </div>

          {/* OPENHAUS Questions */}
          <div className="bg-gray-900 p-8">
            <h2 className="text-xl font-semibold text-white mb-6">OPENHAUS 답변</h2>
            <p className="text-gray-400 text-sm mb-6">멤버십 최초 가입 시점에 따라 질문에 차이가 있습니다.</p>
            
            <div className="space-y-8">
              {/* 24년 11월 이후 신청 */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">24년 11월 이후 신청</h3>
                {['1b', '2b', '3b', '4b', '5b', '6b'].map(questionId => (
                  <div key={questionId}>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {getQuestionName(questionId)}
                    </label>
                    <textarea
                      value={formData[questionId as keyof typeof formData] as string}
                      onChange={(e) => handleInputChange(questionId, e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors resize-none"
                      placeholder="Share your thoughts..."
                    />
                  </div>
                ))}
              </div>

              {/* 24년 10월 이전 신청 */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">24년 10월 이전 신청</h3>
                {['1a', '2a', '3a', '4a'].map(questionId => (
                  <div key={questionId}>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {getQuestionName(questionId)}
                    </label>
                    <textarea
                      value={formData[questionId as keyof typeof formData] as string}
                      onChange={(e) => handleInputChange(questionId, e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors resize-none"
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
        <div className="text-center mt-12">
          <a
            href="/sign-up-june"
            className="text-gray-400 hover:text-white transition-colors duration-200"
          >
            ← Back to Profile
          </a>
        </div>
      </div>
    </div>
  )
} 