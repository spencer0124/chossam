import {
  getBlockCollectionId,
  getBlockValue,
  getDateValue,
  getTextContent
} from 'notion-utils'
import { useEffect, useMemo, useState } from 'react'

/**
 * 노션 캘린더 뷰 렌더러
 *
 * react-notion-x 의 third-party/collection-view.tsx 는 table/gallery/list/board 만
 * 처리하고 calendar 는 `return null` 이라 화면에 아무것도 나오지 않는다.
 * 다만 notion-client 는 뷰 타입을 가리지 않고 모든 뷰의 데이터를 미리 받아
 * recordMap.collection_query[collectionId][viewId] 에 넣어두므로,
 * 여기서는 추가 API 호출 없이 그 데이터를 월간 그리드로 그리기만 한다.
 */

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

// tailwind purge 대상이 되도록 클래스 문자열을 리터럴로 둔다
const TAG_COLORS = {
  default: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-100',
  gray: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-100',
  brown: 'bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100',
  orange:
    'bg-orange-200 text-orange-900 dark:bg-orange-800 dark:text-orange-100',
  yellow:
    'bg-yellow-200 text-yellow-900 dark:bg-yellow-800 dark:text-yellow-100',
  green: 'bg-green-200 text-green-900 dark:bg-green-800 dark:text-green-100',
  blue: 'bg-blue-200 text-blue-900 dark:bg-blue-800 dark:text-blue-100',
  purple:
    'bg-purple-200 text-purple-900 dark:bg-purple-800 dark:text-purple-100',
  pink: 'bg-pink-200 text-pink-900 dark:bg-pink-800 dark:text-pink-100',
  red: 'bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100'
}

// 주의: lib/themeConsoleStyle.js 가 테마별로
//   [class~="text-red-500"] / [class~="text-blue-500"] 등을
//   `color: var(--<theme>-console-primary) !important` 로 강제 치환한다.
// 배경도 마찬가지로 bg-{red,blue,green,indigo}-{500,600} 및 bg-white/bg-gray-50 이 탈취된다.
// 테마색에 먹히지 않아야 하는 색은 임의값(arbitrary value)으로 지정한다.
const SUNDAY_TEXT = 'text-[#dc2626] dark:text-[#f87171]'
const SATURDAY_TEXT = 'text-[#2563eb] dark:text-[#60a5fa]'

