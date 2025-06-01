// Debug utilities for local development
export const debugLog = (component: string, message: string, data?: unknown) => {
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toISOString()
    console.log(`🐛 [${timestamp}] ${component}: ${message}`, data || '')
  }
}

export const debugHydration = (componentName: string) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`💧 Hydration check - ${componentName}:`, {
      isClient: typeof window !== 'undefined',
      hasDocument: typeof document !== 'undefined',
      hasNavigator: typeof navigator !== 'undefined',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'
    })
  }
}

export const debugBrowserAPIs = () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('🌐 Browser APIs availability:', {
      window: typeof window !== 'undefined',
      document: typeof document !== 'undefined',
      localStorage: typeof localStorage !== 'undefined',
      location: typeof window !== 'undefined' && window.location ? 'available' : 'unavailable'
    })
  }
}

export const debugMountState = (componentName: string, mounted: boolean) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔧 ${componentName} mount state:`, {
      mounted,
      canAccessDOM: mounted && typeof document !== 'undefined'
    })
  }
} 