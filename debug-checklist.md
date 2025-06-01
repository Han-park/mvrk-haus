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

- [ ] "Loading..." stuck indefinitely
- [ ] Console errors about hydration mismatch
- [ ] JavaScript errors in console
- [ ] Network requests failing
- [ ] 3D scene not rendering

## Quick Fixes to Test

### If stuck on "Loading..."
1. Check browser console for errors
2. Try refreshing without cache (Cmd+Shift+R)
3. Check Network tab for failed requests

### If hydration errors
1. Look for SSR/client mismatches in console
2. Check if window/document access is properly guarded
3. Verify mount state is working

### If 3D scene issues
1. Check WebGL support: `console.log(!!window.WebGLRenderingContext)`
2. Check Three.js console errors
3. Test with hardware acceleration enabled/disabled 