import { createWalletClient, createPublicClient, http, parseEther, formatEther } from "viem"
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts"
import { baseSepolia } from "viem/chains"
import { safeGetItem, safeSetItem, safeRemoveItem, safeGetJSON, safeSetJSON } from "./safe-storage"

const STORAGE_PREFIX = "block_placer_burner_wallet_"
const LEADERBOARD_KEY = "block_placer_leaderboard"
const BASE_SEPOLIA_RPC = "https://base-sepolia.publicnode.com"
const FALLBACK_RPCS = [
  "https://base-sepolia.publicnode.com",
  "https://sepolia.base.org",
  "https://base-sepolia.drpc.org",
]
const MAX_RETRIES = 3
const RETRY_DELAY = 2000 // 2 seconds

export type GameAction = "place_block" | "clear_line" | "new_game" | "game_over"

// Fee in ETH for each action (enhanced with better gas estimation)
const ACTION_FEES: Record<GameAction, string> = {
  place_block: "0.000008", // ~$0.015 (increased for better success rate)
  clear_line: "0.000004",  // ~$0.008
  new_game: "0.000015",    // ~$0.03
  game_over: "0.000002",   // ~$0.004
}

// Game logging address (can be any address, using dead address for demo)
const GAME_LOG_ADDRESS = "0x396a817c3E18DA8F00AB028b8E4924Aa3Ae54Bdd" as `0x${string}`

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

export interface TransactionResult {
  success: boolean
  hash?: `0x${string}`
  error?: string
  gasUsed?: string
  effectiveGasPrice?: string
}

function getStorageKey(mainWallet: `0x${string}`): string {
  return `${STORAGE_PREFIX}${mainWallet.toLowerCase()}`
}

export function getBurnerWallet(mainWallet: `0x${string}`): BurnerWalletData | null {
  const stored = safeGetItem(getStorageKey(mainWallet))
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

  safeSetItem(getStorageKey(mainWallet), JSON.stringify(walletData))

  return walletData
}

export function clearBurnerWallet(mainWallet: `0x${string}`): void {
  safeRemoveItem(getStorageKey(mainWallet))
}

// Get burner wallet balance with retry logic and fallback RPC endpoints
export async function getBurnerBalance(address: `0x${string}`): Promise<string> {
  const rpcEndpoints = [
    "https://base-sepolia.publicnode.com",
    "https://sepolia.base.org",
    "https://base-sepolia.drpc.org",
  ]

  let lastError: Error | null = null

  for (const rpcUrl of rpcEndpoints) {
    try {
      console.log(`[BurnerWallet] Trying RPC endpoint: ${rpcUrl}`)
      
      const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(rpcUrl, {
          fetchOptions: {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        }),
      })

      const balance = await publicClient.getBalance({ address })
      const formattedBalance = formatEther(balance)
      
      console.log(`[BurnerWallet] Balance retrieved successfully from ${rpcUrl}:`, formattedBalance)
      return formattedBalance
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.error(`[BurnerWallet] Failed to get balance from ${rpcUrl}:`, lastError.message)
      
      // For any error, immediately try the next endpoint without delay
      // This provides faster fallback behavior
      continue
    }
  }

  console.error("[BurnerWallet] All RPC endpoints failed. Last error:", lastError?.message)
  throw new Error(`Failed to get balance from all RPC endpoints. Last error: ${lastError?.message}`)
}

// Estimate gas for a transaction
async function estimateTransactionGas(
  walletClient: any,
  to: `0x${string}`,
  value: bigint,
  data: `0x${string}`,
): Promise<bigint> {
  try {
    // For simple transfers and data transactions, estimate based on complexity
    // Base transfer: 21000 gas
    // Data transactions: additional ~68000 gas per 32 bytes
    const baseGas = BigInt(21000)
    const dataGas = BigInt(Math.ceil(data.length / 2) * 68) // Rough estimate for data processing
    
    const estimated = baseGas + dataGas + BigInt(10000) // Safety buffer
    
    console.log(`[BurnerWallet] Gas estimate: ${estimated} (base: ${baseGas}, data: ${dataGas})`)
    return estimated
  } catch (error) {
    console.warn("[BurnerWallet] Gas estimation failed, using default:", error)
    return BigInt(100000) // Conservative default for data transactions
  }
}

