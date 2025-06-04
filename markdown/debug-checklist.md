# Local Debugging Checklist

## Browser Compatibility Tests

### Chrome Desktop
- [ ] Open http://localhost:3000 in Chrome
- [ ] Check console for hydration errors
- [ ] Test sign-up flow
- [ ] Test 3D scene loading
- [ ] Clear cache (Cmd+Shift+R) and retest

### Chrome Mobile Simulation
- [ ] Chrome DevTools → Toggle device toolbar
- [ ] Select iPhone 13 Pro
- [ ] Test loading behavior
- [ ] Check touch interactions

### Safari Desktop (macOS)
- [ ] Open http://localhost:3000 in Safari
- [ ] Check Web Inspector console
- [ ] Test all functionality

### Incognito/Private Mode
- [ ] Test in Chrome Incognito
- [ ] Test in Safari Private Window
- [ ] Verify no localStorage/cookie dependencies

## Sign-Up-June Loading Issue Debugging

### Common Symptoms
- [ ] Page shows "Loading..." indefinitely
- [ ] Hard refresh (Cmd+Shift+R) sometimes fixes it
- [ ] Console shows session/profile fetch errors
- [ ] Network requests timeout or hang

### Debugging Steps
1. **Check Console Logs**
   ```javascript
   // Look for these patterns in console:
   // ✅ Good: "✅ Setting loading to false"
   // ❌ Bad: "💥 Exception in..." without loading=false
   // ⏰ Timeout: "⏰ getSessionAndProfile timeout"
   ```

2. **Check Network Tab**
   - [ ] Look for hanging Supabase requests
   - [ ] Check if auth session requests are completing
   - [ ] Verify no 4xx/5xx errors from Supabase

3. **Force Debug Mode (Development)**
   ```javascript
   // Run in browser console to force loading off:
   window.location.reload()
   
   // Or manually trigger state reset:
   localStorage.clear()
   sessionStorage.clear()
   ```

### Enhanced Debugging (v2024.2)

4. **Check Detailed Query Breakdown**
   Look for these specific log messages in order:
   ```javascript
   // Session Management:
   "📡 About to call supabase.auth.getSession()..."
   "📡 Session fetch completed in XXXms"
   "📊 Session result: Session found"
   
   // Query Execution:
   "🔧 QUERY BREAKDOWN:"
   "📊 Building query object..."
   "🚀 Starting query execution..."
   "⏰ Query start time: [timestamp]"
   "🏃‍♂️ Executing query with race condition..."
   "✅ Query race completed"  // ← If stuck, this won't appear
   "⏰ Query end time: [timestamp]"
   ```

5. **Identify Hanging Point**
   - **If stuck after "🏃‍♂️ Executing query with race condition..."**: Database query is hanging
   - **If stuck after "📡 About to call supabase.auth.getSession()..."**: Auth system is hanging
   - **If stuck after "🌐 NETWORK HEALTH CHECK: Starting..."**: Network connectivity issues

6. **Network Health Monitoring**
   Check for these logs:
   ```javascript
   "🌐 Basic connectivity test: {success: true/false}"
   "🌐 Supabase connectivity test: {success: true/false}"
   ```

### Troubleshooting by Hang Point

#### If Hanging at Query Execution ✅ **FIXED**
- **Symptoms**: Logs show "🏃‍♂️ Executing query..." but no "✅ Query race completed"
- **Root Cause Found**: Inefficient RLS policies on `user_profiles` table
- **Solution Applied**: Optimized RLS policies (see migration: `optimize_user_profiles_rls_policies`)
- **Performance Issues Fixed**:
  - ❌ **Before**: `auth.uid()` re-evaluated per row → ✅ **After**: `(select auth.uid())` cached
  - ❌ **Before**: Multiple overlapping policies → ✅ **After**: Consolidated efficient policies
  - ❌ **Before**: 5+ second query timeouts → ✅ **After**: Instant query execution

#### If Hanging at Session Fetch  
- **Symptoms**: Logs show "📡 About to call supabase.auth.getSession()..." but no completion
- **Likely Cause**: Supabase Auth service issue or browser storage corruption
- **Solutions**:
  - Clear browser storage (localStorage/sessionStorage)
  - Check Supabase Auth service status
  - Try incognito mode

#### If Network Health Check Fails
- **Symptoms**: "🌐 Basic connectivity test failed" or "🌐 Supabase connectivity test failed"
- **Likely Cause**: Network connectivity or Supabase service outage
- **Solutions**:
  - Check internet connection
  - Visit status.supabase.com
  - Try different network (mobile hotspot)

### RLS Policy Performance Optimization

#### How to Check for RLS Issues
```sql
-- Run in Supabase SQL Editor to check RLS policies
SELECT 
  policyname, cmd, roles, qual
FROM pg_policies 
WHERE tablename = 'user_profiles' 
ORDER BY cmd, policyname;
```

