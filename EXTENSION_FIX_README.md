# Chrome Extension Origin Mismatch Fix

## Problem
When running Next.js applications in GitHub Codespaces, Chrome extensions often encounter "origins don't match" errors due to strict Content Security Policy (CSP) and CORS restrictions.

## Solution Overview
This fix addresses the origin mismatch error by implementing multiple layers of configuration:

### 1. Enhanced Next.js Configuration (`next.config.mjs`)
- Added comprehensive Content Security Policy headers
- Configured CSP to allow Chrome extensions and development environments
- Added security headers for better protection

### 2. Improved Wagmi Configuration (`lib/wagmi-config.ts`)
- Enhanced WalletConnect configuration for extension environments
- Added proper metadata for extension compatibility
- Configured relay URLs and mobile/desktop links

### 3. CORS Middleware (`middleware.ts`)
- Handles preflight requests properly
- Allows connections from Chrome extensions
- Provides dynamic origin validation

### 4. Enhanced Wallet Component (`components/wallet-connect.tsx`)
- Added extension environment detection
- Improved error handling for origin mismatches
- Implemented retry logic for failed connections

### 5. Environment Detection (`lib/environment.ts`)
- Utility functions to detect extension environments
- Development-specific configurations
- Debug logging for troubleshooting

## Key Changes Made

### Content Security Policy
```javascript
// Allows Chrome extensions and development environments
"script-src 'self' 'unsafe-eval' 'unsafe-inline' chrome-extension:"
"style-src 'self' 'unsafe-inline' chrome-extension:"
"connect-src 'self' https: wss: chrome-extension:"
```

### CORS Headers
- `Access-Control-Allow-Origin`: Dynamic based on environment
- `Access-Control-Allow-Credentials`: Enabled for extensions
- `Access-Control-Allow-Methods`: Standard REST methods
- `Access-Control-Allow-Headers`: Common headers for Web3

### WalletConnect Enhancement
- Added proper app metadata
- Configured for extension environments
- Added retry logic for connection failures

## How It Works

1. **Environment Detection**: The app detects if it's running in a Chrome extension environment
2. **CSP Configuration**: Headers are set to allow extension communication
3. **CORS Handling**: Middleware processes requests and allows extension origins
4. **Wallet Connection**: Enhanced error handling with retry logic
5. **Debug Logging**: Detailed logging helps troubleshoot issues

## Development Usage

The application will now:
- ✅ Work properly in GitHub Codespaces
- ✅ Accept connections from Chrome extensions
- ✅ Provide better error messages for connection issues
- ✅ Automatically retry failed connections
- ✅ Log debugging information for troubleshooting

## Testing
1. Start the development server: `npm run dev`
2. Open the app in a Chrome extension environment
3. Try connecting a wallet - the error should no longer occur
4. Check console logs for extension environment detection

## Security Notes
- The CSP is configured specifically for extension environments
- Production builds should use more restrictive CSP rules
- Consider using environment-specific configurations for production deployment

## Troubleshooting
If issues persist:
1. Check browser console for detailed error logs
2. Verify the extension ID in middleware.ts matches your extension
3. Ensure the app is served over HTTPS in production
4. Review network tab for CORS preflight requests