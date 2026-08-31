import BLOG from '@/blog.config'
import { getPostBlocks } from '@/lib/db/SiteDataApi'
import { adapterNotionBlockMap } from '@/lib/utils/notion.util'
import { getBlockValue, idToUuid } from 'notion-utils'

/**
 * 홈에서 링크된 노션 페이지들의 id.
 *
 * NotionNext 는 자기 DB(type/status/slug 스키마)에 있는 행만 정적 경로로 뽑는다.
 * 그래서 홈에 링크만 걸어둔 데이터베이스 페이지(공지사항 / 유튜브 등)는
 * `next dev` 에서는 열리지만(요청 시 렌더) 정적 export 에는 아예 포함되지 않아
 * 배포하면 404 가 된다.
 *
 * 여기서 홈 블록맵을 훑어 그런 페이지 + 표에 렌더되는 각 행의 id 를 모아
 * 정적 경로에 추가한다.
 * 실제 데이터 해석은 SiteDataApi 의 resolvePostProps 가 이미 갖고 있는
 * "마지막 경로가 UUID 면 노션에서 직접 가져온다" 분기가 처리한다.
 */
export async function getHomeLinkedPageIds() {
  const homePageId = BLOG.HOME_PAGE_ID
  if (!homePageId) return []

  try {
    const raw = await getPostBlocks(homePageId, 'home-linked-paths')
    const blockMap = adapterNotionBlockMap(raw)
    const rootId = idToUuid(homePageId)
    const ids = new Set()

    for (const [id, record] of Object.entries(blockMap?.block || {})) {
      if (id === rootId) continue
      const block = getBlockValue(record)
      if (!block) continue

      // 1) 데이터베이스 페이지 / 일반 하위 페이지
      const isDatabasePage = block.type === 'collection_view_page'
      const isSubPage =
        block.type === 'page' && block.parent_table !== 'collection'

      // 2) 데이터베이스의 각 행(= 공지 글 하나하나).
      //    홈에 표가 렌더되면 각 행이 /<rowId> 링크가 되므로 이것도 정적으로 뽑아야 한다.
      //    빠뜨리면 dev 에서는 열리는데 배포 후 클릭하면 404 가 난다.
      const isCollectionRow =
        block.type === 'page' && block.parent_table === 'collection'

      if (isDatabasePage || isSubPage || isCollectionRow) ids.add(id)
    }

    return [...ids].map(id => String(id).replace(/-/g, ''))
  } catch (err) {
    console.warn('[homeLinkedPages] 홈 링크 페이지 수집 실패:', err?.message)
    return []
  }
}
