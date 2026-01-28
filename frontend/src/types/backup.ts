/**
 * Swap backup data structure for recovery purposes.
 * This data is encrypted with the merchant's PGP public key
 * so only they can decrypt and recover failed swaps.
 */
export interface SwapBackupData {
    /** Unique identifier for the swap */
    swapId: string;

    /** BIP39 mnemonic phrase for the Boltz swap wallet */
    mnemonic: string;

    /** Lightning invoice preimage (if available) */
    preimage?: string;

    /** Amount in satoshis (requested) */
    amountSatoshis: number;

    /** Requested amount in satoshis (same as amountSatoshis for backward compat) */
    requestedSats?: number;

    /** Actual received amount in satoshis after claim */
    receivedSats?: number;

    /** Lightning invoice bolt11 string */
    bolt11Invoice: string;

    /** ISO timestamp when the swap was created */
    timestamp: string;

    /** Optional metadata for merchant reference */
    metadata?: {
        fiatAmount?: number;
        currency?: string;
        description?: string;
    };
}

/**
 * Encrypted backup envelope containing the PGP-encrypted data
 */
export interface EncryptedSwapBackup {
    /** PGP encrypted message (armored format) */
    encryptedData: string;

    /** Swap ID for reference (not encrypted) */
    swapId: string;

    /** Timestamp when backup was created */
    timestamp: string;

    /** Version of the backup format */
    version: string;
}
