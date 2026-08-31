/**
 * The board selector and the paged list under it.
 *
 * The only interactive part of the site, and the only hydrated island.
 *
 * Two layout rules hold the page still. The banner sits directly below this
 * component, so anything that changes height here moves it:
 *
 *   1. A row is a fixed height and its title never wraps. A long headline
 *      truncates instead of growing the row.
 *   2. The list area reserves a full page of rows, and the pager renders on
 *      every board — even one with a single page, where both buttons are
 *      disabled. Switching tabs then changes only what is inside a box whose
 *      size never moves.
 *
 * Paging hides rows rather than dropping them: every post stays in the
 * prerendered HTML, where a crawler and a reader with JavaScript off can
 * still reach it.
 *
 * The tab strip is the SDS `Tab` (see src/sds/SOURCE.md), themed to the
 * academy logo red at the island root.
 */
import { useEffect, useState } from 'react'
import { SDSProvider } from '@sds/ui/core/SDSProvider'
import { Tab } from '@sds/ui/components/tab'
import { SdsColors } from '@skkuverse/tokens'
import { compareByDateDesc, formatKoreanDate } from '../lib/date'

/** The academy's logo red. Drives the tab indicator and the selected label. */
const BRAND = '#B40407'

/** The board that opens by default when it exists. */
const DEFAULT_BOARD = '공지사항'

/** Rows per page. The list area always reserves this many. */
export const POSTS_PER_PAGE = 5

/** Fixed row height, in px. With no wrapping, this makes the area's height exact. */
const ROW_HEIGHT = 52

export interface BoardPost {
  slug: string
  title: string
  board: string
  date: string | null
}

export interface BoardBrowserProps {
  /** Board names in Notion's option order. */
  boards: string[]
  posts: BoardPost[]
  /** Overrides the default board; ignored when it names no known board. */
  initialBoard?: string
  /** 1-based; clamped to the board's page count. */
  initialPage?: number
}

function openingBoard(boards: string[], requested?: string): string {
  if (requested && boards.includes(requested)) return requested
  if (boards.includes(DEFAULT_BOARD)) return DEFAULT_BOARD
  return boards[0] ?? ''
}

function pageCountOf(total: number): number {
  return Math.max(1, Math.ceil(total / POSTS_PER_PAGE))
}

function PostRow({ post, hidden }: { post: BoardPost; hidden: boolean }) {
  return (
    <li
      hidden={hidden}
      style={{
        // `hidden` hides through the user-agent stylesheet, which an inline
        // `display` outranks — so the value has to be stated here, or an
        // off-page row keeps its 52px and pushes the banner below down.
        display: hidden ? 'none' : 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        height: ROW_HEIGHT,
        padding: '0 4px',
        borderBottom: `1px solid ${SdsColors.grey100}`
      }}
    >
      <a
        href={`/posts/${post.slug}`}
        style={{
          color: SdsColors.grey800,
          textDecoration: 'none',
          fontSize: 15,
          lineHeight: '22px',
          // Truncate rather than wrap: a wrapped title would make the row
          // taller and shift the banner below.
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        {post.title}
      </a>
      {/* Outside the anchor: the link's name should be the title alone. */}
      <time
        dateTime={post.date ?? undefined}
        style={{
          flexShrink: 0,
          color: SdsColors.grey500,
          fontSize: 13,
          fontVariantNumeric: 'tabular-nums'
        }}
      >
        {formatKoreanDate(post.date)}
      </time>
    </li>
  )
}

function BoardPanel({
  posts,
  hidden,
  page
}: {
  posts: BoardPost[]
  hidden: boolean
  page: number
}) {
  if (posts.length === 0) {
    return (
      <p
        hidden={hidden}
        style={{
          display: hidden ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: POSTS_PER_PAGE * ROW_HEIGHT,
          margin: 0,
          color: SdsColors.grey500,
          fontSize: 15
        }}
      >
        등록된 글이 없습니다.
      </p>
    )
  }

  const first = (page - 1) * POSTS_PER_PAGE

  return (
    <ul
      aria-label="게시글 목록"
      hidden={hidden}
      style={{ listStyle: 'none', margin: 0, padding: 0 }}
    >
      {posts.map((post, index) => (
        <PostRow
          key={post.slug}
          post={post}
          hidden={index < first || index >= first + POSTS_PER_PAGE}
        />
      ))}
    </ul>
  )
}

function Pager({
  page,
  pageCount,
  onChange
}: {
  page: number
  pageCount: number
  onChange: (page: number) => void
}) {
  const button = (label: string, target: number, disabled: boolean, glyph: string) => (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(target)}
      style={{
        width: 32,
        height: 32,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        borderRadius: 8,
        background: 'none',
        color: disabled ? SdsColors.grey300 : SdsColors.grey700,
        cursor: disabled ? 'default' : 'pointer',
        fontSize: 16,
        lineHeight: 1
      }}
    >
      {glyph}
    </button>
  )

  return (
    <nav
      aria-label="게시글 페이지"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 56
      }}
    >
      {button('이전 페이지', page - 1, page <= 1, '‹')}
      <span
        aria-live="polite"
        style={{
          minWidth: 56,
          textAlign: 'center',
          color: SdsColors.grey600,
          fontSize: 13,
          fontVariantNumeric: 'tabular-nums'
        }}
      >
        {page} / {pageCount}
      </span>
      {button('다음 페이지', page + 1, page >= pageCount, '›')}
    </nav>
  )
}

