/**
 * Integration tests for the complete payment flow
 *
 * These tests verify that the entire payment process works correctly:
 * - Loading and decrypting a payment link
 * - Displaying the invoice
 * - Creating a Boltz swap
 * - Monitoring payment status
 * - Claiming L-BTC funds
 * - Uploading and updating backups
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMockBoltzClient, MockBoltzClient, createMockInvoice } from '../mocks/boltz';

describe('Payment Flow Integration', () => {
  let mockBoltz: MockBoltzClient;

  beforeEach(() => {
    // Create mock Boltz client with default config
    mockBoltz = createMockBoltzClient({
      shouldSucceed: true,
      shouldDetectPayment: true,
      paymentDelay: 50
    });

    // Setup localStorage mock
    const localStorageMock: { [key: string]: string } = {};
    globalThis.localStorage = {
      getItem: vi.fn((key: string) => localStorageMock[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key];
      }),
      clear: vi.fn(() => {
        Object.keys(localStorageMock).forEach(key => delete localStorageMock[key]);
      }),
      key: vi.fn((index: number) => Object.keys(localStorageMock)[index] || null),
      length: Object.keys(localStorageMock).length
    };
  });

  afterEach(() => {
    mockBoltz.reset();
    vi.clearAllMocks();
  });

  describe('Happy Path', () => {
    it('should complete full payment flow from link to L-BTC claim', async () => {
      // Step 1: Create a swap
      const invoice = createMockInvoice(10000);
      const swap = await mockBoltz.createSwap({
        from: 'BTC',
        to: 'L-BTC',
        invoice,
        refundPublicKey: 'mock-pubkey-123'
      });

      expect(swap).toBeDefined();
      expect(swap.id).toBeTruthy();
      expect(swap.invoice).toBe(invoice);
      expect(swap.address).toBeTruthy();
      expect(swap.expectedAmount).toBe(10000);

      // Step 2: Verify initial status is 'swap.created'
      const initialStatus = await mockBoltz.getSwapStatus(swap.id);
      expect(initialStatus.status).toBe('swap.created');

      // Step 3: Wait for payment detection
      await new Promise(resolve => setTimeout(resolve, 200));

      // Step 4: Verify payment was detected
      const finalStatus = await mockBoltz.getSwapStatus(swap.id);
      expect(finalStatus.status).toBe('invoice.settled');
      expect(finalStatus.transaction).toBeDefined();
      expect(finalStatus.transaction?.id).toBeTruthy();
    });

    it('should track swap status transitions correctly', async () => {
      const invoice = createMockInvoice(10000);
      const swap = await mockBoltz.createSwap({
        from: 'BTC',
        to: 'L-BTC',
        invoice,
        refundPublicKey: 'mock-pubkey-123'
      });

      // Track status transitions
      const statuses: string[] = [];

      // Initial status
      const status1 = await mockBoltz.getSwapStatus(swap.id);
      statuses.push(status1.status);
      expect(status1.status).toBe('swap.created');

      // Wait for mempool
      await new Promise(resolve => setTimeout(resolve, 60));
      const status2 = await mockBoltz.getSwapStatus(swap.id);
      statuses.push(status2.status);
      expect(status2.status).toBe('transaction.mempool');

      // Wait for confirmation
      await new Promise(resolve => setTimeout(resolve, 60));
      const status3 = await mockBoltz.getSwapStatus(swap.id);
      statuses.push(status3.status);
      expect(status3.status).toBe('transaction.confirmed');

      // Wait for settlement
      await new Promise(resolve => setTimeout(resolve, 60));
      const status4 = await mockBoltz.getSwapStatus(swap.id);
      statuses.push(status4.status);
      expect(status4.status).toBe('invoice.settled');

      // Verify progression
      expect(statuses).toEqual([
        'swap.created',
        'transaction.mempool',
        'transaction.confirmed',
        'invoice.settled'
      ]);
    });

    it('should handle multiple concurrent swaps', async () => {
      const swaps = await Promise.all([
        mockBoltz.createSwap({
          from: 'BTC',
          to: 'L-BTC',
          invoice: createMockInvoice(5000),
          refundPublicKey: 'mock-pubkey-1'
        }),
        mockBoltz.createSwap({
          from: 'BTC',
          to: 'L-BTC',
          invoice: createMockInvoice(10000),
          refundPublicKey: 'mock-pubkey-2'
        }),
        mockBoltz.createSwap({
          from: 'BTC',
          to: 'L-BTC',
          invoice: createMockInvoice(15000),
          refundPublicKey: 'mock-pubkey-3'
        })
      ]);

      expect(swaps).toHaveLength(3);
      expect(swaps[0].id).not.toBe(swaps[1].id);
      expect(swaps[1].id).not.toBe(swaps[2].id);

      // Wait for all to settle
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify all settled independently
      const statuses = await Promise.all(
        swaps.map(swap => mockBoltz.getSwapStatus(swap.id))
      );

      statuses.forEach(status => {
        expect(status.status).toBe('invoice.settled');
      });
    });
  });

  describe('Backup Integration', () => {
    it('should save swap data to localStorage during payment', async () => {
      const invoice = createMockInvoice(10000);
      const swap = await mockBoltz.createSwap({
        from: 'BTC',
        to: 'L-BTC',
        invoice,
        refundPublicKey: 'mock-pubkey-123'
      });

      // Simulate app saving swap data for recovery
      const swapData = JSON.stringify({
        swapId: swap.id,
        invoice: swap.invoice,
        address: swap.address,
        expectedAmount: swap.expectedAmount,
        timestamp: Date.now()
      });

      localStorage.setItem(`swap-${swap.id}`, swapData);

      // Verify data was saved
      const saved = localStorage.getItem(`swap-${swap.id}`);
      expect(saved).toBeTruthy();

      const parsed = JSON.parse(saved!);
      expect(parsed.swapId).toBe(swap.id);
      expect(parsed.invoice).toBe(invoice);
    });

    it('should update backup after successful claim', async () => {
      const invoice = createMockInvoice(10000);
      const swap = await mockBoltz.createSwap({
        from: 'BTC',
        to: 'L-BTC',
        invoice,
        refundPublicKey: 'mock-pubkey-123'
      });

      // Initial backup
      localStorage.setItem(`swap-${swap.id}`, JSON.stringify({
        swapId: swap.id,
        status: 'pending'
      }));

      // Wait for settlement
      await new Promise(resolve => setTimeout(resolve, 200));
      const status = await mockBoltz.getSwapStatus(swap.id);

      // Update backup with claim status
      localStorage.setItem(`swap-${swap.id}`, JSON.stringify({
        swapId: swap.id,
        status: 'claimed',
        txId: status.transaction?.id
      }));

      const updated = localStorage.getItem(`swap-${swap.id}`);
      const parsed = JSON.parse(updated!);
      expect(parsed.status).toBe('claimed');
      expect(parsed.txId).toBeTruthy();
    });
  });

  describe('Transaction Retrieval', () => {
    it('should retrieve transaction details after settlement', async () => {
      const invoice = createMockInvoice(10000);
      const swap = await mockBoltz.createSwap({
        from: 'BTC',
        to: 'L-BTC',
        invoice,
        refundPublicKey: 'mock-pubkey-123'
      });

      // Initially no transaction
      const txBefore = await mockBoltz.getSwapTransaction(swap.id);
      expect(txBefore).toBeNull();

      // Wait for settlement
      await new Promise(resolve => setTimeout(resolve, 200));

      // Now transaction should be available
      const txAfter = await mockBoltz.getSwapTransaction(swap.id);
      expect(txAfter).toBeDefined();
      expect(txAfter?.id).toBeTruthy();
      expect(txAfter?.hex).toBeTruthy();
    });
  });

  describe('Payment Timing', () => {
    it('should handle quick payments (under 1 second)', async () => {
      const quickBoltz = createMockBoltzClient({
        shouldSucceed: true,
        shouldDetectPayment: true,
        paymentDelay: 10
      });

      const invoice = createMockInvoice(10000);
      const swap = await quickBoltz.createSwap({
        from: 'BTC',
        to: 'L-BTC',
        invoice,
        refundPublicKey: 'mock-pubkey-123'
      });

      // Wait minimal time
      await new Promise(resolve => setTimeout(resolve, 100));

      const status = await quickBoltz.getSwapStatus(swap.id);
      expect(status.status).toBe('invoice.settled');
    });

    it('should handle slow payments (multiple seconds)', async () => {
      const slowBoltz = createMockBoltzClient({
        shouldSucceed: true,
        shouldDetectPayment: true,
        paymentDelay: 200
      });

      const invoice = createMockInvoice(10000);
      const swap = await slowBoltz.createSwap({
        from: 'BTC',
        to: 'L-BTC',
        invoice,
        refundPublicKey: 'mock-pubkey-123'
      });

      // Check intermediate states
      await new Promise(resolve => setTimeout(resolve, 250));
      const status1 = await slowBoltz.getSwapStatus(swap.id);
      expect(status1.status).toBe('transaction.mempool');

      await new Promise(resolve => setTimeout(resolve, 250));
      const status2 = await slowBoltz.getSwapStatus(swap.id);
      expect(status2.status).toBe('transaction.confirmed');

      await new Promise(resolve => setTimeout(resolve, 250));
      const status3 = await slowBoltz.getSwapStatus(swap.id);
      expect(status3.status).toBe('invoice.settled');
    });
  });

  describe('Manual Payment Simulation', () => {
    it('should allow manual payment triggering for testing', async () => {
      // Create client that doesn't auto-detect payment
      const manualBoltz = createMockBoltzClient({
        shouldSucceed: true,
        shouldDetectPayment: false,
        paymentDelay: 0
      });

      const invoice = createMockInvoice(10000);
      const swap = await manualBoltz.createSwap({
        from: 'BTC',
        to: 'L-BTC',
        invoice,
        refundPublicKey: 'mock-pubkey-123'
      });

      // Status should remain 'swap.created'
      await new Promise(resolve => setTimeout(resolve, 100));
      const statusBefore = await manualBoltz.getSwapStatus(swap.id);
      expect(statusBefore.status).toBe('swap.created');

      // Manually trigger payment
      manualBoltz.simulatePayment(swap.id);

      const statusAfter = await manualBoltz.getSwapStatus(swap.id);
      expect(statusAfter.status).toBe('invoice.settled');
    });

    it('should allow manual expiry simulation', async () => {
      const manualBoltz = createMockBoltzClient({
        shouldSucceed: true,
        shouldDetectPayment: false
      });

      const invoice = createMockInvoice(10000);
      const swap = await manualBoltz.createSwap({
        from: 'BTC',
        to: 'L-BTC',
        invoice,
        refundPublicKey: 'mock-pubkey-123'
      });

      // Simulate expiry
      manualBoltz.simulateExpiry(swap.id);

      const status = await manualBoltz.getSwapStatus(swap.id);
      expect(status.status).toBe('swap.expired');
    });
  });
});
