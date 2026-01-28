/**
 * URL Parser for Payment Links
 *
 * Payment links follow the format: btcpos.cash/p/{linkId}#{base64url_key}
 * - linkId: Unique identifier for the payment link
 * - base64url_key: AES encryption key (43 chars = 32 bytes)
 */

export interface PaymentLinkData {
    linkId: string;
    aesKey: string;
}

export interface ParseResult {
    success: boolean;
    data?: PaymentLinkData;
    error?: string;
}

/**
 * Validates if a string is a valid base64url-encoded AES key
 * Must be exactly 43 characters (32 bytes encoded in base64url)
 */
export function isValidAesKey(key: string): boolean {
    // Base64url uses: A-Z, a-z, 0-9, -, _
    // 32 bytes encoded in base64url = 43 characters (no padding)
    const base64urlPattern = /^[A-Za-z0-9_-]{43}$/;
    return base64urlPattern.test(key);
}

/**
 * Extracts the linkId from the URL path
 * Expected format: /p/{linkId}
 */
export function extractLinkId(pathname: string): string | null {
    const match = pathname.match(/^\/p\/([^/]+)$/);
    return match ? match[1] : null;
}

/**
 * Extracts the AES key from the URL fragment (hash)
 * The fragment contains just the key (without the # prefix)
 */
export function extractAesKey(hash: string): string | null {
    // Remove leading # if present
    const key = hash.startsWith('#') ? hash.slice(1) : hash;
    return key || null;
}

/**
 * Parses a payment link URL and extracts the linkId and AES key
 * Validates the format and returns appropriate errors
 */
export function parsePaymentLink(url: URL): ParseResult {
    // Extract linkId from path
    const linkId = extractLinkId(url.pathname);
    if (!linkId) {
        return {
            success: false,
            error: 'Invalid payment link format. Expected /p/{linkId}'
        };
    }

    // Extract AES key from fragment
    const aesKey = extractAesKey(url.hash);
    if (!aesKey) {
        return {
            success: false,
            error: 'Missing encryption key. Payment links must include the key in the URL fragment (after #)'
        };
    }

    // Validate AES key format
    if (!isValidAesKey(aesKey)) {
        return {
            success: false,
            error: 'Invalid encryption key format. Key must be 43 characters (base64url-encoded 32 bytes)'
        };
    }

    return {
        success: true,
        data: {
            linkId,
            aesKey
        }
    };
}

/**
 * Parses the current window location as a payment link
 */
export function parseCurrentPaymentLink(): ParseResult {
    return parsePaymentLink(new URL(window.location.href));
}
