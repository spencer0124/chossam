import { useRouter } from 'next/router'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 좌측 목차 — 원페이지 사이트용.
 *
 * 이 사이트는 원페이지다. 목차를 누르면 다른 페이지로 가는 게 아니라
 * **같은 페이지의 해당 섹션으로 스크롤**한다. 그래서 목차는 blockMap 의
 * 블록 순서가 아니라 **실제로 렌더된 DOM** 에서 만든다 —
 * 화면에 없는 항목은 애초에 목차에 나오지 않으므로 죽은 링크가 생기지 않는다.
 *
 *   .notion-calendar                              → 캘린더
 *   .notion-collection > .notion-board-view       → 유튜브
 *   .notion-collection > .notion-collection-group → 게시판 (그룹이 하위 목차)
 *   .notion-collection > .notion-table-view       → 게시판 (그룹 없을 때)
 *
 * 스타일: styles/chossam.css 의 .sds-boardnav
 */

/** 고정 헤더 높이 — chossam.css 의 scroll-margin-top 과 맞춘다 */
const SCROLL_OFFSET = 80

/** 현재 페이지에 렌더된 섹션을 읽는다 */
function readSections() {
  if (typeof document === 'undefined') return []

  const nodes = document.querySelectorAll(
    '#article-wrapper .notion-collection, #article-wrapper .notion-calendar'
  )

  // 요소 참조 대신 `notion-block-<id>` 클래스를 앵커로 들고 있는다.
  // 노션 컬렉션은 지연 렌더/재렌더로 DOM 노드가 교체되기 때문에,
  // 요소를 붙들고 있으면 참조가 끊겨(isConnected=false) 스크롤 감시가 조용히 멈춘다.
  const anchorOf = el =>
    [...el.classList].find(c => c.startsWith('notion-block-')) || null

  const found = []
  const seen = []
  for (const el of nodes) {
    if (seen.some(prev => prev.contains(el) || el.contains(prev))) continue
    const anchor = anchorOf(el)
    if (!anchor) continue
    seen.push(el)

    const top = el.getBoundingClientRect().top + window.scrollY

    if (el.classList.contains('notion-calendar')) {
      found.push({ key: 'calendar', label: '캘린더', anchor, top, children: [] })
    } else if (el.querySelector('.notion-board-view')) {
      found.push({ key: 'board', label: '유튜브', anchor, top, children: [] })
    } else if (el.querySelector('.notion-collection-group')) {
      found.push({
        key: 'groups',
        label: '게시판',
        anchor,
        top,
        children: [...el.querySelectorAll('.notion-collection-group-title')]
          .map(t => t.textContent?.trim().replace(/\s*\d+$/, '') || '')
          .filter(Boolean)
      })
    } else if (el.querySelector('.notion-table-view')) {
      found.push({ key: 'table', label: '게시판', anchor, top, children: [] })
    }
  }

  return found.sort((a, b) => a.top - b.top)
}

export default function BoardNav({ className, onNavigate }) {
  const router = useRouter()
  const [sections, setSections] = useState([])
  const [active, setActive] = useState({ section: null, child: null })
  const clickLock = useRef(0)

  // 노션 컬렉션은 지연 렌더되므로 마운트 후 잠시 관찰하며 목차를 만든다
  useEffect(() => {
    let stopped = false

    const scan = () => {
      if (stopped) return
      const next = readSections()
      setSections(prev => {
        const same =
          prev.length === next.length &&
          prev.every(
            (p, i) =>
              p.key === next[i].key &&
              p.label === next[i].label &&
              p.anchor === next[i].anchor &&
              p.children.join() === next[i].children.join()
          )
        return same ? prev : next
      })
    }

    scan()
    const wrapper = document.querySelector('#article-wrapper')
    const observer = wrapper
      ? new MutationObserver(() => window.requestAnimationFrame(scan))
      : null
    observer?.observe(wrapper, { childList: true, subtree: true })
    const timer = window.setTimeout(scan, 1500)

    return () => {
      stopped = true
      observer?.disconnect()
      window.clearTimeout(timer)
    }
  }, [router.asPath])

  const groupEl = useCallback(name => {
    for (const title of document.querySelectorAll('.notion-collection-group-title')) {
      if (title.textContent?.trim().startsWith(name)) {
        return title.closest('.notion-collection-group') || title
      }
    }
    return null
  }, [])

  /** 원페이지이므로 언제나 스크롤만 한다 (페이지 이동 없음) */
  const scrollTo = useCallback(
    (el, next) => {
      if (!el) return
      const details = el.closest('details')
      if (details && !details.open) details.open = true
      clickLock.current = Date.now()
      setActive(next)
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      onNavigate?.()
    },
    [onNavigate]
  )

  // 직접 스크롤해도 활성 항목이 따라오게 한다
  useEffect(() => {
    if (!sections.length) return
    let frame = 0

    const update = () => {
      frame = 0
      if (Date.now() - clickLock.current < 700) return

      const line = SCROLL_OFFSET + 8
      let current = { section: null, child: null }

      for (const section of sections) {
        const el = document.querySelector(`.${section.anchor}`)
        if (!el || el.getBoundingClientRect().top > line) continue
        current = { section: section.key, child: null }
        for (const name of section.children) {
          const g = groupEl(name)
          if (g && g.getBoundingClientRect().top <= line) current.child = name
        }
      }

      setActive(prev =>
        prev.section === current.section && prev.child === current.child ? prev : current
      )
    }

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [sections, groupEl])

  if (!sections.length) return null

  return (
    <nav className={`sds-boardnav ${className || ''}`}>
      <ul>
        {sections.map(section => (
          <li key={section.key}>
            <button
              type='button'
              className='sds-boardnav-section'
              data-active={active.section === section.key || undefined}
              onClick={() =>
                scrollTo(document.querySelector(`.${section.anchor}`), {
                  section: section.key,
                  child: null
                })
              }>
              {section.label}
            </button>

            {section.children.length > 0 && (
              <ul className='sds-boardnav-sub'>
                {section.children.map(name => (
                  <li key={name}>
                    <button
                      type='button'
                      className='sds-boardnav-child'
                      data-active={active.child === name || undefined}
                      onClick={() =>
                        scrollTo(groupEl(name), { section: section.key, child: name })
                      }>
                      {name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
