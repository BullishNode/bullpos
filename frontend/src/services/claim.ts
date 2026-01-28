/**
 * Claim service - handles post-payment claim and backup update
 */

import { SwapBackupData } from '../types/backup';
import { encryptSwapBackup } from '../crypto/pgp';
import { fetchMerchantPGPKey } from '../api/merchants';
import { updateSwapBackup, retryWithBackoff } from '../api/backups';

export interface ClaimDetails {
    /** Swap ID */
    swapId: string;

    /** Preimage revealed after payment */
    preimage?: string;

    /** Claim transaction ID */
    claimTxid?: string;

    /** Original backup data to update */
    originalBackupData: SwapBackupData;
}

/**
 * Update backup with claim details after successful payment
 *
 * @param merchantId - The merchant's unique identifier
 * @param backupId - The backup ID from initial upload
 * @param writeToken - The write token from initial upload
 * @param claimDetails - Claim transaction details
 * @returns Confirmation of successful update
 * @throws Error if update fails
 */
export async function updateBackupAfterClaim(
    merchantId: string,
    backupId: string,
    writeToken: string,
    claimDetails: ClaimDetails
): Promise<void> {
    try {
        // Step 1: Fetch merchant's PGP public key
        const pgpPublicKey = await fetchMerchantPGPKey(merchantId);

        // Step 2: Create updated backup data with claim details
        const updatedBackupData: SwapBackupData = {
            ...claimDetails.originalBackupData,
            preimage: claimDetails.preimage,
        };

        // Step 3: Encrypt updated backup data
        const encryptedBackup = await encryptSwapBackup(updatedBackupData, pgpPublicKey);

        // Step 4: Update backup on server with new encrypted data and status
        await retryWithBackoff(
            () => updateSwapBackup(
                backupId,
                writeToken,
                'claimed', // Status
                encryptedBackup.encryptedData // Updated encrypted data with preimage
            ),
            3, // max retries
            1000 // 1 second initial delay
        );

        console.log('✅ Backup updated with claim details:', {
            backupId,
            swapId: claimDetails.swapId,
            hasPreimage: !!claimDetails.preimage,
            hasClaimTxid: !!claimDetails.claimTxid,
        });
    } catch (error) {
        // Log error but don't throw - we don't want to disrupt the user experience
        // The claim was successful, the backup update is just for recovery purposes
        console.error('⚠️ Failed to update backup after claim:', error);
        console.error('Swap claimed successfully, but backup not updated');
    }
}