#### Signs of RLS Performance Problems
- [ ] Queries timeout on tables with RLS enabled
- [ ] Performance Advisor shows "auth_rls_initplan" warnings
- [ ] Performance Advisor shows "multiple_permissive_policies" warnings
- [ ] Queries work fine when RLS is disabled

#### RLS Optimization Best Practices
- ✅ Use `(select auth.uid())` instead of `auth.uid()` for caching
- ✅ Consolidate multiple policies into single efficient policies
- ✅ Use specific roles instead of `public` when possible
- ✅ Keep policy logic simple and indexed

### Security Configuration Checklist

#### Database Function Security ✅ **FIXED**
- ✅ Applied `SET search_path = public` to all functions
- ✅ Migration: `fix_function_search_path_security` completed
- ✅ Functions secured: `debug_auth_context`, `handle_new_user`, `update_updated_at_column`, `get_user_role`, `user_has_role_level`, `generate_random_slug`, `set_user_profile_slug`

#### Auth Configuration Security (Manual Steps Required)

**To fix in Supabase Dashboard → Authentication → Settings:**

1. **OTP Expiry Configuration** ⚠️ **NEEDS MANUAL FIX**
   - Current: > 1 hour (too long)
   - Recommended: ≤ 1 hour (3600 seconds)
   - Location: Dashboard → Auth → Settings → Auth → "Email OTP expiry"
   - Set to: `3600` (1 hour) or `1800` (30 minutes)

2. **Leaked Password Protection** ⚠️ **NEEDS MANUAL FIX**
   - Current: Disabled
   - Recommended: Enabled
   - Location: Dashboard → Auth → Settings → Auth → "Leaked password protection"
   - Action: Toggle ON to enable HaveIBeenPwned integration

#### Additional Security Recommendations

3. **Password Requirements** (Optional but Recommended)
   - Location: Dashboard → Auth → Settings → Auth
   - Consider enabling:
     - Minimum password length: 8+ characters
     - Require special characters
     - Require uppercase/lowercase mix

4. **Session Security**
   - JWT expiry: Keep default (1 hour)
   - Refresh token expiry: Keep default (24 hours)
   - Consider enabling session timeout for sensitive operations

#### Manual Dashboard Steps Summary
```
1. Go to Supabase Dashboard → Your Project → Authentication → Settings
2. Scroll to "Auth" section
3. Set "Email OTP expiry" to 3600 (1 hour)
4. Enable "Leaked password protection"
5. Save changes
```

After completing these steps, run Performance Advisor again to confirm all security warnings are resolved.

### Quick Fixes
- [ ] **Hard Refresh**: Cmd+Shift+R (clears cache)
- [ ] **Clear Storage**: DevTools → Application → Clear Storage
- [ ] **Check Supabase Status**: Visit status.supabase.com
- [ ] **Restart Dev Server**: Stop and restart `npm run dev`

### New Safety Features (v2024.1)
- [ ] **15-second timeout**: Page will auto-exit loading after 15s
- [ ] **8-second network timeout**: Supabase requests timeout automatically
- [ ] **Session validation**: Expired sessions are auto-refreshed
- [ ] **Debug info**: Loading screen shows component state in dev mode

### Manual Recovery
If still stuck, force a clean state:
```javascript
// Run in browser console:
supabase.auth.signOut().then(() => {
  localStorage.clear()
  window.location.reload()
})
```

## Development Environment Tests

### Production Build Locally
```bash
npm run build
npm run start
# Test at http://localhost:3000
```

### Network Throttling
- [ ] Chrome DevTools → Network → Slow 3G
- [ ] Test loading states
- [ ] Check for race conditions

## Console Debugging Commands

### Check Hydration State
```javascript
// Run in browser console
console.log('Window exists:', typeof window !== 'undefined')
console.log('Document exists:', typeof document !== 'undefined')
console.log('User agent:', navigator.userAgent)
```

### Test Browser APIs
```javascript
// Test window.location access
try {
  console.log('Origin:', window.location.origin)
} catch (e) {
  console.error('window.location failed:', e)
}

// Test document.getElementById
try {
  console.log('getElementById works:', !!document.getElementById)
} catch (e) {
  console.error('document.getElementById failed:', e)
}
```

## Known Issues to Watch For

- [ ] "Loading..." stuck indefinitely ✅ **FIXED with timeouts**
- [ ] Console errors about hydration mismatch
- [ ] JavaScript errors in console
- [ ] Network requests failing ✅ **FIXED with 8s timeout**
- [ ] 3D scene not rendering

## Quick Fixes to Test

### If stuck on "Loading..."
1. Check browser console for errors
2. Try refreshing without cache (Cmd+Shift+R) ✅ **Should be less needed now**
3. Check Network tab for failed requests
4. **NEW**: Wait 15 seconds for auto-recovery

### If hydration errors
1. Look for SSR/client mismatches in console
2. Check if window/document access is properly guarded
3. Verify mount state is working

### If 3D scene issues
1. Check WebGL support: `console.log(!!window.WebGLRenderingContext)`
2. Check Three.js console errors
3. Test with hardware acceleration enabled/disabled 