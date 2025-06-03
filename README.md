# MVRK HAUS

A Next.js-powered community platform for MVRK CRAFT featuring Google OAuth authentication and role-based access control.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended)
- Supabase account
- Google Cloud Console project

### Installation

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the result.

### Authentication

The platform provides separate pages for new and existing users:

- **Sign-up page**: [http://localhost:3000/sign-up-june](http://localhost:3000/sign-up-june) - For new users creating accounts
- **Sign-in page**: [http://localhost:3000/sign-in](http://localhost:3000/sign-in) - For existing users logging back in
- **Coming soon page**: [http://localhost:3000](http://localhost:3000)

#### User Flow
1. **New users** start at `/sign-up-june` to create an account and enter membership passcode
2. **Existing users** can use `/sign-in` to quickly access their account
3. Both pages use Google OAuth for secure authentication
4. Users are automatically redirected based on their membership status:
   - `awaiting_match` → Complete registration at `/sign-up-june`
   - Active members → Directory at `/directory`
   - Restricted access → Appropriate landing page

## 🔐 User Role System

### Overview

This document describes the user role hierarchy and permissions system for MVRK HAUS. The system is designed to manage member access and maintain community quality through a structured permission model.

### Role Hierarchy

```
admin
├── editor
│   └── general_member
│       ├── awaiting_match
│       └── no_membership
```

---

## Role Definitions

### 🔴 `awaiting_match`
**Status**: Temporary - Post Google Sign-up  
**Description**: Users who have completed Google OAuth sign-up but haven't been matched to membership information yet.

#### Permissions:
- ❌ Cannot view internal information
- ❌ Cannot edit profiles (except basic info)
- ❌ Cannot view member stats
- ❌ Cannot post events
- ❌ Cannot modify user statuses

#### Use Cases:
- New users pending membership verification
- Users whose membership status needs manual review
- Temporary holding state before role assignment

---

### 🔴 `no_membership`
**Status**: Restricted Access  
**Description**: Users without active membership. Same authority level as non-users.

#### Permissions:
- ❌ Cannot view internal information
- ❌ Cannot view member profiles
- ❌ Cannot view community stats
- ❌ Cannot edit any profiles
- ❌ Cannot post events
- ❌ Cannot modify user statuses

#### Use Cases:
- Former members whose membership has expired
- Users who declined membership
- Users whose membership was revoked

---

### 🟡 `general_member`
**Status**: Active Member  
**Description**: Standard community members with access to internal information and self-management capabilities.

#### Permissions:
- ✅ Can view internal information
- ✅ Can view member profiles
- ✅ Can view community stats
- ✅ Can edit their own profile
- ❌ Cannot post events
- ❌ Cannot modify other users' statuses

#### Use Cases:
- Regular community members
- Users who want to engage with community content
- Members participating in community activities

---

### 🟢 `editor`
**Status**: Content Creator  
**Description**: Trusted members who can create and manage community events. Inherits all general_member permissions.

#### Permissions:
- ✅ All `general_member` permissions
- ✅ Can post events
- ✅ Can edit their own events
- ✅ Can manage event details and descriptions
- ❌ Cannot modify user statuses

#### Use Cases:
- Community event organizers
- Content creators
- Trusted members who drive community engagement

---

### 🔵 `admin`
**Status**: Full Administrator  
**Description**: Full system administrators with complete access to user management and all platform features.

#### Permissions:
- ✅ All `editor` permissions
- ✅ Can modify user statuses
- ✅ Can promote/demote between `general_member` ↔ `no_membership`
- ✅ Can manage all user profiles
- ✅ Can delete/edit any events
- ✅ Can access admin panel
- ✅ Can view system analytics

#### Use Cases:
- Platform administrators
- Community managers
- Technical support staff

---

## Permission Matrix

| Permission | awaiting_match | no_membership | general_member | editor | admin |
|------------|---------------|---------------|---------------|---------|-------|
| View internal info | ❌ | ❌ | ✅ | ✅ | ✅ |
| View member profiles | ❌ | ❌ | ✅ | ✅ | ✅ |
| View community stats | ❌ | ❌ | ✅ | ✅ | ✅ |
| Edit own profile | ⚠️ Limited | ❌ | ✅ | ✅ | ✅ |
| Edit other profiles | ❌ | ❌ | ❌ | ❌ | ✅ |
| Post events | ❌ | ❌ | ❌ | ✅ | ✅ |
| Edit any events | ❌ | ❌ | ❌ | ❌ | ✅ |
| Modify user statuses | ❌ | ❌ | ❌ | ❌ | ✅ |
| Access admin panel | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## Role Transitions

### Automatic Transitions
- **New user signup** → `awaiting_match`

### Admin-Managed Transitions
- `awaiting_match` → `general_member` (after membership verification)
- `awaiting_match` → `no_membership` (if membership declined/rejected)
- `general_member` ↔ `no_membership` (membership status changes)
- `general_member` → `editor` (promotion by admin)
- `editor` → `general_member` (demotion by admin)
- Any role → `admin` (super admin promotion)

### Restricted Transitions
- `no_membership` cannot be promoted to `editor` directly
- `awaiting_match` cannot be promoted to `editor` directly
- Only existing `admin` can promote to `admin` role

---

## 💻 Implementation Notes

### Database Schema
```sql
CREATE TYPE user_role AS ENUM (
  'awaiting_match',
  'no_membership', 
  'general_member',
  'editor',
  'admin'
);
```

### Default Assignment
- All new Google OAuth users start as `awaiting_match`
- Manual admin review required for initial role assignment

### Security Considerations
- Row Level Security (RLS) enforces permissions at database level
- Client-side role checks are supplementary, not primary security
- All sensitive operations require server-side permission validation

---

## 🔧 Usage Examples

### Checking Permissions in Components
```typescript
const { profile, hasRole } = useAuth()

// Check specific role
if (hasRole('general_member')) {
  // Show member content
}

// Check minimum permission level
if (profile?.role !== 'awaiting_match' && profile?.role !== 'no_membership') {
  // Show internal content
}
```

### Role-Based Route Protection
```typescript
// Middleware or route guard
const allowedRoles = ['general_member', 'editor', 'admin']
if (!allowedRoles.includes(userRole)) {
  redirect('/access-denied')
}
```

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Authentication**: Supabase Auth with Google OAuth
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Type Safety**: TypeScript
- **3D Graphics**: Three.js with React Three Fiber

## 📁 Project Structure

```
src/
├── app/
│   ├── auth/callback/          # OAuth callback handler
│   ├── sign-up-june/          # Sign-up page
│   └── page.tsx               # Coming soon page
├── lib/
│   ├── supabase.ts            # Supabase client config
│   └── supabase-server.ts     # Server-side client
└── components/
    └── Scene.tsx              # 3D scene component
```

## ❓ FAQ

**Q: What happens when a user's membership expires?**  
A: Admin can change their status from `general_member` to `no_membership`.

**Q: Can editors manage other users?**  
A: No, only admins can modify user statuses and manage other users.

**Q: How long do users stay in `awaiting_match`?**  
A: Until an admin manually reviews and assigns them to either `general_member` or `no_membership`.

**Q: Can `no_membership` users view any content?**  
A: They have the same access as non-users - only public content.

---

## 🚀 Deployment

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Make sure to set up your environment variables in your deployment platform.

---

**MVRK HAUS** - *Website coming soon.*  
*by MVRK CRAFT from MVRK HAUS.*
