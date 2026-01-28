/**
 * Mock Boltz API for integration testing
 *
 * This mock simulates the Boltz swap service behavior without making real API calls.
 * It provides controlled responses for testing the payment flow.
 */

export interface MockBoltzConfig {
  /** Should the swap creation succeed? */
  shouldSucceed?: boolean;
  /** Should payment detection succeed? */
  shouldDetectPayment?: boolean;
  /** Delay before detecting payment (ms) */
  paymentDelay?: number;
  /** Should rate refresh fail? */
  shouldRateFail?: boolean;
}

export interface MockSwapResponse {
  id: string;
  invoice: string;
  address: string;
  timeoutBlockHeight: number;
  expectedAmount: number;
  bip21: string;
}

export interface MockSwapStatus {
  status: 'swap.created' | 'transaction.mempool' | 'transaction.confirmed' | 'invoice.settled' | 'swap.expired';
  transaction?: {
    id: string;
    hex: string;
  };
}

/**
 * Mock Boltz client for testing
 */
export class MockBoltzClient {
  private config: MockBoltzConfig;
  private activeSwaps: Map<string, MockSwapResponse>;
  private swapStatuses: Map<string, MockSwapStatus['status']>;

  constructor(config: MockBoltzConfig = {}) {
    this.config = {
      shouldSucceed: true,
      shouldDetectPayment: true,
      paymentDelay: 100,
      shouldRateFail: false,
      ...config
    };
    this.activeSwaps = new Map();
    this.swapStatuses = new Map();
  }

  /**
   * Create a new submarine swap (Lightning -> Liquid)
   */
  async createSwap(params: {
    from: 'BTC';
    to: 'L-BTC';
    invoice: string;
    refundPublicKey: string;
    pairHash?: string;
  }): Promise<MockSwapResponse> {
    if (!this.config.shouldSucceed) {
      throw new Error('Failed to create swap');
    }

    const swapId = `mock-swap-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const response: MockSwapResponse = {
      id: swapId,
      invoice: params.invoice,
      address: 'lq1mock_liquid_address_for_testing_purposes_only',
      timeoutBlockHeight: 1000000,
      expectedAmount: 10000, // 10k sats
      bip21: `liquidnetwork:lq1mock?amount=0.0001&label=Boltz`
    };

    this.activeSwaps.set(swapId, response);
    this.swapStatuses.set(swapId, 'swap.created');

    // Simulate payment detection after delay
    if (this.config.shouldDetectPayment) {
      setTimeout(() => {
        this.swapStatuses.set(swapId, 'transaction.mempool');
        setTimeout(() => {
          this.swapStatuses.set(swapId, 'transaction.confirmed');
          setTimeout(() => {
            this.swapStatuses.set(swapId, 'invoice.settled');
          }, this.config.paymentDelay || 100);
        }, this.config.paymentDelay || 100);
      }, this.config.paymentDelay || 100);
    }

    return response;
  }

  /**
   * Get swap status
   */
  async getSwapStatus(swapId: string): Promise<MockSwapStatus> {
    const status = this.swapStatuses.get(swapId) || 'swap.created';

    if (status === 'transaction.mempool' || status === 'transaction.confirmed' || status === 'invoice.settled') {
      return {
        status,
        transaction: {
          id: `mock-tx-${swapId}`,
          hex: '0200000000...mock...transaction...hex'
        }
      };
    }

    return { status };
  }

  /**
   * Get current exchange rates
   */
  async getRates(): Promise<{ BTC: { USD: number } }> {
    if (this.config.shouldRateFail) {
      throw new Error('Failed to fetch rates');
    }

    return {
      BTC: {
        USD: 100000 // $100k per BTC for easy testing
      }
    };
  }

  /**
   * Get swap transaction details
   */
  async getSwapTransaction(swapId: string): Promise<{ hex: string; id: string } | null> {
    const status = this.swapStatuses.get(swapId);

    if (status === 'transaction.mempool' || status === 'transaction.confirmed' || status === 'invoice.settled') {
      return {
        id: `mock-tx-${swapId}`,
        hex: '0200000000...mock...transaction...hex'
      };
    }

    return null;
  }

  /**
   * Simulate payment completion
   */
  simulatePayment(swapId: string): void {
    if (this.swapStatuses.has(swapId)) {
      this.swapStatuses.set(swapId, 'invoice.settled');
    }
  }

  /**
   * Simulate swap expiry
   */
  simulateExpiry(swapId: string): void {
    if (this.swapStatuses.has(swapId)) {
      this.swapStatuses.set(swapId, 'swap.expired');
    }
  }

  /**
   * Reset all swaps (for test cleanup)
   */
  reset(): void {
    this.activeSwaps.clear();
    this.swapStatuses.clear();
  }
}

/**
 * Create a mock Boltz client with optional configuration
 */
export function createMockBoltzClient(config?: MockBoltzConfig): MockBoltzClient {
  return new MockBoltzClient(config);
}

/**
 * Mock invoice for testing
 */
export function createMockInvoice(amount: number = 10000): string {
  // Generate a realistic-looking mock invoice
  const timestamp = Math.floor(Date.now() / 1000);
  return `lnbc${amount}n1mock${timestamp}pp${Math.random().toString(36).substring(2, 15)}`;
}
