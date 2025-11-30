import GameContainer from "@/components/game-container"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-2 md:p-8 bg-gray-950">
      <div className="z-10 w-full max-w-md items-center justify-between font-mono text-sm">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-1">Block Placer</h1>
          <p className="text-xs text-gray-500">On-Chain Gaming on Base Sepolia</p>
        </div>
        <GameContainer />
      </div>
    </main>
  )
}
