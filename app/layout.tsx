import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"
import { WalletProvider } from "@/components/wallet-provider"
import "@/lib/global-polyfills"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Block Placer - On-Chain Game",
  description: "A grid-based block placement game with on-chain interactions on Base Sepolia",
    generator: 'block-base.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletProvider>
          <Providers>{children}</Providers>
        </WalletProvider>
      </body>
    </html>
  )
}
