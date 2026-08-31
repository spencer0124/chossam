import { galleryVisibilityClassName } from '@/lib/notion/galleryVisibilityClassName'
import { getBlockValue } from 'notion-utils'
import { Collection } from 'react-notion-x/build/third-party/collection'
import NotionCalendar from './NotionCalendar'

export default function NotionCollection(props) {
  const viewId = props.block?.view_ids?.[0]
  const collectionViewRecord = props.ctx?.recordMap?.collection_view?.[viewId]
  const collectionView = collectionViewRecord?.value || collectionViewRecord

  // react-notion-x 는 calendar 뷰를 렌더하지 않고 null 을 반환한다.
  // 데이터는 recordMap 에 이미 들어와 있으므로 자체 렌더러로 넘긴다.
  if (getBlockValue(collectionViewRecord)?.type === 'calendar') {
    return <NotionCalendar {...props} />
  }

  const className = galleryVisibilityClassName(collectionView)

  if (!className) return <Collection {...props} />

  return (
    <div className={className}>
      <Collection {...props} />
    </div>
  )
}
