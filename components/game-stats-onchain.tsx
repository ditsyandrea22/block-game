"use client"

import { useState, useEffect } from "react"
import { Fuel, Activity, Zap, ExternalLink, AlertCircle, CheckCircle, Clock, XCircle, RefreshCw } from "lucide-react"
import { useBurnerWallet } from "@/hooks/use-burner-wallet"

export function GameStatsOnChain() {
  const { 
    address, 
    balance, 
    isReady, 
    totalTransactions, 
    totalGasSpent, 
    transactionStatus, 
    pendingTx, 
    lastError, 
    clearError,
    refresh,
    isLoading
  } = useBurnerWallet()

  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)

  if (!address) return null

  // Update the last update time when balance changes
  useEffect(() => {
    if (balance !== "0") {
      setLastUpdateTime(new Date())
    }
  }, [balance])

  const getStatusIcon = () => {
    switch (transactionStatus.status) {
      case "pending":
        return <Clock className="w-3 h-3 text-blue-400 animate-pulse" />
      case "success":
        return <CheckCircle className="w-3 h-3 text-emerald-400" />
      case "failed":
      case "timeout":
        return <XCircle className="w-3 h-3 text-red-400" />
      default:
        return null
    }
  }

  const getStatusColor = () => {
    switch (transactionStatus.status) {
      case "pending":
        return "bg-blue-500/10 border-blue-500/30 text-blue-400"
      case "success":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
      case "failed":
      case "timeout":
        return "bg-red-500/10 border-red-500/30 text-red-400"
      default:
        return "bg-gray-500/10 border-gray-500/30 text-gray-400"
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">On-Chain Moves</p>
            <p className="text-sm font-mono text-gray-200">{totalTransactions}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Fuel className="w-4 h-4 text-orange-400" />
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Gas Spent</p>
            <p className="text-sm font-mono text-gray-200">{totalGasSpent} ETH</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          <div className="flex-1">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Session</p>
            <div className="flex items-center gap-2">
              <p className={`text-sm font-mono ${isReady ? "text-emerald-400" : "text-orange-400"}`}>
                {Number(balance).toFixed(8)} ETH
              </p>
              <button
                onClick={refresh}
                disabled={isLoading}
                className="p-1 hover:bg-gray-700 rounded transition-colors"
                title="Refresh balance"
              >
                <RefreshCw className={`w-3 h-3 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              {lastUpdateTime ? `Updated: ${lastUpdateTime.toLocaleTimeString()}` : 'Updating...'}
            </p>
          </div>
        </div>
      </div>

      {/* Transaction Status */}
      {transactionStatus.action && transactionStatus.status !== "idle" && (
        <div className={`flex items-center gap-2 p-2 border rounded-lg ${getStatusColor()}`}>
          {getStatusIcon()}
          <div className="flex-1">
            <span className="text-xs font-medium">
              {transactionStatus.status === "pending" && `Processing: ${transactionStatus.action}`}
              {transactionStatus.status === "success" && `Success: ${transactionStatus.action}`}
              {transactionStatus.status === "failed" && `Failed: ${transactionStatus.action}`}
              {transactionStatus.status === "timeout" && `Timeout: ${transactionStatus.action}`}
            </span>
            {transactionStatus.status === "pending" && (
              <div className="w-full h-1 bg-gray-700 rounded-full mt-1 overflow-hidden">
                <div className="h-full bg-blue-400 animate-pulse rounded-full" style={{width: '60%'}}></div>
              </div>
            )}
            {transactionStatus.error && (
              <p className="text-xs mt-1 opacity-80">{transactionStatus.error}</p>
            )}
          </div>
        </div>
      )}

      {/* Last Transaction Link */}
      {transactionStatus.hash && transactionStatus.status === "success" && (
        <a
          href={`https://sepolia.basescan.org/tx/${transactionStatus.hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-400 hover:bg-emerald-500/20 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          <span>
            Last TX: {transactionStatus.hash.slice(0, 10)}...{transactionStatus.hash.slice(-8)}
          </span>
        </a>
      )}

      {/* Error Display */}
      {lastError && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-400 font-medium">Transaction Error</p>
            <p className="text-xs text-red-300 mt-1">{lastError}</p>
            <button
              onClick={clearError}
              className="text-xs text-red-400 hover:text-red-300 underline mt-2"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Balance Warning */}
      {!isReady && transactionStatus.status === "idle" && (
        <div className="flex items-center gap-2 p-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
          <AlertCircle className="w-3 h-3 text-orange-400" />
          <span className="text-xs text-orange-400">
            Low balance - fund your burner wallet to continue on-chain moves
          </span>
        </div>
      )}
    </div>
  )
}
