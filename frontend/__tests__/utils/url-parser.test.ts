import { describe, it, expect } from 'vitest'
import {
    base64UrlEncode,
    base64UrlDecode,
    encodeConfig,
    decodeConfig
} from '../../src/utils/url-parser'

describe('base64UrlEncode', () => {
    it('should encode a simple string', () => {
        const input = 'hello world'
        const result = base64UrlEncode(input)
        expect(result).toBe('aGVsbG8gd29ybGQ')
    })

    it('should replace + with -', () => {
        // Test string that produces + in base64
        const input = 'test>>>'
        const result = base64UrlEncode(input)
        expect(result).not.toContain('+')
        expect(result).toContain('-')
    })

    it('should replace / with _', () => {
        // Test string that produces / in base64
        const input = 'test???'
        const result = base64UrlEncode(input)
        expect(result).not.toContain('/')
        expect(result).toContain('_')
    })

    it('should remove padding =', () => {
        const input = 'a'
        const result = base64UrlEncode(input)
        expect(result).not.toContain('=')
        expect(result).toBe('YQ')
    })

    it('should handle empty string', () => {
        const result = base64UrlEncode('')
        expect(result).toBe('')
    })

    it('should handle special characters', () => {
        const input = '{"key":"value"}'
        const result = base64UrlEncode(input)
        expect(result).toBeTruthy()
        expect(typeof result).toBe('string')
    })
})

describe('base64UrlDecode', () => {
    it('should decode a simple string', () => {
        const encoded = 'aGVsbG8gd29ybGQ'
        const result = base64UrlDecode(encoded)
        expect(result).toBe('hello world')
    })

    it('should restore - to +', () => {
        const encoded = 'dGVzdD4-Pg'
        const result = base64UrlDecode(encoded)
        expect(result).toBe('test>>>')
    })

    it('should restore _ to /', () => {
        const encoded = 'dGVzdD8_Pw'
        const result = base64UrlDecode(encoded)
        expect(result).toBe('test???')
    })

    it('should handle strings without padding', () => {
        const encoded = 'YQ'
        const result = base64UrlDecode(encoded)
        expect(result).toBe('a')
    })

    it('should handle empty string', () => {
        const result = base64UrlDecode('')
        expect(result).toBe('')
    })

    it('should round-trip encode and decode', () => {
        const original = 'The quick brown fox jumps over the lazy dog'
        const encoded = base64UrlEncode(original)
        const decoded = base64UrlDecode(encoded)
        expect(decoded).toBe(original)
    })

    it('should round-trip with JSON data', () => {
        const original = JSON.stringify({ d: 'descriptor', c: 'USD' })
        const encoded = base64UrlEncode(original)
        const decoded = base64UrlDecode(encoded)
        expect(decoded).toBe(original)
    })
})

describe('encodeConfig', () => {
    it('should encode basic config', () => {
        const descriptor = 'ct(slip77(0123456789abcdef),elwpkh([fingerprint/84h/1h/0h]xpub...))'
        const currency = 'USD'
        const result = encodeConfig(descriptor, currency, false, true)

        const decoded = JSON.parse(base64UrlDecode(result))
        expect(decoded.d).toBe(descriptor)
        expect(decoded.c).toBe(currency)
    })

    it('should omit showGear when false (default)', () => {
        const result = encodeConfig('desc', 'USD', false, true)
        const decoded = JSON.parse(base64UrlDecode(result))
        expect(decoded.g).toBeUndefined()
    })

    it('should include showGear when true', () => {
        const result = encodeConfig('desc', 'USD', true, true)
        const decoded = JSON.parse(base64UrlDecode(result))
        expect(decoded.g).toBe(true)
    })

    it('should omit showDescription when true (default)', () => {
        const result = encodeConfig('desc', 'USD', false, true)
        const decoded = JSON.parse(base64UrlDecode(result))
        expect(decoded.n).toBeUndefined()
    })

    it('should include showDescription when false', () => {
        const result = encodeConfig('desc', 'USD', false, false)
        const decoded = JSON.parse(base64UrlDecode(result))
        expect(decoded.n).toBe(false)
    })

    it('should handle all options true', () => {
        const result = encodeConfig('desc', 'EUR', true, true)
        const decoded = JSON.parse(base64UrlDecode(result))
        expect(decoded.d).toBe('desc')
        expect(decoded.c).toBe('EUR')
        expect(decoded.g).toBe(true)
        expect(decoded.n).toBeUndefined() // true is default, so omitted
    })

    it('should handle all options false', () => {
        const result = encodeConfig('desc', 'GBP', false, false)
        const decoded = JSON.parse(base64UrlDecode(result))
        expect(decoded.d).toBe('desc')
        expect(decoded.c).toBe('GBP')
        expect(decoded.g).toBeUndefined() // false is default, so omitted
        expect(decoded.n).toBe(false)
    })

    it('should produce URL-safe output', () => {
        const result = encodeConfig('test>>>descriptor???', 'USD', false, true)
        expect(result).not.toContain('+')
        expect(result).not.toContain('/')
        expect(result).not.toContain('=')
    })
})

