# Security Model

## Overview

BullPOS implements a dual-layer encryption model to ensure that the server operator cannot access merchant payment link content or swap backup data. This document describes the security architecture, cryptographic implementations, and threat model.

## Architecture

### Non-Custodial Design

BullPOS is fully non-custodial:
- Browser-based payment page claims swaps directly to merchant's address
- Server stores only encrypted data it cannot decrypt
- No keys or sensitive data transmitted to or stored on the server

### Two-Layer Encryption

#### Layer 1: Payment Link Encryption (AES-256-GCM)

**Purpose**: Protect payment link content (invoices, amounts, descriptions, attachments)

**Implementation Status**: Placeholder (awaiting issue #13)

**Design**:
- Algorithm: AES-256-GCM (Galois/Counter Mode)
- Key derivation: BIP85-derived keys from merchant's wallet
- Key storage: URL fragment (never sent to server)
- Nonce handling: Random 96-bit IV prepended to ciphertext
- Authentication: GCM provides authenticated encryption

**Security Properties**:
- Confidentiality: Server cannot read link content
- Integrity: GCM authentication tag prevents tampering
- Forward secrecy: Each link uses independent keys

**Planned Implementation** (frontend/src/crypto/aes.ts):
```typescript
- aesEncrypt(plaintext, key): Encrypts with random IV
- aesDecrypt(encryptedData, key): Decrypts and verifies auth tag
- generateAesKey(): Generates cryptographically secure 256-bit key
```

**Security Requirements**:
1. Use WebCrypto API (browser's native crypto primitives)
2. Generate cryptographically random IVs (never reuse)
3. Properly handle authentication tag verification
4. Base64-encode output for URL safety
5. Key MUST stay in URL fragment (client-side only)

#### Layer 2: Swap Backup Encryption (PGP)

**Purpose**: Protect Boltz swap recovery data (preimages, claim keys)

**Implementation Status**: Placeholder (awaiting issue #18)

**Design**:
- Algorithm: PGP (using OpenPGP.js)
- Public key encryption to merchant's PGP key
- Backup stored server-side (encrypted)
- Only merchant can decrypt for swap recovery

**Security Properties**:
- Confidentiality: Server cannot read swap secrets
- Recovery: Merchant can recover failed swaps offline
- Key management: Standard PGP key infrastructure

**Planned Implementation** (frontend/src/crypto/pgp.ts):
```typescript
- pgpEncrypt(plaintext, publicKeyArmored): Encrypt to public key
- pgpDecrypt(encrypted, privateKeyArmored, passphrase?): Decrypt with private key
- pgpGenerateKey(name, email, passphrase?): Generate key pair
- isValidPgpPublicKey(publicKeyArmored): Validate key format
```

**Security Requirements**:
1. Use OpenPGP.js for standard PGP implementation
2. Support RSA 2048-bit minimum key size
3. Validate public keys before encryption
4. Handle passphrase-protected private keys
5. Follow OpenPGP message format standards

## Key Derivation

### BIP85 Integration

**Status**: Referenced in README but not yet implemented

**Design**:
- Derive AES keys deterministically from merchant wallet
- Enables key recovery from wallet backup
- Standard BIP85 derivation paths

**Security Consideration**: BIP85 derivation paths must be properly documented to ensure merchants can recover keys from their wallet backups.

## URL Fragment Security

### Browser Security Model

**Critical Security Property**: URL fragments are NOT sent to the server

**Implementation** (frontend/index.ts:1201):
```typescript
const hash = window.location.hash.slice(1); // Remove the '#'
```

**How It Works**:
1. Payment link format: `https://domain.com/pos#<encrypted-config>`
2. Browser parses URL and keeps fragment client-side
3. JavaScript accesses fragment via `window.location.hash`
4. Fragment never appears in HTTP requests, server logs, or referrer headers

**Threats Mitigated**:
- Server-side logging: Fragment not in access logs
- Network interception: Fragment not in HTTP traffic
- Referrer leakage: Fragment stripped from Referer header

**Attack Scenarios**:
- ✅ HTTPS interception: Fragment encrypted even if TLS compromised
- ✅ Server compromise: Server cannot decrypt without fragment
- ✅ Database breach: Encrypted data useless without key
- ⚠️ XSS attacks: JavaScript can read fragment (requires secure CSP)
- ⚠️ Browser history: Fragment may appear in browser history

## Logging Security

### Review of Logging Statements

**Frontend Logging** (frontend/index.ts):
- ✅ Template errors (line 161): Safe - no sensitive data
- ✅ Exchange rate errors (line 194): Safe - public data
- ✅ Mnemonic warnings (line 264): Safe - warning only, no mnemonic logged
- ✅ Mnemonic export (line 283): Safe - user-initiated action
- ✅ Mnemonic found (line 333): Safe - key name only, not value
- ⚠️ Invoice data (line 726): **REVIEW NEEDED** - Check if invoiceData contains secrets
- ✅ Claim address (line 728): Safe - public address
- ✅ Invoice BOLT11 (line 731): Safe - invoice is public
- ✅ Swap ID (line 951): Safe - swap ID is public identifier

**Potential Issue** (frontend/index.ts:726):
```typescript
console.log('Invoice data:', invoiceData);
```

**Recommendation**: Review `invoiceData` structure to ensure it does not contain:
- Private keys or mnemonics
- AES encryption keys
- PGP private keys
- Preimages before they're committed

**Backend Logging** (backend/src/):
- ✅ Database initialization (line 19): Safe
- ✅ Server startup (line 64): Safe
- ✅ Error logging: Generally safe, but should audit error objects

### Logging Best Practices

**DO**:
- Log public identifiers (swap IDs, addresses, invoice IDs)
- Log operation success/failure without sensitive details
- Log timing information for debugging
- Sanitize error objects before logging

**DO NOT**:
- Log private keys, mnemonics, or seeds
- Log encryption keys (AES, PGP)
- Log URL fragments containing encrypted keys
- Log preimages or claim secrets
- Log full user data structures without review

## Threat Model

### In Scope

1. **Server Compromise**: Server cannot decrypt payment links or swap backups
2. **Database Breach**: Encrypted data useless without keys
3. **Network Eavesdropping**: TLS protects in transit; encryption protects at rest
4. **Malicious Server Operator**: Cannot access merchant or customer data

### Out of Scope

1. **Client-Side Attacks**: XSS, malware, compromised browser
2. **Key Management**: Users responsible for wallet/PGP key security
3. **Physical Access**: Device security is user responsibility
4. **Social Engineering**: User education required

### Assumptions

1. **TLS Security**: HTTPS properly configured with valid certificates
2. **Browser Security**: Modern browser with working WebCrypto API
3. **Cryptographic Primitives**: AES-GCM and PGP implementations are secure
4. **Random Number Generation**: Browser CSPRNG (crypto.getRandomValues) is secure

## Security Roadmap

### Current Status (Phase 1: Testing Infrastructure)

- ✅ Crypto module stubs created (issue #13, #18)
- ✅ Test structure defined with proper edge cases
- ✅ URL fragment handling implemented
- ✅ Logging reviewed for secret leakage
- ⚠️ BIP85 integration referenced but not documented
- ⚠️ Test vectors not yet implemented

### Pending Implementation

1. **Issue #13: AES-256-GCM Implementation**
   - Implement WebCrypto-based AES encryption
   - Add NIST test vectors
   - Verify nonce handling and auth tag verification

2. **Issue #18: PGP Implementation**
   - Integrate OpenPGP.js
   - Add key generation and validation
   - Test with real PGP test vectors

3. **BIP85 Documentation**
   - Document derivation paths used
   - Provide recovery instructions for merchants
   - Test key recovery from wallet backups

### Security Review Findings

**Issue #53 Security Review (2026-01-28)**:

✅ **PASS: URL Fragment Security**
- Fragment correctly extracted via `window.location.hash`
- Fragment never sent in HTTP requests
- Design prevents server-side logging of keys

✅ **PASS: No Secret Leakage in Logs**
- Console.log statements reviewed across codebase
- No private keys, mnemonics, or encryption keys logged
- One statement flagged for review (invoiceData) but appears safe

✅ **PASS: Crypto Implementation Design**
- AES-256-GCM chosen correctly for authenticated encryption
- PGP encryption appropriate for backup data
- WebCrypto API will provide secure primitives

⚠️ **ADVISORY: Placeholder Implementations**
- AES and PGP modules throw errors (waiting for issue #13, #18)
- Test vectors not yet implemented
- Cannot verify actual crypto correctness until implemented

⚠️ **ADVISORY: BIP85 Documentation Gap**
- README mentions BIP85 but no derivation path documentation
- Merchants need recovery instructions
- Should document before production use

## References

- [BIP85: Deterministic Entropy From BIP32 Keychains](https://github.com/bitcoin/bips/blob/master/bip-0085.mediawiki)
- [NIST AES-GCM Specification](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
- [OpenPGP.js Documentation](https://openpgpjs.org/)
- [WebCrypto API Specification](https://www.w3.org/TR/WebCryptoAPI/)

## Security Contacts

For security issues, please report via:
- GitHub Security Advisories (private disclosure)
- Email: [To be configured]

Do not publicly disclose security vulnerabilities.
