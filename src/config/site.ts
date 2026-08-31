/**
 * Everything about this site that is not a post.
 *
 * Notion is the source of truth for notices only. Branding, contact details and
 * the promotional banner live here, in the repository, where a change is a
 * reviewable diff rather than an edit someone made in a Notion page at 2am.
 */
export const site = {
  name: '목동조쌤 영어학원',
  description: '목동조쌤 영어학원 공지사항 · 과정 안내',
  url: 'https://chossam.pages.dev',

  contact: {
    address: '원희캐슬 A동 601호',
    phone: '010-8336-6325'
  },

  /**
   * What a shared link shows. The title is `name` above; only the description
   * differs, because a preview card wants a standalone sentence rather than the
   * page's own meta description.
   *
   * The image is generated from the same crest the header renders — see
   * scripts/make-icons.ts.
   */
  og: {
    description: '공지사항 및 과정 안내',
    image: '/og-image.png'
  },

  /** The academy's logo red. Also the SDS theme seed in BoardBrowser. */
  brandColor: '#B40407'
} as const

export type Site = typeof site
