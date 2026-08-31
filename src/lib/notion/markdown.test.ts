import { describe, expect, it } from 'vitest'
import {
  assetFileName,
  collectImageUrls,
  findUnknownBlocks,
  renderMarkdownFile,
  rewriteImageUrls,
  stripNotionArtifacts
} from './markdown'

describe('collectImageUrls', () => {
  it('finds markdown image sources', () => {
    const md = [
      '# 안내',
      '![포스터](https://prod-files-secure.s3.us-west-2.amazonaws.com/a/b/poster.png?X-Amz-Signature=deadbeef)',
      '본문',
      '![](https://example.com/plain.jpg)'
    ].join('\n')

    expect(collectImageUrls(md)).toEqual([
      'https://prod-files-secure.s3.us-west-2.amazonaws.com/a/b/poster.png?X-Amz-Signature=deadbeef',
      'https://example.com/plain.jpg'
    ])
  })

  it('finds html image sources, which the markdown endpoint also emits', () => {
    expect(collectImageUrls('<img src="https://example.com/a.png" alt="a">')).toEqual([
      'https://example.com/a.png'
    ])
  })

  it('reports each url once even when it appears twice', () => {
    const md = '![a](https://example.com/a.png)\n![again](https://example.com/a.png)'
    expect(collectImageUrls(md)).toEqual(['https://example.com/a.png'])
  })

  it('ignores links that are not images', () => {
    expect(collectImageUrls('[문서](https://example.com/doc.pdf)')).toEqual([])
  })
})

describe('assetFileName', () => {
  const bytes = new Uint8Array([1, 2, 3, 4])

  it('names a file after its content, not its url', () => {
    // Same bytes behind a re-signed url must produce the same name, or every
    // sync would rewrite every image and the "commit only on change" guard
    // would never hold.
    const a = assetFileName(bytes, 'https://s3.example.com/x/poster.png?X-Amz-Signature=aaa')
    const b = assetFileName(bytes, 'https://s3.example.com/x/poster.png?X-Amz-Signature=bbb')

    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]{12}\.png$/)
  })

  it('separates different content', () => {
    expect(assetFileName(bytes, 'https://e.com/a.png')).not.toBe(
      assetFileName(new Uint8Array([9, 9]), 'https://e.com/a.png')
    )
  })

  it('takes the extension from the url path, ignoring the query string', () => {
    expect(assetFileName(bytes, 'https://e.com/a/b.jpg?sig=1')).toMatch(/\.jpg$/)
  })

  it('falls back to the content type when the url has no extension', () => {
    expect(assetFileName(bytes, 'https://e.com/attachment', 'image/webp')).toMatch(/\.webp$/)
  })

  it('falls back to .png when neither says', () => {
    expect(assetFileName(bytes, 'https://e.com/attachment')).toMatch(/\.png$/)
  })
})

describe('rewriteImageUrls', () => {
  it('swaps remote urls for local paths', () => {
    const md = '![포스터](https://s3.example.com/poster.png?sig=1)'
    const out = rewriteImageUrls(md, new Map([['https://s3.example.com/poster.png?sig=1', 'ab12cd34ef56.png']]))

    expect(out).toBe('![포스터](../../assets/notion/ab12cd34ef56.png)')
  })

  it('rewrites html sources too', () => {
    const out = rewriteImageUrls('<img src="https://e.com/a.png" alt="a">', new Map([['https://e.com/a.png', 'aaa.png']]))
    expect(out).toContain('src="../../assets/notion/aaa.png"')
  })

  it('leaves a url alone when it was not downloaded', () => {
    const md = '![x](https://e.com/missing.png)'
    expect(rewriteImageUrls(md, new Map())).toBe(md)
  })

  it('leaves the rest of the document untouched', () => {
    const md = '# 제목\n\n본문 [링크](https://e.com/doc.pdf)\n\n![a](https://e.com/a.png)'
    const out = rewriteImageUrls(md, new Map([['https://e.com/a.png', 'h.png']]))

    expect(out).toContain('# 제목')
    expect(out).toContain('[링크](https://e.com/doc.pdf)')
  })
})

describe('stripNotionArtifacts', () => {
  it('removes the empty-block marker Notion emits for a blank paragraph', () => {
    // Seen on the first real sync: an empty paragraph in Notion arrives as a
    // literal <empty-block/> tag, which would render as markup on the page.
    expect(stripNotionArtifacts('본문\n<empty-block/>\n')).toBe('본문\n')
  })

  it('collapses the blank run a removed marker leaves behind', () => {
    expect(stripNotionArtifacts('가\n\n<empty-block/>\n\n나')).toBe('가\n\n나')
  })

  it('leaves a document without markers untouched', () => {
    const md = '# 제목\n\n본문\n'
    expect(stripNotionArtifacts(md)).toBe(md)
  })
})

describe('findUnknownBlocks', () => {
  it('reports the block types the markdown endpoint could not render', () => {
    const md = '본문\n\n<unknown type="bookmark" />\n\n<unknown type="embed" />'
    expect(findUnknownBlocks(md)).toEqual(['bookmark', 'embed'])
  })

  it('is empty for a clean document', () => {
    expect(findUnknownBlocks('# 제목\n본문')).toEqual([])
  })
})

describe('renderMarkdownFile', () => {
  const post = {
    notionId: '3cdf3b60-7973-819e-bf32-cde1ccfeac3a',
    slug: '3cdf3b60',
    title: '2026. 2학기 중간고사대비 안내',
    board: '공지사항',
    date: '2026-08-11'
  }

  it('writes frontmatter in a fixed key order, then the body', () => {
    expect(renderMarkdownFile(post, '본문입니다.\n')).toBe(
      [
        '---',
        'title: "2026. 2학기 중간고사대비 안내"',
        'board: "공지사항"',
        'date: "2026-08-11"',
        'notionId: "3cdf3b60-7973-819e-bf32-cde1ccfeac3a"',
        '---',
        '',
        '본문입니다.',
        ''
      ].join('\n')
    )
  })

  it('escapes quotes and backslashes in a title', () => {
    const tricky = { ...post, title: 'He said "hi" \\ bye' }
    expect(renderMarkdownFile(tricky, '')).toContain('title: "He said \\"hi\\" \\\\ bye"')
  })

  it('quotes the date so YAML keeps it a string', () => {
    // Unquoted, YAML parses 2026-08-11 into a Date at UTC midnight — the very
    // timezone shift src/lib/date.ts exists to avoid. Quoted, it stays the
    // calendar date the academy wrote.
    expect(renderMarkdownFile(post, '')).toContain('date: "2026-08-11"')
  })

  it('writes a null date rather than omitting the key', () => {
    // A stable key set keeps the zod schema's shape honest and the diff quiet.
    expect(renderMarkdownFile({ ...post, date: null }, '')).toContain('date: null')
  })

  it('always ends with exactly one newline', () => {
    for (const body of ['본문', '본문\n', '본문\n\n\n']) {
      const out = renderMarkdownFile(post, body)
      expect(out.endsWith('본문\n')).toBe(true)
    }
  })

  it('normalises CRLF, which would otherwise churn the diff on every sync', () => {
    expect(renderMarkdownFile(post, 'a\r\nb\r\n')).toContain('a\nb')
  })
})
