import { describe, it, expect } from 'vitest';
import {
    comparePaymentAmounts,
    formatPaymentDifference,
    type PaymentComparison,
} from '../payment-status';

describe('comparePaymentAmounts', () => {
    describe('exact payments (< 0.1% difference)', () => {
        it('should return exact status when amounts match exactly', () => {
            const result = comparePaymentAmounts(100000, 100000);

            expect(result).toEqual({
                requestedSats: 100000,
                receivedSats: 100000,
                differenceSats: 0,
                differencePercent: 0,
                status: 'exact',
            });
        });

        it('should return exact status for 0.09% difference', () => {
            const requested = 100000;
            const received = 100090; // 0.09% more
            const result = comparePaymentAmounts(requested, received);

            expect(result.status).toBe('exact');
            expect(result.differencePercent).toBe(0.09);
        });

        it('should return exact status for -0.09% difference', () => {
            const requested = 100000;
            const received = 99910; // 0.09% less
            const result = comparePaymentAmounts(requested, received);

            expect(result.status).toBe('exact');
            expect(result.differencePercent).toBe(-0.09);
        });
    });

    describe('overpayments (> 0.1% more)', () => {
        it('should detect overpay at exactly 0.1% threshold', () => {
            const requested = 100000;
            const received = 100100; // Exactly 0.1% more
            const result = comparePaymentAmounts(requested, received);

            expect(result.status).toBe('overpay');
            expect(result.differencePercent).toBe(0.1);
            expect(result.differenceSats).toBe(100);
        });

        it('should detect overpay for 1% difference', () => {
            const requested = 100000;
            const received = 101000; // 1% more
            const result = comparePaymentAmounts(requested, received);

            expect(result.status).toBe('overpay');
            expect(result.differencePercent).toBe(1);
            expect(result.differenceSats).toBe(1000);
        });

        it('should detect overpay for 10% difference', () => {
            const requested = 1000000;
            const received = 1100000; // 10% more
            const result = comparePaymentAmounts(requested, received);

            expect(result.status).toBe('overpay');
            expect(result.differencePercent).toBe(10);
            expect(result.differenceSats).toBe(100000);
        });
    });

    describe('underpayments (< -0.1% less)', () => {
        it('should detect underpay at exactly -0.1% threshold', () => {
            const requested = 100000;
            const received = 99900; // Exactly 0.1% less
            const result = comparePaymentAmounts(requested, received);

            expect(result.status).toBe('underpay');
            expect(result.differencePercent).toBe(-0.1);
            expect(result.differenceSats).toBe(-100);
        });

        it('should detect underpay for 1% difference', () => {
            const requested = 100000;
            const received = 99000; // 1% less
            const result = comparePaymentAmounts(requested, received);

            expect(result.status).toBe('underpay');
            expect(result.differencePercent).toBe(-1);
            expect(result.differenceSats).toBe(-1000);
        });

        it('should detect underpay for 5% difference', () => {
            const requested = 1000000;
            const received = 950000; // 5% less
            const result = comparePaymentAmounts(requested, received);

            expect(result.status).toBe('underpay');
            expect(result.differencePercent).toBe(-5);
            expect(result.differenceSats).toBe(-50000);
        });
    });

    describe('edge cases', () => {
        it('should handle zero requested amount without division by zero', () => {
            const result = comparePaymentAmounts(0, 100);

            expect(result.differencePercent).toBe(0);
            expect(result.differenceSats).toBe(100);
            expect(result.status).toBe('exact'); // 0% is < 0.1%
        });

        it('should handle very small amounts', () => {
            const requested = 1;
            const received = 2;
            const result = comparePaymentAmounts(requested, received);

            expect(result.status).toBe('overpay'); // 100% difference
            expect(result.differencePercent).toBe(100);
        });

        it('should handle very large amounts', () => {
            const requested = 21000000 * 100000000; // 21M BTC in sats
            const received = requested + 1000;
            const result = comparePaymentAmounts(requested, received);

            expect(result.differenceSats).toBe(1000);
            // Very small percentage, should be exact
            expect(result.status).toBe('exact');
        });

        it('should handle negative difference correctly', () => {
            const requested = 50000;
            const received = 49500; // 1% less
            const result = comparePaymentAmounts(requested, received);

            expect(result.differenceSats).toBe(-500);
            expect(result.differencePercent).toBe(-1);
            expect(result.status).toBe('underpay');
        });
    });

    describe('threshold boundary testing', () => {
        it('should be exact at 0.099%', () => {
            const requested = 100000;
            const received = 100099;
            expect(comparePaymentAmounts(requested, received).status).toBe('exact');
        });

        it('should be overpay at 0.101%', () => {
            const requested = 100000;
            const received = 100101;
            expect(comparePaymentAmounts(requested, received).status).toBe('overpay');
        });

        it('should be exact at -0.099%', () => {
            const requested = 100000;
            const received = 99901;
            expect(comparePaymentAmounts(requested, received).status).toBe('exact');
        });

        it('should be underpay at -0.101%', () => {
            const requested = 100000;
            const received = 99899;
            expect(comparePaymentAmounts(requested, received).status).toBe('underpay');
        });
    });
});

