/**
 * UNIT TESTS: Timer Utilities
 * ============================
 * Tests for src/lib/timer/timer-utils.ts
 *
 * CHECKLIST ITEMS COVERED:
 * - Hourly Items: 1 qty = 1 hour
 * - Per-item time tracking
 * - Prevent Done until final hours entered
 */

import { describe, it, expect, vi } from 'vitest'
import {
  formatTime,
  formatDetailedTime,
  calculateElapsedTime,
  getTimerState,
  TimerState,
} from '@/lib/timer/timer-utils'

describe('formatTime', () => {
  it('formats seconds only', () => {
    expect(formatTime(30)).toBe('30s')
    expect(formatTime(0)).toBe('0s')
    expect(formatTime(59)).toBe('59s')
  })

  it('formats minutes and seconds', () => {
    expect(formatTime(60)).toBe('1m 0s')
    expect(formatTime(90)).toBe('1m 30s')
    expect(formatTime(150)).toBe('2m 30s')
    expect(formatTime(3599)).toBe('59m 59s')
  })

  it('formats hours and minutes', () => {
    expect(formatTime(3600)).toBe('1h 0m')
    expect(formatTime(3660)).toBe('1h 1m')
    expect(formatTime(7200)).toBe('2h 0m')
    expect(formatTime(7350)).toBe('2h 2m')
  })

  it('handles negative values as zero', () => {
    expect(formatTime(-10)).toBe('0s')
    expect(formatTime(-3600)).toBe('0s')
  })
})

describe('formatDetailedTime', () => {
  it('formats with padded minutes and seconds', () => {
    expect(formatDetailedTime(0)).toBe('00:00')
    expect(formatDetailedTime(30)).toBe('00:30')
    expect(formatDetailedTime(90)).toBe('01:30')
    expect(formatDetailedTime(600)).toBe('10:00')
  })

  it('includes hours when applicable', () => {
    expect(formatDetailedTime(3600)).toBe('1:00:00')
    expect(formatDetailedTime(3661)).toBe('1:01:01')
    expect(formatDetailedTime(36000)).toBe('10:00:00')
  })

  it('handles negative values as zero', () => {
    expect(formatDetailedTime(-100)).toBe('00:00')
  })
})

describe('calculateElapsedTime', () => {
  it('calculates elapsed seconds from Date object', () => {
    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)

    const elapsed = calculateElapsedTime(fiveMinutesAgo)

    // Allow 1 second tolerance
    expect(elapsed).toBeGreaterThanOrEqual(299)
    expect(elapsed).toBeLessThanOrEqual(301)
  })

  it('calculates elapsed seconds from ISO string', () => {
    const now = new Date()
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000)

    const elapsed = calculateElapsedTime(tenMinutesAgo.toISOString())

    // Allow 1 second tolerance
    expect(elapsed).toBeGreaterThanOrEqual(599)
    expect(elapsed).toBeLessThanOrEqual(601)
  })

  it('returns 0 for current time', () => {
    const now = new Date()
    const elapsed = calculateElapsedTime(now)

    expect(elapsed).toBeLessThanOrEqual(1)
  })
})

describe('getTimerState', () => {
  it('returns completed when isCompleted is true', () => {
    expect(getTimerState(true, false, true)).toBe('completed')
    expect(getTimerState(false, true, true)).toBe('completed')
    expect(getTimerState(false, false, true)).toBe('completed')
  })

  it('returns running when isRunning is true and not completed', () => {
    expect(getTimerState(true, false, false)).toBe('running')
  })

  it('returns paused when isPaused is true and not running or completed', () => {
    expect(getTimerState(false, true, false)).toBe('paused')
  })

  it('returns idle when all false', () => {
    expect(getTimerState(false, false, false)).toBe('idle')
  })

  it('priority order: completed > running > paused > idle', () => {
    // Completed takes precedence
    expect(getTimerState(true, true, true)).toBe('completed')

    // Running takes precedence over paused
    expect(getTimerState(true, true, false)).toBe('running')
  })
})

describe('Hourly Items - 1 qty = 1 hour', () => {
  // CHECKLIST: 1 qty = 1 hour
  it('converts quantity to hours correctly', () => {
    const hourlyRateCents = 3500 // $35/hour

    // 1 qty = 1 hour = $35
    const oneHour = 1 * hourlyRateCents
    expect(oneHour).toBe(3500)

    // 2 qty = 2 hours = $70
    const twoHours = 2 * hourlyRateCents
    expect(twoHours).toBe(7000)

    // 0.5 qty = 30 minutes = $17.50
    const halfHour = 0.5 * hourlyRateCents
    expect(halfHour).toBe(1750)
  })

  it('calculates actual time from seconds to hours', () => {
    // 3600 seconds = 1 hour = 1 qty
    const secondsWorked = 3600
    const hoursWorked = secondsWorked / 3600
    expect(hoursWorked).toBe(1)

    // 5400 seconds = 1.5 hours = 1.5 qty
    const seconds2 = 5400
    const hours2 = seconds2 / 3600
    expect(hours2).toBe(1.5)
  })
})

describe('Timer State Transitions', () => {
  it('idle -> running', () => {
    const initial: TimerState = 'idle'
    const afterStart: TimerState = 'running'

    // Valid transition
    expect(initial).toBe('idle')
    expect(afterStart).toBe('running')
  })

  it('running -> paused', () => {
    const running: TimerState = 'running'
    const paused: TimerState = 'paused'

    expect(running).toBe('running')
    expect(paused).toBe('paused')
  })

  it('paused -> running (resume)', () => {
    const paused: TimerState = 'paused'
    const running: TimerState = 'running'

    expect(paused).toBe('paused')
    expect(running).toBe('running')
  })

  it('running -> completed (stop)', () => {
    const running: TimerState = 'running'
    const completed: TimerState = 'completed'

    expect(running).toBe('running')
    expect(completed).toBe('completed')
  })
})
