"use client"

import { useState, useEffect, useCallback } from "react"
import { useAccount } from "wagmi"
import {
  getBurnerWallet,
  createBurnerWallet,
  clearBurnerWallet,
  getBurnerBalance,
  sendGameTransaction,
  hasEnoughBalance,
  type TransactionResult,
  type GameAction,
} from "@/lib/burner-wallet"

interface BurnerWalletState {
  address: `0x${string}` | null
  balance: string
  isReady: boolean
  isLoading: boolean
}

interface TransactionStatus {
  action: GameAction | null
  hash: `0x${string}` | null
  status: "idle" | "pending" | "success" | "failed" | "timeout"
  error?: string
  attempt: number
}

interface TransactionQueueItem {
  id: string
  action: GameAction
  data: Record<string, unknown>
  resolve: (success: boolean) => void
  reject: (error: string) => void
  attempt: number
}

export function useBurnerWallet() {
  const { address: mainWallet } = useAccount()

  const [state, setState] = useState<BurnerWalletState>({
    address: null,
    balance: "0",
    isReady: false,
    isLoading: true,
  })
  const [privateKey, setPrivateKey] = useState<`0x${string}` | null>(null)
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>({
    action: null,
    hash: null,
    status: "idle",
    attempt: 0,
  })
  const [totalTransactions, setTotalTransactions] = useState(0)
  const [totalGasSpent, setTotalGasSpent] = useState(0)
  const [lastError, setLastError] = useState<string | null>(null)
  const [transactionQueue, setTransactionQueue] = useState<TransactionQueueItem[]>([])
  const [isProcessingQueue, setIsProcessingQueue] = useState(false)

  useEffect(() => {
    if (!mainWallet) {
      // Reset state when wallet disconnects
      setPrivateKey(null)
      setState({
        address: null,
        balance: "0",
        isReady: false,
        isLoading: false,
      })
      setTransactionStatus({
        action: null,
        hash: null,
        status: "idle",
        attempt: 0,
      })
      setTotalTransactions(0)
      setTotalGasSpent(0)
      setLastError(null)
      return
    }

    const wallet = getBurnerWallet(mainWallet)
    if (wallet) {
      setPrivateKey(wallet.privateKey)
      setState((prev) => ({ ...prev, address: wallet.address }))
      refreshBalance(wallet.address)
    } else {
      setState((prev) => ({ ...prev, isLoading: false }))
    }
  }, [mainWallet])

  // Refresh balance with better error handling
  const refreshBalance = useCallback(async (address: `0x${string}`) => {
    try {
      const balance = await getBurnerBalance(address)
      const balanceNum = Number.parseFloat(balance)
      const isReady = balanceNum > 0.005
      
      console.log(`[BurnerWallet] Balance check: ${balance} ETH, isReady: ${isReady}`)
      
      setState((prev) => ({
        ...prev,
        balance,
        isReady,
        isLoading: false,
      }))
      setLastError(null) // Clear any previous balance errors
    } catch (error) {
      console.error("[BurnerWallet] Failed to get balance:", error)
      setState((prev) => ({ ...prev, isLoading: false }))
      setLastError(`Failed to get balance: ${error instanceof Error ? error.message : String(error)}`)
    }
  }, [])

  const initBurnerWallet = useCallback(() => {
    if (!mainWallet) return null

    const wallet = createBurnerWallet(mainWallet)
    setPrivateKey(wallet.privateKey)
    setState({
      address: wallet.address,
      balance: "0",
      isReady: false,
      isLoading: false,
    })
    return wallet.address
  }, [mainWallet])

  const resetBurnerWallet = useCallback(() => {
    if (!mainWallet) return

    clearBurnerWallet(mainWallet)
    setPrivateKey(null)
    setState({
      address: null,
      balance: "0",
      isReady: false,
      isLoading: false,
    })
    setTransactionStatus({
      action: null,
      hash: null,
      status: "idle",
      attempt: 0,
    })
    setTotalTransactions(0)
    setTotalGasSpent(0)
    setLastError(null)
  }, [mainWallet])

  // Process transaction queue sequentially
  const processQueue = useCallback(async () => {
    if (isProcessingQueue || transactionQueue.length === 0) return

    setIsProcessingQueue(true)
    const queue = [...transactionQueue]
    setTransactionQueue([])

    for (const item of queue) {
      try {
        console.log(`[BurnerWallet] Processing queued ${item.action} transaction...`)
        
        // Set transaction status for current item
        setTransactionStatus({
          action: item.action,
          hash: null,
          status: "pending",
          attempt: item.attempt,
        })

        // Execute the transaction
        const result = await sendGameTransaction(privateKey, item.action, item.data)

        if (result.success && result.hash) {
          setTransactionStatus({
            action: item.action,
            hash: result.hash,
            status: "success",
            attempt: item.attempt,
          })
          
          setTotalTransactions((prev) => prev + 1)
          
          // Calculate actual gas spent
          if (result.gasUsed && result.effectiveGasPrice) {
            const gasUsed = Number(result.gasUsed)
            const effectiveGasPrice = Number(result.effectiveGasPrice)
            const gasCostETH = (gasUsed * effectiveGasPrice) / 1e18
            setTotalGasSpent((prev) => prev + gasCostETH)
          } else {
            // Fallback to enhanced estimate
            const fees: Record<GameAction, number> = {
              place_block: 0.000008,
              clear_line: 0.000004,
              new_game: 0.000015,
              game_over: 0.000002,
            }
            setTotalGasSpent((prev) => prev + fees[item.action])
          }

          // Refresh balance after successful tx
          setTimeout(() => {
            console.log(`[BurnerWallet] Refreshing balance after successful tx`)
            refreshBalance(state.address!)
          }, 3000)
          
          item.resolve(true)
          console.log(`[BurnerWallet] Queued ${item.action} transaction successful:`, result.hash)
        } else {
          const error = result.error || "Unknown transaction error"
          setTransactionStatus({
            action: item.action,
            hash: result.hash || null,
            status: "failed",
            error,
            attempt: item.attempt,
          })
          item.resolve(false)
          console.error(`[BurnerWallet] Queued ${item.action} transaction failed:`, error)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        setTransactionStatus({
          action: item.action,
          hash: null,
          status: "failed",
          error: errorMsg,
          attempt: item.attempt,
        })
        item.reject(errorMsg)
        console.error(`[BurnerWallet] Queued ${item.action} transaction error:`, errorMsg)
      }

      // Small delay between transactions to prevent rate limiting
      if (queue.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    setIsProcessingQueue(false)
    setTransactionStatus({
      action: null,
      hash: null,
      status: "idle",
      attempt: 0,
    })
  }, [privateKey, state.address, refreshBalance, isProcessingQueue, transactionQueue])

  // Execute game action with proper queuing
  const executeGameAction = useCallback(
    async (action: GameAction, data: Record<string, unknown> = {}): Promise<boolean> => {
      if (!privateKey || !state.address) {
        const error = "Wallet not initialized"
        console.log("[BurnerWallet]", error)
        setLastError(error)
        return false
      }

      // If there's an ongoing transaction, queue this one
      if (transactionStatus.status === "pending" || isProcessingQueue) {
        console.log(`[BurnerWallet] Queueing ${action} transaction (waiting for current tx)`)
        return new Promise((resolve, reject) => {
          const queueItem: TransactionQueueItem = {
            id: `${Date.now()}-${Math.random()}`,
            action,
            data,
            resolve,
            reject,
            attempt: 1,
          }
          setTransactionQueue(prev => [...prev, queueItem])
        })
      }

      // Check balance before proceeding with strict validation
      try {
        const balanceCheck = await hasEnoughBalance(state.address, action)
        if (!balanceCheck.sufficient) {
          const error = `Insufficient balance for ${action}. Have: ${balanceCheck.available} ETH, Need: ${balanceCheck.required} ETH, Shortfall: ${balanceCheck.shortfall} ETH. Please fund your burner wallet to continue on-chain gameplay.`
          console.log("[BurnerWallet]", error)
          setLastError(error)
          return false
        }
      } catch (error) {
        const errorMsg = `Balance check failed: ${error instanceof Error ? error.message : String(error)}`
        console.error("[BurnerWallet]", errorMsg)
        setLastError(errorMsg)
        return false
      }

      setLastError(null)

      try {
        console.log(`[BurnerWallet] Starting ${action} transaction...`)
        
        const result = await sendGameTransaction(privateKey, action, data)

        // Update transaction status
        if (result.success && result.hash) {
          setTransactionStatus({
            action,
            hash: result.hash,
            status: "success",
            attempt: 1,
          })
          
          setTotalTransactions((prev) => prev + 1)
          
          // Calculate actual gas spent
          if (result.gasUsed && result.effectiveGasPrice) {
            const gasUsed = Number(result.gasUsed)
            const effectiveGasPrice = Number(result.effectiveGasPrice)
            const gasCostETH = (gasUsed * effectiveGasPrice) / 1e18
            setTotalGasSpent((prev) => prev + gasCostETH)
          } else {
            // Fallback to enhanced estimate
            const fees: Record<GameAction, number> = {
              place_block: 0.000008,
              clear_line: 0.000004,
              new_game: 0.000015,
              game_over: 0.000002,
            }
            setTotalGasSpent((prev) => prev + fees[action])
          }

          // Refresh balance after successful tx
          setTimeout(() => {
            console.log(`[BurnerWallet] Refreshing balance after successful tx`)
            refreshBalance(state.address!)
          }, 3000)
          
          console.log(`[BurnerWallet] ${action} transaction successful:`, result.hash)
          return true
        } else {
          const error = result.error || "Unknown transaction error"
          setTransactionStatus({
            action,
            hash: result.hash || null,
            status: "failed",
            error,
            attempt: 1,
          })
          setLastError(error)
          console.error(`[BurnerWallet] ${action} transaction failed:`, error)
          return false
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        setTransactionStatus({
          action,
          hash: null,
          status: "failed",
          error: errorMsg,
          attempt: 1,
        })
        setLastError(errorMsg)
        console.error(`[BurnerWallet] ${action} transaction error:`, errorMsg)
        return false
      }
    },
    [privateKey, state.address, refreshBalance, transactionStatus.status, isProcessingQueue],
  )

  // Process queue when status changes
  useEffect(() => {
    if (transactionStatus.status === "idle" && transactionQueue.length > 0 && !isProcessingQueue) {
      processQueue()
    }
  }, [transactionStatus.status, transactionQueue.length, isProcessingQueue, processQueue])

  // Manual refresh
  const refresh = useCallback(() => {
    if (state.address) {
      refreshBalance(state.address)
    }
  }, [state.address, refreshBalance])

  // Clear last error
  const clearError = useCallback(() => {
    setLastError(null)
  }, [])

  return {
    ...state,
    privateKey,
    mainWallet,
    initBurnerWallet,
    resetBurnerWallet,
    executeGameAction,
    refresh,
    transactionStatus,
    totalTransactions,
    totalGasSpent: totalGasSpent.toFixed(6),
    lastError,
    clearError,
    pendingTx: transactionStatus.status === "pending" ? transactionStatus.action : null,
    transactionQueueLength: transactionQueue.length,
    isProcessingQueue,
  }
}
