import BLOG from '@/blog.config'
import type { SiteData } from '../site.types'

export function EmptyData(pageId?: string): SiteData {
  return {
    NOTION_CONFIG: {},
    siteInfo: {
      title: 'NotionNext BLOG',
      description: 'Notion 데이터를 가져오지 못했습니다',
      pageCover: '/bg_image.jpg',
      icon: '/avatar.svg',
      link: BLOG.LINK
    },
    notice: null,
    allPages: [],
    allNavPages: [],
    allLinkPages: [],
    latestPosts: [],
    categoryOptions: [],
    tagOptions: [],
    customNav: [],
    customMenu: [],
    postCount: 0
  }
}
