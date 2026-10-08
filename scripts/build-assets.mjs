// Builds the profile README's animated header and stack strip, light and dark.
// Fonts and icons come from the portfolio's node_modules; text is measured in Chrome.
// Run: node scripts/build-assets.mjs assets   (previews land in the system temp dir)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { chromium } from '/Users/lark/Documents/Github/lark/node_modules/playwright-core/index.mjs'

const LARK = '/Users/lark/Documents/Github/lark/node_modules'
const OUT = resolve(process.argv[2] ?? 'assets')
const HERE = new URL('.', import.meta.url).pathname
const SCRATCH = `${tmpdir()}/`
mkdirSync(OUT, { recursive: true })

const b64 = (p) => readFileSync(p).toString('base64')
const INTER = b64(`${LARK}/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2`)
const MONO = b64(`${LARK}/@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2`)
const LB = readFileSync(`${HERE}lb-mark.txt`, 'utf8').trim()

const fonts = (mono = true, sans = true) => `
  ${sans ? `@font-face{font-family:'LB Sans';src:url(data:font/woff2;base64,${INTER}) format('woff2');font-weight:100 900}` : ''}
  ${mono ? `@font-face{font-family:'LB Mono';src:url(data:font/woff2;base64,${MONO}) format('woff2');font-weight:100 900}` : ''}`

const THEMES = {
  light: {
    bg: '#fafaf7', tile: '#f3f2ee', card: '#ffffff', ink: '#121214', ink2: '#56554f', ink3: '#8c8a83',
    paper3: '#ebe9e4', rule: '#e7e5e0', handle: '#ffffff', shadow: 'rgb(18 18 20)', shadowOp: 0.16, chipSoft: '#efeaff', greenSoft: '#e6f7ee',
    map1: '#eef0ea', map2: '#dfeef7', road: '#ffffff',
  },
  dark: {
    bg: '#121214', tile: '#1a1a1d', card: '#232327', ink: '#f3f2ee', ink2: '#b4b2ab', ink3: '#76746e',
    paper3: '#35353b', rule: '#2a2a2e', handle: '#121214', shadow: 'rgb(0 0 0)', shadowOp: 0.5, chipSoft: '#2c2547', greenSoft: '#173326',
    map1: '#2a2c29', map2: '#22303a', road: '#3a3b40',
  },
}

const C = { coral: '#ff5a3c', orange: '#ff8a1e', green: '#1fb566', blue: '#2f6bff', violet: '#7b5cff', pink: '#ff4fa3' }

const W = 1584, H = 396, CX = 792
const FS = 58, LS = -0.045 * FS
const B1 = 199, B2 = 256

const ARROW = 'M1.5 1.5 16 9.2l-6.6 1.7L6.2 17.5 1.5 1.5Z'
const IBEAM = 'M2 2h3l1 1 1-1h3M6 3v16M2 20h3l1-1 1 1h3'

/** A cursor arrow with its name chip — the portfolio's collaborator motif. */
function cursor(x, y, color, label, { s = 1, cls = 'cursor', delay = 0 } = {}) {
  const fw = 9.5 * s, padX = 6 * s, h = 17 * s
  const w = label.length * fw * 0.56 + padX * 2
  return `<g transform="translate(${x} ${y})"><g class="${cls}" style="animation-delay:${delay}s">
    <path d="${ARROW}" transform="scale(${0.75 * s})" fill="${color}" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/>
    <g transform="translate(${10 * s} ${12 * s})">
      <path d="M2 0H${w - 6}a6 6 0 0 1 6 6V${h - 6}a6 6 0 0 1-6 6H6a6 6 0 0 1-6-6V2a2 2 0 0 1 2-2Z" fill="${color}"/>
      <text x="${padX}" y="${h / 2 + fw * 0.36}" class="sans" font-size="${fw}" font-weight="500" fill="#fff">${label}</text>
    </g></g></g>`
}

/** A floating tile: positioned and rotated outside, bobbing inside. */
const tile = (x, y, w, h, rot, body, t, delay) => `
  <g transform="translate(${x} ${y}) rotate(${rot} ${w / 2} ${h / 2})"><g class="bob" style="animation-delay:${delay}s">
    <rect width="${w}" height="${h}" rx="30" fill="${t.tile}"/>
    ${body}
  </g></g>`

const card = (x, y, w, h, t, inner = '') => `<g transform="translate(${x} ${y})"><rect width="${w}" height="${h}" rx="9" fill="${t.card}" filter="url(#shadow)"/>${inner}</g>`

