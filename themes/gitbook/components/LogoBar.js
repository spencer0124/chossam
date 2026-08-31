import LazyImage from '@/components/LazyImage'
import { siteConfig } from '@/lib/config'
import SmartLink from '@/components/SmartLink'
import CONFIG from '../config'

/**
 * Logo区域
 * @param {*} props
 * @returns
 */
export default function LogoBar(props) {
  const { siteInfo } = props
  return (
    <div id='logo-wrapper' className='w-full flex items-center mr-2'>
      <SmartLink
        href={`/${siteConfig('GITBOOK_INDEX_PAGE', '', CONFIG)}`}
        className='flex items-center text-base font-bold tracking-tight md:text-xl'>
        <LazyImage
          src={siteInfo?.icon}
          width={30}
          height={30}
          alt={siteConfig('AUTHOR')}
          className='mr-2 block'
        />
        {siteInfo?.title || siteConfig('TITLE')}
      </SmartLink>
    </div>
  )
}
