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
  type GameAction,
} from "@/lib/burner-wallet"

interface BurnerWalletState {
  address: `0x${string}` | null
  balance: string
  isReady: boolean
  isLoading: boolean
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
  const [pendingTx, setPendingTx] = useState<string | null>(null)
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | null>(null)
  const [totalTransactions, setTotalTransactions] = useState(0)
  const [totalGasSpent, setTotalGasSpent] = useState(0)

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

  // Refresh balance
  const refreshBalance = useCallback(async (address: `0x${string}`) => {
    try {
      const balance = await getBurnerBalance(address)
      setState((prev) => ({
        ...prev,
        balance,
        isReady: Number.parseFloat(balance) > 0.001,
        isLoading: false,
      }))
    } catch (error) {
      console.error("[BurnerWallet] Failed to get balance:", error)
      setState((prev) => ({ ...prev, isLoading: false }))
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
    setTotalTransactions(0)
    setTotalGasSpent(0)
  }, [mainWallet])

  // Execute game action
  const executeGameAction = useCallback(
    async (action: GameAction, data: Record<string, unknown> = {}): Promise<boolean> => {
      if (!privateKey || !state.address) {
        console.log("[BurnerWallet] Wallet not initialized")
        return false
      }

      // Check balance
      const hasBalance = await hasEnoughBalance(state.address, action)
      if (!hasBalance) {
        console.log("[BurnerWallet] Insufficient balance")
        return false
      }

      setPendingTx(action)

      const hash = await sendGameTransaction(privateKey, action, data)

      if (hash) {
        setLastTxHash(hash)
        setTotalTransactions((prev) => prev + 1)
        // Estimate gas spent
        const fees: Record<GameAction, number> = {
          place_block: 0.0001,
          clear_line: 0.00005,
          new_game: 0.0002,
          game_over: 0.00005,
        }
        setTotalGasSpent((prev) => prev + fees[action])

        // Refresh balance after tx
        setTimeout(() => refreshBalance(state.address!), 2000)
      }

      setPendingTx(null)
      return hash !== null
    },
    [privateKey, state.address, refreshBalance],
  )

  // Manual refresh
  const refresh = useCallback(() => {
    if (state.address) {
      refreshBalance(state.address)
    }
  }, [state.address, refreshBalance])

  return {
    ...state,
    privateKey,
    mainWallet,
    initBurnerWallet,
    resetBurnerWallet,
    executeGameAction,
    refresh,
    pendingTx,
    lastTxHash,
    totalTransactions,
    totalGasSpent: totalGasSpent.toFixed(5),
  }
}
