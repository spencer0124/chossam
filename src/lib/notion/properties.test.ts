import { describe, expect, it } from 'vitest'
import { resolveProperties } from './properties'

/**
 * Property keys in the client's database are opaque (`:PGV` for 카테고리,
 * `Ylrt` for 날짜), and the visible names are Korean and rename-able. So the
 * resolver keys off the property *type*, which is the one thing a rename
 * cannot change.
 */

/** The academy's real schema, as the official API reports it. */
const schema = {
  글: { id: 'title', name: '글', type: 'title', title: {} },
  카테고리: {
    id: '%3APGV',
    name: '카테고리',
    type: 'multi_select',
    multi_select: {
      options: [
        { id: '1', name: '공지사항', color: 'default' },
        { id: '2', name: '학원시스템', color: 'blue' },
        { id: '3', name: '초등과정', color: 'green' }
      ]
    }
  },
  날짜: { id: 'Ylrt', name: '날짜', type: 'date', date: {} }
}

describe('resolveProperties', () => {
  it('finds title, board and date by type', () => {
    const resolved = resolveProperties(schema)

    expect(resolved.title).toBe('글')
    expect(resolved.board).toBe('카테고리')
    expect(resolved.date).toBe('날짜')
  })

  it('reads the board options in the order Notion lists them', () => {
    // Tab order on the site is this order, so it must survive verbatim.
    expect(resolveProperties(schema).boardOptions).toEqual([
      '공지사항',
      '학원시스템',
      '초등과정'
    ])
  })

  it('accepts a select property as the board when there is no multi_select', () => {
    const withSelect = {
      글: schema.글,
      날짜: schema.날짜,
      분류: {
        id: 'abc',
        name: '분류',
        type: 'select',
        select: { options: [{ id: '1', name: '공지사항', color: 'default' }] }
      }
    }

    const resolved = resolveProperties(withSelect)
    expect(resolved.board).toBe('분류')
    expect(resolved.boardOptions).toEqual(['공지사항'])
  })

  it('prefers the named property when several could serve as the board', () => {
    const ambiguous = {
      ...schema,
      태그: { id: 'zzz', name: '태그', type: 'multi_select', multi_select: { options: [] } }
    }

    expect(resolveProperties(ambiguous, { board: '카테고리' }).board).toBe('카테고리')
    expect(resolveProperties(ambiguous, { board: '태그' }).board).toBe('태그')
  })

  it('names the missing property when one cannot be resolved', () => {
    const noDate = { 글: schema.글, 카테고리: schema.카테고리 }

    expect(() => resolveProperties(noDate)).toThrowError(/date/i)
  })

  it('rejects an override that names a property the schema does not have', () => {
    expect(() => resolveProperties(schema, { board: '없는칸' })).toThrowError(/없는칸/)
  })
})