export function BoardBrowser({
  boards,
  posts,
  initialBoard,
  initialPage = 1
}: BoardBrowserProps) {
  const [board, setBoard] = useState(() => openingBoard(boards, initialBoard))
  const [page, setPage] = useState(initialPage)

  const byBoard = (name: string) =>
    posts.filter(post => post.board === name).sort(compareByDateDesc)

  const pageCount = pageCountOf(byBoard(board).length)

  // A ?board=/?page= link should open on that view. Read after mount rather
  // than during render: the same component is rendered to HTML at build time,
  // where there is no location and every reader would otherwise get the same tab.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requestedBoard = params.get('board')
    const requestedPage = Number(params.get('page'))

    const next = requestedBoard && boards.includes(requestedBoard) ? requestedBoard : null
    if (next) setBoard(next)
    if (Number.isInteger(requestedPage) && requestedPage > 0) setPage(requestedPage)
  }, [boards])

  const writeUrl = (nextBoard: string, nextPage: number) => {
    const url = new URL(window.location.href)
    url.searchParams.set('board', nextBoard)
    url.searchParams.set('page', String(nextPage))
    window.history.replaceState({}, '', url)
  }

  const selectBoard = (next: string) => {
    setBoard(next)
    // Page 2 of the board you just left says nothing about the one you opened.
    setPage(1)
    writeUrl(next, 1)
  }

  const goToPage = (next: number) => {
    const clamped = Math.min(Math.max(next, 1), pageCount)
    setPage(clamped)
    writeUrl(board, clamped)
  }

  // Clamp rather than trust: ?page=99, or a board whose posts shrank since the
  // link was shared, would otherwise render an empty page inside a reserved box.
  const currentPage = Math.min(page, pageCount)

  return (
    <SDSProvider token={{ color: { primary: BRAND } }}>
      <Tab value={board} onChange={selectBoard} alignment="fluid">
        {boards.map(name => (
          <Tab.Item key={name} value={name}>
            {name}
          </Tab.Item>
        ))}
      </Tab>

      <div data-board-list style={{ minHeight: POSTS_PER_PAGE * ROW_HEIGHT }}>
        {boards.map(name => (
          <BoardPanel
            key={name}
            hidden={name !== board}
            page={name === board ? currentPage : 1}
            posts={byBoard(name)}
          />
        ))}
      </div>

      <Pager page={currentPage} pageCount={pageCount} onChange={goToPage} />
    </SDSProvider>
  )
}

export default BoardBrowser
