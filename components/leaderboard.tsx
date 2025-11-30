"use client"

import { useState, useEffect } from "react"
import { useAccount } from "wagmi"
import { getLeaderboard, type LeaderboardEntry } from "@/lib/burner-wallet"
import { Trophy, Medal, Award, Crown, User, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

// Badge component for top 3
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-lg shadow-yellow-500/30">
        <Crown className="w-4 h-4 text-yellow-900" />
      </div>
    )
  }
  if (rank === 2) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 shadow-lg shadow-gray-400/30">
        <Medal className="w-4 h-4 text-gray-700" />
      </div>
    )
  }
  if (rank === 3) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 shadow-lg shadow-amber-600/30">
        <Award className="w-4 h-4 text-amber-200" />
      </div>
    )
  }
  return (
    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-800 text-gray-400 text-sm font-bold">
      {rank}
    </div>
  )
}

// Shorten address
function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [showAll, setShowAll] = useState(false)
  const { address } = useAccount()

  useEffect(() => {
    const data = getLeaderboard()
    setLeaderboard(data)
  }, [])

  // Refresh leaderboard periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const data = getLeaderboard()
      setLeaderboard(data)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const displayedEntries = showAll ? leaderboard : leaderboard.slice(0, 5)
  const currentPlayerEntry = address
    ? leaderboard.find((e) => e.mainWallet.toLowerCase() === address.toLowerCase())
    : null
  const currentPlayerRank = currentPlayerEntry
    ? leaderboard.findIndex((e) => e.mainWallet.toLowerCase() === address.toLowerCase()) + 1
    : null

  if (leaderboard.length === 0) {
    return (
      <div className="bg-gray-900/80 backdrop-blur-sm rounded-xl border border-gray-800 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-bold text-white">Leaderboard</h3>
        </div>
        <div className="text-center py-6 text-gray-500">
          <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No scores yet</p>
          <p className="text-xs">Be the first to play!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900/80 backdrop-blur-sm rounded-xl border border-gray-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-bold text-white">Leaderboard</h3>
        </div>
        <span className="text-xs text-gray-500">{leaderboard.length} players</span>
      </div>

      {/* Current player highlight */}
      {currentPlayerEntry && currentPlayerRank && currentPlayerRank > 5 && !showAll && (
        <div className="mb-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-center gap-3">
            <RankBadge rank={currentPlayerRank} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-blue-400 text-sm font-medium">You</span>
                <span className="text-gray-500 text-xs">{shortenAddress(currentPlayerEntry.mainWallet)}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>
                  Score: <span className="text-white font-bold">{currentPlayerEntry.score.toLocaleString()}</span>
                </span>
                <span>Lvl {currentPlayerEntry.level}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard entries */}
      <div className="space-y-2">
        {displayedEntries.map((entry, index) => {
          const rank = index + 1
          const isCurrentPlayer = address?.toLowerCase() === entry.mainWallet.toLowerCase()

          return (
            <div
              key={entry.mainWallet}
              className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                isCurrentPlayer
                  ? "bg-blue-500/20 border border-blue-500/30"
                  : rank <= 3
                    ? "bg-gray-800/50"
                    : "bg-gray-800/30 hover:bg-gray-800/50"
              }`}
            >
              <RankBadge rank={rank} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {isCurrentPlayer && <span className="text-blue-400 text-xs font-medium">You</span>}
                  <a
                    href={`https://sepolia.basescan.org/address/${entry.mainWallet}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-300 text-sm hover:text-white transition-colors flex items-center gap-1"
                  >
                    {shortenAddress(entry.mainWallet)}
                    <ExternalLink className="w-3 h-3 opacity-50" />
                  </a>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>Lvl {entry.level}</span>
                  <span>{entry.blocksPlaced} blocks</span>
                  <span>{entry.transactions} txns</span>
                </div>
              </div>

              <div className="text-right">
                <div
                  className={`text-lg font-bold ${
                    rank === 1
                      ? "text-yellow-400"
                      : rank === 2
                        ? "text-gray-300"
                        : rank === 3
                          ? "text-amber-500"
                          : "text-white"
                  }`}
                >
                  {entry.score.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">{entry.gasSpent} ETH</div>
              </div>
            </div>
          )
        })}
      </div>

      {leaderboard.length > 5 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(!showAll)}
          className="w-full mt-3 text-gray-400 hover:text-white hover:bg-gray-800"
        >
          {showAll ? "Show Less" : `Show All (${leaderboard.length})`}
        </Button>
      )}
    </div>
  )
}
