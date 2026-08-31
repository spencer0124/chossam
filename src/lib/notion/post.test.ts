import { describe, expect, it, vi } from 'vitest'
import { slugFor, toPost } from './post'

const props = { title: '글', board: '카테고리', date: '날짜' } as const

/** A row shaped the way `dataSources.query` returns it. */
function row(overrides: Record<string, unknown> = {}) {
  return {
    id: '3cdf3b60-7973-819e-bf32-cde1ccfeac3a',
    properties: {
      글: { id: 'title', type: 'title', title: [{ plain_text: '2026. 2학기 중간고사대비 안내' }] },
      카테고리: {
        id: '%3APGV',
        type: 'multi_select',
        multi_select: [{ id: '1', name: '공지사항', color: 'default' }]
      },
      날짜: { id: 'Ylrt', type: 'date', date: { start: '2026-08-11', end: null } }
    },
    ...overrides
  }
}

describe('slugFor', () => {
  it('takes the last eight characters of the id, dashes stripped', () => {
    expect(slugFor('3cdf3b60-7973-819e-bf32-cde1ccfeac3a')).toBe('ccfeac3a')
  })

  it('is stable whether or not the id arrives dashed', () => {
    expect(slugFor('3cdf3b607973819ebf32cde1ccfeac3a')).toBe(
      slugFor('3cdf3b60-7973-819e-bf32-cde1ccfeac3a')
    )
  })

  it('separates ids that share a prefix', () => {
    // Notion page ids are time-ordered, so every row created in one database
    // opens with the same bytes — these three are real ids from the academy's
    // notice database. A prefix-derived slug collides for all of them; the
    // entropy is in the tail.
    const ids = [
      '3cdf3b60-7973-819e-bf32-cde1ccfeac3a',
      '3cdf3b60-7973-81ca-846b-f694f8440e92',
      '3cdf3b60-7973-815d-8ce2-dfaae45931a6'
    ]

    expect(new Set(ids.map(slugFor)).size).toBe(3)
  })
})

describe('toPost', () => {
  it('maps a row to the shape the site consumes', () => {
    expect(toPost(row(), props)).toEqual({
      notionId: '3cdf3b60-7973-819e-bf32-cde1ccfeac3a',
      slug: 'ccfeac3a',
      title: '2026. 2학기 중간고사대비 안내',
      board: '공지사항',
      date: '2026-08-11'
    })
  })

  it('joins a title split across rich-text runs', () => {
    // Notion splits a title at every style change, so a bolded word alone
    // produces three runs for what the reader sees as one sentence.
    const split = row({
      properties: {
        ...row().properties,
        글: {
          id: 'title',
          type: 'title',
          title: [{ plain_text: '초등부 ' }, { plain_text: 'NELT' }, { plain_text: ' 정기고사' }]
        }
      }
    })

    expect(toPost(split, props)?.title).toBe('초등부 NELT 정기고사')
  })

  it('normalises a date-time to a calendar date', () => {
    const timed = row({
      properties: {
        ...row().properties,
        날짜: { id: 'Ylrt', type: 'date', date: { start: '2026-08-11T09:30:00.000+09:00' } }
      }
    })

    expect(toPost(timed, props)?.date).toBe('2026-08-11')
  })

  it('takes the first board and warns when a row carries several', () => {
    const warn = vi.fn()
    const multi = row({
      properties: {
        ...row().properties,
        카테고리: {
          id: '%3APGV',
          type: 'multi_select',
          multi_select: [{ name: '공지사항' }, { name: '고등과정' }]
        }
      }
    })

    expect(toPost(multi, props, { warn })?.board).toBe('공지사항')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('고등과정'))
  })

  it('returns null for a row with no title rather than writing an untitled file', () => {
    const untitled = row({
      properties: { ...row().properties, 글: { id: 'title', type: 'title', title: [] } }
    })

    expect(toPost(untitled, props)).toBeNull()
  })

  it('returns null for a row with no board, which has no tab to appear under', () => {
    const unfiled = row({
      properties: {
        ...row().properties,
        카테고리: { id: '%3APGV', type: 'multi_select', multi_select: [] }
      }
    })

    expect(toPost(unfiled, props)).toBeNull()
  })

  it('keeps a row with no date, sorting it last', () => {
    // A missing date is an editor oversight, not a reason to hide the notice.
    const undated = row({
      properties: { ...row().properties, 날짜: { id: 'Ylrt', type: 'date', date: null } }
    })

    expect(toPost(undated, props)?.date).toBeNull()
  })
})
