/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' chrome-extension:",
              "style-src 'self' 'unsafe-inline' chrome-extension:",
              "img-src 'self' data: blob: chrome-extension: https:",
              "font-src 'self' data: chrome-extension:",
              "connect-src 'self' https: wss: chrome-extension:",
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; ')
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ]
  },
  webpack: (config) => {
    // Handle Node.js polyfills for client-side code
    config.resolve.fallback = {
      ...config.resolve.fallback,
      crypto: false,
      stream: false,
      buffer: false,
      process: false,
      path: false,
      os: false,
      querystring: false,
      url: false,
      'react-native': false,
    }
    
    return config
  },
}

export default nextConfig
