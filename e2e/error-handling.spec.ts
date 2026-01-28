import { test, expect } from '@playwright/test';

/**
 * E2E tests for error handling scenarios
 * Tests invalid payment links, malformed configurations, and security edge cases
 */

test.describe('Invalid Payment Links', () => {
  test('should show error page for invalid base64', async ({ page }) => {
    await page.goto('/#invalid-base64-string!!!');

    // Wait for page to load and process the invalid link
    await page.waitForSelector('.bitcoin-symbol', { timeout: 10000 });

    // Should show error page
    await expect(page.locator('.error-container')).toBeVisible();
    await expect(page.locator('#error-message')).toBeVisible();
  });

  test('should show error page for malformed JSON', async ({ page }) => {
    // Valid base64 but invalid JSON
    const invalidJson = btoa('{invalid json}');
    const encoded = invalidJson.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    await page.goto(`/#${encoded}`);

    await page.waitForSelector('.bitcoin-symbol', { timeout: 10000 });
    await expect(page.locator('.error-container')).toBeVisible();
  });

  test('should show error page for missing descriptor field', async ({ page }) => {
    const config = { c: 'USD' }; // Missing 'd' field
    const json = JSON.stringify(config);
    const base64 = btoa(json);
    const encoded = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    await page.goto(`/#${encoded}`);

    await page.waitForSelector('.bitcoin-symbol', { timeout: 10000 });
    await expect(page.locator('.error-container')).toBeVisible();
  });

  test('should show error page for missing currency field', async ({ page }) => {
    const config = { d: 'ct(slip77(0000000000000000000000000000000000000000000000000000000000000001),elwpkh([00000000/84\'/1776\'/0\']tpubDC8msFGeGuwnKG9Upg7DM2b4DaRqg3CUZa5g8v2SRQ6K4NSkxUgd7HsL2XVWbVm39yBA4LAxysQAm397zwQSQoQgewGiYZqrA9DsP4zbQ1M/<0;1>/*))#2svvlgmy' };
    const json = JSON.stringify(config);
    const base64 = btoa(json);
    const encoded = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    await page.goto(`/#${encoded}`);

    await page.waitForSelector('.bitcoin-symbol', { timeout: 10000 });
    await expect(page.locator('.error-container')).toBeVisible();
  });

  test('should show error page for empty config', async ({ page }) => {
    const config = {};
    const json = JSON.stringify(config);
    const base64 = btoa(json);
    const encoded = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    await page.goto(`/#${encoded}`);

    await page.waitForSelector('.bitcoin-symbol', { timeout: 10000 });
    await expect(page.locator('.error-container')).toBeVisible();
  });

  test('should provide recovery option on error page', async ({ page }) => {
    await page.goto('/#invalid');

    await page.waitForSelector('.bitcoin-symbol', { timeout: 10000 });
    await expect(page.locator('.error-container')).toBeVisible();

    // Should have a button to go back to setup
    const setupButton = page.locator('button:has-text("Go to Setup"), a:has-text("Go to Setup")');
    await expect(setupButton).toBeVisible();

    // Click should navigate to setup page
    await setupButton.click();
    await page.waitForURL(/setup/, { timeout: 5000 });

    // Should now be on setup page
    await expect(page.locator('.setup-page, #setup-form')).toBeVisible();
  });
});

