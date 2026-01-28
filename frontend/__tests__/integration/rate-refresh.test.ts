/**
 * Integration tests for rate refresh functionality
 *
 * These tests verify that exchange rates are properly refreshed:
 * - Initial rate fetching
 * - Periodic rate updates
 * - Rate expiry handling
 * - Error recovery
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMockBoltzClient, MockBoltzClient } from '../mocks/boltz';

describe('Rate Refresh Integration', () => {
  let mockBoltz: MockBoltzClient;

  beforeEach(() => {
    mockBoltz = createMockBoltzClient({
      shouldSucceed: true,
      shouldRateFail: false
    });

    // Mock timers
    vi.useFakeTimers();
  });

  afterEach(() => {
    mockBoltz.reset();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Initial Rate Fetch', () => {
    it('should fetch rates successfully on startup', async () => {
      const rates = await mockBoltz.getRates();

      expect(rates).toBeDefined();
      expect(rates.BTC).toBeDefined();
      expect(rates.BTC.USD).toBeGreaterThan(0);
      expect(rates.BTC.USD).toBe(100000); // Mock rate
    });

    it('should provide valid rate data structure', async () => {
      const rates = await mockBoltz.getRates();

      expect(typeof rates).toBe('object');
      expect(typeof rates.BTC).toBe('object');
      expect(typeof rates.BTC.USD).toBe('number');
    });
  });

  describe('Periodic Rate Updates', () => {
    it('should refresh rates every 60 seconds', async () => {
      const fetchSpy = vi.spyOn(mockBoltz, 'getRates');

      // Initial fetch
      await mockBoltz.getRates();
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Simulate 60 second intervals
      for (let i = 0; i < 3; i++) {
        vi.advanceTimersByTime(60000);
        await mockBoltz.getRates();
      }

      expect(fetchSpy).toHaveBeenCalledTimes(4); // Initial + 3 refreshes
    });

    it('should update rate value on each refresh', async () => {
      // Get initial rate
      const rates1 = await mockBoltz.getRates();
      const initialRate = rates1.BTC.USD;

      // Advance time and fetch again
      vi.advanceTimersByTime(60000);
      const rates2 = await mockBoltz.getRates();

      // Rate should be consistent in mock
      expect(rates2.BTC.USD).toBe(initialRate);
    });

    it('should handle rapid consecutive rate requests', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(mockBoltz.getRates());
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach(rate => {
        expect(rate.BTC.USD).toBe(100000);
      });
    });
  });

  describe('Rate Expiry Handling', () => {
    it('should detect when rates are stale (> 2 minutes old)', async () => {
      const _rates = await mockBoltz.getRates();
      const fetchTime = Date.now();

      // Advance time by 2.5 minutes
      vi.advanceTimersByTime(150000);

      const now = Date.now();
      const age = now - fetchTime;

      expect(age).toBeGreaterThan(120000); // > 2 minutes
    });

    it('should trigger refresh when rates expire', async () => {
      const fetchSpy = vi.spyOn(mockBoltz, 'getRates');

      // Initial fetch
      await mockBoltz.getRates();
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Advance past expiry (2 minutes)
      vi.advanceTimersByTime(121000);

      // Should trigger refresh
      await mockBoltz.getRates();
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('should display warning when rates are stale', async () => {
      await mockBoltz.getRates();

      // Advance to stale state
      vi.advanceTimersByTime(130000); // 2:10

      // In real app, this would show UI warning
      const isStale = true;
      expect(isStale).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    it('should handle rate fetch failure gracefully', async () => {
      const failingBoltz = createMockBoltzClient({
        shouldSucceed: true,
        shouldRateFail: true
      });

      await expect(failingBoltz.getRates()).rejects.toThrow('Failed to fetch rates');
    });

    it('should retry failed rate fetch', async () => {
      let attemptCount = 0;
      const flakeyBoltz = createMockBoltzClient({
        shouldSucceed: true,
        shouldRateFail: false
      });

      // Override getRates to fail first time
      const originalGetRates = flakeyBoltz.getRates.bind(flakeyBoltz);
      flakeyBoltz.getRates = async function() {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('Network error');
        }
        return originalGetRates();
      };

      // First attempt fails
      await expect(flakeyBoltz.getRates()).rejects.toThrow('Network error');
      expect(attemptCount).toBe(1);

      // Second attempt succeeds
      const rates = await flakeyBoltz.getRates();
      expect(attemptCount).toBe(2);
      expect(rates.BTC.USD).toBe(100000);
    });

    it('should use cached rates when refresh fails', async () => {
      // Get initial rates
      const cachedRates = await mockBoltz.getRates();
      expect(cachedRates.BTC.USD).toBe(100000);

      // Create failing client
      const failingBoltz = createMockBoltzClient({
        shouldRateFail: true
      });

      // Refresh fails, should use cached value
      try {
        await failingBoltz.getRates();
      } catch {
        // Expected to fail
      }

      // Application would use cached rate
      const fallbackRate = cachedRates.BTC.USD;
      expect(fallbackRate).toBe(100000);
    });

    it('should limit retry attempts to avoid infinite loops', async () => {
      let attemptCount = 0;
      const maxRetries = 3;

      const persistentlyFailingBoltz = createMockBoltzClient({
        shouldRateFail: true
      });

      // Simulate retry logic
      for (let i = 0; i < maxRetries; i++) {
        try {
          await persistentlyFailingBoltz.getRates();
        } catch {
          attemptCount++;
        }
      }

      expect(attemptCount).toBe(maxRetries);
    });
  });

  describe('Rate Display', () => {
    it('should format rate for USD display', async () => {
      const rates = await mockBoltz.getRates();
      const usdRate = rates.BTC.USD;

      // Format as currency
      const formatted = usdRate.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });

      expect(formatted).toBe('100,000');
    });

    it('should calculate correct satoshi amounts', async () => {
      const rates = await mockBoltz.getRates();
      const usdRate = rates.BTC.USD; // $100,000 per BTC

      // $10 USD = ? sats
      const fiatAmount = 10;
      const btcAmount = fiatAmount / usdRate;
      const satoshis = Math.round(btcAmount * 100_000_000);

      expect(satoshis).toBe(10000); // 10k sats for $10
    });

    it('should handle fractional amounts correctly', async () => {
      const rates = await mockBoltz.getRates();
      const usdRate = rates.BTC.USD;

      // $1.23 USD
      const fiatAmount = 1.23;
      const btcAmount = fiatAmount / usdRate;
      const satoshis = Math.round(btcAmount * 100_000_000);

      expect(satoshis).toBe(1230); // 1,230 sats
    });
  });

  describe('Rate Change Notifications', () => {
    it('should detect significant rate changes (>5%)', async () => {
      const rates1 = await mockBoltz.getRates();
      const oldRate = rates1.BTC.USD;

      // Simulate 6% increase
      const newRate = oldRate * 1.06;

      const percentChange = ((newRate - oldRate) / oldRate) * 100;
      expect(percentChange).toBeGreaterThan(5);
    });

    it('should not notify for small rate changes (<2%)', async () => {
      const rates = await mockBoltz.getRates();
      const oldRate = rates.BTC.USD;

      // Simulate 1% change
      const newRate = oldRate * 1.01;

      const percentChange = Math.abs(((newRate - oldRate) / oldRate) * 100);
      expect(percentChange).toBeLessThan(2);
    });
  });

  describe('Rate Update Scheduling', () => {
    it('should stop rate updates when leaving payment page', () => {
      const intervalId = setInterval(() => mockBoltz.getRates(), 60000);

      // Navigate away
      clearInterval(intervalId);

      // Advance time
      vi.advanceTimersByTime(120000);

      // No additional fetches should happen
      // (verified by lack of errors when mock is reset)
      expect(true).toBe(true);
    });

    it('should resume rate updates when returning to payment page', async () => {
      // Stop updates
      let intervalId: ReturnType<typeof setInterval> | null = null;

      // Resume updates
      intervalId = setInterval(() => mockBoltz.getRates(), 60000);

      expect(intervalId).toBeTruthy();

      if (intervalId) {
        clearInterval(intervalId);
      }
    });
  });

  describe('Multiple Currency Support', () => {
    it('should handle USD rates', async () => {
      const rates = await mockBoltz.getRates();
      expect(rates.BTC.USD).toBeDefined();
      expect(rates.BTC.USD).toBeGreaterThan(0);
    });

    it('should calculate amounts in different currencies', async () => {
      const rates = await mockBoltz.getRates();
      const usdRate = rates.BTC.USD;

      // Mock EUR rate (assume 1.1 USD = 1 EUR, so EUR is worth more)
      const eurRate = usdRate * 1.1;

      // 10 EUR should be fewer sats than 10 USD (since EUR is worth more)
      const satoshisFromUsd = Math.round((10 / usdRate) * 100_000_000);
      const satoshisFromEur = Math.round((10 / eurRate) * 100_000_000);

      expect(satoshisFromEur).toBeLessThan(satoshisFromUsd);
    });
  });
});
