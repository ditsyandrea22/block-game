import { createWalletClient, createPublicClient, http, parseEther, formatEther } from "viem"
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts"
import { baseSepolia } from "viem/chains"

const STORAGE_PREFIX = "block_placer_burner_wallet_"
const LEADERBOARD_KEY = "block_placer_leaderboard"
const BASE_SEPOLIA_RPC = "https://sepolia.base.org"

export type GameAction = "place_block" | "clear_line" | "new_game" | "game_over"

// Fee in ETH for each action
const ACTION_FEES: Record<GameAction, string> = {
  place_block: "0.0001",
  clear_line: "0.00005",
  new_game: "0.0002",
  game_over: "0.00005",
}

// Game logging address (can be any address, using dead address for demo)
const GAME_LOG_ADDRESS = "0x000000000000000000000000000000000000dEaD" as `0x${string}`

interface BurnerWalletData {
  privateKey: `0x${string}`
  address: `0x${string}`
  mainWallet: `0x${string}`
}

export interface LeaderboardEntry {
  mainWallet: `0x${string}`
  burnerWallet: `0x${string}`
  score: number
  level: number
  blocksPlaced: number
  transactions: number
  gasSpent: string
  timestamp: number
}

function getStorageKey(mainWallet: `0x${string}`): string {
  return `${STORAGE_PREFIX}${mainWallet.toLowerCase()}`
}

export function getBurnerWallet(mainWallet: `0x${string}`): BurnerWalletData | null {
  if (typeof window === "undefined") return null

  const stored = localStorage.getItem(getStorageKey(mainWallet))
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      return null
    }
  }
  return null
}

export function createBurnerWallet(mainWallet: `0x${string}`): BurnerWalletData {
  const privateKey = generatePrivateKey()
  const account = privateKeyToAccount(privateKey)

  const walletData: BurnerWalletData = {
    privateKey,
    address: account.address,
    mainWallet,
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(getStorageKey(mainWallet), JSON.stringify(walletData))
  }

  return walletData
}

export function clearBurnerWallet(mainWallet: `0x${string}`): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(getStorageKey(mainWallet))
  }
}

// Get burner wallet balance
export async function getBurnerBalance(address: `0x${string}`): Promise<string> {
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(BASE_SEPOLIA_RPC),
  })

  const balance = await publicClient.getBalance({ address })
  return formatEther(balance)
}

// Send automatic transaction from burner wallet
export async function sendGameTransaction(
  privateKey: `0x${string}`,
  action: GameAction,
  data: Record<string, unknown>,
): Promise<`0x${string}` | null> {
  try {
    const account = privateKeyToAccount(privateKey)

    const walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(BASE_SEPOLIA_RPC),
    })

    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(BASE_SEPOLIA_RPC),
    })

    // Encode game data
    const gameData = JSON.stringify({
      action,
      timestamp: Date.now(),
      player: account.address,
      ...data,
    })

    const fee = ACTION_FEES[action]

    // Get gas estimate
    const gasPrice = await publicClient.getGasPrice()

    // Send transaction automatically (no popup needed)
    const hash = await walletClient.sendTransaction({
      to: GAME_LOG_ADDRESS,
      value: parseEther(fee),
      data: `0x${Buffer.from(gameData).toString("hex")}` as `0x${string}`,
      gasPrice,
    })

    return hash
  } catch (error) {
    console.error("[BurnerWallet] Transaction failed:", error)
    return null
  }
}

// Check if burner wallet has enough balance
export async function hasEnoughBalance(address: `0x${string}`, action: GameAction): Promise<boolean> {
  const balance = await getBurnerBalance(address)
  const fee = Number.parseFloat(ACTION_FEES[action])
  const gasBuffer = 0.0005 // Buffer for gas fees

  return Number.parseFloat(balance) >= fee + gasBuffer
}

export function getLeaderboard(): LeaderboardEntry[] {
  if (typeof window === "undefined") return []

  const stored = localStorage.getItem(LEADERBOARD_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      return []
    }
  }
  return []
}

export function saveToLeaderboard(entry: LeaderboardEntry): void {
  if (typeof window === "undefined") return

  const leaderboard = getLeaderboard()

  // Check if this wallet already has an entry
  const existingIndex = leaderboard.findIndex((e) => e.mainWallet.toLowerCase() === entry.mainWallet.toLowerCase())

  if (existingIndex !== -1) {
    // Update only if new score is higher
    if (entry.score > leaderboard[existingIndex].score) {
      leaderboard[existingIndex] = entry
    }
  } else {
    leaderboard.push(entry)
  }

  // Sort by score descending
  leaderboard.sort((a, b) => b.score - a.score)

  // Keep top 100
  const trimmed = leaderboard.slice(0, 100)

  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(trimmed))
}

export function getPlayerRank(mainWallet: `0x${string}`): number | null {
  const leaderboard = getLeaderboard()
  const index = leaderboard.findIndex((e) => e.mainWallet.toLowerCase() === mainWallet.toLowerCase())
  return index !== -1 ? index + 1 : null
}

export function getPlayerBestScore(mainWallet: `0x${string}`): LeaderboardEntry | null {
  const leaderboard = getLeaderboard()
  return leaderboard.find((e) => e.mainWallet.toLowerCase() === mainWallet.toLowerCase()) || null
}
