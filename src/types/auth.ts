export type UserRole = 'awaiting_match' | 'no_membership' | 'general_member' | 'editor' | 'admin'

export interface UserProfile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  role: UserRole
  created_at: string
  updated_at: string
  'june-ot-katalkName'?: string
  'june-ot-legalName'?: string
  mvrkName?: string
  bio?: string
  instagramId?: string
  roleTagIds?: number[]
  slug?: string
  '1a'?: string
  '2a'?: string
  '3a'?: string
  '4a'?: string
  '1b'?: string
  '2b'?: string
  '3b'?: string
  '4b'?: string
  '5b'?: string
  '6b'?: string
}

// Role hierarchy levels for comparison
export const ROLE_LEVELS: Record<UserRole, number> = {
  awaiting_match: 1,
  no_membership: 1,
  general_member: 3,
  editor: 4,
  admin: 5,
} as const

// Helper function to check if a role meets minimum requirement
export function hasRoleLevel(currentRole: UserRole, minimumRole: UserRole): boolean {
  return ROLE_LEVELS[currentRole] >= ROLE_LEVELS[minimumRole]
}

// Role transition rules
export const ROLE_TRANSITIONS: Record<UserRole, UserRole[]> = {
  awaiting_match: ['general_member', 'no_membership'],
  no_membership: ['general_member'],
  general_member: ['no_membership', 'editor', 'admin'],
  editor: ['general_member', 'admin'],
  admin: [], // Admins can be demoted to any role, but we don't list them to prevent accidental changes
} as const

// Check if role transition is allowed
export function canTransitionTo(fromRole: UserRole, toRole: UserRole): boolean {
  return ROLE_TRANSITIONS[fromRole].includes(toRole) || fromRole === 'admin'
}

// Role display information
export const ROLE_INFO: Record<UserRole, { 
  label: string
  color: string
  emoji: string
  description: string 
}> = {
  awaiting_match: {
    label: 'Awaiting Match',
    color: 'red',
    emoji: '🔴',
    description: 'Pending membership verification'
  },
  no_membership: {
    label: 'No Membership',
    color: 'red',
    emoji: '🔴',
    description: 'Restricted access'
  },
  general_member: {
    label: 'member',
    color: 'yellow',
    emoji: '🟡',
    description: 'Active community member'
  },
  editor: {
    label: 'Editor',
    color: 'green',
    emoji: '🟢',
    description: 'Content creator'
  },
  admin: {
    label: 'Administrator',
    color: 'blue',
    emoji: '🔵',
    description: 'Full administrator'
  },
} as const 