/**
 * Payment Link Page
 *
 * Displays a payment link page that shows encrypted payment information
 * The page extracts the link ID from the path and the AES key from the URL fragment
 */

import { parseCurrentPaymentLink } from '../utils/url-parser';

/**
 * Initializes and renders the payment link page
 * This function is called when a user visits a /p/{linkId} URL
 */
export function initPaymentLinkPage(): void {
    // Parse the payment link from the current URL
    const parseResult = parseCurrentPaymentLink();

    if (!parseResult.success) {
        // Show error page if parsing failed
        renderPaymentLinkError(parseResult.error || 'Unknown error');
        return;
    }

    const { linkId, aesKey } = parseResult.data!;

    // TODO: Fetch encrypted payment data from backend using linkId
    // TODO: Decrypt payment data using aesKey
    // TODO: Display payment information to user

    // For now, render a placeholder page showing the extracted data
    renderPaymentLinkPlaceholder(linkId, aesKey);
}

/**
 * Renders a placeholder payment link page (to be replaced with actual implementation)
 */
function renderPaymentLinkPlaceholder(linkId: string, aesKey: string): void {
    const app = document.getElementById('app');
    if (!app) return;

    app.innerHTML = `
        <div style="padding: 2rem; max-width: 600px; margin: 0 auto;">
            <h1>Payment Link</h1>
            <div style="margin: 2rem 0; padding: 1rem; background: #f0f0f0; border-radius: 8px;">
                <p><strong>Link ID:</strong> ${escapeHtml(linkId)}</p>
                <p><strong>AES Key:</strong> ${escapeHtml(aesKey.slice(0, 10))}... (${aesKey.length} chars)</p>
                <p style="margin-top: 1rem; color: #666;">
                    ✓ URL parsed successfully<br>
                    ✓ Link ID extracted from path<br>
                    ✓ AES key extracted from fragment<br>
                    ✓ Key format validated (43 chars base64url)
                </p>
            </div>
            <p style="color: #888; font-size: 0.9rem;">
                This is a placeholder page. The actual implementation will:
            </p>
            <ul style="color: #888; font-size: 0.9rem;">
                <li>Fetch encrypted payment data from the backend</li>
                <li>Decrypt the data using the AES key</li>
                <li>Display the payment amount and details</li>
                <li>Show a QR code and invoice for payment</li>
            </ul>
        </div>
    `;
}

/**
 * Renders an error page for payment link parsing failures
 */
function renderPaymentLinkError(errorMessage: string): void {
    const app = document.getElementById('app');
    if (!app) return;

    app.innerHTML = `
        <div style="padding: 2rem; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #e11d48;">Payment Link Error</h1>
            <div style="margin: 2rem 0; padding: 1rem; background: #fee; border-radius: 8px; border-left: 4px solid #e11d48;">
                <p><strong>Error:</strong> ${escapeHtml(errorMessage)}</p>
            </div>
            <p style="color: #888;">
                Please check that you have the complete payment link URL, including the encryption key after the # symbol.
            </p>
            <p style="color: #888;">
                Expected format: <code>btcpos.cash/p/{linkId}#{key}</code>
            </p>
        </div>
    `;
}

/**
 * Escapes HTML to prevent XSS
 */
function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
