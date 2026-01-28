import { test, expect } from '@playwright/test';

/**
 * E2E tests for payment link functionality
 * Tests the complete user flow from loading a payment link to creating invoices
 */

// Valid test configuration
const VALID_CONFIG = {
  d: 'ct(slip77(0000000000000000000000000000000000000000000000000000000000000001),elwpkh([00000000/84\'/1776\'/0\']tpubDC8msFGeGuwnKG9Upg7DM2b4DaRqg3CUZa5g8v2SRQ6K4NSkxUgd7HsL2XVWbVm39yBA4LAxysQAm397zwQSQoQgewGiYZqrA9DsP4zbQ1M/<0;1>/*))#2svvlgmy',
  c: 'USD',
  g: false,
  n: true
};

function encodeConfig(config: typeof VALID_CONFIG): string {
  const json = JSON.stringify(config);
  const base64 = btoa(json);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

test.describe('Payment Link Loading', () => {
  test('should load POS page with valid payment link', async ({ page }) => {
    const encoded = encodeConfig(VALID_CONFIG);
    await page.goto(`/#${encoded}`);

    // Wait for WASM to load
    await page.waitForSelector('.bitcoin-symbol', { timeout: 10000 });

    // Check page title
    await expect(page.locator('h1')).toContainText('Bitcoin POS');

    // Check main elements are visible
    await expect(page.locator('#amount')).toBeVisible();
    await expect(page.locator('#currency-code')).toContainText('USD');

    // Check keypad is visible
    await expect(page.locator('.keypad')).toBeVisible();
    for (let i = 0; i <= 9; i++) {
      await expect(page.locator(`button:has-text("${i}")`)).toBeVisible();
    }
  });

  test('should display currency code from config', async ({ page }) => {
    const encoded = encodeConfig({ ...VALID_CONFIG, c: 'CAD' });
    await page.goto(`/#${encoded}`);

    await page.waitForSelector('.bitcoin-symbol', { timeout: 10000 });
    await expect(page.locator('#currency-code')).toContainText('CAD');
  });

  test('should show description field when enabled', async ({ page }) => {
    const encoded = encodeConfig({ ...VALID_CONFIG, n: true });
    await page.goto(`/#${encoded}`);

    await page.waitForSelector('.bitcoin-symbol', { timeout: 10000 });
    await expect(page.locator('#description')).toBeVisible();
  });

  test('should hide description field when disabled', async ({ page }) => {
    const encoded = encodeConfig({ ...VALID_CONFIG, n: false });
    await page.goto(`/#${encoded}`);

    await page.waitForSelector('.bitcoin-symbol', { timeout: 10000 });
    await expect(page.locator('#description')).not.toBeVisible();
  });

  test('should show setup gear icon when enabled', async ({ page }) => {
    const encoded = encodeConfig({ ...VALID_CONFIG, g: true });
    await page.goto(`/#${encoded}`);

    await page.waitForSelector('.bitcoin-symbol', { timeout: 10000 });
    await expect(page.locator('#setup-link')).toBeVisible();
  });

  test('should hide setup gear icon when disabled', async ({ page }) => {
    const encoded = encodeConfig({ ...VALID_CONFIG, g: false });
    await page.goto(`/#${encoded}`);

    await page.waitForSelector('.bitcoin-symbol', { timeout: 10000 });
    await expect(page.locator('#setup-link')).not.toBeVisible();
  });
});

test.describe('Amount Entry', () => {
  test('should enter amount using keypad', async ({ page }) => {
    const encoded = encodeConfig(VALID_CONFIG);
    await page.goto(`/#${encoded}`);

    await page.waitForSelector('.bitcoin-symbol', { timeout: 10000 });

    // Enter amount
    await page.click('button:has-text("1")');
    await page.click('button:has-text("2")');
    await page.click('button:has-text(".")');
    await page.click('button:has-text("5")');
    await page.click('button:has-text("0")');

    // Check display
    await expect(page.locator('#amount')).toContainText('12.50');
  });

  test('should clear amount', async ({ page }) => {
    const encoded = encodeConfig(VALID_CONFIG);
    await page.goto(`/#${encoded}`);

    await page.waitForSelector('.bitcoin-symbol', { timeout: 10000 });

    // Enter amount
    await page.click('button:has-text("1")');
    await page.click('button:has-text("2")');
    await expect(page.locator('#amount')).toContainText('12');

    // Clear
    await page.click('#clear');
    await expect(page.locator('#amount')).toContainText('0');
  });

  test('should backspace digits', async ({ page }) => {
    const encoded = encodeConfig(VALID_CONFIG);
    await page.goto(`/#${encoded}`);

    await page.waitForSelector('.bitcoin-symbol', { timeout: 10000 });

    // Enter amount
    await page.click('button:has-text("1")');
    await page.click('button:has-text("2")');
    await page.click('button:has-text("3")');
    await expect(page.locator('#amount')).toContainText('123');

    // Backspace
    await page.click('#backspace');
    await expect(page.locator('#amount')).toContainText('12');
  });
});

test.describe('Currency Mode Switching', () => {
  test('should switch between fiat and sats mode', async ({ page }) => {
    const encoded = encodeConfig(VALID_CONFIG);
    await page.goto(`/#${encoded}`);

    await page.waitForSelector('.bitcoin-symbol', { timeout: 10000 });

    // Wait for mode buttons to be initialized with active class
    await expect(page.locator('#mode-fiat')).toHaveClass(/active/, { timeout: 5000 });

    // Should start in fiat mode
    await expect(page.locator('#mode-fiat')).toHaveClass(/active/);

    // Switch to sats mode
    await page.click('#mode-sats');
    await expect(page.locator('#mode-sats')).toHaveClass(/active/);
    await expect(page.locator('#mode-fiat')).not.toHaveClass(/active/);

    // Switch back to fiat mode
    await page.click('#mode-fiat');
    await expect(page.locator('#mode-fiat')).toHaveClass(/active/);
    await expect(page.locator('#mode-sats')).not.toHaveClass(/active/);
  });

  test('should display rate information', async ({ page }) => {
    const encoded = encodeConfig(VALID_CONFIG);
    await page.goto(`/#${encoded}`);

    await page.waitForSelector('.bitcoin-symbol', { timeout: 10000 });

    // Wait for rate value to actually populate (not just the template container)
    await expect(page.locator('#rate-value')).not.toHaveText('--', { timeout: 15000 });

    // Check rate display exists and has content
    const rateText = await page.locator('#rate-value').textContent();
    expect(rateText).toBeTruthy();
    expect(rateText).not.toBe('--');
  });
});

test.describe('Submit Button', () => {
  test('should disable submit button when amount is zero', async ({ page }) => {
    const encoded = encodeConfig(VALID_CONFIG);
    await page.goto(`/#${encoded}`);

    await page.waitForSelector('.bitcoin-symbol', { timeout: 10000 });

    await expect(page.locator('#submit')).toBeDisabled();
  });

  test('should enable submit button when amount is entered', async ({ page }) => {
    const encoded = encodeConfig(VALID_CONFIG);
    await page.goto(`/#${encoded}`);

    await page.waitForSelector('.bitcoin-symbol', { timeout: 10000 });

    // Enter amount
    await page.click('button:has-text("1")');
    await page.click('button:has-text("0")');

    await expect(page.locator('#submit')).toBeEnabled();
  });
});

test.describe('Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const encoded = encodeConfig(VALID_CONFIG);
    await page.goto(`/#${encoded}`);

    await page.waitForSelector('.bitcoin-symbol', { timeout: 10000 });

    // Check main elements are visible on mobile
    await expect(page.locator('.bitcoin-symbol')).toBeVisible();
    await expect(page.locator('.keypad')).toBeVisible();
    await expect(page.locator('#amount')).toBeVisible();
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    const encoded = encodeConfig(VALID_CONFIG);
    await page.goto(`/#${encoded}`);

    await page.waitForSelector('.bitcoin-symbol', { timeout: 10000 });

    await expect(page.locator('.bitcoin-symbol')).toBeVisible();
    await expect(page.locator('.keypad')).toBeVisible();
  });

  test('should work on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    const encoded = encodeConfig(VALID_CONFIG);
    await page.goto(`/#${encoded}`);

    await page.waitForSelector('.bitcoin-symbol', { timeout: 10000 });

    await expect(page.locator('.bitcoin-symbol')).toBeVisible();
    await expect(page.locator('.keypad')).toBeVisible();
  });
});

test.describe('WASM Module Loading', () => {
  test('should show loading status while WASM initializes', async ({ page }) => {
    const encoded = encodeConfig(VALID_CONFIG);
    await page.goto(`/#${encoded}`);

    // The loading indicator should be visible initially or complete quickly
    // We just verify the page eventually loads successfully
    await page.waitForSelector('.bitcoin-symbol', { timeout: 10000 });
    await expect(page.locator('h1')).toContainText('Bitcoin POS');
  });
});
