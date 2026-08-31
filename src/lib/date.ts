/**
 * Dates on this site are calendar dates, never instants.
 *
 * A post dated 2026-08-11 is dated that day in Seoul regardless of where the
 * page is built or read, so nothing here goes through `Date`: parsing
 * '2026-08-11' yields UTC midnight, which renders as the 10th anywhere west of
 * Greenwich. Reading the string is both simpler and correct.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/

/** `2026-08-11` → `2026. 8. 11.`, the format the client's mockup uses. */
export function formatKoreanDate(date: string | null | undefined): string {
  if (!date) return ''
  const match = ISO_DATE.exec(date)
  if (!match) return date

  const [, year, month, day] = match
  return `${year}. ${Number(month)}. ${Number(day)}.`
}

/**
 * Newest first, undated last, ties broken by title.
 *
 * The tiebreak matters: without it the order of two same-day posts would depend
 * on the order Notion happened to return them, and the page would reshuffle on
 * an unrelated sync.
 */
export function compareByDateDesc(
  a: { date: string | null; title: string },
  b: { date: string | null; title: string }
): number {
  if (a.date !== b.date) {
    if (!a.date) return 1
    if (!b.date) return -1
    return a.date < b.date ? 1 : -1
  }
  return a.title.localeCompare(b.title, 'ko')
}
