// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BoardBrowser, POSTS_PER_PAGE, type BoardPost } from './BoardBrowser'

afterEach(cleanup)

// Selecting a tab writes ?board= so the view can be linked to, and every test
// in this file shares one jsdom window. Without this reset, one test's click
// decides the next test's opening tab.
beforeEach(() => window.history.replaceState({}, '', '/'))

const boards = ['공지사항', '학원시스템', '초등과정']

const posts: BoardPost[] = [
  { slug: 'aaaaaaaa', title: '2026. 2학기 중간고사대비 안내', board: '공지사항', date: '2026-08-11' },
  { slug: 'bbbbbbbb', title: 'Results speak for themselves', board: '공지사항', date: '2026-03-24' },
  { slug: 'cccccccc', title: '학습관리 시스템 안내', board: '학원시스템', date: '2026-08-05' }
]

/** 공지사항 with enough posts to need a second page. */
const manyPosts: BoardPost[] = Array.from({ length: POSTS_PER_PAGE + 2 }, (_, i) => ({
  slug: `post${i}`.padEnd(8, '0'),
  title: `공지 ${String(i).padStart(2, '0')}`,
  board: '공지사항',
  // Descending dates, so the rendered order is the array order.
  date: `2026-08-${String(28 - i).padStart(2, '0')}`
}))

/**
 * Titles in the list under the tab strip.
 *
 * The date is deliberately outside the anchor, so a link's text is exactly the
 * post title — both for this assertion and for a screen reader reading the link.
 */
function visibleTitles() {
  return within(screen.getByRole('list', { name: '게시글 목록' }))
    .getAllByRole('link')
    .map(link => link.textContent?.trim())
}

describe('BoardBrowser', () => {
  it('renders one tab per board, in the order given', () => {
    render(<BoardBrowser boards={boards} posts={posts} />)

    expect(screen.getAllByRole('tab').map(tab => tab.textContent)).toEqual(boards)
  })

  it('selects 공지사항 on load', () => {
    render(<BoardBrowser boards={boards} posts={posts} />)

    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('공지사항')
  })

  it('shows only the selected board, newest first', () => {
    render(<BoardBrowser boards={boards} posts={posts} />)

    expect(visibleTitles()).toEqual([
      '2026. 2학기 중간고사대비 안내',
      'Results speak for themselves'
    ])
  })

  it('swaps the list when another tab is clicked', () => {
    render(<BoardBrowser boards={boards} posts={posts} />)

    fireEvent.click(screen.getByRole('tab', { name: '학원시스템' }))

    expect(visibleTitles()).toEqual(['학습관리 시스템 안내'])
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('학원시스템')
  })

  it('puts every board\'s posts in the html and hides the ones not selected', () => {
    // The page is prerendered: a crawler, and a reader with JavaScript off,
    // should still find all the notices in the markup rather than only the
    // opening board's share of them.
    const { container } = render(<BoardBrowser boards={boards} posts={posts} />)

    expect(container.querySelectorAll('a[href^="/posts/"]')).toHaveLength(posts.length)
    expect(screen.getAllByRole('list', { name: '게시글 목록' })).toHaveLength(1)
  })

  it('links each post to its page', () => {
    render(<BoardBrowser boards={boards} posts={posts} />)

    expect(screen.getByRole('link', { name: /중간고사대비/ })).toHaveAttribute(
      'href',
      '/posts/aaaaaaaa'
    )
  })

  it('shows the date beside the title', () => {
    render(<BoardBrowser boards={boards} posts={posts} />)

    expect(screen.getByText('2026. 8. 11.')).toBeDefined()
  })

  it('says so when a board has no posts yet', () => {
    render(<BoardBrowser boards={boards} posts={posts} />)

    fireEvent.click(screen.getByRole('tab', { name: '초등과정' }))

    expect(screen.getByText(/등록된 글이 없습니다/)).toBeDefined()
  })

  it('falls back to the first board when 공지사항 is not one of them', () => {
    render(<BoardBrowser boards={['고등과정', '중3과정']} posts={[]} />)

    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('고등과정')
  })

  it('honours an explicit initial board, which is how ?board= deep links land', () => {
    render(<BoardBrowser boards={boards} posts={posts} initialBoard="학원시스템" />)

    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('학원시스템')
  })

  it('opens on the board named in ?board=, which is what a shared link carries', () => {
    window.history.replaceState({}, '', '/?board=학원시스템')
    render(<BoardBrowser boards={boards} posts={posts} />)

    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('학원시스템')
  })

  it('records the chosen board in the url so the view can be shared', () => {
    render(<BoardBrowser boards={boards} posts={posts} />)

    fireEvent.click(screen.getByRole('tab', { name: '초등과정' }))

    expect(new URL(window.location.href).searchParams.get('board')).toBe('초등과정')
  })

  it('ignores an initial board that is not on the list', () => {
    render(<BoardBrowser boards={boards} posts={posts} initialBoard="없는게시판" />)

    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('공지사항')
  })
})

