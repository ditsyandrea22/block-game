"use client"

import { Fuel, Activity, Zap, ExternalLink } from "lucide-react"
import { useBurnerWallet } from "@/hooks/use-burner-wallet"

export function GameStatsOnChain() {
  const { address, balance, isReady, totalTransactions, totalGasSpent, lastTxHash, pendingTx } = useBurnerWallet()

  if (!address) return null

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
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Session</p>
            <p className={`text-sm font-mono ${isReady ? "text-emerald-400" : "text-orange-400"}`}>
              {balance.slice(0, 7)} ETH
            </p>
          </div>
        </div>
      </div>

      {pendingTx && (
        <div className="flex items-center gap-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-blue-400">Processing: {pendingTx}</span>
        </div>
      )}

      {lastTxHash && !pendingTx && (
        <a
          href={`https://sepolia.basescan.org/tx/${lastTxHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-400 hover:bg-emerald-500/20 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          <span>
            Last TX: {lastTxHash.slice(0, 10)}...{lastTxHash.slice(-8)}
          </span>
        </a>
      )}
    </div>
  )
}
