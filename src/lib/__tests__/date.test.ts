import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime, formatTime } from '../date'

describe('platform date formatting', () => {
  it('uses the Vietnam timezone across the UTC date boundary', () => {
    expect(formatDate('2026-06-28T17:30:00.000Z')).toBe('29/06/2026')
  })

  it('formats time consistently in 24-hour notation', () => {
    expect(formatTime('2026-06-28T10:30:00.000Z')).toBe('17:30')
    expect(formatDateTime('not-a-date')).toBe('—')
  })
})
