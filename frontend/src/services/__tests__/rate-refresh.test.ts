import { describe, it, expect, vi, beforeEach } from 'vitest'
import { refreshRateAndSwap, cancelOldSwap } from '../rate-refresh'
import type * as lwk from 'lwk_wasm'

// Mock the state module
vi.mock('../../../state', () => ({
  getPricesFetcher: vi.fn(),
  setExchangeRate: vi.fn(),
  getBoltzSession: vi.fn(),
}))

describe('rate-refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('refreshRateAndSwap', () => {
    it('should throw error if PricesFetcher not initialized', async () => {
      const { getPricesFetcher } = await import('../../../state')
      vi.mocked(getPricesFetcher).mockReturnValue(null)

      await expect(
        refreshRateAndSwap(100, 'USD', 'test', {} as lwk.Address)
      ).rejects.toThrow('PricesFetcher not initialized')
    })

    it('should throw error if BoltzSession not initialized', async () => {
      const { getPricesFetcher, getBoltzSession } = await import('../../../state')

      const mockPricesFetcher = {
        rates: vi.fn(),
      } as unknown as lwk.PricesFetcher

      vi.mocked(getPricesFetcher).mockReturnValue(mockPricesFetcher)
      vi.mocked(getBoltzSession).mockReturnValue(null)

      await expect(
        refreshRateAndSwap(100, 'USD', 'test', {} as lwk.Address)
      ).rejects.toThrow('BoltzSession not initialized')
    })

    it('should fetch new rate and create new swap', async () => {
      const { getPricesFetcher, getBoltzSession, setExchangeRate } = await import('../../../state')

      const mockRates = {
        median: vi.fn().mockReturnValue(50000), // 1 BTC = 50,000 USD
      }

      const mockPricesFetcher = {
        rates: vi.fn().mockResolvedValue(mockRates),
      } as unknown as lwk.PricesFetcher

      const mockInvoice = {
        bolt11Invoice: vi.fn().mockReturnValue({ toString: () => 'lnbc...' }),
        swapId: vi.fn().mockReturnValue('swap123'),
      } as unknown as lwk.InvoiceResponse

      const mockBoltzSession = {
        invoice: vi.fn().mockResolvedValue(mockInvoice),
      } as unknown as lwk.BoltzSession

      vi.mocked(getPricesFetcher).mockReturnValue(mockPricesFetcher)
      vi.mocked(getBoltzSession).mockReturnValue(mockBoltzSession)

      const result = await refreshRateAndSwap(
        100, // $100 USD
        'USD',
        'Test payment',
        {} as lwk.Address
      )

      // Verify exchange rate was fetched
      expect(mockPricesFetcher.rates).toHaveBeenCalled()
      expect(mockRates.median).toHaveBeenCalled()

      // Verify exchange rate was updated in state
      expect(setExchangeRate).toHaveBeenCalledWith(50000)

      // Verify correct satoshi calculation
      // $100 / $50,000 = 0.002 BTC = 200,000 sats
      expect(result.satoshis).toBe(200000)
      expect(result.fiatAmount).toBe(100)
      expect(result.exchangeRate).toBe(50000)

      // Verify new swap was created
      expect(mockBoltzSession.invoice).toHaveBeenCalledWith(
        BigInt(200000),
        'Test payment',
        expect.anything()
      )

      expect(result.invoice).toBe(mockInvoice)
    })

    it('should round satoshi amounts correctly', async () => {
      const { getPricesFetcher, getBoltzSession } = await import('../../../state')

      const mockRates = {
        median: vi.fn().mockReturnValue(45123.45), // Awkward rate
      }

      const mockPricesFetcher = {
        rates: vi.fn().mockResolvedValue(mockRates),
      } as unknown as lwk.PricesFetcher

      const mockInvoice = {
        bolt11Invoice: vi.fn().mockReturnValue({ toString: () => 'lnbc...' }),
        swapId: vi.fn().mockReturnValue('swap123'),
      } as unknown as lwk.InvoiceResponse

      const mockBoltzSession = {
        invoice: vi.fn().mockResolvedValue(mockInvoice),
      } as unknown as lwk.BoltzSession

      vi.mocked(getPricesFetcher).mockReturnValue(mockPricesFetcher)
      vi.mocked(getBoltzSession).mockReturnValue(mockBoltzSession)

      const result = await refreshRateAndSwap(
        100,
        'USD',
        'Test',
        {} as lwk.Address
      )

      // Should round to nearest integer satoshi
      expect(Number.isInteger(result.satoshis)).toBe(true)
    })
  })

  describe('cancelOldSwap', () => {
    it('should log swap cancellation', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log')

      const mockInvoice = {
        swapId: vi.fn().mockReturnValue('swap123'),
      } as unknown as lwk.InvoiceResponse

      await cancelOldSwap(mockInvoice)

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Cancelling old swap: swap123'
      )
    })

    it('should handle errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error')

      const mockInvoice = {
        swapId: vi.fn().mockImplementation(() => {
          throw new Error('Swap ID error')
        }),
      } as unknown as lwk.InvoiceResponse

      // Should not throw
      await expect(cancelOldSwap(mockInvoice)).resolves.toBeUndefined()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to cancel old swap:',
        expect.any(Error)
      )
    })
  })
})