describe('formatPaymentDifference', () => {
    describe('exact payment formatting', () => {
        it('should format exact payment with simple message', () => {
            const comparison: PaymentComparison = {
                requestedSats: 100000,
                receivedSats: 100000,
                differenceSats: 0,
                differencePercent: 0,
                status: 'exact',
            };

            const result = formatPaymentDifference(comparison, 'USD', 50000);

            expect(result.title).toBe('Exact payment');
            expect(result.message).toBe('Payment amount matches exactly');
            expect(result.fiatMessage).toBeUndefined();
        });
    });

    describe('overpayment formatting', () => {
        it('should format overpayment with sats and percentage', () => {
            const comparison: PaymentComparison = {
                requestedSats: 100000,
                receivedSats: 101000,
                differenceSats: 1000,
                differencePercent: 1,
                status: 'overpay',
            };

            const result = formatPaymentDifference(comparison, 'USD', null);

            expect(result.title).toBe('Overpayment received');
            expect(result.message).toBe('Received 1000 sats more than requested (+1.00%)');
            expect(result.fiatMessage).toBeUndefined();
        });

        it('should include fiat equivalent when exchange rate provided', () => {
            const comparison: PaymentComparison = {
                requestedSats: 100000,
                receivedSats: 105000,
                differenceSats: 5000,
                differencePercent: 5,
                status: 'overpay',
            };

            const exchangeRate = 50000; // $50k per BTC
            const result = formatPaymentDifference(comparison, 'USD', exchangeRate);

            expect(result.title).toBe('Overpayment received');
            expect(result.message).toBe('Received 5000 sats more than requested (+5.00%)');
            expect(result.fiatMessage).toBe('≈ USD 2.50');
        });

        it('should format small overpayment with correct decimal precision', () => {
            const comparison: PaymentComparison = {
                requestedSats: 1000000,
                receivedSats: 1001234,
                differenceSats: 1234,
                differencePercent: 0.1234,
                status: 'overpay',
            };

            const result = formatPaymentDifference(comparison, 'CAD', 70000);

            expect(result.message).toContain('+0.12%');
            expect(result.fiatMessage).toBe('≈ CAD 0.86'); // 1234 sats at 70k
        });
    });

    describe('underpayment formatting', () => {
        it('should format underpayment with sats and percentage', () => {
            const comparison: PaymentComparison = {
                requestedSats: 100000,
                receivedSats: 99000,
                differenceSats: -1000,
                differencePercent: -1,
                status: 'underpay',
            };

            const result = formatPaymentDifference(comparison, 'USD', null);

            expect(result.title).toBe('Underpayment received');
            expect(result.message).toBe('Received 1000 sats less than requested (-1.00%)');
            expect(result.fiatMessage).toBeUndefined();
        });

        it('should include fiat equivalent for underpayment', () => {
            const comparison: PaymentComparison = {
                requestedSats: 200000,
                receivedSats: 190000,
                differenceSats: -10000,
                differencePercent: -5,
                status: 'underpay',
            };

            const exchangeRate = 50000;
            const result = formatPaymentDifference(comparison, 'EUR', exchangeRate);

            expect(result.title).toBe('Underpayment received');
            expect(result.message).toBe('Received 10000 sats less than requested (-5.00%)');
            expect(result.fiatMessage).toBe('≈ EUR 5.00');
        });
    });

    describe('fiat calculation edge cases', () => {
        it('should handle zero exchange rate', () => {
            const comparison: PaymentComparison = {
                requestedSats: 100000,
                receivedSats: 105000,
                differenceSats: 5000,
                differencePercent: 5,
                status: 'overpay',
            };

            const result = formatPaymentDifference(comparison, 'USD', 0);

            expect(result.fiatMessage).toBeUndefined();
        });

        it('should handle negative exchange rate', () => {
            const comparison: PaymentComparison = {
                requestedSats: 100000,
                receivedSats: 105000,
                differenceSats: 5000,
                differencePercent: 5,
                status: 'overpay',
            };

            const result = formatPaymentDifference(comparison, 'USD', -50000);

            expect(result.fiatMessage).toBeUndefined();
        });

        it('should format very small fiat amounts correctly', () => {
            const comparison: PaymentComparison = {
                requestedSats: 100000,
                receivedSats: 100010,
                differenceSats: 10,
                differencePercent: 0.01,
                status: 'exact', // Would be exact in real calculation
            };

            const exchangeRate = 50000;
            const result = formatPaymentDifference(comparison, 'USD', exchangeRate);

            // Exact payments don't show fiat
            expect(result.fiatMessage).toBeUndefined();
        });

        it('should format large fiat amounts correctly', () => {
            const comparison: PaymentComparison = {
                requestedSats: 10000000, // 0.1 BTC
                receivedSats: 11000000, // 0.11 BTC
                differenceSats: 1000000, // 0.01 BTC difference
                differencePercent: 10,
                status: 'overpay',
            };

            const exchangeRate = 50000;
            const result = formatPaymentDifference(comparison, 'USD', exchangeRate);

            expect(result.fiatMessage).toBe('≈ USD 500.00'); // 0.01 BTC * 50k
        });
    });

    describe('currency display', () => {
        it('should display currency code in fiat message', () => {
            const comparison: PaymentComparison = {
                requestedSats: 100000,
                receivedSats: 105000,
                differenceSats: 5000,
                differencePercent: 5,
                status: 'overpay',
            };

            const usd = formatPaymentDifference(comparison, 'USD', 50000);
            const cad = formatPaymentDifference(comparison, 'CAD', 70000);
            const eur = formatPaymentDifference(comparison, 'EUR', 45000);

            expect(usd.fiatMessage).toContain('USD');
            expect(cad.fiatMessage).toContain('CAD');
            expect(eur.fiatMessage).toContain('EUR');
        });
    });

    describe('percentage formatting', () => {
        it('should format percentage to 2 decimal places', () => {
            const comparison: PaymentComparison = {
                requestedSats: 1000000,
                receivedSats: 1012345,
                differenceSats: 12345,
                differencePercent: 1.2345,
                status: 'overpay',
            };

            const result = formatPaymentDifference(comparison, 'USD', null);

            expect(result.message).toContain('+1.23%');
        });

        it('should round percentage correctly', () => {
            const comparison: PaymentComparison = {
                requestedSats: 1000000,
                receivedSats: 1012367,
                differenceSats: 12367,
                differencePercent: 1.2367,
                status: 'overpay',
            };

            const result = formatPaymentDifference(comparison, 'USD', null);

            expect(result.message).toContain('+1.24%');
        });
    });
});
