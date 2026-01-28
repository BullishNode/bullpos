# BullPOS Development Guide

## Overview

BullPOS is a monorepo containing:
- **Frontend**: Browser payment page (fork of btcpos)
- **Backend**: Express + SQLite API server

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+
- Git

## Initial Setup

### 1. Clone the repository

```bash
git clone https://github.com/BullishNode/bullpos.git
cd bullpos
```

### 2. Install dependencies

```bash
npm install
```

This will install dependencies for both the frontend and backend workspaces.

## Development Workflow

### Running the Development Servers

**Frontend (Webpack dev server with hot reload):**
```bash
npm run dev:frontend
```
Access at: http://localhost:8080

**Backend (Express API server):**
```bash
npm run dev:backend
```
Access at: http://localhost:3000

### Building for Production

**Build frontend:**
```bash
npm run build:frontend
```
Output: `frontend/dist/`

**Build backend:**
```bash
npm run build:backend
```
Output: `backend/dist/`

### Code Quality

**Run linting:**
```bash
npm run lint
```

**Run tests:**
```bash
npm test
```

## Frontend Development

The frontend is a fork of [btcpos](https://github.com/unique-org/btcpos) with BullPOS-specific features.

### Key Technologies
- **TypeScript**: Type-safe JavaScript
- **Webpack**: Module bundler with dev server
- **lwk_wasm**: Liquid Wallet Kit for L-BTC transactions
- **Boltz**: Lightning-to-Liquid swap integration

### File Structure
```
frontend/
├── index.ts          # Main application entry
├── state.ts          # State management
├── bootstrap.ts      # App initialization
├── index.html        # Payment page UI
├── styles.css        # Styling
├── webpack.config.cjs # Build configuration
└── tsconfig.json     # TypeScript config
```

### Development Server
```bash
cd frontend
npm run dev
```

### Building
```bash
cd frontend
npm run build
```

### Linting
```bash
cd frontend
npm run lint
npm run lint:fix  # Auto-fix issues
```

## Backend Development

The backend provides the API for encrypted payment links and merchant management.

### Key Technologies
- **Express**: Web framework
- **SQLite**: Embedded database
- **TypeScript**: Type-safe JavaScript
- **JWT**: Authentication tokens

### Development Server
```bash
cd backend
npm run dev
```

### Building
```bash
cd backend
npm run build
```

## Architecture Notes

### Frontend (btcpos fork)
The frontend preserves all btcpos functionality:
- Liquid wallet integration via lwk_wasm
- Boltz swap support for Lightning-to-Liquid
- Client-side payment processing

BullPOS additions:
- Encrypted payment link decryption (AES-256-GCM)
- Rich content display (line items, images, PDFs)
- Merchant branding support

### Security Model

**Two-layer encryption:**

1. **Link payload (AES-256-GCM)**
   - Encryption key stored in URL fragment
   - Fragment never sent to server
   - Server stores ciphertext it cannot decrypt

2. **Swap backup (PGP)**
   - Encrypted to merchant's PGP public key
   - Server stores backup it cannot decrypt
   - Only merchant can recover failed swaps

## Troubleshooting

### Build Issues

**Frontend build fails:**
- Check Node.js version: `node --version` (should be 18+)
- Clear node_modules: `rm -rf node_modules package-lock.json && npm install`
- Check for TypeScript errors: `cd frontend && npx tsc --noEmit`

**Backend build fails:**
- Check for TypeScript errors: `cd backend && npx tsc --noEmit`
- Verify SQLite is available on system

### Runtime Issues

**Frontend dev server won't start:**
- Check if port 8080 is available: `lsof -i :8080`
- Try different port: `cd frontend && PORT=3001 npm run dev`

**Backend dev server won't start:**
- Check if port 3000 is available: `lsof -i :3000`
- Verify database directory is writable

## Testing

### Frontend Tests
```bash
cd frontend
npm test
```

### Backend Tests
```bash
cd backend
npm test
```

### Run all tests
```bash
npm test
```

## Git Workflow

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make changes and commit: `git commit -m "Description"`
3. Push to remote: `git push origin feature/my-feature`
4. Create pull request on GitHub

## Resources

- [btcpos original repository](https://github.com/unique-org/btcpos)
- [lwk_wasm documentation](https://github.com/Blockstream/lwk)
- [Boltz API documentation](https://docs.boltz.exchange/)
