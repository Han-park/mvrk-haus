'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { UserProfile } from '@/types/auth'
import Image from 'next/image'

interface Question {
  id: number
  question_id: string
  question_name: string
}

interface RoleTag {
  id: number
  roleTagName: string
}

// Static fallback for questions in case database fetch fails
const FALLBACK_QUESTIONS: Record<string, string> = {
  '1a': '당신에게 \'나다운 삶\'이란 어떤 삶인가요?',
  '2a': '당신은 당신의 어떤 모습을 가장 사랑하시나요?',
  '3a': '당신에게 가장 큰 의미를 지닌 가치는 무엇인가요?',
  '4a': '당신은 어떤 사람인가요?',
  '1b': '당신에게 \'나만의 방식과 속도대로 산다\'는 건 어떤 의미인가요?',
  '2b': '당신을 계속해서 앞으로 나아가게 만드는 것은 무엇인가요?',
  '3b': '당신은 어떤 삶을 살고 싶은가요?',
  '4b': '당신은 어떤 사람인가요?',
  '5b': '메버릭 하우스를 통해 당신은 어떤 경험을 하고 싶나요?',
  '6b': '메버릭 하우스와 함께 하면서 이루고 싶은 당신의 비전은 무엇인가요?'
}

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null)
  const [targetProfile, setTargetProfile] = useState<UserProfile | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [roleTags, setRoleTags] = useState<RoleTag[]>([])
  const [loading, setLoading] = useState(true)
  const [questionsLoading, setQuestionsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const fetchTargetProfile = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // First try to find by slug
      const { data, error } = await supabase
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

        setTargetProfile(idData)
      } else if (error) {
        console.error('Error fetching target profile:', error)
        setError('Error loading user profile')
        setLoading(false)
        return
      } else {
        // Check if the target profile should be visible to current user
        if (data.role === 'no_membership' || data.role === 'awaiting_match') {
          setError('This profile is not available')
          setLoading(false)
          return
        }

        setTargetProfile(data)
      }
      
      setLoading(false)
    } catch (error) {
      console.error('Error fetching target profile:', error)
      setError('Error loading user profile')
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    const getSessionAndProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setCurrentUser(session?.user ?? null)
      
      if (session?.user) {
        await fetchCurrentUserProfile(session.user.id)
      }
      
      // Fetch questions regardless of authentication
      await fetchQuestions()
      
      // Fetch role tags
      await fetchRoleTags()
      
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
    }
  }, [currentProfile, slug, fetchTargetProfile])

  const fetchQuestions = async () => {
    try {
      setQuestionsLoading(true)
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
    } finally {
      setQuestionsLoading(false)
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

  const getQuestionName = (questionId: string): string => {
    const question = questions.find(q => q.question_id === questionId)
    return question?.question_name || FALLBACK_QUESTIONS[questionId] || questionId
  }

  const getAnswerValue = (questionId: string): string | undefined => {
    if (!targetProfile) return undefined
    const value = targetProfile[questionId as keyof UserProfile] as string | undefined
    return value
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-black text-xl">Loading...</div>
      </div>
    )
  }

  // Check authentication
  if (!currentUser) {
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

  // Check membership access
  if (currentProfile?.role === 'no_membership') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-black mb-4">Access Restricted</h1>
          <p className="text-gray-600 mb-6">You need an active membership to view user profiles.</p>
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

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-black mb-4">Profile Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 mr-4"
          >
            Go Back
          </button>
          <Link 
            href="/directory" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
          >
            View Directory
          </Link>
        </div>
      </div>
    )
  }

  if (!targetProfile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-black text-xl">User profile not found</div>
      </div>
    )
  }

  // Get question IDs that have answers
  const questionIds = ['1a', '2a', '3a', '4a', '1b', '2b', '3b', '4b', '5b', '6b']
  const answeredQuestions = targetProfile ? questionIds.filter(id => {
    const answer = getAnswerValue(id)
    return answer && answer.trim().length > 0
  }) : []

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-2">Member Profile</h1>
                   {/* Last Updated */}
                   {targetProfile.updated_at && (
                  <p className="text-base text-gray-500 mb-4">
                    {new Date(targetProfile.updated_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })} 업데이트됨
                  </p>
                )}
        </div>

        {/* Profile Content */}
        <div className="max-w-4xl mx-auto">
          {/* Top Section */}
          <div className="bg-gray-100 p-8 mb-8 border border-gray-300">
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-32 h-32 bg-gray-300 flex items-center justify-center overflow-hidden border border-gray-200">
                  {targetProfile.avatar_url ? (
                    <Image
                      src={targetProfile.avatar_url} 
                      alt="Profile" 
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-bold text-gray-700">
                      {(targetProfile.mvrkName || targetProfile['june-ot-legalName'] || targetProfile.email)?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-3xl font-bold text-black mb-4">
                  {targetProfile.mvrkName || targetProfile['june-ot-legalName'] || 'Member'}
                </h2>
                
                {/* Bio */}
                {targetProfile.bio && (
                  <p className="text-gray-700 leading-relaxed mb-2 whitespace-pre-wrap">{targetProfile.bio}</p>
                )}
                

                {/* Role Tags */}
                {targetProfile.roleTagIds && targetProfile.roleTagIds.length > 0 && (
                  <div className="mb-6 flex md:justify-start justify-center">
                    <div className="flex flex-wrap gap-2">
                      {targetProfile.roleTagIds.map(tagId => {
                        const tag = roleTags.find(t => t.id === tagId)
                        return tag ? (
                          <span 
                            key={tagId} 
                            className="px-3 py-1 bg-white border border-gray-300 text-xs text-gray-700"
                          >
                            {tag.roleTagName}
                          </span>
                        ) : null
                      })}
                    </div>
                  </div>
                )}

                {/* Instagram Button */}
                {targetProfile.instagramId && (
                  <a
                    href={`https://instagram.com/${targetProfile.instagramId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-baseline space-x-1 bg-gray-800 text-white px-4 py-2 font-bold hover:bg-gray-900 transition-colors"
                  >
              
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="transform rotate-315">
                      <path d="M1.20308 1.04312C1.00481 0.954998 0.772341 1.0048 0.627577 1.16641C0.482813 1.32802 0.458794 1.56455 0.568117 1.75196L3.92115 7.50002L0.568117 13.2481C0.458794 13.4355 0.482813 13.672 0.627577 13.8336C0.772341 13.9952 1.00481 14.045 1.20308 13.9569L14.7031 7.95693C14.8836 7.87668 15 7.69762 15 7.50002C15 7.30243 14.8836 7.12337 14.7031 7.04312L1.20308 1.04312ZM4.84553 7.10002L2.21234 2.586L13.2689 7.50002L2.21234 12.414L4.84552 7.90002H9C9.22092 7.90002 9.4 7.72094 9.4 7.50002C9.4 7.27911 9.22092 7.10002 9 7.10002H4.84553Z" fill="currentColor" stroke="currentColor" strokeWidth="0.3" fillRule="evenodd" clipRule="evenodd"></path>
                    </svg>
                    <span>협업 요청하기</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Question Answers Section */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-black mb-6">OPEN HAUS 답변</h3>

            <div className="bg-gray-100 p-6 border border-gray-300">
            {questionsLoading ? (
                <p className="text-gray-600">Loading questions...</p>
            ) : answeredQuestions.length === 0 ? (
              <div className="bg-gray-100 p-6 border border-gray-300">
                <p className="text-gray-600">No questions answered yet.</p>
              </div>
            ) : (
              answeredQuestions.map(questionId => (
                <div key={questionId}>
                  <h4 className="text-lg font-semibold text-black mb-3">
                    {getQuestionName(questionId)}
                  </h4>
                  <p className="text-gray-700 bg-white p-3 leading-relaxed whitespace-pre-wrap mb-6 border border-gray-300">
                    {getAnswerValue(questionId)}
                  </p>
                </div>
              ))
            )}
               </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="text-center mt-12 space-x-4">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-black transition-colors duration-200"
          >
            ← Go Back
          </button>
          <span className="text-gray-400">|</span>
          <Link
            href="/directory"
            className="text-gray-600 hover:text-black transition-colors duration-200"
          >
            View All Members
          </Link>
        </div>
      </div>
    </div>
  )
} 