const pad = n => String(n).padStart(2, '0')
const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
/** 'YYYY-MM-DD' → 로컬 자정 Date (UTC 파싱으로 인한 하루 밀림 방지) */
const parseKey = s => {
  const [y, m, d] = String(s).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export default function NotionCalendar({ block, className, ctx }) {
  const recordMap = ctx?.recordMap
  const collectionId = getBlockCollectionId(block, recordMap)

  // 이 블록에 달린 캘린더 뷰만 추린다 (예: 학사 일정 / 오늘의 식단)
  const calendarViewIds = useMemo(() => {
    return (block?.view_ids || []).filter(
      id => getBlockValue(recordMap?.collection_view?.[id])?.type === 'calendar'
    )
  }, [block?.view_ids, recordMap])

  const [activeViewId, setActiveViewId] = useState(calendarViewIds[0])
  const viewId = calendarViewIds.includes(activeViewId)
    ? activeViewId
    : calendarViewIds[0]

  const collection = getBlockValue(recordMap?.collection?.[collectionId])
  const collectionView = getBlockValue(recordMap?.collection_view?.[viewId])
  const collectionData = recordMap?.collection_query?.[collectionId]?.[viewId]

  // 날짜 속성 id. 캘린더 뷰는 query2.calendar_by 에 들고 있다
  const datePropId = collectionView?.query2?.calendar_by

  // 뱃지로 띄울 속성들 (calendar_properties 중 visible:true, 날짜 속성 제외)
  const badgePropIds = useMemo(() => {
    const props = collectionView?.format?.calendar_properties || []
    return props
      .filter(p => p?.visible && p?.property !== datePropId)
      .map(p => p.property)
  }, [collectionView, datePropId])

  const events = useMemo(() => {
    const blockIds =
      collectionData?.collection_group_results?.blockIds ??
      collectionData?.blockIds ??
      []
    const out = []
    for (const blockId of blockIds) {
      const row = getBlockValue(recordMap?.block?.[blockId])
      if (!row) continue
      const dv = getDateValue(row.properties?.[datePropId])
      if (!dv?.start_date) continue

      const tags = []
      for (const pid of badgePropIds) {
        const raw = getTextContent(row.properties?.[pid])
        if (!raw) continue
        for (const name of raw.split(',').map(s => s.trim()).filter(Boolean)) {
          const option = collection?.schema?.[pid]?.options?.find(
            o => o.value === name
          )
          tags.push({ name, color: option?.color || 'default' })
        }
      }

      out.push({
        id: blockId,
        title: getTextContent(row.properties?.title) || '(제목 없음)',
        start: dv.start_date,
        end: dv.end_date || dv.start_date,
        startTime: dv.start_time || '',
        tags
      })
    }
    return out
  }, [collectionData, recordMap, datePropId, badgePropIds, collection])

  // 서버 렌더와 hydration 을 일치시키기 위해, 첫 렌더는 데이터에서 파생된
  // 결정적인 달을 쓰고 마운트 후에 '이번 달'로 옮긴다.
  // (정적 export 라 HTML 이 며칠 전 빌드일 수 있어 new Date() 를 초기값으로 쓰면 mismatch)
  const fallbackMonth = useMemo(() => {
    const first = events
      .map(e => e.start)
      .sort()
      .find(Boolean)
    const d = first ? parseKey(first) : null
    return d ? { y: d.getFullYear(), m: d.getMonth() } : null
  }, [events])

  const [cursor, setCursor] = useState(null)
  const [todayKey, setTodayKey] = useState(null)

  useEffect(() => {
    const now = new Date()
    setTodayKey(keyOf(now))
    setCursor({ y: now.getFullYear(), m: now.getMonth() })
  }, [])

  const view = cursor || fallbackMonth

  const eventsByDay = useMemo(() => {
    const map = new Map()
    for (const ev of events) {
      const start = parseKey(ev.start)
      const end = parseKey(ev.end) || start
      if (!start) continue
      let d = start
      let guard = 0
      while (d <= end && guard++ < 400) {
        const k = keyOf(d)
        if (!map.has(k)) map.set(k, [])
        map.get(k).push(ev)
        d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
      }
    }
    return map
  }, [events])

  if (!collectionView || !collectionData) {
    return null
  }

  // 달을 아직 못 정한 상태(이벤트 0건 + 마운트 전) → 자리만 잡아둔다
  if (!view) {
    return <div className={`min-h-[24rem] ${className || ''}`} />
  }

  const firstWeekday = new Date(view.y, view.m, 1).getDay()
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7

  const monthHasEvents = Array.from(eventsByDay.keys()).some(k =>
    k.startsWith(`${view.y}-${pad(view.m + 1)}`)
  )

  const goMonth = delta => {
    const d = new Date(view.y, view.m + delta, 1)
    setCursor({ y: d.getFullYear(), m: d.getMonth() })
  }

  // 컬렉션 이름이 'ㅤ'(U+3164) 같은 공백성 문자뿐이면 표시하지 않는다
  const rawTitle = getTextContent(collection?.name) || ''
  const title = /[^\s\u3164\u00a0]/.test(rawTitle) ? rawTitle : ''

  return (
    <div className={`notion-calendar my-4 w-full ${className || ''}`}>
      {/* 헤더: 제목 · 뷰 탭 · 월 이동 */}
      <div className='flex flex-wrap items-center justify-between gap-2 mb-3'>
        <div className='flex items-center gap-2'>
          <span className='sds-cal-title'>
            {view.y}년 {view.m + 1}월
          </span>
          {title && (
            <span className='text-sm text-gray-400 dark:text-gray-500'>
              {title}
            </span>
          )}
        </div>

        <div className='flex items-center gap-2'>
          {calendarViewIds.length > 1 && (
            <div className='sds-cal-tabs'>
              {calendarViewIds.map(id => {
                const v = getBlockValue(recordMap?.collection_view?.[id])
                const active = id === viewId
                return (
                  <button
                    key={id}
                    onClick={() => setActiveViewId(id)}
                    className='sds-cal-tab'
                    data-active={active || undefined}>
                    {v?.name || '캘린더'}
                  </button>
                )
              })}
            </div>
          )}

          <button
            onClick={() => goMonth(-1)}
            aria-label='이전 달'
            className='sds-cal-btn'>
            ‹
          </button>
          <button
            onClick={() => {
              const now = new Date()
              setCursor({ y: now.getFullYear(), m: now.getMonth() })
            }}
            className='sds-cal-btn'>
            오늘
          </button>
          <button
            onClick={() => goMonth(1)}
            aria-label='다음 달'
            className='sds-cal-btn'>
            ›
          </button>
        </div>
      </div>

      {!monthHasEvents && (
        <div className='sds-cal-empty'>
          이 달에는 등록된 일정이 없습니다.
        </div>
      )}

      {/* 요일 */}
      <div className='grid grid-cols-7 border-t border-l border-gray-200 dark:border-gray-700'>
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`border-r border-b border-gray-200 dark:border-gray-700 py-1 text-center text-xs font-medium ${
              i === 0
                ? SUNDAY_TEXT
                : i === 6
                  ? SATURDAY_TEXT
                  : 'text-gray-500 dark:text-gray-400'
            }`}>
            {w}
          </div>
        ))}

        {/* 날짜 셀 */}
        {Array.from({ length: cellCount }).map((_, i) => {
          const dayNum = i - firstWeekday + 1
          const inMonth = dayNum >= 1 && dayNum <= daysInMonth
          const k = inMonth ? `${view.y}-${pad(view.m + 1)}-${pad(dayNum)}` : null
          const dayEvents = k ? eventsByDay.get(k) || [] : []
          const isToday = k && k === todayKey
          const weekday = i % 7

          return (
            <div
              key={i}
              className={`border-r border-b border-gray-200 dark:border-gray-700 min-h-[5.5rem] p-1 align-top ${
                inMonth ? '' : 'bg-[#f9fafb] dark:bg-gray-900/40'
              }`}>
              {inMonth && (
                <div
                  className={`text-xs mb-1 ${
                    isToday
                      ? 'sds-cal-today inline-flex items-center justify-center w-5 h-5 rounded-full text-white'
                      : weekday === 0
                        ? SUNDAY_TEXT
                        : weekday === 6
                          ? SATURDAY_TEXT
                          : 'text-gray-500 dark:text-gray-400'
                  }`}>
                  {dayNum}
                </div>
              )}

              <div className='space-y-1'>
                {dayEvents.map((ev, idx) => (
                  <div
                    key={`${ev.id}-${idx}`}
                    title={ev.title}
                    className='sds-cal-event'>
                    <div className='truncate'>
                      {ev.startTime && (
                        <span className='mr-1 text-gray-400'>
                          {ev.startTime}
                        </span>
                      )}
                      {ev.title}
                    </div>
                    {ev.tags.length > 0 && (
                      <div className='mt-0.5 flex flex-wrap gap-0.5'>
                        {ev.tags.map((t, ti) => (
                          <span
                            key={ti}
                            className={`rounded px-1 ${TAG_COLORS[t.color] || TAG_COLORS.default}`}>
                            {t.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
