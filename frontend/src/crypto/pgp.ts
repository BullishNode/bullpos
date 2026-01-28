/**
 * PGP encryption utilities for swap backup data
 * Uses OpenPGP.js to encrypt sensitive swap information with merchant's public key
 */

import * as openpgp from 'openpgp';
import { SwapBackupData, EncryptedSwapBackup } from '../types/backup';

const BACKUP_FORMAT_VERSION = '1.0.0';

/**
 * Encrypt swap backup data with a PGP public key
 * @param backupData - The swap backup data to encrypt
 * @param pgpPublicKeyArmored - The merchant's PGP public key in armored format
 * @returns Encrypted backup envelope
 * @throws Error if encryption fails or key is invalid
 */
export async function encryptSwapBackup(
    backupData: SwapBackupData,
    pgpPublicKeyArmored: string
): Promise<EncryptedSwapBackup> {
    try {
        // Parse the PGP public key
        const publicKey = await openpgp.readKey({ armoredKey: pgpPublicKeyArmored });

        // Convert backup data to JSON string
        const message = await openpgp.createMessage({ text: JSON.stringify(backupData, null, 2) });

        // Encrypt the message
        const encrypted = await openpgp.encrypt({
            message,
            encryptionKeys: publicKey,
        });

        // Return encrypted backup envelope
        return {
            encryptedData: encrypted as string,
            swapId: backupData.swapId,
            timestamp: new Date().toISOString(),
            version: BACKUP_FORMAT_VERSION,
        };
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to encrypt swap backup: ${error.message}`);
        }
        throw new Error('Failed to encrypt swap backup: Unknown error');
    }
}

/**
 * Validate that a PGP public key is well-formed
 * @param pgpPublicKeyArmored - The PGP public key in armored format
 * @returns true if valid, false otherwise
 */
export async function validatePGPPublicKey(pgpPublicKeyArmored: string): Promise<boolean> {
    try {
        const publicKey = await openpgp.readKey({ armoredKey: pgpPublicKeyArmored });
        // Check if key is valid and not revoked
        return !(await publicKey.isRevoked());
    } catch {
        return false;
    }
}

/**
 * Create swap backup data from invoice and wallet information
 * @param swapId - Unique swap identifier
 * @param mnemonic - BIP39 mnemonic for the Boltz swap wallet
 * @param bolt11Invoice - Lightning invoice string
 * @param amountSatoshis - Amount in satoshis
 * @param preimage - Optional preimage
 * @param metadata - Optional metadata (fiat amount, currency, description)
 * @returns SwapBackupData object ready for encryption
 */
export function createSwapBackupData(
    swapId: string,
    mnemonic: string,
    bolt11Invoice: string,
    amountSatoshis: number,
    preimage?: string,
    metadata?: {
        fiatAmount?: number;
        currency?: string;
        description?: string;
    }
): SwapBackupData {
    return {
        swapId,
        mnemonic,
        preimage,
        amountSatoshis,
        bolt11Invoice,
        timestamp: new Date().toISOString(),
        metadata,
    };
}
