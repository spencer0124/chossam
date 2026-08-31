import Collapse from '@/components/Collapse'
import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import { SignInButton, SignedOut, UserButton } from '@clerk/nextjs'
import { useRef, useState } from 'react'
import CONFIG from '../config'
import LogoBar from './LogoBar'
import { MenuBarMobile } from './MenuBarMobile'
import { MenuItemDrop } from './MenuItemDrop'
import { useGitBookGlobal } from '@/themes/gitbook'

/**
 * 页头：顶部导航栏 + 菜单
 * @param {} param0
 * @returns
 */
export default function Header(props) {
  const { className, customNav, customMenu } = props
  const [isOpen, changeShow] = useState(false)
  const collapseRef = useRef(null)

  const { locale } = useGlobal()
  const { pageNavVisible, changePageNavVisible } = useGitBookGlobal()

  const defaultLinks = [
    {
      icon: 'fas fa-th',
      name: locale.COMMON.CATEGORY,
      href: '/category',
      show: siteConfig('GITBOOK_MENU_CATEGORY', null, CONFIG)
    },
    {
      icon: 'fas fa-tag',
      name: locale.COMMON.TAGS,
      href: '/tag',
      show: siteConfig('GITBOOK_BOOK_MENU_TAG', null, CONFIG)
    },
    {
      icon: 'fas fa-archive',
      name: locale.NAV.ARCHIVE,
      href: '/archive',
      show: siteConfig('GITBOOK_MENU_ARCHIVE', null, CONFIG)
    },
    {
      icon: 'fas fa-search',
      name: locale.NAV.SEARCH,
      href: '/search',
      show: siteConfig('GITBOOK_MENU_SEARCH', null, CONFIG)
    }
  ]

  let links = defaultLinks.concat(customNav)

  const toggleMenuOpen = () => {
    changeShow(!isOpen)
  }

  // 如果 开启自定义菜单，则覆盖Page生成的菜单
  if (siteConfig('CUSTOM_MENU')) {
    links = customMenu
  }

  const enableClerk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  return (
    <div id='top-nav' className={'fixed top-0 w-full z-20 ' + className}>
      {/* PC端菜单 */}
      <div className='flex justify-center border-b dark:border-black items-center w-full h-16 bg-white dark:bg-hexo-black-gray'>
        <div className='px-5 max-w-screen-4xl w-full flex gap-x-3 justify-between items-center'>
          {/* 左侧*/}
          <div className='flex'>
            <LogoBar {...props} />

            {/* 桌面端顶部菜单 */}
            <div className='hidden md:flex'>
              {links &&
                links?.map((link, index) => (
                  <MenuItemDrop key={index} link={link} />
                ))}
            </div>
          </div>

          {/* 右侧 */}
          <div className='flex items-center gap-4'>
            {/* 登录相关 */}
            {enableClerk && (
              <>
                <SignedOut>
                  <SignInButton mode='modal'>
                    <button className='bg-green-500 hover:bg-green-600 text-white rounded-lg px-3 py-2'>
                      {locale.COMMON.SIGN_IN}
                    </button>
                  </SignInButton>
                </SignedOut>
                <UserButton />
              </>
            )}
            {/* 折叠按钮、仅移动端显示 */}
            <div className='mr-1 flex md:hidden justify-end items-center space-x-4  dark:text-gray-200'>
              {/* 모바일 햄버거 → PC 좌측 목차와 같은 내용을 서랍으로 연다 */}
              <div
                onClick={() => changePageNavVisible(!pageNavVisible)}
                aria-label='목차 열기'
                className='cursor-pointer text-lg hover:scale-110 duration-150'>
                {pageNavVisible ? (
                  <i className='fas fa-times' />
                ) : (
                  <i className='fa-solid fa-bars' />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 移动端折叠菜单 */}
      <Collapse
        type='vertical'
        collapseRef={collapseRef}
        isOpen={isOpen}
        className='md:hidden'>
        <div className='bg-white dark:bg-hexo-black-gray pt-1 py-2 lg:hidden '>
          <MenuBarMobile
            {...props}
            onHeightChange={param =>
              collapseRef.current?.updateCollapseHeight(param)
            }
          />
        </div>
      </Collapse>
    </div>
  )
}
