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

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Authentication**: Supabase Auth with Google OAuth
- **Database**: Supabase (PostgreSQL 17.4.1)
- **Styling**: Tailwind CSS
- **Type Safety**: TypeScript
- **3D Graphics**: Three.js with React Three Fiber
- **Deployment**: Vercel
- **Package Manager**: pnpm

## 📁 Project Structure

```
mvrk-haus/
├── .git/                      # Git repository
├── .next/                     # Next.js build output
├── node_modules/              # Dependencies
├── public/                    # Static assets
│   ├── img/                   # Images
│   ├── next.svg              # Next.js logo
│   ├── vercel.svg            # Vercel logo
│   ├── window.svg            # Window icon
│   ├── globe.svg             # Globe icon
│   └── file.svg              # File icon
├── src/                       # Source code
│   ├── app/                   # Next.js App Router
│   │   ├── api/               # API routes
│   │   ├── auth/              # Authentication pages
│   │   │   └── callback/      # OAuth callback handler
│   │   ├── blob-demo/         # Blob animation demo
│   │   ├── debug-auth/        # Authentication debugging
│   │   ├── directory/         # Member directory
│   │   │   └── [slug]/        # Individual member pages
│   │   ├── hidden/            # Admin/hidden pages
│   │   ├── profile/           # Profile management
│   │   │   └── edit/          # Profile editing
│   │   ├── sign-in/           # Sign-in page
│   │   ├── sign-up-june/      # Sign-up page
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Coming soon page
│   │   ├── globals.css        # Global styles
│   │   └── favicon.ico        # Favicon
│   ├── components/            # React components
│   │   ├── Header.tsx         # Navigation header
│   │   ├── Scene.tsx          # 3D scene component
│   │   ├── Model.tsx          # 3D model component
│   │   ├── BlobHalftoneBackground.tsx # Background animation
│   │   └── BlobHalftoneCanvas.tsx     # Canvas animation
│   ├── lib/                   # Utility libraries
│   │   ├── supabase.ts        # Supabase client config
│   │   ├── supabase-server.ts # Server-side Supabase client
│   │   ├── blobGenerator.ts   # Blob animation utilities
│   │   └── debug.ts           # Debug utilities
│   ├── types/                 # TypeScript type definitions
│   │   └── auth.ts            # Authentication types
│   └── middleware.ts          # Next.js middleware
├── markdown/                  # Documentation
├── eslint.config.mjs         # ESLint configuration
├── next.config.ts            # Next.js configuration
├── package.json              # Project dependencies
├── pnpm-lock.yaml           # pnpm lock file
├── postcss.config.mjs       # PostCSS configuration
├── tailwind.config.ts       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
├── vercel.json              # Vercel deployment config
├── SECURITY_REVIEW.md       # Security audit documentation
├── SUPABASE_SETUP_GUIDE.md  # Supabase setup guide
└── README.md                # This file
```

## 🗄️ Complete Supabase Setup Guide

### Project Overview

**Organization**: mvrkhaus  
**Project ID**: xuoupvqoiuyqidvcibjz  
**Region**: ap-northeast-2 (Asia Pacific - Seoul)  
**Database Version**: PostgreSQL 17.4.1  
**Project URL**: https://xuoupvqoiuyqidvcibjz.supabase.co  

### Environment Setup

#### 1. Environment Variables

Create a `.env.local` file in your project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xuoupvqoiuyqidvcibjz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Node Environment
NODE_ENV=development
```

> ⚠️ **Security Note**: Never commit actual keys to version control. Use `.env.example` for templates.

#### 2. Supabase Client Configuration

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})
```

### Database Schema

#### Core Tables