function header(t, m) {
  const wave = Array.from({ length: 34 }, (_, i) => {
    const h = 4 + Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.45)) * 20
    return `<rect class="bar" style="animation-delay:${(-i * 0.09).toFixed(2)}s" x="${i * 3.6}" y="${(13 - h / 2).toFixed(1)}" width="2" height="${h.toFixed(1)}" rx="1" fill="${i < 22 ? t.ink : t.paper3}"/>`
  }).join('')

  const dots = [0, 1, 2, 3, 4, 5].map((i) => {
    const x = 30 + (i % 3) * 35 + 14, y = 46 + Math.floor(i / 3) * 35 + 14
    return i === 5 ? `<circle class="pulse" cx="${x}" cy="${y}" r="14" fill="url(#hot)"/>` : `<circle cx="${x}" cy="${y}" r="14" fill="${t.card}"/>`
  }).join('')

  const role = (i, color, name) => `<g transform="translate(10 ${16 + i * 22})">
    <circle cx="6" cy="0" r="6" fill="${color}"/>
    <text x="19" y="3.2" class="sans" font-size="9" font-weight="500" fill="${t.ink}">${name}</text>
    <rect x="126" y="-6" width="28" height="11" rx="3" fill="${t.tile}"/>
    <text x="140" y="2" class="mono" font-size="6.5" text-anchor="middle" fill="${t.ink3}">RBAC</text></g>`

  const sec = (n, i) => `<text class="tick sans" style="animation-delay:${i - 4}s" x="12" y="27" font-size="20" font-weight="600" letter-spacing="-0.4" fill="${t.ink}">00:${n}</text>`

  const tiles = [
    // dial pad · Design
    tile(46, -38, 168, 168, -3, `${dots}${cursor(108, 104, C.orange, 'Design', { cls: 'cursor' })}`, t, -1),
    // ticket
    tile(330, -64, 150, 150, 2, card(14, 34, 122, 84, t, `
      <text x="9" y="15" class="mono" font-size="6.5" fill="${t.ink3}">#2481</text>
      <rect x="74" y="8" width="40" height="10" rx="5" fill="${t.chipSoft}"/><text x="94" y="15.2" class="mono" font-size="6.5" text-anchor="middle" fill="${C.violet}">2 matches</text>
      <text x="9" y="33" class="sans" font-size="8.5" font-weight="500" fill="${t.ink}">VPN drops every few</text>
      <text x="9" y="44" class="sans" font-size="8.5" font-weight="500" fill="${t.ink}">minutes</text>
      <rect x="9" y="51" width="18" height="6" rx="3" fill="${t.paper3}"/><rect x="30" y="51" width="12" height="6" rx="3" fill="${t.paper3}"/><rect x="45" y="51" width="15" height="6" rx="3" fill="${t.paper3}"/>
      <rect x="9" y="62" width="104" height="16" rx="5" fill="${t.bg}"/><rect x="12" y="65" width="18" height="10" rx="2" fill="url(#thumb)"/><rect x="35" y="67.5" width="46" height="5" rx="2.5" fill="${t.paper3}"/>`), t, -3),
    // API
    tile(1080, -50, 150, 150, -2, card(10, 66, 128, 32, t, `
      <rect x="7" y="6" width="17" height="9" rx="2" fill="${t.greenSoft}"/><text x="15.5" y="12.8" class="mono" font-size="6.5" text-anchor="middle" fill="${C.green}">GET</text>
      <text x="28" y="12.8" class="mono" font-size="6.5" fill="${t.ink3}">/api/requests?status=op…</text>
      <circle class="pulse" cx="10" cy="22.5" r="2.4" fill="${C.green}"/><text x="16" y="25" class="mono" font-size="6.5" fill="${t.ink3}">200 OK · Reverb live</text>`), t, -5),
    // roles · Backend
    tile(1356, 34, 196, 168, 2.5, `${card(16, 30, 166, 104, t, role(0, C.blue, 'Dispatcher') + role(1, C.coral, 'Responder') + role(2, C.green, 'Supervisor') + role(3, C.violet, 'Admin'))}${cursor(150, 112, C.green, 'Backend', { delay: -2 })}`, t, -2),
    // SOS call
    tile(1150, 262, 176, 176, -2, card(14, 40, 148, 74, t, `
      ${['42', '43', '44', '45'].map(sec).join('')}
      <circle class="pulse" cx="113" cy="18" r="2.6" fill="${C.coral}"/><text x="119" y="21" class="sans" font-size="8" font-weight="600" fill="${C.coral}">SOS</text>
      <g transform="translate(12 38)">${wave}</g>`), t, -4),
    // type · Design
    tile(1412, 252, 170, 170, 3, `${card(16, 28, 128, 76, t, `
      <text x="12" y="38" class="sans weight" font-size="30" letter-spacing="-0.9" fill="${t.ink}">Aa</text>
      <text x="12" y="62" class="sans" font-size="8.5" font-weight="500" fill="${t.ink}">Inter Variable</text>
      <text x="116" y="62" class="mono" font-size="7" text-anchor="end" fill="${t.ink3}">100–900</text>`)}${cursor(116, 92, C.pink, 'Design', { delay: -4 })}`, t, -6),
    // map · Frontend
    tile(240, 206, 178, 160, 2, `${card(16, 34, 146, 96, t, `
      <clipPath id="mapclip"><path d="M9 0H137a9 9 0 0 1 9 9V68H0V9a9 9 0 0 1 9-9Z"/></clipPath>
      <g clip-path="url(#mapclip)"><rect width="146" height="68" fill="url(#map)"/>
        <rect y="34" width="146" height="5" fill="${t.road}"/><rect x="50" width="5" height="68" fill="${t.road}"/>
        <path class="route" d="M20 50h34V36h14" stroke="${C.blue}" stroke-width="1.6" stroke-dasharray="2 3" fill="none"/>
        <g class="pin" transform="translate(66 12)"><path d="M7 17s6-6 6-10A6 6 0 0 0 1 7c0 4 6 10 6 10Z" fill="${C.coral}"/><circle cx="7" cy="7" r="2.3" fill="#fff"/></g></g>
      <text x="9" y="84" class="sans" font-size="8" font-weight="500" fill="${t.ink}">Live caller location</text>`)}${cursor(118, 82, C.blue, 'Frontend', { delay: -1 })}`, t, -2.5),
    // deploy toast
    tile(34, 262, 168, 150, -2.5, card(14, 34, 140, 46, t, `
      <circle cx="18" cy="23" r="9" fill="${t.greenSoft}"/><path d="M14 23.2l2.7 2.7 5.3-5.6" stroke="${C.green}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="34" y="21" class="sans" font-size="9" font-weight="600" fill="${t.ink}">Deployed</text>
      <text x="34" y="32" class="mono" font-size="6.5" fill="${t.ink3}">main · just now</text>`), t, -3.5),
  ].join('')

  // Selection box around "UX", the I-beam after "engineering", the Design cursor after "UX."
  const sx = m.uxX - 3.5, sy = B2 - 0.735 * FS - 5, sw = m.uxW + 6.5, sh = 0.735 * FS + 9
  const handles = [[sx, sy], [sx + sw, sy], [sx + sw, sy + sh], [sx, sy + sh]]
    .map(([x, y], i) => `<rect class="handle" style="animation-delay:${1.3 + i * 0.06}s" x="${x - 4.5}" y="${y - 4.5}" width="9" height="9" fill="${t.handle}" stroke="${C.blue}" stroke-width="1.5"/>`).join('')
  const perim = 2 * (sw + sh)
  const engChipW = 11 * 12 * 0.56 + 16

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d">
<title id="t">Lark Babao — Full-Stack Software Engineer &amp; UI/UX Designer</title>
<desc id="d">Where robust engineering meets refined UX. Product, UI/UX design and full-stack engineering.</desc>
<style>${fonts()}
  .sans{font-family:'LB Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif}
  .mono{font-family:'LB Mono',ui-monospace,'SF Mono',Menlo,monospace}
  .bob{animation:bob 7s ease-in-out infinite}
  .cursor{animation:drift 6.5s ease-in-out infinite}
  .caret{animation:blink 1.1s steps(1) infinite}
  .sel{stroke-dasharray:${perim.toFixed(1)};animation:draw 1s .3s cubic-bezier(.16,1,.3,1) both}
  .handle,.chip-in{transform-box:fill-box;transform-origin:center;animation:pop .35s cubic-bezier(.16,1,.3,1) both}
  .chip-in{transform-origin:left top}
  .bar{transform-box:fill-box;transform-origin:center;animation:wave 1.1s ease-in-out infinite}
  .route{animation:march 1s linear infinite}
  .pin{animation:bob 2.4s ease-in-out infinite}
  .pulse{animation:pulse 1.8s ease-in-out infinite}
  .tick{opacity:0;animation:tick 4s steps(1) infinite}
  .weight{font-weight:300;animation:weight 4s ease-in-out infinite}
  @keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
  @keyframes drift{0%,100%{transform:translate(0,0)}35%{transform:translate(7px,-5px)}70%{transform:translate(2px,4px)}}
  @keyframes blink{0%{opacity:1}50%{opacity:0}}
  @keyframes draw{from{stroke-dashoffset:${perim.toFixed(1)}}to{stroke-dashoffset:0}}
  @keyframes pop{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
  @keyframes wave{0%,100%{transform:scaleY(.45)}50%{transform:scaleY(1)}}
  @keyframes march{to{stroke-dashoffset:-20}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
  @keyframes tick{0%{opacity:1}25%{opacity:0}}
  @keyframes weight{0%,100%{font-weight:300}50%{font-weight:800}}
  @media (prefers-reduced-motion:reduce){*{animation:none!important}.tick{opacity:0}.tick:first-of-type{opacity:1}}
</style>
<defs>
  <clipPath id="frame"><rect width="${W}" height="${H}" rx="24"/></clipPath>
  <filter id="shadow" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="${t.shadow}" flood-opacity="${t.shadowOp}"/></filter>
  <filter id="lift" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000" flood-opacity=".22"/></filter>
  <linearGradient id="hot" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff8a7a"/><stop offset=".6" stop-color="#ff5a3c"/><stop offset="1" stop-color="#ff4fa3"/></linearGradient>
  <linearGradient id="thumb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c8d6ff"/><stop offset="1" stop-color="#ffe1b3"/></linearGradient>
  <linearGradient id="map" x1="0" y1="0" x2="1" y2="0"><stop offset=".7" stop-color="${t.map1}"/><stop offset="1" stop-color="${t.map2}"/></linearGradient>
</defs>
<g clip-path="url(#frame)">
  <rect width="${W}" height="${H}" fill="${t.bg}"/>
  ${tiles}
</g>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="23.5" fill="none" stroke="${t.rule}"/>

<path d="${LB}" transform="translate(${CX - 22} 81) scale(${44 / 232})" fill="${t.ink}"/>
<text id="l1" x="${CX}" y="${B1}" text-anchor="middle" class="sans" font-size="${FS}" font-weight="600" letter-spacing="${LS}" fill="${t.ink3}">Where robust engineering</text>
<text id="l2" x="${CX}" y="${B2}" text-anchor="middle" class="sans" font-size="${FS}" font-weight="600" letter-spacing="${LS}" fill="${t.ink}">meets refined UX.</text>

<rect class="sel" x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="none" stroke="${C.blue}" stroke-width="1.5"/>
${handles}

<g transform="translate(${m.l1End + 6} ${B1 - 34})">
  <g class="caret"><g filter="url(#lift)"><path d="${IBEAM}" transform="scale(1.08)" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="${IBEAM}" transform="scale(1.08)" stroke="${C.blue}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g></g>
  <g transform="translate(9 21)"><g class="chip-in" style="animation-delay:.9s">
    <path d="M2 0H${engChipW - 6}a6 6 0 0 1 6 6V14a6 6 0 0 1-6 6H6a6 6 0 0 1-6-6V2a2 2 0 0 1 2-2Z" fill="${C.blue}"/>
    <text x="8" y="14.3" class="sans" font-size="12" font-weight="500" fill="#fff">Engineering</text></g></g>
</g>
${cursor(m.l2End + 0.12 * FS, B2 - 30, C.pink, 'Design', { s: 1.28, delay: -1.5 })}

<text x="${CX}" y="315" text-anchor="middle" class="mono" font-size="12.5" font-weight="500" letter-spacing="1.1" fill="${t.ink3}">PRODUCT  ·  UI/UX DESIGN  ·  FULL-STACK ENGINEERING</text>
</svg>`
}

// ---------- Stack strip ----------
const ICON = `${LARK}/simple-icons/icons`
const icon = (slug) => readFileSync(`${ICON}/${slug}.svg`, 'utf8').match(/ d="([^"]+)"/)[1]
const GROUPS = [
  ['Frontend', [['react', 'React'], ['nextdotjs', 'Next.js'], ['typescript', 'TypeScript'], ['tailwindcss', 'Tailwind CSS'], ['threedotjs', 'three.js'], ['vite', 'Vite']]],
  ['Mobile', [['flutter', 'Flutter'], ['dart', 'Dart'], ['firebase', 'Firebase']]],
  ['Backend', [['laravel', 'Laravel'], ['php', 'PHP'], ['nodedotjs', 'Node.js'], ['express', 'Express'], ['mongodb', 'MongoDB'], ['mysql', 'MySQL'], ['python', 'Python']]],
  ['Tools', [['figma', 'Figma'], ['git', 'Git'], ['docker', 'Docker'], ['postman', 'Postman']]],
]

function stack(t) {
  const SW = 1000, T = 64, G = 10, GAP = 44, ROWH = 112
  const rows = [GROUPS.slice(0, 2), GROUPS.slice(2)]
  let out = ''
  let iconIndex = 0
  // Two columns that line up across rows: the widest group sets each column.
  const span = (n) => n * T + (n - 1) * G
  const colW = [0, 1].map((c) => Math.max(...rows.map((row) => span(row[c][1].length))))
  const x0 = (SW - (colW[0] + GAP * 2 + colW[1])) / 2
  rows.forEach((row, r) => {
    const y = 24 + r * ROWH
    row.forEach(([name, items], c) => {
      const x = c === 0 ? x0 : x0 + colW[0] + GAP * 2
      out += `<text x="${x}" y="${y + 6}" class="mono" font-size="11" font-weight="500" letter-spacing="1" fill="${t.ink3}">${name.toUpperCase()}</text>`
      items.forEach(([slug, label], i) => {
        const tx = x + i * (T + G), ty = y + 18
        out += `<g transform="translate(${tx} ${ty})"><g class="pop" style="animation-delay:${(iconIndex++ * 0.04).toFixed(2)}s"><title>${label}</title>
          <rect width="${T}" height="${T}" rx="16" fill="${t.tile}"/>
          <path d="${icon(slug)}" transform="translate(${(T - 28) / 2} ${(T - 28) / 2}) scale(${28 / 24})" fill="${t.ink}"/></g></g>`
      })
    })
  })
  const SH = 24 + ROWH * 2 - 10
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${SH}" viewBox="0 0 ${SW} ${SH}" role="img" aria-labelledby="t">
<title id="t">Tech stack: ${GROUPS.flatMap(([, items]) => items.map(([, l]) => l)).join(', ')}</title>
<style>${fonts(true, false)}
  .mono{font-family:'LB Mono',ui-monospace,'SF Mono',Menlo,monospace}
  .pop{transform-box:fill-box;transform-origin:center;animation:pop .5s cubic-bezier(.16,1,.3,1) both}
  @keyframes pop{from{transform:translateY(8px) scale(.9);opacity:0}to{transform:none;opacity:1}}
  @media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
${out}
</svg>`
}

// ---------- Measure, then write ----------
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage()
await page.setContent(`<body style="margin:0">${header(THEMES.light, { uxX: 0, uxW: 0, l1End: 0, l2End: 0 })}</body>`)
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(300)
const m = await page.evaluate(() => {
  const l1 = document.getElementById('l1'), l2 = document.getElementById('l2')
  const s2 = l2.textContent, u = s2.indexOf('UX')
  const U = l2.getExtentOfChar(u), X = l2.getExtentOfChar(u + 1), dot = l2.getExtentOfChar(u + 2)
  const b1 = l1.getBBox()
  return { uxX: U.x, uxW: X.x + X.width - U.x, l1End: b1.x + b1.width, l2End: dot.x + dot.width }
})
console.log('measured', m)

for (const [name, t] of Object.entries(THEMES)) {
  writeFileSync(`${OUT}/header-${name}.svg`, header(t, m))
  writeFileSync(`${OUT}/stack-${name}.svg`, stack(t))
}

// Preview screenshots, one per file, after the intro animations settle.
for (const f of ['header-light', 'header-dark', 'stack-light', 'stack-dark']) {
  await page.setViewportSize({ width: 1040, height: 340 })
  writeFileSync(`${SCRATCH}${f}.html`, `<body style="margin:0;padding:20px;background:${f.endsWith('dark') ? '#0d1117' : '#ffffff'}"><img src="file://${OUT}/${f}.svg" width="1000"></body>`)
  await page.goto(`file://${SCRATCH}${f}.html`)
  await page.waitForTimeout(2200)
  await page.screenshot({ path: `${SCRATCH}${f}.png`, fullPage: false })
}
await browser.close()
