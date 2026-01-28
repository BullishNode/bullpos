/**
 * API client for swap backup operations
 */

import { EncryptedSwapBackup } from '../types/backup';

// Use relative URL to hit the same origin, or fallback to production API
const API_BASE_URL = 'https://api.btcpos.cash';

export interface BackupUploadResponse {
    success: boolean;
    backupId: string;
    swapId: string;
    timestamp: string;
}

export interface BackupUploadRequest {
    merchantId: string;
    encryptedData: string;
    swapId: string;
    timestamp: string;
    version: string;
}

/**
 * Upload encrypted swap backup to the backend
 * @param backup - The encrypted backup data
 * @param merchantId - The merchant's unique identifier
 * @returns Confirmation of successful backup storage
 * @throws Error if the upload fails
 */
export async function uploadSwapBackup(
    backup: EncryptedSwapBackup,
    merchantId: string
): Promise<BackupUploadResponse> {
    const url = `${API_BASE_URL}/api/backups`;

    const payload: BackupUploadRequest = {
        merchantId,
        encryptedData: backup.encryptedData,
        swapId: backup.swapId,
        timestamp: backup.timestamp,
        version: backup.version,
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => response.statusText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data: BackupUploadResponse = await response.json();

        if (!data.success) {
            throw new Error('Backup upload reported failure');
        }

        return data;
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to upload swap backup: ${error.message}`);
        }
        throw new Error('Failed to upload swap backup: Unknown error');
    }
}

/**
 * Retry an async operation with exponential backoff
 * @param operation - The async function to retry
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param initialDelay - Initial delay in ms before first retry (default: 1000)
 * @returns Result of the operation
 * @throws Error if all retries are exhausted
 */
export async function retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000
): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            // Don't retry on last attempt
            if (attempt === maxRetries) {
                break;
            }

            // Calculate exponential backoff: initialDelay * 2^attempt
            const delay = initialDelay * Math.pow(2, attempt);

            console.warn(
                `Backup upload attempt ${attempt + 1} failed, retrying in ${delay}ms...`,
                lastError.message
            );

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw new Error(
        `Failed after ${maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`
    );
}
