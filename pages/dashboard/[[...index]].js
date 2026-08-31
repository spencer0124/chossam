import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { resolvePostProps } from '@/lib/db/SiteDataApi'
import { DynamicLayout } from '@/themes/theme'
import PropTypes from 'prop-types'

/**
 * 根据notion的slug访问页面
 * 只解析一级目录例如 /about
 * @param {*} props
 * @returns
 */
const Dashboard = props => {
  const theme = siteConfig('THEME', BLOG.THEME, props?.NOTION_CONFIG)

  Dashboard.propTypes = {
    NOTION_CONFIG: PropTypes.object
  }
  return <DynamicLayout theme={theme} layoutName='LayoutDashboard' {...props} />
}

export async function getStaticProps({ locale }) {
  const prefix = 'dashboard'
  const props = await resolvePostProps({
    prefix,
    locale,
  })

  return {
    props,
    revalidate: process.env.EXPORT
      ? undefined
      : siteConfig(
        'NEXT_REVALIDATE_SECOND',
        BLOG.NEXT_REVALIDATE_SECOND,
        props.NOTION_CONFIG
      )
  }
}

export const getStaticPaths = () => {
  // Clerk(회원 기능)을 쓰지 않는 사이트에서는 대시보드 경로를 만들지 않는다.
  // 그대로 두면 정적 export 에 회원/추천/출금 데모 페이지가 중국어 그대로 배포된다.
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return { paths: [], fallback: false }
  }

  return {
    paths: [
      { params: { index: [] } }, // 对应首页路径
      { params: { index: ['membership'] } },
      { params: { index: ['balance'] } },
      { params: { index: ['user-profile'] } },
      { params: { index: ['user-profile', 'security'] } }, // 嵌套路由，按结构传递
      { params: { index: ['order'] } },
      { params: { index: ['affiliate'] } }
    ],
    fallback: 'blocking' // 或者 true，阻塞式渲染
  }
}

export default Dashboard
