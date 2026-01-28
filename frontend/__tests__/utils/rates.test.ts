import { describe, it, expect } from 'vitest'
import {
    fiatToSatoshis,
    satoshisToFiat,
    satoshiBucket,
    validateInvoicePayload,
    type InvoicePayload
} from '../../src/utils/rates'

describe('fiatToSatoshis', () => {
    it('should convert USD to satoshis at $100k/BTC', () => {
        const result = fiatToSatoshis(100, 100_000)
        expect(result).toBe(100_000) // $100 at $100k/BTC = 100k sats
    })

    it('should convert USD to satoshis at $50k/BTC', () => {
        const result = fiatToSatoshis(50, 50_000)
        expect(result).toBe(100_000) // $50 at $50k/BTC = 100k sats
    })

    it('should handle small amounts', () => {
        const result = fiatToSatoshis(1, 100_000)
        expect(result).toBe(1_000) // $1 at $100k/BTC = 1k sats
    })

    it('should handle large amounts', () => {
        const result = fiatToSatoshis(10_000, 100_000)
        expect(result).toBe(10_000_000) // $10k at $100k/BTC = 10M sats
    })

    it('should round to nearest satoshi', () => {
        const result = fiatToSatoshis(0.5, 100_000)
        expect(result).toBe(500) // $0.50 at $100k/BTC = 500 sats
        expect(Number.isInteger(result)).toBe(true)
    })

    it('should handle fractional results', () => {
        // $0.333 at $100k/BTC = 333.33... sats, should round to 333
        const result = fiatToSatoshis(0.333, 100_000)
        expect(result).toBe(333)
    })

    it('should return 0 for zero amount', () => {
        const result = fiatToSatoshis(0, 100_000)
        expect(result).toBe(0)
    })

    it('should return 0 for negative amount', () => {
        const result = fiatToSatoshis(-10, 100_000)
        expect(result).toBe(0)
    })

    it('should return 0 for zero rate', () => {
        const result = fiatToSatoshis(100, 0)
        expect(result).toBe(0)
    })

    it('should return 0 for negative rate', () => {
        const result = fiatToSatoshis(100, -100_000)
        expect(result).toBe(0)
    })

    it('should handle very high exchange rates', () => {
        const result = fiatToSatoshis(1, 1_000_000) // $1M/BTC
        expect(result).toBe(100) // $1 at $1M/BTC = 100 sats
    })

    it('should handle very low exchange rates', () => {
        const result = fiatToSatoshis(100, 10_000) // $10k/BTC
        expect(result).toBe(1_000_000) // $100 at $10k/BTC = 1M sats
    })
})

describe('satoshisToFiat', () => {
    it('should convert satoshis to USD at $100k/BTC', () => {
        const result = satoshisToFiat(100_000, 100_000)
        expect(result).toBe(100) // 100k sats at $100k/BTC = $100
    })

    it('should convert satoshis to USD at $50k/BTC', () => {
        const result = satoshisToFiat(100_000, 50_000)
        expect(result).toBe(50) // 100k sats at $50k/BTC = $50
    })

    it('should handle small amounts', () => {
        const result = satoshisToFiat(1_000, 100_000)
        expect(result).toBe(1) // 1k sats at $100k/BTC = $1
    })

    it('should handle large amounts', () => {
        const result = satoshisToFiat(10_000_000, 100_000)
        expect(result).toBe(10_000) // 10M sats at $100k/BTC = $10k
    })

    it('should handle fractional results', () => {
        const result = satoshisToFiat(500, 100_000)
        expect(result).toBe(0.5) // 500 sats at $100k/BTC = $0.50
    })

    it('should return 0 for zero satoshis', () => {
        const result = satoshisToFiat(0, 100_000)
        expect(result).toBe(0)
    })

    it('should return 0 for negative satoshis', () => {
        const result = satoshisToFiat(-1000, 100_000)
        expect(result).toBe(0)
    })

    it('should return 0 for zero rate', () => {
        const result = satoshisToFiat(100_000, 0)
        expect(result).toBe(0)
    })

    it('should return 0 for negative rate', () => {
        const result = satoshisToFiat(100_000, -100_000)
        expect(result).toBe(0)
    })

    it('should handle very high exchange rates', () => {
        const result = satoshisToFiat(100, 1_000_000) // $1M/BTC
        expect(result).toBe(1) // 100 sats at $1M/BTC = $1
    })

    it('should handle very low exchange rates', () => {
        const result = satoshisToFiat(1_000_000, 10_000) // $10k/BTC
        expect(result).toBe(100) // 1M sats at $10k/BTC = $100
    })

    it('should round-trip with fiatToSatoshis', () => {
        const originalFiat = 42.50
        const rate = 100_000
        const sats = fiatToSatoshis(originalFiat, rate)
        const convertedBack = satoshisToFiat(sats, rate)
        expect(convertedBack).toBeCloseTo(originalFiat, 2)
    })
})

describe('satoshiBucket', () => {
    it('should categorize 0-999 as 0-1k', () => {
        expect(satoshiBucket(0)).toBe('0-1k')
        expect(satoshiBucket(500)).toBe('0-1k')
        expect(satoshiBucket(999)).toBe('0-1k')
    })

    it('should categorize 1k-9999 as 1k-10k', () => {
        expect(satoshiBucket(1_000)).toBe('1k-10k')
        expect(satoshiBucket(5_000)).toBe('1k-10k')
        expect(satoshiBucket(9_999)).toBe('1k-10k')
    })

    it('should categorize 10k-99999 as 10k-100k', () => {
        expect(satoshiBucket(10_000)).toBe('10k-100k')
        expect(satoshiBucket(50_000)).toBe('10k-100k')
        expect(satoshiBucket(99_999)).toBe('10k-100k')
    })

    it('should categorize 100k-999999 as 100k-1M', () => {
        expect(satoshiBucket(100_000)).toBe('100k-1M')
        expect(satoshiBucket(500_000)).toBe('100k-1M')
        expect(satoshiBucket(999_999)).toBe('100k-1M')
    })

    it('should categorize 1M+ as 1M+', () => {
        expect(satoshiBucket(1_000_000)).toBe('1M+')
        expect(satoshiBucket(10_000_000)).toBe('1M+')
        expect(satoshiBucket(100_000_000)).toBe('1M+')
    })

    it('should handle negative values', () => {
        // Negative values should still return a bucket (edge case)
        expect(satoshiBucket(-100)).toBe('0-1k')
    })
})

