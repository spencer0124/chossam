import { describe, expect, it } from 'vitest'
import { compareByDateDesc, formatKoreanDate } from './date'

describe('formatKoreanDate', () => {
  it('renders the date the way the mockup shows it', () => {
    expect(formatKoreanDate('2026-08-11')).toBe('2026. 8. 11.')
  })

  it('drops leading zeroes from month and day', () => {
    expect(formatKoreanDate('2026-07-06')).toBe('2026. 7. 6.')
  })

  it('reads the calendar date off the string rather than a Date', () => {
    // `new Date('2026-08-11')` is UTC midnight, which is the 10th in any
    // timezone west of Greenwich. Formatting must not depend on where the
    // build machine happens to be.
    expect(formatKoreanDate('2026-01-01')).toBe('2026. 1. 1.')
  })

  it('returns an empty string for a missing date', () => {
    expect(formatKoreanDate(null)).toBe('')
  })
})

describe('compareByDateDesc', () => {
  const dated = (date: string | null, title = 'x') => ({ date, title })

  it('puts the newest post first', () => {
    const sorted = [dated('2026-03-24'), dated('2026-08-11'), dated('2026-07-22')].sort(
      compareByDateDesc
    )

    expect(sorted.map(post => post.date)).toEqual(['2026-08-11', '2026-07-22', '2026-03-24'])
  })

  it('sorts undated posts last rather than dropping them', () => {
    const sorted = [dated(null), dated('2026-08-11')].sort(compareByDateDesc)
    expect(sorted.map(post => post.date)).toEqual(['2026-08-11', null])
  })

  it('breaks ties by title so the order never depends on input order', () => {
    const sorted = [dated('2026-08-11', '나'), dated('2026-08-11', '가')].sort(compareByDateDesc)
    expect(sorted.map(post => post.title)).toEqual(['가', '나'])
  })
})
