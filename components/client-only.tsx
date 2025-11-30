"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ClientOnlyProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Component that only renders its children on the client side.
 * This prevents hydration mismatches and SSR issues with client-only components.
 */
export function ClientOnly({ children, fallback }: ClientOnlyProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      fallback || (
        <Button
          variant="outline"
          className="bg-gray-500/20 border-gray-500/50 text-gray-400 w-full"
          disabled
        >
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Loading...
        </Button>
      )
    )
  }

  return <>{children}</>
}