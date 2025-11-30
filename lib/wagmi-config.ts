import { http, createConfig } from "wagmi"
import { baseSepolia } from "wagmi/chains"
import { injected, coinbaseWallet, walletConnect } from "wagmi/connectors"

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_WALLETCONNECT_PROJECT_ID"

export { baseSepolia }

export const BASE_SEPOLIA_CHAIN_ID = 84532

export const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected(),
    coinbaseWallet({
      appName: "Block Placer",
    }),
    walletConnect({ projectId }),
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
