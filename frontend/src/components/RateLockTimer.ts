// RateLockTimer.ts - Rate lock countdown timer component for fiat-amount invoices

/**
 * RateLockTimer creates and manages a countdown timer display
 * for rate-locked invoices (fixed-fiat amounts).
 *
 * When the timer expires, it triggers a callback to refresh the rate
 * and create a new swap.
 */

export interface RateLockTimerOptions {
    /** Duration in minutes */
    durationMins: number;
    /** Callback when timer expires */
    onExpiry: () => void;
    /** Callback for timer updates (optional) */
    onTick?: (remainingMs: number) => void;
}

export class RateLockTimer {
    private durationMs: number;
    private startTime: number;
    private intervalId: number | null = null;
    private onExpiry: () => void;
    private onTick?: (remainingMs: number) => void;
    private expired = false;

    constructor(options: RateLockTimerOptions) {
        this.durationMs = options.durationMins * 60 * 1000;
        this.startTime = Date.now();
        this.onExpiry = options.onExpiry;
        this.onTick = options.onTick;
    }

    /**
     * Start the countdown timer
     */
    start(): void {
        if (this.intervalId !== null) {
            return; // Already running
        }

        // Immediately call tick for initial display
        this.tick();

        // Update every second
        this.intervalId = window.setInterval(() => this.tick(), 1000);
    }

    /**
     * Stop the countdown timer
     */
    stop(): void {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /**
     * Get remaining time in milliseconds
     */
    getRemainingMs(): number {
        const elapsed = Date.now() - this.startTime;
        const remaining = this.durationMs - elapsed;
        return Math.max(0, remaining);
    }

    /**
     * Check if timer has expired
     */
    isExpired(): boolean {
        return this.expired;
    }

    /**
     * Format remaining time as MM:SS
     */
    formatTime(): string {
        const remainingMs = this.getRemainingMs();
        const totalSeconds = Math.ceil(remainingMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    private tick(): void {
        const remainingMs = this.getRemainingMs();

        // Call tick callback if provided
        if (this.onTick) {
            this.onTick(remainingMs);
        }

        // Check for expiry
        if (remainingMs <= 0 && !this.expired) {
            this.expired = true;
            this.stop();
            this.onExpiry();
        }
    }
}

/**
 * Create a timer display element with styled countdown
 */
export function createTimerDisplay(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'rate-lock-timer';
    container.innerHTML = `
        <div class="timer-label">Rate locked for:</div>
        <div class="timer-value">--:--</div>
    `;
    return container;
}

/**
 * Update timer display element with current time
 */
export function updateTimerDisplay(container: HTMLDivElement, timeString: string): void {
    const valueEl = container.querySelector('.timer-value');
    if (valueEl) {
        valueEl.textContent = timeString;
    }
}