// Wait for transaction confirmation with improved error handling
async function waitForTransactionConfirmation(
  publicClient: any,
  hash: `0x${string}`,
  timeoutMs = 45000, // Increased timeout to 45 seconds
): Promise<TransactionResult> {
  const startTime = Date.now()
  let attempts = 0
  const maxAttempts = Math.floor(timeoutMs / 1000)

  return new Promise((resolve) => {
    const checkTransaction = async () => {
      attempts++
      
      try {
        // Check if transaction exists first
        const tx = await publicClient.getTransaction({ hash })
        
        if (!tx) {
          console.log(`[BurnerWallet] Transaction not found yet, attempt ${attempts}/${maxAttempts}`)
          
          if (attempts >= maxAttempts) {
            resolve({
              success: false,
              hash,
              error: "Transaction not found after timeout",
            })
            return
          }
          
          setTimeout(checkTransaction, 1000)
          return
        }
        
        // If transaction is pending, wait and retry
        if (tx.blockNumber === null) {
          console.log(`[BurnerWallet] Transaction pending, attempt ${attempts}/${maxAttempts}`)
          
          if (attempts >= maxAttempts) {
            resolve({
              success: false,
              hash,
              error: "Transaction timeout - still pending",
            })
            return
          }
          
          setTimeout(checkTransaction, 2000) // Check less frequently for pending transactions
          return
        }
        
        // Transaction has been mined, get receipt
        const receipt = await publicClient.getTransactionReceipt({ hash })
        
        if (receipt) {
          const success = receipt.status === "success"
          console.log(`[BurnerWallet] Transaction ${success ? 'confirmed' : 'failed'}: ${hash}`)
          
          resolve({
            success,
            hash,
            gasUsed: receipt.gasUsed.toString(),
            effectiveGasPrice: receipt.effectiveGasPrice?.toString(),
            error: success ? undefined : "Transaction reverted or failed",
          })
          return
        } else {
          console.log(`[BurnerWallet] Receipt not available yet, attempt ${attempts}/${maxAttempts}`)
          
          if (attempts >= maxAttempts) {
            resolve({
              success: false,
              hash,
              error: "Receipt not available after timeout",
            })
            return
          }
          
          setTimeout(checkTransaction, 1000)
        }
      } catch (error) {
        console.error(`[BurnerWallet] Error checking transaction (attempt ${attempts}):`, error)
        
        if (attempts >= maxAttempts) {
          resolve({
            success: false,
            hash,
            error: `Transaction check failed: ${error instanceof Error ? error.message : String(error)}`,
          })
          return
        }
        
        setTimeout(checkTransaction, 2000)
      }
    }

    // Start checking immediately
    checkTransaction()
  })
}

