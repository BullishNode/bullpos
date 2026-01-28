/**
 * URL-safe Base64 encoding/decoding utilities for POS configuration
 */

/**
 * Encode a string to URL-safe base64 format
 * Replaces +, /, and = characters with URL-safe equivalents
 */
export function base64UrlEncode(str: string): string {
    const base64 = btoa(str);
    return base64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

/**
 * Decode a URL-safe base64 string
 * Restores +, /, and = characters from URL-safe format
 */
export function base64UrlDecode(str: string): string {
    // Add padding back
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
        base64 += '=';
    }
    return atob(base64);
}

/**
 * POS Configuration interface
 */
export interface POSConfig {
    d: string; // descriptor
    c: string; // currency code (alpha3)
    g?: boolean; // show gear (optional, defaults to false)
    n?: boolean; // show note/description (optional, defaults to true)
}

/**
 * Encode POS configuration into a URL-safe base64 string
 * Only includes optional fields if they differ from defaults to keep URLs shorter
 */
export function encodeConfig(
    descriptor: string,
    currency: string,
    showGear: boolean,
    showDescription: boolean
): string {
    const config: POSConfig = { d: descriptor, c: currency };
    // Only include 'g' if true to keep URL shorter when false (default)
    if (showGear) {
        config.g = true;
    }
    // Only include 'n' if false to keep URL shorter when true (default)
    if (!showDescription) {
        config.n = false;
    }
    return base64UrlEncode(JSON.stringify(config));
}

/**
 * Decode a POS configuration from a URL-safe base64 string
 * Returns null if the string is invalid or malformed
 */
export function decodeConfig(encoded: string): POSConfig | null {
    try {
        const json = base64UrlDecode(encoded);
        const config = JSON.parse(json) as POSConfig;
        if (typeof config.d !== 'string' || typeof config.c !== 'string') {
            return null;
        }
        // Default showGear to false if not present
        if (typeof config.g !== 'boolean') {
            config.g = false;
        }
        // Default showDescription to true if not present
        if (typeof config.n !== 'boolean') {
            config.n = true;
        }
        return config;
    } catch {
        return null;
    }
}