##### 1. User Profiles (`user_profiles`)
```sql
-- Main user profile table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role user_role DEFAULT 'awaiting_match'::user_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- MVRK-specific fields
  mvrkName TEXT,
  bio TEXT,
  instagramId TEXT,
  slug TEXT,
  roleTagIds INTEGER[],
  
  -- June signup fields
  "june-ot-katalkName" TEXT,
  "june-ot-legalName" TEXT,
  
  -- Survey responses
  "1a" TEXT, "2a" TEXT, "3a" TEXT, "4a" TEXT,
  "1b" TEXT, "2b" TEXT, "3b" TEXT, "4b" TEXT, "5b" TEXT, "6b" TEXT
);
```

##### 2. User Roles Enum
```sql
-- User role hierarchy
CREATE TYPE user_role AS ENUM (
  'awaiting_match',    -- New users waiting for approval
  'no_membership',     -- Denied or inactive users
  'general_member',    -- Basic community access
  'editor',           -- Can edit content
  'admin'             -- Full access
);
```

##### 3. Role Tags (`user_profile_roleTagId_enum`)
```sql
-- Role tags for user categorization
CREATE TABLE user_profile_roleTagId_enum (
  id INTEGER PRIMARY KEY,
  roleTagName TEXT NOT NULL
);
```

##### 4. June OTP System (`june-otp`)
```sql
-- OTP verification for June signup campaign
CREATE TABLE "june-otp" (
  id SERIAL PRIMARY KEY,
  kaTalkName TEXT,
  legalName TEXT,
  passcode TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_register BOOLEAN DEFAULT FALSE,
  
  -- Survey responses
  "1a" TEXT, "2a" TEXT, "3a" TEXT, "4a" TEXT,
  "1b" TEXT, "2b" TEXT, "3b" TEXT, "4b" TEXT, "5b" TEXT, "6b" TEXT,
  
  instagramID TEXT,
  
  -- Registration tracking
  registered_user_id UUID REFERENCES auth.users(id),
  registered_email TEXT,
  registered_at TIMESTAMPTZ DEFAULT NOW()
);
```

##### 5. OpenHaus Questions (`openhaus_questions_enum`)
```sql
-- Dynamic question system
CREATE TABLE openhaus_questions_enum (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  question_id TEXT,
  question_name TEXT
);
```

#### Database Functions

##### User Role Utilities
```sql
-- Get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
BEGIN
  RETURN (
    SELECT role FROM user_profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has minimum role level
CREATE OR REPLACE FUNCTION user_has_role_level(minimum_role user_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT CASE 
      WHEN get_user_role() = 'admin' THEN TRUE
      WHEN get_user_role() = 'editor' AND minimum_role IN ('editor', 'general_member', 'awaiting_match') THEN TRUE
      WHEN get_user_role() = 'general_member' AND minimum_role IN ('general_member', 'awaiting_match') THEN TRUE
      WHEN get_user_role() = 'awaiting_match' AND minimum_role = 'awaiting_match' THEN TRUE
      ELSE FALSE
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate random slug for users
CREATE OR REPLACE FUNCTION generate_random_slug()
RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    substr(md5(random()::text), 1, 8)
  );
END;
$$ LANGUAGE plpgsql;

-- Debug auth context
CREATE OR REPLACE FUNCTION debug_auth_context()
RETURNS TABLE(
  current_user_id UUID,
  current_user_role TEXT,
  is_authenticated BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid() as current_user_id,
    COALESCE(up.role::TEXT, 'no_profile') as current_user_role,
    (auth.uid() IS NOT NULL) as is_authenticated
  FROM user_profiles up
  WHERE up.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Authentication Setup

#### OAuth Configuration

##### Google OAuth Setup
1. **Google Cloud Console**:
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized origins: `https://your-domain.com`, `http://localhost:3000`
   - Add authorized redirect URIs: `https://xuoupvqoiuyqidvcibjz.supabase.co/auth/v1/callback`

2. **Supabase Dashboard**:
   ```
   Authentication > Settings > Auth Providers > Google
   - Enable Google provider
   - Add Client ID and Client Secret
   ```

#### Auth Flow Implementation

