"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import GameBoard from "./game-board"
import BlockSelector from "./block-selector"
import ScoreDisplay from "./score-display"
import LevelDisplay from "./level-display"
import { WalletConnect } from "./wallet-connect"
import { GameStatsOnChain } from "./game-stats-onchain"
import { Leaderboard } from "./leaderboard"
import { PlayerBadge } from "./player-badge"
import { ClientOnly } from "./client-only"
import { useBurnerWallet } from "@/hooks/use-burner-wallet"
import { useAccount } from "wagmi"
import { checkForCompleteLines, canPlaceBlock } from "@/lib/game-utils"
import { type BlockShape, BLOCK_SHAPES } from "@/lib/block-shapes"
import { saveToLeaderboard } from "@/lib/burner-wallet"
import { AlertTriangle, Zap } from "lucide-react"

// Game settings
const BOARD_SIZE = 8
const POINTS_PER_LINE = 100
const BLOCKS_PER_LEVEL = 10

export default function GameContainer() {
  const [gameBoard, setGameBoard] = useState<(string | null)[][]>(
    Array(BOARD_SIZE)
      .fill(null)
      .map(() => Array(BOARD_SIZE).fill(null)),
  )
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [placedBlocks, setPlacedBlocks] = useState(0)
  const [availableBlocks, setAvailableBlocks] = useState<BlockShape[]>([])
  const [selectedBlock, setSelectedBlock] = useState<BlockShape | null>(null)
  const [isGameOver, setIsGameOver] = useState(false)
  const [showInstructions, setShowInstructions] = useState(true)

  const { isConnected, address } = useAccount()
  const burner = useBurnerWallet()

  useEffect(() => {
    generateNewBlocks()
  }, [])

  useEffect(() => {
    if (placedBlocks >= level * BLOCKS_PER_LEVEL) {
      setLevel((prev) => prev + 1)
      generateNewBlocks(true)
    }
  }, [placedBlocks, level])

  useEffect(() => {
    if (availableBlocks.length > 0 && !canPlaceAnyBlock()) {
      handleGameOver()
    }
  }, [gameBoard, availableBlocks])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "r" || e.key === "R") && selectedBlock) {
        rotateSelectedBlock()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedBlock])

  const handleGameOver = async () => {
    setIsGameOver(true)

    // Execute game over transaction without waiting to avoid UI blocking
    if (burner.isReady) {
      burner.executeGameAction("game_over", { score, level }).catch(error => {
        console.error("Game over transaction failed:", error)
      })
    }

    // Save to leaderboard if wallet connected
    if (address && burner.address) {
      saveToLeaderboard({
        mainWallet: address,
        burnerWallet: burner.address,
        score,
        level,
        blocksPlaced: placedBlocks,
        transactions: burner.totalTransactions,
        gasSpent: burner.totalGasSpent,
        timestamp: Date.now(),
      })
    }
  }

  const startNewGame = async () => {
    if (burner.isReady) {
      burner.executeGameAction("new_game", {}).catch(error => {
        console.error("New game transaction failed:", error)
      })
    }

    setGameBoard(
      Array(BOARD_SIZE)
        .fill(null)
        .map(() => Array(BOARD_SIZE).fill(null)),
    )
    setScore(0)
    setLevel(1)
    setPlacedBlocks(0)
    setSelectedBlock(null)
    setIsGameOver(false)
    generateNewBlocks()
  }

  const generateNewBlocks = (isLevelUp = false) => {
    const count = 3
    const newBlocks: BlockShape[] = []

    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * BLOCK_SHAPES.length)
      const block = JSON.parse(JSON.stringify(BLOCK_SHAPES[randomIndex])) as Omit<BlockShape, "id" | "color">

      const colors = ["red", "blue", "green", "yellow", "purple"]
      const randomColor = colors[Math.floor(Math.random() * colors.length)]

      const newBlock: BlockShape = {
        ...block,
        color: randomColor,
        id: `block-${Date.now()}-${i}`,
      }

      newBlocks.push(newBlock)
    }

    setAvailableBlocks(newBlocks)
  }

  const handleBlockSelect = (block: BlockShape) => {
    setSelectedBlock(block)
  }

  const handleCellClick = async (row: number, col: number) => {
    if (!selectedBlock) return

    // STRICT ON-CHAIN MODE: Block interaction if wallet is not ready for on-chain transactions
    if (!burner.isReady) {
      console.log("Game action blocked: burner wallet not ready for on-chain transactions")
      return
    }

    // Block interaction if there's a pending transaction or queue
    if (burner.pendingTx || burner.transactionQueueLength > 0 || burner.isProcessingQueue) {
      console.log("Game action blocked: transaction in progress")
      return
    }

    if (canPlaceBlock(gameBoard, selectedBlock, row, col)) {
      // Send transactions first and wait for confirmation before updating UI
      try {
        // Queue place_block transaction and wait for result
        const placeBlockSuccess = await burner.executeGameAction("place_block", {
          row,
          col,
          blockId: selectedBlock.id,
        })

        if (!placeBlockSuccess) {
          console.error("Place block transaction failed, game state not updated")
          return
        }

        // Only update UI after successful transaction
        const newBoard = [...gameBoard.map((row) => [...row])]

        selectedBlock.shape.forEach((blockRow, rowOffset) => {
          blockRow.forEach((cell, colOffset) => {
            if (cell) {
              newBoard[row + rowOffset][col + colOffset] = selectedBlock.color
            }
          })
        })

        setGameBoard(newBoard)
        setAvailableBlocks((prev) => prev.filter((block) => block.id !== selectedBlock.id))
        setPlacedBlocks((prev) => prev + 1)
        setSelectedBlock(null)

        const { clearedBoard, linesCleared } = checkForCompleteLines(newBoard)

        if (linesCleared > 0) {
          const pointsEarned = linesCleared * POINTS_PER_LINE * level
          setScore((prev) => prev + pointsEarned)
          setGameBoard(clearedBoard)

          // Queue clear_line transaction if applicable (non-blocking)
          setTimeout(() => {
            burner.executeGameAction("clear_line", {
              linesCleared,
              score: linesCleared * POINTS_PER_LINE * level,
            }).catch(error => {
              console.error("Clear line transaction failed:", error)
            })
          }, 500) // Small delay to avoid rapid-fire transactions
        }

        if (availableBlocks.length <= 1) {
          generateNewBlocks()
        }
      } catch (error) {
        console.error("Game action failed due to transaction error:", error)
        // Don't update game state if transaction failed
      }
    }
  }

  const canPlaceAnyBlock = () => {
    for (const block of availableBlocks) {
      for (let row = 0; row <= BOARD_SIZE - block.shape.length; row++) {
        for (let col = 0; col <= BOARD_SIZE - block.shape[0].length; col++) {
          if (canPlaceBlock(gameBoard, block, row, col)) {
            return true
          }
        }
      }
    }
    return false
  }

  const rotateSelectedBlock = () => {
    if (!selectedBlock) return

    const rotatedBlock = JSON.parse(JSON.stringify(selectedBlock)) as BlockShape
    const rows = rotatedBlock.shape.length
    const cols = rotatedBlock.shape[0].length

    const newShape: boolean[][] = Array(cols)
      .fill(null)
      .map(() => Array(rows).fill(false))

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        newShape[c][rows - 1 - r] = rotatedBlock.shape[r][c]
      }
    }

    rotatedBlock.shape = newShape
    setSelectedBlock(rotatedBlock)
  }

  return (
    <div className="flex flex-col gap-4 items-center max-w-md mx-auto">
      <div className="flex justify-between items-center w-full mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-xs text-gray-400 font-mono">Base Sepolia (84532)</span>
        </div>
        <PlayerBadge />
      </div>

      <ClientOnly>
        <WalletConnect />
      </ClientOnly>

      {burner.address && (
        <ClientOnly>
          <GameStatsOnChain />
        </ClientOnly>
      )}

      {!isConnected && (
        <ClientOnly>
          <div className="w-full p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-red-400 text-sm">Connect wallet to Base Sepolia to start on-chain gameplay.</span>
          </div>
        </ClientOnly>
      )}

      {isConnected && !burner.isReady && (
        <ClientOnly>
          <div className="w-full p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg flex items-center gap-2">
            <Zap className="w-4 h-4 text-orange-500" />
            <span className="text-orange-400 text-sm">
              ON-CHAIN MODE: Fund your session wallet to enable gameplay. All moves require on-chain transactions.
            </span>
          </div>
        </ClientOnly>
      )}

      <div className="flex justify-between w-full mb-2">
        <ScoreDisplay score={score} />
        <LevelDisplay level={level} />
      </div>

      <GameBoard board={gameBoard} selectedBlock={selectedBlock} onCellClick={handleCellClick} />

      <div className="flex flex-col gap-3 w-full">
        <BlockSelector blocks={availableBlocks} selectedBlock={selectedBlock} onSelectBlock={handleBlockSelect} />

        <div className="flex gap-2 justify-center flex-wrap">
          <Button
            onClick={rotateSelectedBlock}
            disabled={!selectedBlock || !burner.isReady || !!burner.pendingTx || burner.transactionQueueLength > 0}
            variant="outline"
            className="text-black bg-white hover:bg-gray-100 hover:text-black disabled:opacity-50"
          >
            Rotate Block (R)
          </Button>

          <Button
            onClick={() => startNewGame()}
            disabled={!burner.isReady || !!burner.pendingTx || burner.transactionQueueLength > 0}
            className="text-black bg-white hover:bg-gray-100 hover:text-black disabled:opacity-50"
          >
            {!burner.isReady 
              ? "Fund Wallet to Play" 
              : burner.pendingTx || burner.transactionQueueLength > 0
                ? `Processing... (${burner.transactionQueueLength + (burner.pendingTx ? 1 : 0)})` 
                : "New Game"
            }
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowInstructions(true)}
            className="text-black bg-white hover:bg-gray-100 hover:text-black"
          >
            How to Play
          </Button>
        </div>
      </div>

      <div className="w-full mt-4">
        <Leaderboard />
      </div>

      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="bg-white text-black">
          <DialogHeader>
            <DialogTitle className="text-black text-xl">How to Play Block Placer</DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-gray-700">
            Strict On-Chain Block Placer on Base Sepolia (All Moves Require Transactions):
          </DialogDescription>
          <ul className="list-disc pl-5 space-y-2 mt-2 text-gray-800">
            <li>
              <strong>Connect your wallet</strong> to Base Sepolia testnet (auto-switches)
            </li>
            <li>
              <strong>Fund your session wallet</strong> - Each wallet gets a unique session wallet
            </li>
            <li>
              <strong>ON-CHAIN ONLY:</strong> All game moves require on-chain transactions. Gameplay blocked without funded wallet.
            </li>
            <li>
              <strong>Automatic transactions</strong> - No wallet popups! All moves sent via session wallet.
            </li>
            <li>
              <strong>Compete on the leaderboard</strong> - Your best score is saved and ranked
            </li>
            <li>
              Get free testnet ETH from{" "}
              <a
                href="https://www.alchemy.com/faucets/base-sepolia"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                Base Sepolia Faucet
              </a>
            </li>
            <li>Select a block and click on the board to place it</li>
            <li>
              Rotate blocks with the Rotate button or{" "}
              <kbd className="px-2 py-1 bg-gray-200 rounded text-sm text-black border border-gray-300">R</kbd> key
            </li>
            <li>Complete horizontal or vertical lines to clear them</li>
          </ul>
          <DialogFooter>
            <Button
              onClick={() => setShowInstructions(false)}
              className="text-black bg-white hover:bg-gray-100 hover:text-black border border-gray-300"
            >
              Start Playing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isGameOver} onOpenChange={setIsGameOver}>
        <DialogContent className="bg-white text-black">
          <DialogHeader>
            <DialogTitle className="text-black text-xl">Game Over!</DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-gray-700">Your final results:</DialogDescription>
          <div className="py-4 text-gray-800">
            <p className="text-lg">Final score: {score}</p>
            <p className="text-lg">Level reached: {level}</p>
            <p className="text-lg">Blocks placed: {placedBlocks}</p>
            <p className="text-lg">On-chain transactions: {burner.totalTransactions}</p>
            <p className="text-lg">Total gas spent: {burner.totalGasSpent} ETH</p>
            {address && burner.isReady && <p className="text-lg mt-2 text-green-600 font-semibold">Score saved to leaderboard!</p>}
            {!burner.isReady && <p className="text-lg mt-2 text-orange-600 font-semibold">Fund wallet to save score and continue playing!</p>}
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                startNewGame()
                setIsGameOver(false)
              }}
              disabled={!burner.isReady || !!burner.pendingTx}
              className="text-black bg-white hover:bg-gray-100 hover:text-black border border-gray-300"
            >
              {!burner.isReady ? "Fund Wallet to Continue" : burner.pendingTx ? "Processing..." : "Play Again"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
