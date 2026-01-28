# BullPOS

Non-custodial payment link system for merchants using Bull Bitcoin Wallet.

## Overview

BullPOS enables merchants to create encrypted payment links with rich content (invoices, images, PDFs). Customers pay via Lightning, and funds arrive as L-BTC in the merchant's Liquid wallet.

**Key Properties:**
- **Non-custodial**: Browser claims directly to merchant's address
- **Private**: Server cannot read link content (AES) or swap backups (PGP)
- **Rich content**: Line items, images, PDFs, branding
- **Single receive mode**: 100% Bitcoin (L-BTC to Liquid wallet)

## Repository Structure

```
bullpos/
├── frontend/          # Browser payment page (fork of btcpos)
│   ├── index.ts       # Main application logic
│   ├── state.ts       # State management
│   ├── index.html     # Payment page UI
│   └── webpack.config.cjs  # Build configuration
├── backend/           # Express + SQLite API server
├── package.json       # Monorepo workspace config
└── README.md
```

### Frontend (btcpos fork)

The frontend is a fork of [btcpos](https://github.com/unique-org/btcpos) that adds unique payment link functionality while preserving the existing Boltz swap integration. Key features from btcpos:
- **lwk_wasm**: Liquid Wallet Kit for L-BTC transactions
- **Webpack**: Production-ready bundling
- **TypeScript**: Type-safe development
- **Boltz integration**: Lightning-to-Liquid swaps

## Development

### Prerequisites
- Node.js 18+
- npm 9+

### Setup
```bash
npm install
```

### Run Development Servers
```bash
# Frontend
npm run dev:frontend

# Backend
npm run dev:backend
```

### Testing
```bash
npm test
```

## Security Model

### Two Layers of Encryption

1. **Link payload**: AES-256-GCM
   - Key derived via BIP85, stored in URL fragment
   - Fragment NEVER sent to server
   - Server stores ciphertext it cannot decrypt

2. **Swap backup**: PGP
   - Encrypted to merchant's PGP public key
   - Server stores backup it cannot decrypt
   - Only merchant can recover failed swaps

## Acknowledgment

BullPOS frontend is a fork of btcpos: https://github.com/RCasatta/btcpos 

## License

MIT
