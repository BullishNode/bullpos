/**
 * Base64url encoding/decoding utilities
 *
 * Base64url is a URL-safe variant of Base64 encoding that:
 * - Replaces + with -
 * - Replaces / with _
 * - Removes padding (=)
 */

/**
 * Encode a string to base64url format
 * @param str - The string to encode
 * @returns Base64url encoded string
 */
export function base64UrlEncode(str: string): string {
    const base64 = btoa(str);
    return base64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

/**
 * Decode a base64url string
 * @param str - The base64url encoded string
 * @returns Decoded string
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
 * Decode a base64url string to ArrayBuffer
 * @param str - The base64url encoded string
 * @returns ArrayBuffer containing the decoded bytes
 */
export function base64UrlDecodeToBuffer(str: string): ArrayBuffer {
    const decoded = base64UrlDecode(str);
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
        bytes[i] = decoded.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Encode an ArrayBuffer to base64url format
 * @param buffer - The ArrayBuffer to encode
 * @returns Base64url encoded string
 */
export function base64UrlEncodeBuffer(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return base64UrlEncode(binary);
}
