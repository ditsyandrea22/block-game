"use client"

import { useAccount, useConnect, useDisconnect, useBalance, useSwitchChain, useSendTransaction } from "wagmi"
import { useEffect, useState, useCallback } from "react"
import { parseEther } from "viem"
import { Button } from "@/components/ui/button"
import { Wallet, LogOut, ChevronDown, RefreshCw, Copy, ExternalLink, Zap, AlertTriangle, Loader2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useBurnerWallet } from "@/hooks/use-burner-wallet"
import { BASE_SEPOLIA_CHAIN_ID } from "@/lib/wagmi-config"

const BASE_SEPOLIA_PARAMS = {
  chainId: "0x14a34", // 84532 in hex
  chainName: "Base Sepolia",
  nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://sepolia.base.org"],
  blockExplorerUrls: ["https://sepolia.basescan.org"],
}

export function WalletConnect() {
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain()
  const { data: balance, refetch: refetchBalance } = useBalance({
    address,
    chainId: BASE_SEPOLIA_CHAIN_ID,
  })

  const { sendTransactionAsync } = useSendTransaction()

  const burner = useBurnerWallet()
  const [copied, setCopied] = useState(false)
  const [fundAmount, setFundAmount] = useState("0.005")
  const [isFunding, setIsFunding] = useState(false)
  const [fundError, setFundError] = useState<string | null>(null)

  const isWrongNetwork = isConnected && chain && chain.id !== BASE_SEPOLIA_CHAIN_ID

  const addBaseSepoliaToWallet = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) return false

    try {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [BASE_SEPOLIA_PARAMS],
      })
      return true
    } catch (error) {
      console.error("[v0] Failed to add Base Sepolia:", error)
      return false
    }
  }, [])

  const switchToBaseSepolia = useCallback(async () => {
    try {
      await switchChainAsync({ chainId: BASE_SEPOLIA_CHAIN_ID })
      return true
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : ""

      // Chain not found in wallet - try to add it
      if (errorMsg.includes("Unrecognized") || errorMsg.includes("4902") || errorMsg.includes("not found")) {
        console.log("[v0] Chain not found, adding Base Sepolia...")
        const added = await addBaseSepoliaToWallet()
        if (added) {
          // Try switching again after adding
          try {
            await switchChainAsync({ chainId: BASE_SEPOLIA_CHAIN_ID })
            return true
          } catch {
            return false
          }
        }
      }
      return false
    }
  }, [switchChainAsync, addBaseSepoliaToWallet])

  useEffect(() => {
    if (isConnected && chain && chain.id !== BASE_SEPOLIA_CHAIN_ID) {
      console.log("[v0] Connected to wrong chain:", chain.id, "- Auto-switching to Base Sepolia...")
      switchToBaseSepolia()
    }
  }, [isConnected, chain, switchToBaseSepolia])

  // Initialize burner wallet if not exists
  useEffect(() => {
    if (isConnected && !burner.address) {
      burner.initBurnerWallet()
    }
  }, [isConnected, burner.address, burner.initBurnerWallet])

  const copyAddress = () => {
    if (burner.address) {
      navigator.clipboard.writeText(burner.address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const fundBurnerWallet = useCallback(async () => {
    if (!burner.address || !address) return

    setIsFunding(true)
    setFundError(null)

    try {
      // Step 1: Ensure we're on Base Sepolia
      if (chain?.id !== BASE_SEPOLIA_CHAIN_ID) {
        console.log("[v0] Switching to Base Sepolia before funding...")
        const switched = await switchToBaseSepolia()
        if (!switched) {
          setFundError("Please switch to Base Sepolia network manually")
          setIsFunding(false)
          return
        }
        // Wait for wallet to update after switch
        await new Promise((resolve) => setTimeout(resolve, 1500))
      }

      console.log("[v0] Funding session wallet...")
      console.log("[v0] From:", address)
      console.log("[v0] To:", burner.address)
      console.log("[v0] Amount:", fundAmount, "ETH")

      // Step 2: Send the funding transaction
      const hash = await sendTransactionAsync({
        to: burner.address as `0x${string}`,
        value: parseEther(fundAmount),
        chainId: BASE_SEPOLIA_CHAIN_ID,
      })

      console.log("[v0] Funding tx sent:", hash)
      console.log("[v0] BaseScan: https://sepolia.basescan.org/tx/" + hash)

      // Refresh balances after delay
      setTimeout(() => {
        burner.refresh()
        refetchBalance()
      }, 5000)
    } catch (error: unknown) {
      console.error("[v0] Funding error:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error"

      if (errorMessage.includes("rejected") || errorMessage.includes("denied")) {
        setFundError("Transaction rejected")
      } else if (errorMessage.includes("insufficient")) {
        setFundError("Insufficient balance. Get free ETH from Base Sepolia faucet!")
      } else if (errorMessage.includes("chain") || errorMessage.includes("network")) {
        setFundError("Wrong network - please switch to Base Sepolia")
      } else {
        setFundError(errorMessage.slice(0, 50))
      }
    } finally {
      setIsFunding(false)
    }
  }, [burner, address, chain?.id, switchToBaseSepolia, fundAmount, sendTransactionAsync, refetchBalance])

  // Wrong network - show switch button
  if (isWrongNetwork) {
    return (
      <Button
        onClick={switchToBaseSepolia}
        disabled={isSwitching}
        className="bg-orange-500/20 border-orange-500/50 text-orange-400 hover:bg-orange-500/30 w-full"
      >
        {isSwitching ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Switching to Base Sepolia...
          </>
        ) : (
          <>
            <AlertTriangle className="w-4 h-4 mr-2" />
            Switch to Base Sepolia
          </>
        )}
      </Button>
    )
  }

  // Connected state
  if (isConnected && address) {
    return (
      <div className="flex flex-col gap-2 w-full">
        {/* Main Wallet Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="bg-emerald-500/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30 hover:text-emerald-300 w-full justify-between"
            >
              <div className="flex items-center">
                <Wallet className="w-4 h-4 mr-2" />
                <span className="text-xs">Main:</span>
                <span className="ml-1">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-gray-900 border-gray-700 w-64">
            <DropdownMenuItem className="text-gray-300 focus:text-white focus:bg-gray-800">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-500">Balance (Base Sepolia)</span>
                <span>{balance ? `${Number(balance.formatted).toFixed(4)} ETH` : "Loading..."}</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-gray-300 focus:text-white focus:bg-gray-800">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-500">Network</span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  Base Sepolia (84532)
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-700" />
            <DropdownMenuItem
              className="text-red-400 focus:text-red-300 focus:bg-gray-800 cursor-pointer"
              onClick={() => {
                disconnect()
                burner.resetBurnerWallet()
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Session Wallet (Burner) for Auto-Transactions */}
        {burner.address && (
          <div className="bg-gray-800/80 border border-blue-500/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-blue-400" />
                <span className="text-xs font-medium text-blue-400">Session Wallet (Auto-TX)</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                onClick={burner.refresh}
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <code className="text-xs text-gray-300 bg-gray-900/50 px-2 py-1 rounded flex-1 truncate">
                {burner.address.slice(0, 10)}...{burner.address.slice(-8)}
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                onClick={copyAddress}
              >
                <Copy className="w-3 h-3" />
              </Button>
              <a
                href={`https://sepolia.basescan.org/address/${burner.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">Balance:</span>
              <span className={`text-sm font-mono ${burner.isReady ? "text-emerald-400" : "text-orange-400"}`}>
                {burner.balance} ETH
              </span>
            </div>

            {!burner.isReady && (
              <div className="space-y-2">
                <p className="text-xs text-orange-400">Fund session wallet to enable auto-transactions</p>
                {fundError && <p className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">{fundError}</p>}
                <div className="flex gap-2">
                  <select
                    value={fundAmount}
                    onChange={(e) => setFundAmount(e.target.value)}
                    className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white flex-1"
                  >
                    <option value="0.002">0.002 ETH</option>
                    <option value="0.005">0.005 ETH</option>
                    <option value="0.01">0.01 ETH</option>
                    <option value="0.02">0.02 ETH</option>
                  </select>
                  <Button
                    size="sm"
                    onClick={fundBurnerWallet}
                    disabled={isFunding}
                    className="bg-blue-600 hover:bg-blue-700 text-xs h-7"
                  >
                    {isFunding ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Funding...
                      </>
                    ) : (
                      "Fund"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {burner.isReady && (
              <div className="flex items-center gap-1 text-xs text-emerald-400">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                Auto-transactions enabled
              </div>
            )}

            {copied && <p className="text-xs text-emerald-400 mt-1">Address copied!</p>}
          </div>
        )}
      </div>
    )
  }

  // Not connected - show connect button
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="bg-blue-500/20 border-blue-500/50 text-blue-400 hover:bg-blue-500/30 hover:text-blue-300 w-full"
          disabled={isPending}
        >
          <Wallet className="w-4 h-4 mr-2" />
          {isPending ? "Connecting..." : "Connect Wallet"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-gray-900 border-gray-700">
        {connectors.map((connector) => (
          <DropdownMenuItem
            key={connector.uid}
            className="text-gray-300 focus:text-white focus:bg-gray-800 cursor-pointer"
            onClick={() => connect({ connector })}
          >
            {connector.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
