# 벤더링된 디자인 시스템 (SDS)

`~/project/pindom/src/design-system` 을 그대로 복사한 것. 원본은 skkuverse 의
`@skkuverse/sds` 이며 Toss Design System(TDS) 을 참고해 만들어졌다.

## 이 폴더는 웹에서 "실행되지 않는다"

93개 파일 중 38개가 `react-native` 를 import 하는 **React Native** 컴포넌트다.
Next.js 웹 빌드에서는 렌더링할 수 없고, 타입체크만으로도 빌드가 깨진다
(`Cannot find module 'react-native'`). 그래서 `tsconfig.json` 의 `exclude` 에
`src/design-system` 을 넣어 타입체크 대상에서 뺐다.

## 그럼 무엇에 쓰는가 — 토큰

`tokens/{colors,radius,spacing,shadows,typography}.ts` 는 `react-native` 의존이
거의 없는 순수 값이다. 이 값들이 실제 사이트 룩을 결정한다.

    node scripts/sds-to-css.js

가 위 파일들을 **fs 로 읽어서**(import 아님) `styles/sds-tokens.css` 의 CSS 변수로
바꾼다. 그래서 타입체크에서 제외해도 토큰 파이프라인은 그대로 동작한다.

색을 바꾸려면 `scripts/sds-to-css.js` 의 `BRAND` 를 고치고 다시 실행하면 된다.
테마 색(Tailwind 유틸리티까지 퍼지는 값)은 `conf/themeColorPalette.js` 와
`themes/gitbook/config.js` 에 따로 있다.