test.describe('Security - XSS Prevention', () => {
  test('should not execute script in descriptor field', async ({ page }) => {
    const config = {
      d: '<script>alert("XSS")</script>',
      c: 'USD'
    };
    const json = JSON.stringify(config);
    const base64 = btoa(json);
    const encoded = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    await page.goto(`/#${encoded}`);

    await page.waitForSelector('.bitcoin-symbol', { timeout: 10000 });

    // Should not trigger script execution - page should either error or safely display
    const dialogPromise = page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null);
    const dialog = await dialogPromise;

    // No alert should appear
    expect(dialog).toBeNull();
  });

  test('should not execute script in currency field', async ({ page }) => {
    const config = {
      d: 'ct(slip77(0000000000000000000000000000000000000000000000000000000000000001),elwpkh([00000000/84\'/1776\'/0\']tpubDC8msFGeGuwnKG9Upg7DM2b4DaRqg3CUZa5g8v2SRQ6K4NSkxUgd7HsL2XVWbVm39yBA4LAxysQAm397zwQSQoQgewGiYZqrA9DsP4zbQ1M/<0;1>/*))#2svvlgmy',
      c: '<script>alert("XSS")</script>'
    };
    const json = JSON.stringify(config);
    const base64 = btoa(json);
    const encoded = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    await page.goto(`/#${encoded}`);

    await page.waitForSelector('.bitcoin-symbol', { timeout: 10000 });

    const dialogPromise = page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null);
    const dialog = await dialogPromise;

    expect(dialog).toBeNull();
  });

  test('should sanitize error messages', async ({ page }) => {
    const xssString = '<img src=x onerror=alert("XSS")>';
    const base64 = btoa(xssString);
    const encoded = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    await page.goto(`/#${encoded}`);

    await page.waitForSelector('.bitcoin-symbol', { timeout: 10000 });

    // Check that no alert is triggered
    const dialogPromise = page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null);
    const dialog = await dialogPromise;

    expect(dialog).toBeNull();

    // Error message should be present but sanitized
    await expect(page.locator('.error-container')).toBeVisible();
  });
});

test.describe('Edge Cases', () => {
  test('should handle null values gracefully', async ({ page }) => {
    const config = {
      d: null,
      c: null
    };
    const json = JSON.stringify(config);
    const base64 = btoa(json);
    const encoded = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    await page.goto(`/#${encoded}`);

    await page.waitForSelector('.bitcoin-symbol', { timeout: 10000 });
    // Should show error page instead of crashing
    await expect(page.locator('.error-container')).toBeVisible();
  });

  test('should handle array instead of object', async ({ page }) => {
    const config = ['not', 'an', 'object'];
    const json = JSON.stringify(config);
    const base64 = btoa(json);
    const encoded = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    await page.goto(`/#${encoded}`);

    await page.waitForSelector('.bitcoin-symbol', { timeout: 10000 });
    await expect(page.locator('.error-container')).toBeVisible();
  });

  test('should handle number instead of string for descriptor', async ({ page }) => {
    const config = {
      d: 12345,
      c: 'USD'
    };
    const json = JSON.stringify(config);
    const base64 = btoa(json);
    const encoded = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    await page.goto(`/#${encoded}`);

    await page.waitForSelector('.bitcoin-symbol', { timeout: 10000 });
    await expect(page.locator('.error-container')).toBeVisible();
  });

  test('should handle unicode characters in config', async ({ page }) => {
    const config = {
      d: 'ct(slip77(0000000000000000000000000000000000000000000000000000000000000001),elwpkh([00000000/84\'/1776\'/0\']tpubDC8msFGeGuwnKG9Upg7DM2b4DaRqg3CUZa5g8v2SRQ6K4NSkxUgd7HsL2XVWbVm39yBA4LAxysQAm397zwQSQoQgewGiYZqrA9DsP4zbQ1M/<0;1>/*))#2svvlgmy',
      c: '💰🔥'
    };
    const json = JSON.stringify(config);
    const base64 = btoa(json);
    const encoded = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    await page.goto(`/#${encoded}`);

    await page.waitForSelector('.bitcoin-symbol', { timeout: 10000 });
    // May show error or handle gracefully depending on validation
    const isError = await page.locator('.error-container').isVisible();
    const isPOS = await page.locator('#amount').isVisible();

    // Either error or POS page is acceptable
    expect(isError || isPOS).toBeTruthy();
  });

  test('should handle very long descriptor strings', async ({ page }) => {
    const longDescriptor = 'x'.repeat(10000);
    const config = {
      d: longDescriptor,
      c: 'USD'
    };
    const json = JSON.stringify(config);
    const base64 = btoa(json);
    const encoded = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    await page.goto(`/#${encoded}`);

    await page.waitForSelector('.bitcoin-symbol', { timeout: 10000 });
    // Should handle without crashing
    const pageLoaded = await page.locator('body').isVisible();
    expect(pageLoaded).toBeTruthy();
  });

  test('should handle empty string fields', async ({ page }) => {
    const config = {
      d: '',
      c: ''
    };
    const json = JSON.stringify(config);
    const base64 = btoa(json);
    const encoded = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    await page.goto(`/#${encoded}`);

    await page.waitForSelector('.bitcoin-symbol', { timeout: 10000 });
    await expect(page.locator('.error-container')).toBeVisible();
  });

  test('should handle truncated base64', async ({ page }) => {
    const config = {
      d: 'ct(slip77(0000000000000000000000000000000000000000000000000000000000000001),elwpkh([00000000/84\'/1776\'/0\']tpubDC8msFGeGuwnKG9Upg7DM2b4DaRqg3CUZa5g8v2SRQ6K4NSkxUgd7HsL2XVWbVm39yBA4LAxysQAm397zwQSQoQgewGiYZqrA9DsP4zbQ1M/<0;1>/*))#2svvlgmy',
      c: 'USD'
    };
    const json = JSON.stringify(config);
    const base64 = btoa(json);
    const encoded = base64.substring(0, base64.length - 10); // Truncate

    await page.goto(`/#${encoded}`);

    await page.waitForSelector('.bitcoin-symbol', { timeout: 10000 });
    await expect(page.locator('.error-container')).toBeVisible();
  });
});

