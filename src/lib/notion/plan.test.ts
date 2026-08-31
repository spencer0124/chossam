import { describe, expect, it } from 'vitest'
import { planSync } from './plan'

const post = (slug: string, title: string, board = '공지사항') => ({
  post: {
    notionId: `${slug}-0000-0000-0000-000000000000`,
    slug,
    title,
    board,
    date: '2026-08-11' as string | null
  },
  body: `${title} 본문\n`
})

describe('planSync', () => {
  it('writes one markdown file per post', () => {
    const plan = planSync({
      entries: [post('aaaaaaaa', '공지 하나')],
      boards: ['공지사항'],
      existingPosts: [],
      existingAssets: [],
      usedAssets: []
    })

    expect(plan.writes.map(w => w.path)).toContain('src/content/posts/aaaaaaaa.md')
    expect(plan.writes.find(w => w.path === 'src/content/posts/aaaaaaaa.md')?.content).toContain(
      'title: "공지 하나"'
    )
  })

  it('writes the board list in Notion order', () => {
    const plan = planSync({
      entries: [post('aaaaaaaa', 'x', '고등과정')],
      boards: ['공지사항', '학원시스템', '고등과정'],
      existingPosts: [],
      existingAssets: [],
      usedAssets: []
    })

    const boards = plan.writes.find(w => w.path === 'src/data/boards.json')
    expect(boards?.content).toBe(
      JSON.stringify([{ name: '공지사항' }, { name: '학원시스템' }, { name: '고등과정' }], null, 2) + '\n'
    )
  })

  it('deletes a post file whose row is gone from Notion', () => {
    const plan = planSync({
      entries: [post('aaaaaaaa', '남은 글')],
      boards: ['공지사항'],
      existingPosts: ['aaaaaaaa.md', 'bbbbbbbb.md'],
      existingAssets: [],
      usedAssets: []
    })

    expect(plan.deletes).toEqual(['src/content/posts/bbbbbbbb.md'])
  })

  it('deletes an asset nothing references any more', () => {
    const plan = planSync({
      entries: [post('aaaaaaaa', 'x')],
      boards: ['공지사항'],
      existingPosts: [],
      existingAssets: ['keep123456ab.png', 'orphan123456.png'],
      usedAssets: ['keep123456ab.png']
    })

    expect(plan.deletes).toEqual(['src/assets/notion/orphan123456.png'])
  })

  it('refuses two posts that would land on the same file', () => {
    // This fired on the first real sync: Notion ids are time-ordered, so a
    // prefix-derived slug collided across the whole database. Loud beats
    // silently overwriting one notice with another.
    expect(() =>
      planSync({
        entries: [post('aaaaaaaa', '먼저'), post('aaaaaaaa', '나중')],
        boards: ['공지사항'],
        existingPosts: [],
        existingAssets: [],
        usedAssets: []
      })
    ).toThrowError(/aaaaaaaa/)
  })

  it('orders writes by path so two runs produce the same plan', () => {
    const plan = planSync({
      entries: [post('cccccccc', 'c'), post('aaaaaaaa', 'a'), post('bbbbbbbb', 'b')],
      boards: ['공지사항'],
      existingPosts: [],
      existingAssets: [],
      usedAssets: []
    })

    expect(plan.writes.map(w => w.path)).toEqual([...plan.writes.map(w => w.path)].sort())
  })

  it('reports a post whose board is not one of the schema options', () => {
    // The tab bar is built from `boards`, so such a post would be unreachable.
    const plan = planSync({
      entries: [post('aaaaaaaa', 'x', '없는게시판')],
      boards: ['공지사항'],
      existingPosts: [],
      existingAssets: [],
      usedAssets: []
    })

    expect(plan.warnings.join(' ')).toContain('없는게시판')
  })
})
