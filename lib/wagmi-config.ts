import { http, createConfig } from "wagmi"
import { baseSepolia } from "wagmi/chains"
import { injected, coinbaseWallet, walletConnect } from "wagmi/connectors"

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
]

export const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected({
      target: {
        id: 'injected',
        name: 'Injected',
        provider: (window) => window,
      },
    }),
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
      mobileLinks: ['metamask', 'trust', 'rainbow', 'imtoken', 'brave', 'coinbase'],
      desktopLinks: ['metamask', 'rainbow', 'trust', 'zerion', 'imtoken'],
      // Allow connections from extensions and development environments
      relayUrl: 'wss://relay.walletconnect.com',
    }),
  ],
  transports: {
    [baseSepolia.id]: http("https://sepolia.base.org"),
  },
  ssr: true,
})

declare module "wagmi" {
  interface Register {
    config: typeof config
  }
}
