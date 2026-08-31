# 배포 (Cloudflare Pages)

## 브랜치 전략

- `main` — Cloudflare Pages 가 이 브랜치를 빌드해 배포한다. 직접 커밋하지 않는다.
- `dev`  — 평소 작업 브랜치. 확인 끝나면 `main` 으로 머지한다.

```bash
git checkout dev            # 작업
git checkout main && git merge dev && git push origin main   # 배포
git checkout dev
```

## Cloudflare Pages 설정

| 항목 | 값 |
|---|---|
| Framework preset | None |
| Build command | `npm run export` |
| Build output directory | `out` |
| Production branch | `main` |

## 환경변수 (Cloudflare > Settings > Environment variables)

```
NODE_VERSION=20
VERCEL_ENV=production          # 없으면 본문이 정적 렌더되지 않아 글이 전부 404
NOTION_PAGE_ID=3cdf3b60797381778158ec135ba36a00
NEXT_PUBLIC_HOME_PAGE_ID=2cd01f3412a24dfd9b893d0a353dbedc
NEXT_PUBLIC_THEME=gitbook
NEXT_PUBLIC_LANG=ko-KR
NEXT_PUBLIC_TITLE=목동조쌤 영어학원
NEXT_PUBLIC_DESCRIPTION=목동조쌤 영어학원
NEXT_PUBLIC_AUTHOR=목동조쌤 영어학원
NEXT_PUBLIC_KEYWORD=목동 영어학원, 목동조쌤, 중등 영어, 고등 영어, 내신 대비
NEXT_PUBLIC_AVATAR=/logo.png
NEXT_PUBLIC_FAVICON=/favicon.ico
NEXT_PUBLIC_HOME_BANNER_IMAGE=/og-image.png
NEXT_PUBLIC_THEME_SWITCH=false
NEXT_PUBLIC_APPEARANCE=light
NEXT_PUBLIC_LINK=https://<배포된 주소>
```

### NEXT_PUBLIC_LINK 주의

빌드 시점에 정적 파일로 **구워지는** 값이다. `og:image` / `sitemap.xml` / canonical URL 의
절대경로가 여기서 만들어지므로, 값이 틀리면 카톡·페이스북 링크 미리보기가 깨진다.
바꾼 뒤에는 **반드시 재배포**해야 반영된다.

1. 처음: `https://chossam.pages.dev` (Cloudflare 가 주는 주소)
2. 도메인 산 뒤: `https://실제도메인` 으로 바꾸고 재배포

## 노션 콘텐츠 반영

정적 export 라 노션을 고쳐도 자동 반영되지 않는다. Cloudflare 의 **Deploy hook** URL 을 만들고
필요할 때 호출하거나, GitHub Actions cron 으로 주기 실행한다.

## 노션 쪽 필수 조건

홈에 인라인으로 올린 데이터베이스는 **그 원본이 공개(게시)되어 있어야** 익명 사용자에게 행이 보인다.
링크된 뷰의 원본이 비공개 하위 페이지면 공개 API 가 0건을 돌려주고 표가 비어 보인다.
(`공지사항`, `유튜브` 하위 페이지는 이미 게시 처리함)

## 로컬

```bash
npm run dev                      # 개발 (첫 진입 느림 — 라우트별 컴파일)
npm run export && npx serve out  # 실제 배포 결과 확인 (빠름)
```
