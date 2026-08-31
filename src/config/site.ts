/**
 * Everything about this site that is not a post.
 *
 * Notion is the source of truth for notices only. Branding, contact details and
 * the promotional banner live here, in the repository, where a change is a
 * reviewable diff rather than an edit someone made in a Notion page at 2am.
 */
export const site = {
  name: '목동 조쌤 영어학원',
  description: '목동 조쌤 영어학원 공지사항 · 과정 안내',
  url: 'https://chossam.pages.dev',

  contact: {
    address: '원희캐슬 A동 601호',
    phone: '010-8336-6325'
  },

  /** The academy's logo red. Also the SDS theme seed in BoardBrowser. */
  brandColor: '#B40407'
} as const

export type Site = typeof site
