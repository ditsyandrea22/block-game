import { http, createConfig } from "wagmi"
import { baseSepolia } from "wagmi/chains"
import { injected, coinbaseWallet, walletConnect } from "wagmi/connectors"
import "./global-polyfills"

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "34548f090395c08d157465907480cc5d"

export { baseSepolia }

export const BASE_SEPOLIA_CHAIN_ID = 84532

// Allow connections from GitHub Codespaces and Chrome extensions
const allowedOrigins = [
  'http://localhost:3000',
  'https://*.app.github.dev',
  'https://*.github.dev',
  'chrome-extension://*',
  'moz-extension://*',
  'https://vigilant-space-eureka-544pj9pgpqx3p75x-3000.app.github.dev', // Current domain
]

export const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected(),
    coinbaseWallet({
      appName: "Block Placer",
      appLogoUrl: '/favicon.ico',
    }),
    walletConnect({
      projectId,
      metadata: {
        name: "Block Placer - On-Chain Game",
        description: "A grid-based block placement game with on-chain interactions on Base Sepolia",
        url: typeof window !== 'undefined' ? window.location.origin : 'https://block-placer.vercel.app',
        icons: [`${typeof window !== 'undefined' ? window.location.origin : 'https://block-placer.vercel.app'}/favicon.ico`],
      },
      showQrModal: true,
    }),
  ],
  transports: {
    [baseSepolia.id]: http("https://base-sepolia-rpc.publicnode.com", {
      fetchOptions: {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    }),
  },
})

declare module "wagmi" {
  interface Register {
    config: typeof config
  }
}
