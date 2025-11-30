import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Add CORS headers for development and extension environments
  const origin = request.headers.get('origin')
  const allowedOrigins = [
    'http://localhost:3000',
    'https://*.app.github.dev',
    'https://*.github.dev',
    'chrome-extension://mnkbccinkbalkmmnmbcicdobcmgggmfc', // Your specific extension
    'chrome-extension://*',
    'moz-extension://*',
  ]
  
  // Check if the origin is allowed
  const isAllowedOrigin = origin && allowedOrigins.some(allowed => {
    if (allowed === '*') return true
    if (allowed.includes('*')) {
      const pattern = allowed.replace('*.', '[^.]+\\.')
      return new RegExp(pattern).test(origin)
    }
    return origin === allowed
  })
  
  if (isAllowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  } else {
    // For development, allow all origins (remove in production)
    response.headers.set('Access-Control-Allow-Origin', '*')
  }
  
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization')
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers: response.headers })
  }
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}