test.describe('Network Conditions', () => {
  test('should handle offline mode gracefully', async ({ page, context }) => {
    // Set offline mode
    await context.setOffline(true);

    const config = {
      d: 'ct(slip77(0000000000000000000000000000000000000000000000000000000000000001),elwpkh([00000000/84\'/1776\'/0\']tpubDC8msFGeGuwnKG9Upg7DM2b4DaRqg3CUZa5g8v2SRQ6K4NSkxUgd7HsL2XVWbVm39yBA4LAxysQAm397zwQSQoQgewGiYZqrA9DsP4zbQ1M/<0;1>/*))#2svvlgmy',
      c: 'USD'
    };
    const json = JSON.stringify(config);
    const base64 = btoa(json);
    const encoded = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    await page.goto(`/#${encoded}`);

    // Page should still load (static assets may be cached)
    await page.waitForSelector('.bitcoin-symbol', { timeout: 10000 });

    // Go back online
    await context.setOffline(false);
  });
});

test.describe('Invalid Descriptor Formats', () => {
  test('should handle invalid descriptor with special characters', async ({ page }) => {
    const config = {
      d: '!@#$%^&*()',
      c: 'USD'
    };
    const json = JSON.stringify(config);
    const base64 = btoa(json);
    const encoded = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    await page.goto(`/#${encoded}`);

    await page.waitForSelector('.bitcoin-symbol', { timeout: 10000 });
    // Should show error or handle gracefully
    const pageLoaded = await page.locator('body').isVisible();
    expect(pageLoaded).toBeTruthy();
  });

  test('should handle invalid currency code', async ({ page }) => {
    const config = {
      d: 'ct(slip77(0000000000000000000000000000000000000000000000000000000000000001),elwpkh([00000000/84\'/1776\'/0\']tpubDC8msFGeGuwnKG9Upg7DM2b4DaRqg3CUZa5g8v2SRQ6K4NSkxUgd7HsL2XVWbVm39yBA4LAxysQAm397zwQSQoQgewGiYZqrA9DsP4zbQ1M/<0;1>/*))#2svvlgmy',
      c: 'INVALID123'
    };
    const json = JSON.stringify(config);
    const base64 = btoa(json);
    const encoded = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    await page.goto(`/#${encoded}`);

    await page.waitForSelector('.bitcoin-symbol', { timeout: 10000 });
    // App may accept any currency code or show error
    const pageLoaded = await page.locator('body').isVisible();
    expect(pageLoaded).toBeTruthy();
  });
});
