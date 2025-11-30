"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { WagmiProvider } from "wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { config } from "@/lib/wagmi-config"

interface WalletProviderContextType {
  isReady: boolean
  hasError: boolean
  error?: string
}

const WalletProviderContext = createContext<WalletProviderContextType>({
  isReady: false,
  hasError: false,
})

export const useWalletProvider = () => {
  const context = useContext(WalletProviderContext)
  if (!context) {
    throw new Error("useWalletProvider must be used within a WalletProvider")
  }
  return context
}

interface WalletProviderProps {
  children: React.ReactNode
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [queryClient] = useState(() => new QueryClient())
  const [isReady, setIsReady] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    try {
      // Ensure we're in a browser environment
      if (typeof window === 'undefined') {
        setHasError(true)
        setError('Wallet functionality is only available in browser environments')
        return
      }

      // Check if required browser APIs are available
      if (typeof window.indexedDB === 'undefined' && typeof window.localStorage === 'undefined') {
        console.warn('Neither indexedDB nor localStorage is available')
      }

      // Mark as ready
      setIsReady(true)
      setHasError(false)
    } catch (err) {
      console.error('Wallet provider initialization error:', err)
      setHasError(true)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    }
  }, [])

  const contextValue: WalletProviderContextType = {
    isReady,
    hasError,
    error,
  }

  if (hasError) {
    return (
      <WalletProviderContext.Provider value={contextValue}>
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">Wallet Unavailable</h2>
            <p className="text-gray-400">{error || 'Unable to initialize wallet functionality'}</p>
          </div>
        </div>
      </WalletProviderContext.Provider>
    )
  }

  if (!isReady) {
    return (
      <WalletProviderContext.Provider value={contextValue}>
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4 mx-auto"></div>
            <p className="text-gray-400">Initializing wallet...</p>
          </div>
        </div>
      </WalletProviderContext.Provider>
    )
  }

  return (
    <WalletProviderContext.Provider value={contextValue}>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    </WalletProviderContext.Provider>
  )
}