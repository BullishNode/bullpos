/**
 * Backup service - orchestrates the backup creation, encryption, and upload flow
 */

import { SwapBackupData, EncryptedSwapBackup } from '../types/backup';
import { encryptSwapBackup, validatePGPPublicKey } from '../crypto/pgp';
import { fetchMerchantPGPKey } from '../api/merchants';
import { uploadSwapBackup, retryWithBackoff, BackupUploadResponse } from '../api/backups';

export interface CreateBackupOptions {
    /** Unique identifier for the swap */
    swapId: string;

    /** BIP39 mnemonic phrase for the Boltz swap wallet */
    mnemonic: string;

    /** Amount in satoshis */
    amountSatoshis: number;

    /** Lightning invoice bolt11 string */
    bolt11Invoice: string;

    /** Lightning invoice preimage (if available) */
    preimage?: string;

    /** Optional metadata for merchant reference */
    metadata?: {
        fiatAmount?: number;
        currency?: string;
        description?: string;
    };
}

/**
 * Create, encrypt, and upload a swap backup before displaying the invoice
 * This is a critical operation that must succeed before showing the invoice to the user
 *
 * @param merchantId - The merchant's unique identifier
 * @param options - Swap details to back up
 * @returns Confirmation of successful backup storage
 * @throws Error if any step fails (fetch key, encrypt, upload)
 */
export async function createAndUploadBackup(
    merchantId: string,
    options: CreateBackupOptions
): Promise<BackupUploadResponse> {
    // Step 1: Prepare backup data structure
    const backupData: SwapBackupData = {
        swapId: options.swapId,
        mnemonic: options.mnemonic,
        amountSatoshis: options.amountSatoshis,
        bolt11Invoice: options.bolt11Invoice,
        timestamp: new Date().toISOString(),
        preimage: options.preimage,
        metadata: options.metadata,
    };

    // Step 2: Fetch merchant's PGP public key
    let pgpPublicKey: string;
    try {
        pgpPublicKey = await fetchMerchantPGPKey(merchantId);
    } catch (error) {
        throw new Error(
            `Failed to fetch merchant PGP key: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }

    // Step 2.5: Validate PGP public key
    const isValidKey = await validatePGPPublicKey(pgpPublicKey);
    if (!isValidKey) {
        throw new Error('Merchant PGP public key is invalid or revoked');
    }

    // Step 3: Encrypt backup data with PGP
    let encryptedBackup: EncryptedSwapBackup;
    try {
        encryptedBackup = await encryptSwapBackup(backupData, pgpPublicKey);
    } catch (error) {
        throw new Error(
            `Failed to encrypt backup: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }

    // Step 4: Upload encrypted backup with retry logic
    try {
        const uploadResult = await retryWithBackoff(
            () => uploadSwapBackup(encryptedBackup, merchantId),
            3, // max 3 retries
            1000 // 1 second initial delay
        );

        console.log('✅ Backup uploaded successfully:', {
            backupId: uploadResult.backupId,
            swapId: uploadResult.swapId,
            timestamp: uploadResult.timestamp,
        });

        return uploadResult;
    } catch (error) {
        throw new Error(
            `Failed to upload backup after retries: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Validate that a backup was created successfully before proceeding
 * Throws an error with user-friendly message if validation fails
 *
 * @param result - The backup upload result to validate
 * @throws Error if backup is invalid
 */
export function validateBackupSuccess(result: BackupUploadResponse): void {
    if (!result.success) {
        throw new Error('Backup upload was not successful');
    }

    if (!result.backupId) {
        throw new Error('No backup ID returned from server');
    }

    if (!result.swapId) {
        throw new Error('Backup missing swap ID reference');
    }

    // All validation passed
    console.log('✅ Backup validation passed');
}
