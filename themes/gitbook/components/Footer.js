import { siteConfig } from '@/lib/config'

/**
 * 사이트 푸터
 * NotionNext 기본 푸터에서 외부 브랜딩(NotionNext 링크·버전),
 * 방문자 카운터(busuanzi), 중국 ICP 비안 표기를 제거한 학원용 푸터.
 */
const Footer = () => {
  const currentYear = new Date().getFullYear()
  const since = siteConfig('SINCE')
  const copyrightDate =
    parseInt(since) < currentYear ? `${since}-${currentYear}` : `${currentYear}`
  const title = siteConfig('TITLE')

  // 연락처는 CONTACT_* 설정이 있을 때만 노출한다
  const phone = siteConfig('CONTACT_PHONE')
  const address = siteConfig('CONTACT_ADDRESS')

  return (
    <footer className='z-20 border p-3 rounded-lg bg-white justify-center text-center w-full text-sm relative'>
      <div className='text-gray-600'>{title}</div>

      {(phone || address) && (
        <div className='mt-1 text-xs text-gray-500'>
          {address && <span>{address}</span>}
          {address && phone && <span className='mx-1'>·</span>}
          {phone && <span>{phone}</span>}
        </div>
      )}

      <div className='mt-1 text-xs text-gray-400'>© {copyrightDate}</div>

      {/* SEO title */}
      <h1 className='pt-1 hidden'>{title}</h1>
    </footer>
  )
}

export default Footer
