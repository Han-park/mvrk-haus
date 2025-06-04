# Google OAuth Setup Guide

## Required Environment Variables

Create a `.env.local` file in your project root with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Required for server-side Supabase operations (optional for basic auth)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Node Environment
NODE_ENV=development
```

## Supabase Dashboard Configuration

### 1. Authentication Settings

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** > **Settings**
3. Under **URL Configuration**, add your site URLs:
   - For development: `http://localhost:3000`
   - For production: `https://your-domain.com`

### 2. Google OAuth Provider Setup

1. In Supabase Dashboard, go to **Authentication** > **Providers**
2. Find **Google** and click **Enable**
3. You'll need to create a Google OAuth application:

#### Google Console Setup:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google+ API
4. Go to **Credentials** > **Create Credentials** > **OAuth 2.0 Client IDs**
5. Configure the OAuth consent screen
6. For **Authorized JavaScript origins**, add:
   - `http://localhost:3000` (development)
   - `https://your-domain.com` (production)
7. For **Authorized redirect URIs**, add:
   - `https://your-supabase-project.supabase.co/auth/v1/callback`

#### Back in Supabase:
1. Copy the **Client ID** and **Client Secret** from Google Console
2. Paste them into the Google provider settings in Supabase
3. Save the configuration

### 3. Redirect URLs

The app is configured to redirect to `/auth/callback` after OAuth, which then redirects to `/sign-up-june`.

Make sure your Supabase project has the following redirect URLs configured:
- `http://localhost:3000/auth/callback` (development)
- `https://your-domain.com/auth/callback` (production)

## Testing

1. Start your development server: `npm run dev`
2. Go to `http://localhost:3000/sign-up-june`
3. Click "Continue with Google"
4. Complete the Google OAuth flow
5. You should be redirected back to the app with authentication

## Troubleshooting

### "Authentication failed" but user was created

If you see "Authentication failed" but notice a new user was created in your Supabase Users dashboard, this means:

1. ✅ **Google OAuth is working** - Google authenticated you successfully
2. ✅ **Supabase OAuth is working** - Supabase created the user account
3. ❌ **Session creation failed** - The callback couldn't establish a browser session

**Debug steps:**

1. **Check browser console logs:**
   - Open Developer Tools (F12)
   - Look for error messages in the Console tab
   - Check the Network tab for failed requests

2. **Visit the debug page:**
   - Go to `http://localhost:3000/debug-auth`
   - This page will show you detailed session and user information
   - Try the "Test Google Sign In" button to see raw errors

3. **Check server logs:**
   - Look at your terminal where `npm run dev` is running
   - OAuth callback errors will be logged there with detailed messages

4. **Common fixes:**
   - Restart your development server
   - Clear browser cookies and localStorage
   - Verify your `.env.local` file has the correct Supabase URL and keys
   - Make sure your Supabase project's redirect URLs are correct

### Common Issues:

1. **"Invalid redirect URI"**: Make sure all URLs are properly configured in both Google Console and Supabase
2. **"OAuth flow failed"**: Check browser console for detailed error messages
3. **"Authentication failed"**: Verify your Supabase environment variables are correct
4. **Session not persisting**: Clear browser storage and check for cookie issues

### Error Messages:

The app will display specific error messages from failed OAuth attempts:
- **OAuth error**: Issue with the code exchange process
- **Callback error**: Problem in the callback handling
- **No authorization code**: OAuth didn't return the expected code parameter

### Google OAuth Flow Explanation:

1. **User clicks "Continue with Google"** → App redirects to Google
2. **Google authentication** → User signs in with Google account
3. **Google callback to Supabase** → Google sends code to `https://your-project.supabase.co/auth/v1/callback`
4. **Supabase processes OAuth** → Creates/updates user, generates session
5. **Supabase redirects to your app** → Sends to `/auth/callback` with code
6. **Your callback processes** → Exchanges code for session cookies
7. **Final redirect** → User lands back in your app, authenticated

### Debug Mode:

Check the browser's network tab and console for detailed error information during the OAuth flow. 