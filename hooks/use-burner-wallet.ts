"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
  const [lastBalanceRefresh, setLastBalanceRefresh] = useState<number>(0)
  
  // Use ref to avoid stale closure issues
  const addressRef = useRef<`0x${string}` | null>(null)
  
  useEffect(() => {
    addressRef.current = state.address
  }, [state.address])

  useEffect(() => {
    console.log(`[BurnerWallet] === WALLET EFFECT ===`)
    console.log(`[BurnerWallet] Main wallet:`, mainWallet)
    
    if (!mainWallet) {
      console.log(`[BurnerWallet] No main wallet, resetting state`)
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

    console.log(`[BurnerWallet] Main wallet connected, checking for burner wallet`)
    const wallet = getBurnerWallet(mainWallet)
    console.log(`[BurnerWallet] Found burner wallet:`, wallet)
    
    if (wallet) {
      console.log(`[BurnerWallet] Setting up existing burner wallet`)
      setPrivateKey(wallet.privateKey)
      setState((prev) => { 
        const newState = { ...prev, address: wallet.address }
        console.log(`[BurnerWallet] Updated state with address:`, newState)
        return newState 
      })
      console.log(`[BurnerWallet] Refreshing balance for:`, wallet.address)
      refreshBalance(wallet.address).catch(error => {
        console.warn(`[BurnerWallet] Initial balance refresh failed:`, error)
      })
    } else {
      console.log(`[BurnerWallet] No burner wallet found, waiting for creation`)
      setState((prev) => ({ ...prev, isLoading: false }))
    }
  }, [mainWallet])

  // Refresh balance with comprehensive debug logging
  const refreshBalance = useCallback(async (address: `0x${string}`) => {
    console.log(`[BurnerWallet] === REFRESH BALANCE START ===`)
    console.log(`[BurnerWallet] Address: ${address}`)
    
    try {
      const balance = await getBurnerBalance(address)
      const balanceNum = Number.parseFloat(balance)
      const threshold = 0.002 // Reduced even further for testing
      const isReady = balanceNum > threshold
      
      console.log(`[BurnerWallet] === BALANCE RESULTS ===`)
      console.log(`[BurnerWallet] Raw balance: ${balance}`)
      console.log(`[BurnerWallet] Parsed balance: ${balanceNum}`)
      console.log(`[BurnerWallet] Threshold: ${threshold}`)
      console.log(`[BurnerWallet] Is Ready: ${isReady}`)
      console.log(`[BurnerWallet] Comparison: ${balanceNum} > ${threshold} = ${balanceNum > threshold}`)
      
      const newState = {
        balance,
        isReady,
        isLoading: false,
      }
      
      console.log(`[BurnerWallet] Setting state:`, newState)
      
      setState((prev) => {
        const updated = { ...prev, ...newState }
        console.log(`[BurnerWallet] State updated from:`, prev, "to:", updated)
        return updated
      })
      
      setLastError(null) // Clear any previous balance errors
      setLastBalanceRefresh(Date.now()) // Track when balance was last refreshed
      console.log(`[BurnerWallet] === REFRESH BALANCE SUCCESS ===`)
      
      return balance // Return the new balance for immediate use
    } catch (error) {
      console.error(`[BurnerWallet] === REFRESH BALANCE ERROR ===`)
      console.error(`[BurnerWallet] Failed to get balance:`, error)
      setState((prev) => ({ 
        ...prev, 
        isLoading: false,
        isReady: false, // Ensure isReady is false on error
      }))
      setLastError(`Failed to get balance: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }, [])

  // Helper function to refresh balance after successful transactions
  const refreshBalanceAfterTx = useCallback(async (address: `0x${string}`) => {
    console.log(`[BurnerWallet] Refreshing balance after transaction for:`, address)
    
    // Immediate refresh attempt
    try {
      await refreshBalance(address)
    } catch (error) {
      console.warn(`[BurnerWallet] Immediate balance refresh failed:`, error)
      
      // Retry after 2 seconds with multiple attempts
      let retries = 3
      while (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        try {
          await refreshBalance(address)
          console.log(`[BurnerWallet] Balance refresh successful on retry`)
          break
        } catch (retryError) {
          console.warn(`[BurnerWallet] Balance refresh retry ${4 - retries} failed:`, retryError)
          retries--
        }
      }
    }
  }, [refreshBalance])

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

          // Refresh balance after successful tx - immediate + delayed refresh
          console.log(`[BurnerWallet] Scheduling balance refresh after successful tx`)
          
          // Use the current address from ref to avoid stale closure
          const currentAddress = addressRef.current
          if (currentAddress) {
            // Immediate refresh
            refreshBalanceAfterTx(currentAddress)
            
            // Additional refreshes to ensure balance is updated
            setTimeout(() => {
              refreshBalanceAfterTx(currentAddress)
            }, 5000)
            
            setTimeout(() => {
              refreshBalanceAfterTx(currentAddress)
            }, 10000)
          }
          
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
  }, [privateKey, state.address, refreshBalance, refreshBalanceAfterTx, isProcessingQueue, transactionQueue])

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

          // Refresh balance after successful tx - immediate + delayed refresh
          console.log(`[BurnerWallet] Scheduling balance refresh after successful tx`)
          
          // Use the current address from ref to avoid stale closure
          const currentAddress = addressRef.current
          if (currentAddress) {
            // Immediate refresh
            refreshBalanceAfterTx(currentAddress)
            
            // Additional refreshes to ensure balance is updated
            setTimeout(() => {
              refreshBalanceAfterTx(currentAddress)
            }, 5000)
            
            setTimeout(() => {
              refreshBalanceAfterTx(currentAddress)
            }, 10000)
          }
          
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
    [privateKey, state.address, refreshBalance, refreshBalanceAfterTx, transactionStatus.status, isProcessingQueue],
  )

  // Automatic balance polling to detect external changes (like manual funding)
  useEffect(() => {
    if (!state.address) return

    const pollBalance = async () => {
      const now = Date.now()
      // Don't poll if we just refreshed recently (within 25 seconds)
      if (now - lastBalanceRefresh < 25000) return

      try {
        console.log("[BurnerWallet] Auto-polling balance for updates...")
        await refreshBalance(state.address)
        setLastBalanceRefresh(now)
      } catch (error) {
        // Silently fail auto-polling to avoid spam
        console.warn("[BurnerWallet] Auto-balance polling failed:", error)
      }
    }

    // Initial poll
    pollBalance()

    // Set up periodic polling every 30 seconds
    const interval = setInterval(pollBalance, 30000)

    return () => clearInterval(interval)
  }, [state.address, refreshBalance, lastBalanceRefresh])

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
