import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RateLockTimer, createTimerDisplay, updateTimerDisplay } from '../RateLockTimer'

describe('RateLockTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should initialize with correct duration', () => {
    const timer = new RateLockTimer({
      durationMins: 15,
      onExpiry: () => {},
    })

    // 15 minutes = 900,000 ms
    const remaining = timer.getRemainingMs()
    expect(remaining).toBeGreaterThanOrEqual(899000)
    expect(remaining).toBeLessThanOrEqual(900000)
  })

  it('should format time correctly as MM:SS', () => {
    const timer = new RateLockTimer({
      durationMins: 5,
      onExpiry: () => {},
    })

    const formatted = timer.formatTime()
    expect(formatted).toMatch(/^\d+:\d{2}$/)
    expect(formatted).toBe('5:00')
  })

  it('should call onExpiry when timer expires', () => {
    const onExpiry = vi.fn()
    const timer = new RateLockTimer({
      durationMins: 0.001, // ~60ms for fast test
      onExpiry,
    })

    timer.start()

    // Fast forward past expiration
    vi.advanceTimersByTime(100)

    expect(onExpiry).toHaveBeenCalledTimes(1)
  })

  it('should call onTick callback during countdown', () => {
    const onTick = vi.fn()
    const timer = new RateLockTimer({
      durationMins: 1,
      onExpiry: () => {},
      onTick,
    })

    timer.start()

    // Advance by 1 second
    vi.advanceTimersByTime(1000)

    expect(onTick).toHaveBeenCalled()
    const remainingMs = onTick.mock.calls[onTick.mock.calls.length - 1][0]
    expect(remainingMs).toBeLessThan(60000)
  })

  it('should stop the timer when stop() is called', () => {
    const onExpiry = vi.fn()
    const timer = new RateLockTimer({
      durationMins: 1,
      onExpiry,
    })

    timer.start()
    timer.stop()

    // Advance time - expiry should not be called
    vi.advanceTimersByTime(100000)
    expect(onExpiry).not.toHaveBeenCalled()
  })

  it('should not start multiple intervals', () => {
    const timer = new RateLockTimer({
      durationMins: 1,
      onExpiry: () => {},
    })

    timer.start()
    timer.start() // Call again
    timer.start() // And again

    // Should only have one interval running
    // Verify by checking that tick only happens once per second
    const onTick = vi.fn()
    const timer2 = new RateLockTimer({
      durationMins: 1,
      onExpiry: () => {},
      onTick,
    })

    timer2.start()
    timer2.start()

    vi.advanceTimersByTime(1000)

    // Should be called twice: once on start, once after 1 second
    expect(onTick.mock.calls.length).toBeLessThanOrEqual(2)
  })

  it('should mark timer as expired after expiry', () => {
    const timer = new RateLockTimer({
      durationMins: 0.001,
      onExpiry: () => {},
    })

    expect(timer.isExpired()).toBe(false)

    timer.start()
    vi.advanceTimersByTime(100)

    expect(timer.isExpired()).toBe(true)
  })

  it('should return 0 remaining time after expiry', () => {
    const timer = new RateLockTimer({
      durationMins: 0.001,
      onExpiry: () => {},
    })

    timer.start()
    vi.advanceTimersByTime(100)

    expect(timer.getRemainingMs()).toBe(0)
  })
})

describe('Timer Display Functions', () => {
  it('should create timer display with correct structure', () => {
    const display = createTimerDisplay()

    expect(display.className).toBe('rate-lock-timer')
    expect(display.querySelector('.timer-label')).not.toBeNull()
    expect(display.querySelector('.timer-value')).not.toBeNull()
  })

  it('should update timer display value', () => {
    const display = createTimerDisplay()
    updateTimerDisplay(display, '5:30')

    const valueEl = display.querySelector('.timer-value')
    expect(valueEl?.textContent).toBe('5:30')
  })

  it('should handle missing value element gracefully', () => {
    const display = document.createElement('div')

    // Should not throw
    expect(() => {
      updateTimerDisplay(display, '5:30')
    }).not.toThrow()
  })
})
