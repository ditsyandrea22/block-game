// Environment-specific configurations for better extension support
export const isDevelopment = process.env.NODE_ENV === 'development'
export const isExtension = typeof window !== 'undefined' && (
  window.location.protocol === 'chrome-extension:' || 
  window.location.protocol === 'moz-extension:'
)
export const isGitHubCodespaces = typeof window !== 'undefined' && 
  window.location.hostname.includes('github.dev')

// Development URLs
export const DEV_URLS = [
  'http://localhost:3000',
  'https://*.app.github.dev',
  'https://*.github.dev',
  'https://*.codespaces.githubusercontent.com',
]

// Extension patterns that should be allowed
export const EXTENSION_PATTERNS = [
  'chrome-extension://*',
  'moz-extension://*',
  'ms-browser-extension://*',
]

// Wallet configuration for different environments
export const getWalletConfig = () => {
  const config = {
    appName: "Block Placer",
    appDescription: "A grid-based block placement game with on-chain interactions on Base Sepolia",
    appUrl: typeof window !== 'undefined' ? window.location.origin : 'https://block-placer.vercel.app',
    icons: [`${typeof window !== 'undefined' ? window.location.origin : 'https://block-placer.vercel.app'}/favicon.ico`],
  }

  // In development, use more permissive settings
  if (isDevelopment) {
    config.appUrl = '*'
  }

  return config
}

// Debug logging for extension environments
export const debugExtensionEnvironment = () => {
  if (isExtension) {
    console.log('Extension Environment Detected:')
    console.log('- Protocol:', window.location.protocol)
    console.log('- Host:', window.location.hostname)
    console.log('- Path:', window.location.pathname)
    console.log('- User Agent:', navigator.userAgent)
  }
}