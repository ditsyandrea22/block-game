"use client"

import { useAccount } from "wagmi"
import { getPlayerRank, getPlayerBestScore } from "@/lib/burner-wallet"
import { useState, useEffect } from "react"
import { Crown, Medal, Award, Star, Zap } from "lucide-react"

export function PlayerBadge() {
  const { address } = useAccount()
  const [rank, setRank] = useState<number | null>(null)
  const [bestScore, setBestScore] = useState<number | null>(null)

  useEffect(() => {
    if (address) {
      const playerRank = getPlayerRank(address)
      const playerBest = getPlayerBestScore(address)
      setRank(playerRank)
      setBestScore(playerBest?.score || null)
    } else {
      setRank(null)
      setBestScore(null)
    }
  }, [address])

  // Refresh periodically
  useEffect(() => {
    if (!address) return

    const interval = setInterval(() => {
      const playerRank = getPlayerRank(address)
      const playerBest = getPlayerBestScore(address)
      setRank(playerRank)
      setBestScore(playerBest?.score || null)
    }, 3000)

    return () => clearInterval(interval)
  }, [address])

  if (!address || !rank) return null

  const getBadgeStyle = () => {
    if (rank === 1) {
      return {
        bg: "bg-gradient-to-r from-yellow-500/20 to-amber-500/20",
        border: "border-yellow-500/50",
        text: "text-yellow-400",
        icon: <Crown className="w-4 h-4" />,
        title: "Champion",
      }
    }
    if (rank === 2) {
      return {
        bg: "bg-gradient-to-r from-gray-400/20 to-gray-500/20",
        border: "border-gray-400/50",
        text: "text-gray-300",
        icon: <Medal className="w-4 h-4" />,
        title: "Runner Up",
      }
    }
    if (rank === 3) {
      return {
        bg: "bg-gradient-to-r from-amber-600/20 to-amber-700/20",
        border: "border-amber-600/50",
        text: "text-amber-500",
        icon: <Award className="w-4 h-4" />,
        title: "Third Place",
      }
    }
    if (rank <= 10) {
      return {
        bg: "bg-gradient-to-r from-blue-500/20 to-cyan-500/20",
        border: "border-blue-500/50",
        text: "text-blue-400",
        icon: <Star className="w-4 h-4" />,
        title: "Top 10",
      }
    }
    return {
      bg: "bg-gradient-to-r from-purple-500/20 to-pink-500/20",
      border: "border-purple-500/50",
      text: "text-purple-400",
      icon: <Zap className="w-4 h-4" />,
      title: "Player",
    }
  }

  const style = getBadgeStyle()

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${style.bg} border ${style.border}`}>
      <span className={style.text}>{style.icon}</span>
      <div className="flex flex-col">
        <span className={`text-xs font-semibold ${style.text}`}>{style.title}</span>
        <span className="text-[10px] text-gray-400">
          Rank #{rank} • Best: {bestScore?.toLocaleString() || 0}
        </span>
      </div>
    </div>
  )
}