describe('decodeConfig', () => {
    it('should decode valid config', () => {
        const encoded = encodeConfig('descriptor123', 'USD', false, true)
        const result = decodeConfig(encoded)

        expect(result).not.toBeNull()
        expect(result?.d).toBe('descriptor123')
        expect(result?.c).toBe('USD')
        expect(result?.g).toBe(false)
        expect(result?.n).toBe(true)
    })

    it('should return null for invalid base64', () => {
        const result = decodeConfig('!!!invalid!!!')
        expect(result).toBeNull()
    })

    it('should return null for non-JSON content', () => {
        const encoded = base64UrlEncode('not json')
        const result = decodeConfig(encoded)
        expect(result).toBeNull()
    })

    it('should return null for missing descriptor', () => {
        const encoded = base64UrlEncode(JSON.stringify({ c: 'USD' }))
        const result = decodeConfig(encoded)
        expect(result).toBeNull()
    })

    it('should return null for missing currency', () => {
        const encoded = base64UrlEncode(JSON.stringify({ d: 'descriptor' }))
        const result = decodeConfig(encoded)
        expect(result).toBeNull()
    })

    it('should return null for non-string descriptor', () => {
        const encoded = base64UrlEncode(JSON.stringify({ d: 123, c: 'USD' }))
        const result = decodeConfig(encoded)
        expect(result).toBeNull()
    })

    it('should return null for non-string currency', () => {
        const encoded = base64UrlEncode(JSON.stringify({ d: 'desc', c: 123 }))
        const result = decodeConfig(encoded)
        expect(result).toBeNull()
    })

    it('should default showGear to false when missing', () => {
        const encoded = base64UrlEncode(JSON.stringify({ d: 'desc', c: 'USD' }))
        const result = decodeConfig(encoded)
        expect(result?.g).toBe(false)
    })

    it('should default showDescription to true when missing', () => {
        const encoded = base64UrlEncode(JSON.stringify({ d: 'desc', c: 'USD' }))
        const result = decodeConfig(encoded)
        expect(result?.n).toBe(true)
    })

    it('should preserve showGear when true', () => {
        const encoded = base64UrlEncode(JSON.stringify({ d: 'desc', c: 'USD', g: true }))
        const result = decodeConfig(encoded)
        expect(result?.g).toBe(true)
    })

    it('should preserve showDescription when false', () => {
        const encoded = base64UrlEncode(JSON.stringify({ d: 'desc', c: 'USD', n: false }))
        const result = decodeConfig(encoded)
        expect(result?.n).toBe(false)
    })

    it('should round-trip full config', () => {
        const original = encodeConfig('my-descriptor', 'CAD', true, false)
        const decoded = decodeConfig(original)
        expect(decoded?.d).toBe('my-descriptor')
        expect(decoded?.c).toBe('CAD')
        expect(decoded?.g).toBe(true)
        expect(decoded?.n).toBe(false)
    })

    it('should handle empty string', () => {
        const result = decodeConfig('')
        expect(result).toBeNull()
    })
})