// Send transaction with improved retry logic and validation
export async function sendGameTransaction(
  privateKey: `0x${string}`,
  action: GameAction,
  data: Record<string, unknown>,
): Promise<TransactionResult> {
  let lastError: string = ""

  // Pre-validate the private key
  try {
    const account = privateKeyToAccount(privateKey)
    if (!account.address) {
      return {
        success: false,
        error: "Invalid private key provided",
      }
    }
  } catch (error) {
    return {
      success: false,
      error: `Invalid private key: ${error instanceof Error ? error.message : String(error)}`,
    }
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const account = privateKeyToAccount(privateKey)

      // Try each RPC endpoint for this attempt
      const rpcEndpoints = [BASE_SEPOLIA_RPC, ...FALLBACK_RPCS]
      let lastRpcError = null

      for (const rpcUrl of rpcEndpoints) {
        try {
          console.log(`[BurnerWallet] Attempt ${attempt}: Trying RPC ${rpcUrl}`)

          // Check network connectivity before proceeding
          const testClient = createPublicClient({
            chain: baseSepolia,
            transport: http(rpcUrl),
          })
          await testClient.getBlockNumber()

          const walletClient = createWalletClient({
            account,
            chain: baseSepolia,
            transport: http(rpcUrl),
          })

          const publicClient = createPublicClient({
            chain: baseSepolia,
            transport: http(rpcUrl),
          })

          // Encode game data
          const gameData = JSON.stringify({
            action,
            timestamp: Date.now(),
            player: account.address,
            attempt,
            ...data,
          })

          const fee = ACTION_FEES[action]
          const value = parseEther(fee)
          const data_hex = `0x${Buffer.from(gameData).toString("hex")}` as `0x${string}`

          // Get current gas price with higher buffer for better success rate
          const gasPrice = await publicClient.getGasPrice()
          const gasPriceWithBuffer = BigInt(Math.floor(Number(gasPrice) * 1.5)) // 50% buffer
          
          // Use estimated gas with safety margin
          const estimatedGas = await estimateTransactionGas(walletClient, GAME_LOG_ADDRESS, value, data_hex)
          const gasLimit = estimatedGas * BigInt(120) / BigInt(100) // 20% safety margin

          console.log(`[BurnerWallet] Attempting ${action} transaction (attempt ${attempt})`)
          console.log(`[BurnerWallet] Gas: ${gasLimit}, GasPrice: ${gasPriceWithBuffer}, Fee: ${fee} ETH`)

          // Send transaction with timeout
          const transactionPromise = (walletClient.sendTransaction as any)({
            to: GAME_LOG_ADDRESS,
            value,
            data: data_hex,
            gas: gasLimit,
            gasPrice: gasPriceWithBuffer,
            maxPriorityFeePerGas: gasPriceWithBuffer / BigInt(2), // Add priority fee
            maxFeePerGas: gasPriceWithBuffer * BigInt(2), // EIP-1559 support
          })

          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("Transaction sending timeout")), 45000)
          })

          try {
            const hash = await Promise.race([transactionPromise, timeoutPromise])
            
            console.log(`[BurnerWallet] Transaction sent successfully: ${hash}`)
            console.log(`[BurnerWallet] View on BaseScan: https://sepolia.basescan.org/tx/${hash}`)

            // Wait for confirmation with longer timeout for network issues
            const result = await waitForTransactionConfirmation(publicClient, hash, 60000)

            if (result.success) {
              console.log(`[BurnerWallet] Transaction confirmed: ${hash}`)
              return result
            } else {
              console.warn(`[BurnerWallet] Transaction failed: ${result.error}`)
              lastError = result.error || "Unknown error"
              lastRpcError = null // Clear RPC error since we got a response
              break // Break RPC loop to retry with next attempt
            }
          } catch (raceError) {
            console.error(`[BurnerWallet] Transaction race failed:`, raceError)
            lastRpcError = raceError instanceof Error ? raceError : new Error(String(raceError))
            continue // Try next RPC endpoint
          }
        } catch (error) {
          lastRpcError = error instanceof Error ? error : new Error(String(error))
          console.error(`[BurnerWallet] RPC ${rpcUrl} failed:`, lastRpcError.message)
          continue // Try next RPC endpoint
        }
      }

      // If all RPCs failed, prepare for retry
      if (lastRpcError) {
        lastError = lastRpcError.message
        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAY * attempt
          console.log(`[BurnerWallet] All RPCs failed, retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        } else {
          break // Max retries reached
        }
      }

      // If we got here, it means we had a transaction error but RPC worked
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY * attempt
        console.log(`[BurnerWallet] Transaction failed, retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
      console.error(`[BurnerWallet] Transaction attempt ${attempt} failed:`, lastError)
      
      // Don't retry on certain types of errors
      if (lastError.includes("insufficient") || lastError.includes("rejected") || lastError.includes("denied")) {
        console.log("[BurnerWallet] Not retrying due to user rejection or insufficient funds")
        break
      }
      
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY * attempt
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  console.error(`[BurnerWallet] All ${MAX_RETRIES} attempts failed. Last error:`, lastError)
  return {
    success: false,
    error: `Transaction failed after ${MAX_RETRIES} attempts: ${lastError}`,
  }
}

// Enhanced balance checking with strict validation for on-chain only gameplay
export async function hasEnoughBalance(address: `0x${string}`, action: GameAction): Promise<{ sufficient: boolean; required: string; available: string; shortfall: string }> {
  let retries = 3
  let lastError: Error | null = null

  while (retries > 0) {
    try {
      // Get balance with fallback RPCs
      const balance = await getBurnerBalance(address)
      
      // Try to get gas price from fallback RPCs
      let gasPrice: any = null
      for (const rpcUrl of [BASE_SEPOLIA_RPC, ...FALLBACK_RPCS]) {
        try {
          const publicClient = createPublicClient({
            chain: baseSepolia,
            transport: http(rpcUrl),
          })
          gasPrice = await publicClient.getGasPrice()
          break
        } catch (error) {
          console.warn(`[BurnerWallet] Gas price fetch failed from ${rpcUrl}:`, error)
          continue
        }
      }

      const fee = parseFloat(ACTION_FEES[action])
      const currentBalance = Number.parseFloat(balance)
      
      // Enhanced gas estimation with more realistic values
      const baseGas = 21000
      const dataGas = 68000 // For transaction data processing
      const gasEstimate = baseGas + dataGas + 20000 // Total with safety margin
      const gasCost = gasPrice ? Number(formatEther(gasPrice)) * gasEstimate / 1e9 : 0.000015 // Convert from wei to ETH
      
      // Strict safety margins for Base Sepolia
      const safetyMargin = 0.000025 // 0.0025 ETH safety margin for Base Sepolia
      const networkCongestionBuffer = 0.000015 // Additional buffer for network congestion
      const totalRequired = fee + gasCost + safetyMargin + networkCongestionBuffer
      const shortfall = Math.max(0, totalRequired - currentBalance)

      console.log(`[BurnerWallet] Strict Balance Check:`, {
        currentBalance: currentBalance.toFixed(8),
        fee: fee.toFixed(8),
        gasCost: gasCost.toFixed(8),
        safetyMargin: safetyMargin.toFixed(8),
        totalRequired: totalRequired.toFixed(8),
        sufficient: currentBalance >= totalRequired,
        shortfall: shortfall.toFixed(8),
        action,
        address: address.slice(0, 8) + '...',
      })

      // Strict check - no tolerance for insufficient balance
      const hasEnough = currentBalance >= totalRequired

      if (!hasEnough) {
        console.warn(`[BurnerWallet] Insufficient balance for ${action}. Have: ${currentBalance.toFixed(6)} ETH, Need: ${totalRequired.toFixed(6)} ETH, Shortfall: ${shortfall.toFixed(6)} ETH`)
      }

      return {
        sufficient: hasEnough,
        required: totalRequired.toFixed(6),
        available: currentBalance.toFixed(6),
        shortfall: shortfall.toFixed(6),
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.error(`[BurnerWallet] Balance check failed (attempt ${4 - retries}):`, lastError.message)
      retries--
      
      if (retries > 0) {
        // Wait before retry with exponential backoff
        const delay = (4 - retries) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  console.error(`[BurnerWallet] All balance check attempts failed. Last error:`, lastError?.message)
  return {
    sufficient: false,
    required: ACTION_FEES[action],
    available: "0",
    shortfall: ACTION_FEES[action],
  }
}

export function getLeaderboard(): LeaderboardEntry[] {
  const stored = safeGetItem(LEADERBOARD_KEY)
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

  safeSetItem(LEADERBOARD_KEY, JSON.stringify(trimmed))
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