```typescript
// Sign in with Google
const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  })
}

// Handle auth callback
// pages/auth/callback/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(requestUrl.origin)
}
```

#### Profile Creation Trigger

```sql
-- Automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

### TypeScript Integration

#### Generated Types

Create `src/lib/database.types.ts`:

```typescript
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      "june-otp": {
        Row: {
          "1a": string | null
          "1b": string | null
          "2a": string | null
          "2b": string | null
          "3a": string | null
          "3b": string | null
          "4a": string | null
          "4b": string | null
          "5b": string | null
          "6b": string | null
          created_at: string | null
          id: number
          instagramID: string | null
          is_register: boolean | null
          kaTalkName: string | null
          legalName: string | null
          passcode: string | null
          registered_at: string | null
          registered_email: string | null
          registered_user_id: string | null
          updated_at: string | null
        }
        Insert: {
          // Insert type definitions...
        }
        Update: {
          // Update type definitions...
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          "1a": string | null
          "1b": string | null
          "2a": string | null
          "2b": string | null
          "3a": string | null
          "3b": string | null
          "4a": string | null
          "4b": string | null
          "5b": string | null
          "6b": string | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          instagramId: string | null
          "june-ot-katalkName": string | null
          "june-ot-legalName": string | null
          mvrkName: string | null
          role: Database["public"]["Enums"]["user_role"]
          roleTagIds: number[] | null
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          // Insert type definitions...
        }
        Update: {
          // Update type definitions...
        }
        Relationships: []
      }
      // ... other tables
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      debug_auth_context: {
        Args: Record<PropertyKey, never>
        Returns: {
          current_user_id: string
          current_user_role: string
          is_authenticated: boolean
        }[]
      }
      generate_random_slug: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      user_has_role_level: {
        Args: { minimum_role: Database["public"]["Enums"]["user_role"] }
        Returns: boolean
      }
    }
    Enums: {
      user_role:
        | "awaiting_match"
        | "no_membership"
        | "general_member"
        | "editor"
        | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper type exports
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type UserRole = Database['public']['Enums']['user_role']
export type RoleTag = Database['public']['Tables']['user_profile_roleTagId_enum']['Row']
export type Question = Database['public']['Tables']['openhaus_questions_enum']['Row']
```

#### Type-Safe Queries

```typescript
// Example: Fetch user profile with full type safety
const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }

  return data
}

// Example: Update profile with type checking
const updateProfile = async (userId: string, updates: Partial<UserProfile>) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  return { data, error }
}
```

### Security & Row Level Security

#### RLS Policies

```sql
-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE "june-otp" ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profile_roleTagId_enum ENABLE ROW LEVEL SECURITY;
ALTER TABLE openhaus_questions_enum ENABLE ROW LEVEL SECURITY;

-- User profiles: Users can read/update their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (user_has_role_level('admin'));

-- General members can view other general members
CREATE POLICY "Members can view other members" ON user_profiles
  FOR SELECT USING (
    user_has_role_level('general_member') AND 
    role IN ('general_member', 'editor', 'admin')
  );

-- June OTP: Only admins can manage
CREATE POLICY "Only admins can manage june-otp" ON "june-otp"
  FOR ALL USING (user_has_role_level('admin'));

-- Role tags: Readable by authenticated users
CREATE POLICY "Authenticated users can read role tags" ON user_profile_roleTagId_enum
  FOR SELECT TO authenticated USING (true);

-- Questions: Readable by general members and above
CREATE POLICY "Members can read questions" ON openhaus_questions_enum
  FOR SELECT USING (user_has_role_level('general_member'));
```

### Development Workflow

#### Type Generation
```bash
# Generate fresh TypeScript types
npx supabase gen types typescript --project-id xuoupvqoiuyqidvcibjz > src/lib/database.types.ts
```

#### Local Development
```bash
# Start local Supabase (optional)
npx supabase start

# Run migrations
npx supabase db push

# Reset database
npx supabase db reset
```

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