describe('BoardBrowser paging', () => {
  it('shows at most one page of posts at a time', () => {
    render(<BoardBrowser boards={boards} posts={manyPosts} />)

    expect(visibleTitles()).toHaveLength(POSTS_PER_PAGE)
    expect(visibleTitles()[0]).toBe('공지 00')
  })

  it('moves to the rest on the next page', () => {
    render(<BoardBrowser boards={boards} posts={manyPosts} />)

    fireEvent.click(screen.getByRole('button', { name: '다음 페이지' }))

    expect(visibleTitles()).toEqual(['공지 05', '공지 06'])
  })

  it('stops at the last page and at the first', () => {
    render(<BoardBrowser boards={boards} posts={manyPosts} />)

    const next = screen.getByRole('button', { name: '다음 페이지' })
    const previous = screen.getByRole('button', { name: '이전 페이지' })

    expect(previous).toBeDisabled()
    fireEvent.click(next)
    expect(next).toBeDisabled()
    fireEvent.click(previous)
    expect(visibleTitles()[0]).toBe('공지 00')
  })

  it('reports which page of how many', () => {
    render(<BoardBrowser boards={boards} posts={manyPosts} />)

    expect(screen.getByText('1 / 2')).toBeDefined()
  })

  it('keeps the pager present on a single-page board, so nothing below shifts', () => {
    // The banner sits under this component. A pager that disappears on some
    // boards would move it every time you switch tabs.
    render(<BoardBrowser boards={boards} posts={posts} />)

    expect(screen.getByRole('button', { name: '다음 페이지' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '이전 페이지' })).toBeDisabled()
  })

  it('returns to the first page when the board changes', () => {
    render(<BoardBrowser boards={boards} posts={manyPosts} />)

    fireEvent.click(screen.getByRole('button', { name: '다음 페이지' }))
    fireEvent.click(screen.getByRole('tab', { name: '학원시스템' }))
    fireEvent.click(screen.getByRole('tab', { name: '공지사항' }))

    expect(visibleTitles()[0]).toBe('공지 00')
  })

  it('records the page in the url beside the board', () => {
    render(<BoardBrowser boards={boards} posts={manyPosts} />)

    fireEvent.click(screen.getByRole('button', { name: '다음 페이지' }))

    const params = new URL(window.location.href).searchParams
    expect(params.get('board')).toBe('공지사항')
    expect(params.get('page')).toBe('2')
  })

  it('opens on the page named in ?page=', () => {
    window.history.replaceState({}, '', '/?board=공지사항&page=2')
    render(<BoardBrowser boards={boards} posts={manyPosts} />)

    expect(visibleTitles()).toEqual(['공지 05', '공지 06'])
  })

  it('keeps every post in the html, including the pages not shown', () => {
    const { container } = render(<BoardBrowser boards={boards} posts={manyPosts} />)

    expect(container.querySelectorAll('a[href^="/posts/"]')).toHaveLength(manyPosts.length)
  })

  it('reserves the height of a full page even when the board holds fewer', () => {
    const { container } = render(<BoardBrowser boards={boards} posts={posts} />)
    const area = container.querySelector('[data-board-list]') as HTMLElement

    expect(area.style.minHeight).not.toBe('')
  })
})

describe('BoardBrowser layout stability', () => {
  it('takes hidden rows out of the layout, not just out of the a11y tree', () => {
    // The `hidden` attribute hides an element through the user-agent
    // stylesheet, which an inline `display` overrides. The first version of
    // this component set display:flex on every row, so rows outside the
    // current page still occupied space — invisible to getByRole, but enough
    // to push the banner below down by two rows on 공지사항.
    const { container } = render(<BoardBrowser boards={boards} posts={manyPosts} />)

    const offPage = [...container.querySelectorAll('li[hidden]')]
    expect(offPage.length).toBeGreaterThan(0)
    for (const row of offPage) {
      expect(getComputedStyle(row).display).toBe('none')
    }
  })

  it('takes a hidden board panel out of the layout too', () => {
    const { container } = render(<BoardBrowser boards={boards} posts={posts} />)

    for (const panel of container.querySelectorAll('ul[hidden], p[hidden]')) {
      expect(getComputedStyle(panel).display).toBe('none')
    }
  })

  it('hides the empty-state message when its board is not selected', () => {
    // 초등과정 has no posts in this fixture, so its panel is the message.
    const { container } = render(<BoardBrowser boards={boards} posts={posts} />)
    const messages = [...container.querySelectorAll('p[hidden]')]

    expect(messages.length).toBeGreaterThan(0)
    for (const message of messages) {
      expect(getComputedStyle(message).display).toBe('none')
    }
  })
})
