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