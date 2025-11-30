# Block Placer 🎮

An on-chain block placement puzzle game built on Base Sepolia testnet with automatic transaction signing via session wallets.

## 🌟 Features

- **On-Chain Gaming**: Every game action is recorded on Base Sepolia blockchain
- **Session Wallets**: Automatic transaction signing without constant wallet popups
- **Burner Wallet System**: Each connected wallet gets a unique session wallet for seamless gameplay
- **Leaderboard**: Compete with other players and track your best scores
- **Progressive Difficulty**: Game difficulty increases with each level
- **Real-time Stats**: Track your on-chain transactions and gas spent

## 🎯 How to Play

1. **Connect Wallet**: Connect your wallet to Base Sepolia testnet (auto-switches)
2. **Fund Session**: Transfer some testnet ETH to your session wallet for automatic transactions
3. **Place Blocks**: Select blocks and place them on the 8x8 grid
4. **Clear Lines**: Complete horizontal or vertical lines to score points
5. **Level Up**: Place blocks to progress through levels with increasing difficulty

### Controls

- Click on a block to select it
- Click on the board to place the selected block
- Press `R` or click "Rotate Block" to rotate the selected block
- Complete lines (horizontal or vertical) to clear them and earn points

### Scoring

- Each cleared line: 100 points × current level
- Level up every 10 blocks placed
- Game ends when no blocks can be placed

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or compatible runtime
- A Web3 wallet (MetaMask, Coinbase Wallet, etc.)
- Base Sepolia testnet ETH ([Get from faucet](https://www.alchemy.com/faucets/base-sepolia))

### Installation

```bash
# Install dependencies
npm install
# or
pnpm install

# Run development server
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Setup

Create a `.env.local` file based on `.env.example`:

```bash
cp .env.example .env.local
```

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (React 19)
- **Blockchain**: Base Sepolia Testnet
- **Web3 Libraries**: 
  - wagmi v2 - React hooks for Ethereum
  - viem - TypeScript interface for Ethereum
  - @coinbase/wallet-sdk - Wallet connection
- **UI Components**: 
  - Radix UI - Accessible component primitives
  - Tailwind CSS - Styling
  - Framer Motion - Animations
- **State Management**: React hooks + TanStack Query
- **Storage**: AsyncStorage for persistent data

## 📁 Project Structure

```
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── game-container.tsx # Main game logic
│   ├── game-board.tsx     # Game board display
│   ├── block-selector.tsx # Block selection UI
│   ├── wallet-connect.tsx # Wallet connection
│   ├── leaderboard.tsx    # Leaderboard display
│   └── ui/                # Reusable UI components
├── hooks/                 # Custom React hooks
│   ├── use-burner-wallet.ts # Session wallet management
│   └── use-mobile.ts      # Mobile detection
├── lib/                   # Utility functions
│   ├── game-utils.ts      # Game logic utilities
│   ├── block-shapes.ts    # Block shape definitions
│   ├── burner-wallet.ts   # Wallet utilities
│   └── wagmi-config.ts    # Web3 configuration
└── types/                 # TypeScript type definitions
```

## 🔗 On-Chain Features

### Session Wallet System

Each connected wallet receives a unique burner/session wallet that:
- Automatically signs transactions without user prompts
- Tracks all game actions on-chain
- Records gas spent and transaction count
- Maintains game state integrity

### Recorded Actions

- Game start
- Block placement
- Line clearing
- Game over
- Score updates

## 🏆 Leaderboard

The leaderboard tracks:
- Player scores
- Levels reached
- Blocks placed
- Total transactions
- Gas spent
- Timestamp of achievements

Scores are saved locally and associated with your main wallet address.

## 🎨 Customization

### Block Shapes

Block shapes are defined in `lib/block-shapes.ts`. You can add new shapes by following the existing pattern:

```typescript
{
  name: "Custom Block",
  shape: [
    [true, false],
    [true, true]
  ]
}
```

### Game Settings

Adjust game parameters in `components/game-container.tsx`:

```typescript
const BOARD_SIZE = 8           // Grid size
const POINTS_PER_LINE = 100    // Points per cleared line
const BLOCKS_PER_LEVEL = 10    // Blocks to place per level
```

## 🧪 Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Lint code
npm run lint
```

## 📝 License

This project is private and not licensed for public use.

## 🤝 Contributing

This is a private project. Contributions are not currently accepted.

## 🔗 Links

- [Base Sepolia Faucet](https://www.alchemy.com/faucets/base-sepolia)
- [Base Documentation](https://docs.base.org/)
- [wagmi Documentation](https://wagmi.sh/)

## ⚠️ Disclaimer

This is a testnet application for demonstration purposes. Do not use real funds. Always use Base Sepolia testnet ETH.

---

Built with ❤️ on Base Sepolia