describe('validateInvoicePayload', () => {
    const validPayload: InvoicePayload = {
        fiatAmount: 100.50,
        currency: 'USD',
        satoshis: 100_000,
        description: 'Test payment',
        timestamp: new Date().toISOString()
    }

    it('should validate a correct payload', () => {
        expect(validateInvoicePayload(validPayload)).toBe(true)
    })

    it('should validate payload with null description', () => {
        const payload = { ...validPayload, description: null }
        expect(validateInvoicePayload(payload)).toBe(true)
    })

    it('should reject null payload', () => {
        expect(validateInvoicePayload(null)).toBe(false)
    })

    it('should reject undefined payload', () => {
        expect(validateInvoicePayload(undefined)).toBe(false)
    })

    it('should reject non-object payload', () => {
        expect(validateInvoicePayload('string')).toBe(false)
        expect(validateInvoicePayload(123)).toBe(false)
        expect(validateInvoicePayload(true)).toBe(false)
    })

    it('should reject missing fiatAmount', () => {
        const payload = { ...validPayload }
        delete (payload as Partial<InvoicePayload>).fiatAmount
        expect(validateInvoicePayload(payload)).toBe(false)
    })

    it('should reject non-number fiatAmount', () => {
        const payload = { ...validPayload, fiatAmount: '100' }
        expect(validateInvoicePayload(payload)).toBe(false)
    })

    it('should reject negative fiatAmount', () => {
        const payload = { ...validPayload, fiatAmount: -100 }
        expect(validateInvoicePayload(payload)).toBe(false)
    })

    it('should accept zero fiatAmount', () => {
        const payload = { ...validPayload, fiatAmount: 0 }
        expect(validateInvoicePayload(payload)).toBe(true)
    })

    it('should reject missing currency', () => {
        const payload = { ...validPayload }
        delete (payload as Partial<InvoicePayload>).currency
        expect(validateInvoicePayload(payload)).toBe(false)
    })

    it('should reject non-string currency', () => {
        const payload = { ...validPayload, currency: 123 }
        expect(validateInvoicePayload(payload)).toBe(false)
    })

    it('should reject currency with wrong length', () => {
        expect(validateInvoicePayload({ ...validPayload, currency: 'US' })).toBe(false)
        expect(validateInvoicePayload({ ...validPayload, currency: 'USDD' })).toBe(false)
        expect(validateInvoicePayload({ ...validPayload, currency: '' })).toBe(false)
    })

    it('should accept valid 3-letter currency codes', () => {
        expect(validateInvoicePayload({ ...validPayload, currency: 'EUR' })).toBe(true)
        expect(validateInvoicePayload({ ...validPayload, currency: 'GBP' })).toBe(true)
        expect(validateInvoicePayload({ ...validPayload, currency: 'CAD' })).toBe(true)
    })

    it('should reject missing satoshis', () => {
        const payload = { ...validPayload }
        delete (payload as Partial<InvoicePayload>).satoshis
        expect(validateInvoicePayload(payload)).toBe(false)
    })

    it('should reject non-number satoshis', () => {
        const payload = { ...validPayload, satoshis: '100000' }
        expect(validateInvoicePayload(payload)).toBe(false)
    })

    it('should reject zero satoshis', () => {
        const payload = { ...validPayload, satoshis: 0 }
        expect(validateInvoicePayload(payload)).toBe(false)
    })

    it('should reject negative satoshis', () => {
        const payload = { ...validPayload, satoshis: -100 }
        expect(validateInvoicePayload(payload)).toBe(false)
    })

    it('should reject fractional satoshis', () => {
        const payload = { ...validPayload, satoshis: 100.5 }
        expect(validateInvoicePayload(payload)).toBe(false)
    })

    it('should reject non-string description', () => {
        const payload = { ...validPayload, description: 123 }
        expect(validateInvoicePayload(payload)).toBe(false)
    })

    it('should accept empty string description', () => {
        const payload = { ...validPayload, description: '' }
        expect(validateInvoicePayload(payload)).toBe(true)
    })

    it('should reject missing timestamp', () => {
        const payload = { ...validPayload }
        delete (payload as Partial<InvoicePayload>).timestamp
        expect(validateInvoicePayload(payload)).toBe(false)
    })

    it('should reject non-string timestamp', () => {
        const payload = { ...validPayload, timestamp: 123456789 }
        expect(validateInvoicePayload(payload)).toBe(false)
    })

    it('should reject invalid timestamp string', () => {
        expect(validateInvoicePayload({ ...validPayload, timestamp: 'not a date' })).toBe(false)
        expect(validateInvoicePayload({ ...validPayload, timestamp: '2024-13-45' })).toBe(false)
    })

    it('should accept valid ISO 8601 timestamps', () => {
        expect(validateInvoicePayload({
            ...validPayload,
            timestamp: '2024-01-15T10:30:00Z'
        })).toBe(true)
        expect(validateInvoicePayload({
            ...validPayload,
            timestamp: '2024-01-15T10:30:00.123Z'
        })).toBe(true)
    })
})
