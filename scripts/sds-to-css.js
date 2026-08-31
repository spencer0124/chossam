/* eslint-disable */
/**
 * SDS(React Native) 토큰 → 웹 CSS 변수 생성기.
 *
 * src/design-system 은 pindom 에서 그대로 복사해 온 React Native 디자인 시스템이라
 * 컴포넌트는 Next.js 웹에서 렌더링되지 않는다. 하지만 토큰(색·반경·간격·타이포·그림자)은
 * 순수 TS 객체라 그대로 쓸 수 있다. 이 스크립트가 그 토큰을 읽어 styles/sds-tokens.css 를
 * 만든다 — 값을 손으로 베끼지 않으므로 원본과 어긋날 일이 없다.
 *
 *   node scripts/sds-to-css.js
 */
const fs = require('fs')
const path = require('path')

const DS = path.join(__dirname, '..', 'src', 'design-system')
const read = p => fs.readFileSync(path.join(DS, p), 'utf8')

/** `key: '#value',` / `key: 123,` 형태를 뽑는다 */
function extract(src) {
  const out = {}
  for (const m of src.matchAll(/^\s{2}([A-Za-z][A-Za-z0-9]*)\s*:\s*(?:'([^']*)'|([\d.]+))\s*,/gm)) {
    out[m[1]] = m[2] !== undefined ? m[2] : Number(m[3])
  }
  return out
}

const colors = extract(read('tokens/colors.ts'))
const radius = extract(read('tokens/radius.ts'))
const spacing = extract(read('tokens/spacing.ts'))

/** 타이포: export const t5: SdsTextStyle = { fontSize: 17, lineHeight: 25.5, fontWeight: '400' } */
function extractTypo(src) {
  const out = {}
  for (const m of src.matchAll(
    /export const (\w+): SdsTextStyle = \{[^}]*?fontSize:\s*([\d.]+),[^}]*?lineHeight:\s*([\d.]+),[^}]*?fontWeight:\s*'(\d+)'/gs
  )) {
    out[m[1]] = { size: +m[2], line: +m[3], weight: +m[4] }
  }
  return out
}
const typo = extractTypo(read('tokens/typography.ts'))

/** 그림자: boxShadow: '0px 1px 3px rgba(...)' — 선언 순서대로 이름을 붙인다 */
function extractShadows(src) {
  const names = [...src.matchAll(/^const (\w+): SdsShadowToken/gm)].map(m => m[1])
  const values = [...src.matchAll(/boxShadow:\s*'([^']+)'/g)].map(m => m[1])
  const out = {}
  names.forEach((n, i) => {
    if (values[i]) out[n] = values[i].replace(/(\d)px/g, '$1px')
  })
  return out
}
const shadows = extractShadows(read('tokens/shadows.ts'))

/* ── 브랜드 색 교체 ────────────────────────────────────────────────
 * pindom 의 primary 는 acid green(#58CF04) 이다. chossam 은 학원 로고 문장에서
 * 뽑은 레드를 쓴다. SDS 의 brand 램프와 같은 계단(50/200/400/500/600/700)을
 * 유지하려고 흰색·검정과 섞어 파생시킨다 — 눈대중 금지.
 */
const BRAND = '#B40407' // 로고 문장에서 샘플링
const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
const rgb2hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0').toUpperCase()).join('')
const mix = (hex, target, amount) => rgb2hex(hex2rgb(hex).map((v, i) => v + (target[i] - v) * amount))
const W = [255, 255, 255]
const K = [0, 0, 0]

const brand = {
  brand50: mix(BRAND, W, 0.94),
  brand100: mix(BRAND, W, 0.86),
  brand200: mix(BRAND, W, 0.66),
  brand400: mix(BRAND, W, 0.22),
  brand500: BRAND,
  brand600: mix(BRAND, K, 0.14),
  brand700: mix(BRAND, K, 0.3)
}

const lines = []
lines.push('/*')
lines.push(' * 이 파일은 scripts/sds-to-css.js 가 생성한다. 직접 수정하지 마라.')
lines.push(' * 원본: src/design-system/tokens/*  (pindom 에서 복사한 SDS — Toss TDS 기반)')
lines.push(' * 값을 바꾸려면 토큰 파일이나 생성기의 BRAND 를 고치고 다시 실행:')
lines.push(' *   node scripts/sds-to-css.js')
lines.push(' */')
lines.push(':root {')

lines.push('  /* ── 브랜드 (학원 로고 레드) ── */')
for (const [k, v] of Object.entries(brand)) lines.push(`  --sds-${k}: ${v};`)
lines.push(`  --sds-primary: ${brand.brand500};`)
lines.push(`  --sds-primary-hover: ${brand.brand600};`)
lines.push(`  --sds-primary-tint: ${brand.brand50};`)

lines.push('')
lines.push('  /* ── SDS 색 토큰 ── */')
for (const [k, v] of Object.entries(colors)) {
  if (/^brand/.test(k)) continue // 위에서 교체됨
  lines.push(`  --sds-${k}: ${v};`)
}

lines.push('')
lines.push('  /* ── 반경 ── */')
for (const [k, v] of Object.entries(radius)) lines.push(`  --sds-radius-${k}: ${v}px;`)

lines.push('')
lines.push('  /* ── 간격 ── */')
for (const [k, v] of Object.entries(spacing)) lines.push(`  --sds-space-${k}: ${v}px;`)

lines.push('')
lines.push('  /* ── 타이포 (size / line-height / weight) ── */')
for (const [k, v] of Object.entries(typo)) {
  lines.push(`  --sds-${k}-size: ${v.size}px;`)
  lines.push(`  --sds-${k}-line: ${v.line}px;`)
  lines.push(`  --sds-${k}-weight: ${v.weight};`)
}

lines.push('')
lines.push('  /* ── 그림자 ── */')
for (const [k, v] of Object.entries(shadows)) lines.push(`  --sds-shadow-${k}: ${v};`)

lines.push('}')

const out = path.join(__dirname, '..', 'styles', 'sds-tokens.css')
fs.writeFileSync(out, lines.join('\n') + '\n', 'utf8')
console.log(
  `styles/sds-tokens.css 생성: 색 ${Object.keys(colors).length + Object.keys(brand).length}, ` +
  `반경 ${Object.keys(radius).length}, 간격 ${Object.keys(spacing).length}, ` +
  `타이포 ${Object.keys(typo).length}, 그림자 ${Object.keys(shadows).length}`
)
