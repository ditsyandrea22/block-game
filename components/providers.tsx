"use client"

import type React from "react"
import { WagmiProvider } from "wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { config } from "@/lib/wagmi-config"
import { useState, useEffect } from "react"
import { debugExtensionEnvironment } from "@/lib/environment"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  useEffect(() => {
    // Initialize environment debugging
    debugExtensionEnvironment()
  }, [])

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}
