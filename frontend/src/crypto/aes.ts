/**
 * AES-256-GCM encryption/decryption utilities using WebCrypto API
 *
 * This module provides functions for encrypting and decrypting payment link
 * payloads using AES-256-GCM (Galois/Counter Mode), which provides both
 * confidentiality and authenticity.
 */

import { base64UrlDecodeToBuffer } from '../utils/encoding';

/**
 * Error thrown when decryption fails
 */
export class DecryptionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DecryptionError';
    }
}

/**
 * Parameters for AES-256-GCM decryption
 */
export interface AesGcmParams {
    /** The base64url-encoded encryption key (256 bits / 32 bytes) */
    key: string;
    /** The base64url-encoded nonce/IV (96 bits / 12 bytes for GCM) */
    nonce: string;
    /** The base64url-encoded ciphertext with authentication tag */
    ciphertext: string;
}

/**
 * Import a raw AES-256 key from base64url string into WebCrypto
 *
 * @param keyBase64Url - Base64url-encoded key (must be 256 bits / 32 bytes)
 * @returns CryptoKey for use with WebCrypto API
 * @throws DecryptionError if key format is invalid
 */
export async function importAesKey(keyBase64Url: string): Promise<CryptoKey> {
    try {
        const keyBuffer = base64UrlDecodeToBuffer(keyBase64Url);

        // Verify key length (AES-256 requires 32 bytes)
        if (keyBuffer.byteLength !== 32) {
            throw new DecryptionError(
                `Invalid key length: expected 32 bytes (256 bits), got ${keyBuffer.byteLength} bytes`
            );
        }

        // Import the key for AES-GCM decryption
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyBuffer,
            { name: 'AES-GCM' },
            false, // not extractable
            ['decrypt', 'encrypt'] // key usages
        );

        return cryptoKey;
    } catch (error) {
        if (error instanceof DecryptionError) {
            throw error;
        }
        throw new DecryptionError(`Failed to import key: ${error}`);
    }
}

/**
 * Decrypt an AES-256-GCM encrypted payload
 *
 * @param params - Decryption parameters (key, nonce, ciphertext)
 * @returns Decrypted plaintext as a string
 * @throws DecryptionError if decryption fails (wrong key, corrupted data, etc.)
 */
export async function decryptAesGcm(params: AesGcmParams): Promise<string> {
    try {
        // Import the key
        const cryptoKey = await importAesKey(params.key);

        // Decode nonce and ciphertext from base64url
        const nonce = base64UrlDecodeToBuffer(params.nonce);
        const ciphertext = base64UrlDecodeToBuffer(params.ciphertext);

        // Verify nonce length (GCM typically uses 96 bits / 12 bytes)
        if (nonce.byteLength !== 12) {
            throw new DecryptionError(
                `Invalid nonce length: expected 12 bytes (96 bits), got ${nonce.byteLength} bytes`
            );
        }

        // Decrypt using AES-GCM
        const decryptedBuffer = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: nonce,
                tagLength: 128 // 128-bit authentication tag (default for GCM)
            },
            cryptoKey,
            ciphertext
        );

        // Convert decrypted bytes to string
        const decoder = new TextDecoder('utf-8');
        const plaintext = decoder.decode(decryptedBuffer);

        return plaintext;
    } catch (error) {
        if (error instanceof DecryptionError) {
            throw error;
        }

        // WebCrypto throws generic errors for authentication failures
        if (error instanceof DOMException) {
            throw new DecryptionError(
                'Decryption failed: invalid key, corrupted ciphertext, or authentication tag mismatch'
            );
        }

        throw new DecryptionError(`Decryption failed: ${error}`);
    }
}

/**
 * Decrypt and parse a JSON payload encrypted with AES-256-GCM
 *
 * @param params - Decryption parameters (key, nonce, ciphertext)
 * @returns Parsed JSON object
 * @throws DecryptionError if decryption or JSON parsing fails
 */
export async function decryptJsonPayload<T = unknown>(params: AesGcmParams): Promise<T> {
    try {
        const plaintext = await decryptAesGcm(params);

        // Parse JSON
        const parsed = JSON.parse(plaintext) as T;
        return parsed;
    } catch (error) {
        if (error instanceof DecryptionError) {
            throw error;
        }

        if (error instanceof SyntaxError) {
            throw new DecryptionError('Decrypted payload is not valid JSON');
        }

        throw new DecryptionError(`Failed to decrypt JSON payload: ${error}`);
    }
}

/**
 * Encrypt a string using AES-256-GCM
 *
 * @param plaintext - The string to encrypt
 * @param cryptoKey - The CryptoKey to use for encryption
 * @param nonce - The nonce/IV (should be random and unique for each encryption)
 * @returns Encrypted ciphertext as ArrayBuffer
 */
export async function encryptAesGcm(
    plaintext: string,
    cryptoKey: CryptoKey,
    nonce: ArrayBuffer
): Promise<ArrayBuffer> {
    try {
        // Encode plaintext to bytes
        const encoder = new TextEncoder();
        const plaintextBuffer = encoder.encode(plaintext);

        // Verify nonce length
        if (nonce.byteLength !== 12) {
            throw new DecryptionError(
                `Invalid nonce length: expected 12 bytes (96 bits), got ${nonce.byteLength} bytes`
            );
        }

        // Encrypt using AES-GCM
        const ciphertext = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: nonce,
                tagLength: 128
            },
            cryptoKey,
            plaintextBuffer
        );

        return ciphertext;
    } catch (error) {
        throw new DecryptionError(`Encryption failed: ${error}`);
    }
}
