// Builds the profile README's artwork as animated SVGs, in the portfolio's language:
// the footer's living gradient, Apple-style cards, Memoji stickers and design-tool cursors.
//
//   node scripts/build-assets.mjs [outDir=assets]
//
// Fonts, stickers and icons come from the portfolio (../lark), the photo from the LinkedIn
// banner folder. Text is measured in Chrome so every chip, caret and bubble fits its words.
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { chromium } from '/Users/lark/Documents/Github/lark/node_modules/playwright-core/index.mjs'

const LARK = '/Users/lark/Documents/Github/lark'
const BANNER = '/Users/lark/Documents/linkedin-banner'
const NM = `${LARK}/node_modules`
const OUT = resolve(process.argv[2] ?? 'assets')
const HERE = new URL('.', import.meta.url).pathname
const TMP = mkdtempSync(join(tmpdir(), 'readme-'))
mkdirSync(OUT, { recursive: true })

// ---------- Assets ----------
const b64 = (p) => readFileSync(p).toString('base64')
let n = 0
const webp = (src, args) => {
  const out = join(TMP, `${n++}.webp`)
  execFileSync('cwebp', ['-quiet', ...args, src, '-o', out])
  return `data:image/webp;base64,${b64(out)}`
}
const PHOTO = (() => {
  const png = join(TMP, 'me.png')
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', `${BANNER}/me.jpg`, '-vf', 'crop=1000:1000:250:0,scale=560:560:flags=lanczos', png])
  return webp(png, ['-q', '84'])
})()
const sticker = (name, w = 240) => webp(`${LARK}/public/stickers/${name}.webp`, ['-q', '86', '-resize', String(w), '0'])
const STICKER = Object.fromEntries(['laptop', 'party', 'cool-shades', 'presenting', 'hearts'].map((s) => [s, sticker(s)]))
const STICKER_RATIO = { laptop: 320 / 276, party: 320 / 296, 'cool-shades': 273 / 236, presenting: 320 / 307, hearts: 275 / 239 }
const MEC = `data:image/webp;base64,${b64(`${LARK}/public/projects/optima/mec.webp`)}`
const LB = readFileSync(`${HERE}lb-mark.txt`, 'utf8').trim()
const LB_W = 232, LB_H = 201

const FONT = {
  sans: b64(`${NM}/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2`),
  mono: b64(`${NM}/@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2`),
  serif: b64(`${BANNER}/cormorant-italic.woff2`),
}
const EMOJI = `'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji'`
const fontCss = (...use) => `
  ${use.includes('sans') ? `@font-face{font-family:'LB Sans';src:url(data:font/woff2;base64,${FONT.sans}) format('woff2');font-weight:100 900}` : ''}
  ${use.includes('mono') ? `@font-face{font-family:'LB Mono';src:url(data:font/woff2;base64,${FONT.mono}) format('woff2');font-weight:100 900}` : ''}
  ${use.includes('serif') ? `@font-face{font-family:'LB Serif';src:url(data:font/woff2;base64,${FONT.serif}) format('woff2');font-weight:300 700;font-style:italic}` : ''}
  .sans{font-family:'LB Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif,${EMOJI}}
  .mono{font-family:'LB Mono',ui-monospace,'SF Mono',Menlo,monospace}
  .serif{font-family:'LB Serif','Cormorant Garamond',Georgia,serif;font-style:italic}`

const C = { coral: '#ff5a3c', orange: '#ff8a1e', yellow: '#ffc21a', green: '#1fb566', cyan: '#19c3da', blue: '#2f6bff', violet: '#7b5cff', pink: '#ff4fa3', imsg: '#0a84ff' }
const ARROW = 'M1.5 1.5 16 9.2l-6.6 1.7L6.2 17.5 1.5 1.5Z'
const IBEAM = 'M2 2h3l1 1 1-1h3M6 3v16M2 20h3l1-1 1 1h3'
const TICK = 'M1.5 5.2 4.5 8 10.5 1.8'
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

const REDUCED = `@media (prefers-reduced-motion:reduce){*{animation:none!important}}`
const svgOpen = (w, h, title, desc = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="t${desc ? ' d' : ''}">
<title id="t">${esc(title)}</title>${desc ? `<desc id="d">${esc(desc)}</desc>` : ''}`

/** The LB mark, `w` wide, top-left at x,y. */
const mark = (x, y, w, fill) => `<path d="${LB}" transform="translate(${x} ${y}) scale(${w / LB_W})" fill="${fill}"/>`

/** A rounded name chip: the portfolio's collaborator label. Top-left corner is tight, like a cursor's tag. */
const chipPath = (w, h, r = 7) => `M2 0H${w - r}a${r} ${r} 0 0 1 ${r} ${r}V${h - r}a${r} ${r} 0 0 1-${r} ${r}H${r}a${r} ${r} 0 0 1-${r}-${r}V2a2 2 0 0 1 2-2Z`

// ---------- Measuring ----------
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage()
await page.setContent(`<style>${fontCss('sans', 'mono', 'serif')}</style><svg id="m" width="10" height="10"></svg>`)
await page.evaluate(() => Promise.all([
  document.fonts.load(`600 20px 'LB Sans'`), document.fonts.load(`500 20px 'LB Mono'`), document.fonts.load(`italic 600 20px 'LB Serif'`),
]))

/** Width of `text`, and the x where each character starts (xs[text.length] is the width). */
async function measure(text, { size, weight = 400, cls = 'sans', ls = 0 }) {
  return page.evaluate(([text, size, weight, cls, ls]) => {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    t.setAttribute('class', cls); t.setAttribute('font-size', size); t.setAttribute('font-weight', weight); t.setAttribute('letter-spacing', ls)
    t.textContent = text
    document.getElementById('m').appendChild(t)
    const chars = [...text].length
    const xs = [0]
    for (let i = 1; i <= chars; i++) xs.push(t.getSubStringLength(0, i))
    t.remove()
    return { w: xs[chars], xs }
  }, [text, size, weight, cls, ls])
}

/** The footer's living gradient (MenuGradient.tsx), frozen at time `t`, as a WebP data URI. */
async function gradient(w, h, t, zoom = 0.42) {
  const png = await page.evaluate(([w, h, t, zoom]) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h
    const gl = c.getContext('webgl', { preserveDrawingBuffer: true })
    const fs = `precision highp float; uniform vec2 uRes; uniform float uTime; uniform vec3 uC0,uC1,uC2,uC3;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); vec2 u=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x), mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x), u.y); }
      void main(){ vec2 p=gl_FragCoord.xy/uRes; p.x*=uRes.x/uRes.y; p*=${zoom.toFixed(3)}; float t=uTime*0.05;
        vec2 q=vec2(noise(p*1.1+t), noise(p*1.1-t+3.1));
        vec2 r=vec2(noise(p*1.5+q*1.6+t*1.3+1.7), noise(p*1.5+q*1.6-t+9.2));
        float n=noise(p+r*1.9);
        vec3 col=mix(uC0,uC1,smoothstep(0.2,0.85,n));
        col=mix(col,uC2,smoothstep(0.35,0.9,r.x)*0.85);
        col=mix(col,uC3,smoothstep(0.5,0.95,q.y)*0.7);
        gl_FragColor=vec4(col,1.); }`
    const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return o }
    const pr = gl.createProgram()
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 p; void main(){ gl_Position=vec4(p,0.,1.); }'))
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr); gl.useProgram(pr)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    ;['#2f6bff', '#7b5cff', '#19c3da', '#ff4fa3'].forEach((h, i) => gl.uniform3fv(gl.getUniformLocation(pr, 'uC' + i), hex(h)))
    gl.uniform2f(gl.getUniformLocation(pr, 'uRes'), w, h); gl.uniform1f(gl.getUniformLocation(pr, 'uTime'), t)
    gl.viewport(0, 0, w, h); gl.drawArrays(gl.TRIANGLES, 0, 3)
    return c.toDataURL('image/png')
  }, [w, h, t, zoom])
  const file = join(TMP, `${n++}.png`)
  writeFileSync(file, Buffer.from(png.split(',')[1], 'base64'))
  return webp(file, ['-q', '82'])
}

/** Soft colour light drifting over the gradient, so it feels alive like the site's. */
const blobs = (W, H, spots) => spots.map(([x, y, r, color, dur, dx, dy], i) => `
  <radialGradient id="glow${i}"><stop offset="0" stop-color="${color}" stop-opacity=".55"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>
  <g class="drift${i}"><circle cx="${x * W}" cy="${y * H}" r="${r}" fill="url(#glow${i})"/></g>
  <style>.drift${i}{animation:drift${i} ${dur}s ease-in-out infinite}@keyframes drift${i}{0%,100%{transform:translate(0,0)}50%{transform:translate(${dx}px,${dy}px)}}</style>`).join('')

// =====================================================================
// 1 · Hero — the gradient, the headline, What I do, the polaroid
// =====================================================================
async function hero() {
  const W = 1400, H = 520, X = 72, FS = 52, LS = -0.045 * FS
  const B1 = 196, B2 = 254
  const bg = await gradient(W, H, 8)
  const l1 = await measure('Where robust engineering', { size: FS, weight: 600, ls: LS })
  const l2 = await measure('meets refined UX.', { size: FS, weight: 600, ls: LS })
  const name = await measure('Lark Babao', { size: 21, weight: 600, ls: -0.3 })
  const url = await measure('larkbabao.vercel.app', { size: 17, weight: 600, ls: -0.2 })
  const eng = await measure('Engineering', { size: 13, weight: 600 })
  const des = await measure('Design', { size: 13, weight: 600 })
  const cap = await measure('Designs it. Builds it. Ships it.', { size: 25, weight: 600, cls: 'serif' })

  const u = 'meets refined '.length
  const ux = { x: X + l2.xs[u] - 3, w: l2.xs[u + 2] - l2.xs[u] + 4 }
  const sel = { x: ux.x, y: B2 - 0.735 * FS - 6, w: ux.w, h: 0.735 * FS + 11 }
  const perim = 2 * (sel.w + sel.h)
  const handles = [[sel.x, sel.y], [sel.x + sel.w, sel.y], [sel.x + sel.w, sel.y + sel.h], [sel.x, sel.y + sel.h]]
    .map(([x, y], i) => `<rect class="pop" style="animation-delay:${1.1 + i * 0.07}s" x="${x - 4.5}" y="${y - 4.5}" width="9" height="9" rx="1" fill="#fff"/>`).join('')

  const caretX = X + l1.w + 6
  const engW = eng.w + 18, desW = des.w + 18

  // What I do: the Experience card as a checklist.
  const rows = [['Product', C.violet], ['UI/UX Design', C.pink], ['Design Systems', C.orange], ['Frontend', C.blue], ['Backend & APIs', C.green], ['Realtime & IoT', C.cyan]]
  const uiux = await measure('UI/UX Design', { size: 21, weight: 600, ls: -0.5 })
  const list = rows.map(([label, color], i) => `
    <g transform="translate(26 ${108 + i * 40})">
      <g class="pop" style="animation-delay:${0.5 + i * 0.12}s"><circle cx="12" cy="-7" r="12" fill="${color}"/>
      <path d="${TICK}" transform="translate(6 -12)" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>
      <text x="34" y="0" class="sans" font-size="21" font-weight="600" letter-spacing="-0.5" fill="#121214">${esc(label)}</text>
    </g>`).join('')

  const polW = 272, polH = 330, ph = 236
  const capSize = Math.min(25, (25 * (polW - 30)) / cap.w)

  return `${svgOpen(W, H, 'Lark Babao, Full-Stack Software Engineer: where robust engineering meets refined UX', 'Product, UI/UX design and full-stack engineering. Designs it. Builds it. Ships it.')}
<style>${fontCss('sans', 'mono', 'serif')}
  .bob{animation:bob 7s ease-in-out infinite}
  .float{animation:float 6s ease-in-out infinite}
  .cursor{animation:cursor 6.5s ease-in-out infinite}
  .blink{animation:blink 1.1s steps(1) infinite}
  .sel{stroke-dasharray:${perim.toFixed(1)};animation:draw 1s .3s cubic-bezier(.16,1,.3,1) both}
  .pop{transform-box:fill-box;transform-origin:center;animation:pop .45s cubic-bezier(.34,1.56,.64,1) both}
  .chip{transform-box:fill-box;transform-origin:left top;animation:pop .45s .8s cubic-bezier(.34,1.56,.64,1) both}
  @keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
  @keyframes float{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-10px) rotate(3deg)}}
  @keyframes cursor{0%,100%{transform:translate(0,0)}35%{transform:translate(8px,-6px)}70%{transform:translate(3px,5px)}}
  @keyframes blink{0%{opacity:1}50%{opacity:0}}
  @keyframes draw{from{stroke-dashoffset:${perim.toFixed(1)}}to{stroke-dashoffset:0}}
  @keyframes pop{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
  ${REDUCED}
</style>
<defs>
  <clipPath id="frame"><rect width="${W}" height="${H}" rx="32"/></clipPath>
  <clipPath id="photo"><rect width="${ph}" height="${ph}" rx="2"/></clipPath>
  <filter id="lift" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="22" stdDeviation="22" flood-color="#100c46" flood-opacity=".42"/></filter>
  <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="#100c46" flood-opacity=".3"/></filter>
  <filter id="sticker" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#100c46" flood-opacity=".4"/></filter>
  <linearGradient id="list" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" stop-color="#fff"/><stop offset="1" stop-color="#e9e3ff"/></linearGradient>
  <linearGradient id="tile" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7b5cff"/><stop offset="1" stop-color="#2f6bff"/></linearGradient>
  <linearGradient id="gloss" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <linearGradient id="back" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#bcd4ff"/><stop offset="1" stop-color="#8fb4ff"/></linearGradient>
</defs>

<g clip-path="url(#frame)">
  <image href="${bg}" width="${W}" height="${H}" preserveAspectRatio="none"/>
  ${blobs(W, H, [[0.12, 0.2, 380, C.cyan, 18, 120, 60], [0.55, 1.05, 420, C.pink, 22, -140, -50], [0.95, 0.1, 360, C.violet, 26, -100, 80]])}

  <!-- What I do -->
  <g transform="translate(800 74) rotate(-4 145 178)"><g class="bob" style="animation-delay:-2s">
    <rect width="290" height="356" rx="28" fill="url(#list)" filter="url(#lift)"/>
    <rect x="26" y="26" width="40" height="40" rx="11" fill="url(#tile)"/>
    ${mark(34, 38.5, 24, '#fff')}
    <text x="78" y="42" class="mono" font-size="10.5" font-weight="500" letter-spacing="1.1" fill="#8c8a83">WHAT I DO</text>
    <text x="78" y="58" class="mono" font-size="10.5" font-weight="500" letter-spacing="1.1" fill="#56554f">DESIGN × ENGINEERING</text>
    ${list}
    <g transform="translate(${26 + 34 + uiux.w + 14} ${108 + 40 - 14})"><g class="cursor" style="animation-delay:-3s">
      <path d="${ARROW}" fill="${C.pink}" stroke="#fff" stroke-width="1.4" stroke-linejoin="round" filter="url(#soft)"/>
      <g transform="translate(13 16)"><path d="${chipPath(desW, 22)}" fill="${C.pink}"/><text x="9" y="15.5" class="sans" font-size="13" font-weight="600" fill="#fff">Design</text></g>
    </g></g>
  </g></g>
  <g transform="translate(1004 372) rotate(8)"><g class="float" style="animation-delay:-1s">
    <image href="${STICKER.laptop}" width="104" height="${104 * STICKER_RATIO.laptop}" filter="url(#sticker)"/></g></g>

  <!-- The polaroids -->
  <g transform="translate(1140 48) rotate(10 ${polW / 2} ${polH / 2})"><g class="bob" style="animation-delay:-4s">
    <rect width="${polW}" height="${polH}" rx="6" fill="#fff" filter="url(#lift)"/>
    <rect x="18" y="18" width="${ph}" height="${ph}" rx="2" fill="url(#back)"/></g></g>
  <g transform="translate(1108 78) rotate(-5 ${polW / 2} ${polH / 2})"><g class="bob" style="animation-delay:-1.5s">
    <rect width="${polW}" height="${polH}" rx="6" fill="#fff" filter="url(#lift)"/>
    <g transform="translate(18 18)" clip-path="url(#photo)">
      <image href="${PHOTO}" width="${ph}" height="${ph}"/>
      <rect width="${ph}" height="${ph}" fill="url(#gloss)"/>
    </g>
    <text x="${polW / 2}" y="${18 + ph + 46}" text-anchor="middle" class="serif" font-size="${capSize.toFixed(1)}" font-weight="600" fill="#56554f">Designs it. Builds it. Ships it.</text>
  </g></g>
  <g transform="translate(1296 30) rotate(-10)"><g class="float" style="animation-delay:-3s">
    <image href="${STICKER.party}" width="92" height="${92 * STICKER_RATIO.party}" filter="url(#sticker)"/></g></g>
</g>

<!-- The headline, with an editor's caret and a designer's selection -->
<text x="${X}" y="${B1}" class="sans" font-size="${FS}" font-weight="600" letter-spacing="${LS}" fill="#fff" fill-opacity=".62">Where robust engineering</text>
<text x="${X}" y="${B2}" class="sans" font-size="${FS}" font-weight="600" letter-spacing="${LS}" fill="#fff">meets refined UX.</text>
<rect class="sel" x="${sel.x}" y="${sel.y}" width="${sel.w}" height="${sel.h}" fill="none" stroke="#fff" stroke-width="1.6"/>
${handles}
<g transform="translate(${caretX} ${B1 - 32})">
  <g class="blink"><path d="${IBEAM}" transform="scale(1.1)" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none" filter="url(#soft)"/></g>
  <g transform="translate(10 22)"><g class="chip"><path d="${chipPath(engW, 24)}" fill="#fff" filter="url(#soft)"/>
    <text x="9" y="16.5" class="sans" font-size="13" font-weight="600" fill="${C.blue}">Engineering</text></g></g>
</g>
<g transform="translate(${X + l2.w + 12} ${B2 - 26})"><g class="cursor">
  <path d="${ARROW}" transform="scale(1.15)" fill="#fff" stroke="none" filter="url(#soft)"/>
  <g transform="translate(16 18)"><path d="${chipPath(desW, 24)}" fill="#fff" filter="url(#soft)"/>
    <text x="9" y="16.5" class="sans" font-size="13" font-weight="600" fill="#e0287f">Design</text></g>
</g></g>

<text x="${X}" y="314" class="sans" font-size="20" font-weight="500" letter-spacing="-0.2" fill="#fff" fill-opacity=".85">Product <tspan fill-opacity=".5">  •  </tspan>UI/UX Design<tspan fill-opacity=".5">  •  </tspan>Full-Stack Engineering</text>

<!-- Sign-off: the mark, the name, the address -->
${mark(X, 368, 40, '#fff')}
<text x="${X + 52}" y="${368 + 26}" class="sans" font-size="21" font-weight="600" letter-spacing="-0.3" fill="#fff">Lark Babao</text>
<g transform="translate(${X + 52 + name.w + 22} 358)">
  <rect width="${url.w + 66}" height="48" rx="24" fill="#fff" filter="url(#soft)"/>
  <text x="24" y="30" class="sans" font-size="17" font-weight="600" letter-spacing="-0.2" fill="#2f4be0">larkbabao.vercel.app</text>
  <path d="M${url.w + 34} 29l8-8m-6 0h6v6" stroke="#2f4be0" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</g>
</svg>`
}

// =====================================================================
// 2 · Experience — the About section's cards, with their Memoji
// =====================================================================
const EXPERIENCE = [
  { role: ['Co-Founder &', 'Lead Developer'], org: 'Quadsync Technologies', period: 'May 2026 — Present', kind: 'Work', logo: { text: 'Q', grad: ['#7b5cff', '#2f6bff'], fg: '#fff' }, tint: '#e9e3ff', sticker: 'cool-shades' },
  { role: ['Assistant Web', 'Developer'], org: 'MEC Networks Corporation', period: 'Nov 2025 — Present', kind: 'Work', logo: { img: MEC }, tint: '#dde9ff', sticker: 'laptop' },
  { role: ['Chief Technology', 'Officer'], org: 'GDG on Campus · NU Manila', period: 'May 2024 — Jul 2025', kind: 'Leadership', logo: { text: 'GDG', bg: '#fff', fg: '#1f1f1f' }, tint: '#dff5e8', sticker: 'presenting' },
  { role: ['BS Information', 'Technology'], org: 'NU Manila · Summa Cum Laude', period: 'Jan 2024 — Sep 2026', kind: 'Education', logo: { text: 'NU', grad: ['#2b3f9e', '#1a2a73'], fg: '#ffd23f' }, tint: '#fff1cc', sticker: 'party' },
]
const KIND = { Work: C.blue, Leadership: C.green, Education: C.orange }

function experience(theme) {
  const dark = theme === 'dark'
  const t = dark
    ? { card: '#18181b', ink: '#f3f2ee', ink2: '#b4b2ab', ink3: '#7d7b75', stroke: 'rgb(255 255 255 / .07)', tintOp: 0.2, shadow: 0 }
    : { card: '#ffffff', ink: '#121214', ink2: '#56554f', ink3: '#8c8a83', stroke: 'rgb(18 18 20 / .06)', tintOp: 1, shadow: 0.1 }
  const W = 1400, H = 300, CW = 320, CH = 280, GAP = 20, X0 = (W - (CW * 4 + GAP * 3)) / 2
  const cards = EXPERIENCE.map((e, i) => {
    const x = X0 + i * (CW + GAP)
    const sw = 118, sh = sw * STICKER_RATIO[e.sticker]
    const logo = e.logo.img
      ? `<rect width="52" height="52" rx="14" fill="#fff" stroke="${t.stroke}"/><image href="${e.logo.img}" x="6" y="${26 - 44 * 70 / 250 / 2}" width="40" height="${(40 * 70) / 250}"/>`
      : `<rect width="52" height="52" rx="14" fill="${e.logo.grad ? `url(#logo${i})` : e.logo.bg}" stroke="${t.stroke}"/>
         <text x="26" y="${26 + (e.logo.text.length > 2 ? 5 : 7)}" text-anchor="middle" class="sans" font-size="${e.logo.text.length > 2 ? 14 : 19}" font-weight="700" letter-spacing="-0.3" fill="${e.logo.fg}">${e.logo.text}</text>`
    return `
    <linearGradient id="tint${i}" x1="0" y1="0" x2="0" y2="1"><stop offset=".35" stop-color="${e.tint}" stop-opacity="0"/><stop offset="1" stop-color="${e.tint}" stop-opacity="${t.tintOp}"/></linearGradient>
    ${e.logo.grad ? `<linearGradient id="logo${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${e.logo.grad[0]}"/><stop offset="1" stop-color="${e.logo.grad[1]}"/></linearGradient>` : ''}
    <clipPath id="card${i}"><rect width="${CW}" height="${CH}" rx="26"/></clipPath>
    <g transform="translate(${x} 10)"><g class="rise" style="animation-delay:${i * 0.1}s">
      <rect width="${CW}" height="${CH}" rx="26" fill="${t.card}" filter="url(#card)"/>
      <g clip-path="url(#card${i})">
        <rect width="${CW}" height="${CH}" fill="url(#tint${i})"/>
        <g transform="translate(${CW - sw - 6} ${CH - sh * 0.78}) rotate(${i % 2 ? -7 : 7} ${sw / 2} ${sh / 2})"><g class="float" style="animation-delay:${-i * 1.3}s">
          <image href="${STICKER[e.sticker]}" width="${sw}" height="${sh}" filter="url(#sticker)"/></g></g>
      </g>
      <rect x=".5" y=".5" width="${CW - 1}" height="${CH - 1}" rx="25.5" fill="none" stroke="${t.stroke}"/>
      <g transform="translate(24 24)">${logo}</g>
      <circle cx="${CW - 24 - 6 - e.kind.length * 7.6}" cy="40" r="3.5" fill="${KIND[e.kind]}"/>
      <text x="${CW - 24}" y="44" text-anchor="end" class="mono" font-size="11" font-weight="500" letter-spacing="1" fill="${t.ink3}">${e.kind.toUpperCase()}</text>
      <text x="24" y="122" class="sans" font-size="22" font-weight="600" letter-spacing="-0.6" fill="${t.ink}">${esc(e.role[0])}</text>
      <text x="24" y="149" class="sans" font-size="22" font-weight="600" letter-spacing="-0.6" fill="${t.ink}">${esc(e.role[1])}</text>
      <text x="24" y="178" class="sans" font-size="14" font-weight="500" fill="${t.ink2}">${esc(e.org)}</text>
      <text x="24" y="${CH - 26}" class="mono" font-size="11" font-weight="500" letter-spacing=".6" fill="${t.ink3}">${esc(e.period.toUpperCase())}</text>
    </g></g>`
  }).join('')

  return `${svgOpen(W, H, 'Experience: Co-Founder and Lead Developer at Quadsync Technologies; Assistant Web Developer at MEC Networks Corporation; Chief Technology Officer at Google Developer Groups on Campus, NU Manila; BS Information Technology, Summa Cum Laude, National University')}
<style>${fontCss('sans', 'mono')}
  .float{animation:float 6s ease-in-out infinite}
  .rise{animation:rise .7s cubic-bezier(.16,1,.3,1) both}
  @keyframes float{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-8px) rotate(-3deg)}}
  @keyframes rise{from{transform:translateY(14px);opacity:0}to{transform:none;opacity:1}}
  ${REDUCED}
</style>
<defs>
  <filter id="card" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#121214" flood-opacity="${t.shadow}"/></filter>
  <filter id="sticker" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#121214" flood-opacity="${dark ? 0.5 : 0.22}"/></filter>
</defs>
${cards}
</svg>`
}

// =====================================================================
// 3 · Stack — a macOS desktop: menu bar, wallpaper, and a dock that magnifies
// =====================================================================
const ICON = (slug) => readFileSync(`${NM}/simple-icons/icons/${slug}.svg`, 'utf8').match(/ d="([^"]+)"/)[1]
const APPS = [
  ['react', 'React', '#20232a', '#61dafb', 1], ['nextdotjs', 'Next.js', '#000', '#fff'], ['typescript', 'TypeScript', '#3178c6', '#fff', 1],
  ['tailwindcss', 'Tailwind CSS', '#fff', '#06b6d4'], ['threedotjs', 'three.js', '#fff', '#000'], ['vite', 'Vite', 'url(#vite)', '#fff'],
  ['flutter', 'Flutter', '#fff', '#02569b', 1], ['dart', 'Dart', '#0175c2', '#fff'], ['firebase', 'Firebase', '#2a2a2e', '#ffca28'],
  ['laravel', 'Laravel', '#ff2d20', '#fff', 1], ['php', 'PHP', '#777bb4', '#fff'], ['nodedotjs', 'Node.js', '#5fa04e', '#fff', 1],
  ['express', 'Express', '#fff', '#000'], ['mongodb', 'MongoDB', '#001e2b', '#00ed64'], ['mysql', 'MySQL', '#fff', '#00758f'],
  ['python', 'Python', '#3776ab', '#ffd43b'], ['figma', 'Figma', '#1e1e1e', '#fff', 1], ['git', 'Git', '#f05032', '#fff', 1],
  ['docker', 'Docker', '#2496ed', '#fff'], ['postman', 'Postman', '#ff6c37', '#fff'],
]

async function dock() {
  const W = 1400, H = 230, S = 54, G = 12, PAD = 14
  const dw = APPS.length * S + (APPS.length - 1) * G + PAD * 2, dh = S + PAD * 2 + 4
  const dx = (W - dw) / 2, dy = H - dh - 18
  const bg = await gradient(W, H, 31, 0.5)
  const T = 9, STEP = 0.3
  const labels = await Promise.all(APPS.map(([, l]) => measure(l, { size: 13, weight: 500 })))
  const icons = APPS.map(([slug, label, bgc, fg, running], i) => {
    const x = dx + PAD + i * (S + G), y = dy + PAD
    const lw = labels[i].w + 22
    const d = (i * STEP).toFixed(2)
    return `<g transform="translate(${x} ${y})">
      <g class="mag" style="animation-delay:${d}s">
        <rect width="${S}" height="${S}" rx="13" fill="${bgc}"/>
        <rect width="${S}" height="${S}" rx="13" fill="url(#shine)"/>
        <rect x=".5" y=".5" width="${S - 1}" height="${S - 1}" rx="12.5" fill="none" stroke="rgb(0 0 0 / .08)"/>
        <path d="${ICON(slug)}" transform="translate(${(S - 28) / 2} ${(S - 28) / 2}) scale(${28 / 24})" fill="${fg}"/>
      </g>
      <g class="tip" style="animation-delay:${d}s"><g transform="translate(${S / 2 - lw / 2} -56)">
        <rect width="${lw}" height="26" rx="7" fill="#1d1d22" fill-opacity=".86"/>
        <text x="${lw / 2}" y="17.5" text-anchor="middle" class="sans" font-size="13" font-weight="500" fill="#fff">${esc(label)}</text>
      </g></g>
      ${running ? `<circle cx="${S / 2}" cy="${S + 7}" r="2.2" fill="#fff" fill-opacity=".9"/>` : ''}
    </g>`
  }).join('')

  // Each icon swells as the wave passes; its neighbours follow half a step behind.
  const p = (s) => ((s / T) * 100).toFixed(2)
  return `${svgOpen(W, H, `Tech stack: ${APPS.map((a) => a[1]).join(', ')}`)}
<style>${fontCss('sans')}
  .mag{transform-box:fill-box;transform-origin:50% 100%;animation:mag ${T}s ease-in-out infinite}
  .tip{opacity:0;animation:tip ${T}s ease-in-out infinite}
  @keyframes mag{0%,${p(0.7)}%,100%{transform:translateY(0) scale(1)}${p(0.35)}%{transform:translateY(-10px) scale(1.34)}}
  @keyframes tip{0%,${p(0.12)}%,${p(0.6)}%,100%{opacity:0;transform:translateY(4px)}${p(0.25)}%,${p(0.45)}%{opacity:1;transform:translateY(-10px)}}
  ${REDUCED}
</style>
<defs>
  <clipPath id="frame"><rect width="${W}" height="${H}" rx="28"/></clipPath>
  <clipPath id="dock"><rect x="${dx}" y="${dy}" width="${dw}" height="${dh}" rx="24"/></clipPath>
  <filter id="blur" x="0" y="0" width="100%" height="100%"><feGaussianBlur stdDeviation="18"/></filter>
  <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <linearGradient id="vite" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#41d1ff"/><stop offset="1" stop-color="#bd34fe"/></linearGradient>
</defs>
<g clip-path="url(#frame)">
  <image href="${bg}" width="${W}" height="${H}" preserveAspectRatio="none"/>
  ${blobs(W, H, [[0.2, 0.9, 300, C.pink, 20, 160, -30], [0.8, 0.1, 320, C.cyan, 24, -160, 40]])}
  <!-- menu bar -->
  <rect width="${W}" height="34" fill="#fff" fill-opacity=".16"/>
  ${mark(22, 9.5, 19, '#fff')}
  <text x="56" y="22.5" class="sans" font-size="14" fill="#fff"><tspan font-weight="700">Lark</tspan><tspan dx="22" font-weight="500" fill-opacity=".92">Design</tspan><tspan dx="20" font-weight="500" fill-opacity=".92">Engineer</tspan><tspan dx="20" font-weight="500" fill-opacity=".92">Ship</tspan></text>
  <text x="${W - 22}" y="22.5" text-anchor="end" class="sans" font-size="14" font-weight="500" fill="#fff">Stack  ·  ${APPS.length} apps open  ·  9:41</text>
  <!-- the dock: frosted glass over the wallpaper -->
  <g clip-path="url(#dock)"><image href="${bg}" width="${W}" height="${H}" preserveAspectRatio="none" filter="url(#blur)"/></g>
  <rect x="${dx}" y="${dy}" width="${dw}" height="${dh}" rx="24" fill="#fff" fill-opacity=".2" stroke="#fff" stroke-opacity=".4"/>
  ${icons}
</g>
</svg>`
}

// =====================================================================
// 4 · Messages — "Lark, build me…", typed out and answered
// =====================================================================
async function messages(theme) {
  const dark = theme === 'dark'
  const t = dark
    ? { win: '#1c1c1e', head: '#2c2c2e', rule: 'rgb(255 255 255 / .08)', them: '#3a3a3c', themInk: '#fff', field: '#1c1c1e', fieldStroke: '#48484a', ink: '#fff', hint: '#8e8e93', plus: '#3a3a3c', shadow: 0.55, glow: 0.35 }
    : { win: '#ffffff', head: '#f6f6f7', rule: 'rgb(0 0 0 / .08)', them: '#e9e9eb', themInk: '#000', field: '#ffffff', fieldStroke: '#c7c7cc', ink: '#000', hint: '#8e8e93', plus: '#e9e9eb', shadow: 0.16, glow: 0.22 }
  const W = 1000, H = 560, WX = 60, WY = 24, WW = 880, WH = 510
  const FS = 18, BH = 42, PADX = 17
  const T = 20
  const asks = ['Lark, build me a dashboard my team will actually open', 'Lark, build me an app that works offline']
  const replies = ['Dashboards are my favourite. Seriously.', 'An app? I ship those in Flutter 📱']
  const intro = 'Hey! What should we build? 👋'
  const m = async (s) => measure(s, { size: FS, weight: 400, ls: -0.2 })
  const [ma, mb, ra, rb, mi] = await Promise.all([m(asks[0]), m(asks[1]), m(replies[0]), m(replies[1]), m(intro)])
  const typed = [ma, mb]

  // The thread, top to bottom.
  const top = WY + 104, step = BH + 12
  const L = WX + 28, R = WX + WW - 28
  const p = (s) => `${((s / T) * 100).toFixed(2)}%`

  // When each thing happens, in seconds.
  const CPS = 0.042
  const plan = []
  let s = 0.8
  for (let k = 0; k < 2; k++) {
    const typeStart = s, typeEnd = s + [...asks[k]].length * CPS
    const sent = typeEnd + 0.35, dots = sent + 0.45, reply = dots + 1.5
    plan.push({ typeStart, typeEnd, sent, dots, reply })
    s = reply + 1.4
  }
  const END = T - 0.8

  const bubble = (x, y, w, fill, ink, text, cls, delay, anchor = 'start') => `
    <g class="${cls}"><g class="bub" style="transform-origin:${anchor === 'end' ? x + w : x}px ${y + BH}px">
      <rect x="${x}" y="${y}" width="${w}" height="${BH}" rx="21" fill="${fill}"/>
      <text x="${x + PADX}" y="${y + 27}" class="sans" font-size="${FS}" letter-spacing="-0.2" fill="${ink}">${esc(text)}</text>
    </g></g>`

  // Shown from `on` to `off` (seconds), popping in like iMessage.
  const showKf = (name, on, off) => `@keyframes ${name}{0%,${p(on - 0.01)}{opacity:0;transform:scale(.6)}${p(on + 0.25)}{opacity:1;transform:scale(1)}${p(off)}{opacity:1;transform:scale(1)}${p(off + 0.4)},100%{opacity:0;transform:scale(1)}}`
  const kfs = []
  const els = []
  // Intro, always there.
  els.push(bubble(L, top, mi.w + PADX * 2, t.them, t.themInk, intro, 'still', 0))
  plan.forEach((pl, k) => {
    const yAsk = top + step * (1 + k * 2), yReply = yAsk + step
    const aw = typed[k].w + PADX * 2, rw = (k ? rb : ra).w + PADX * 2
    kfs.push(showKf(`ask${k}`, pl.sent, END), showKf(`reply${k}`, pl.reply, END))
    kfs.push(`@keyframes dots${k}{0%,${p(pl.dots - 0.01)}{opacity:0;transform:scale(.6)}${p(pl.dots + 0.2)}{opacity:1;transform:scale(1)}${p(pl.reply - 0.05)}{opacity:1;transform:scale(1)}${p(pl.reply)},100%{opacity:0;transform:scale(.6)}}`)
    els.push(`<style>.ask${k} .bub{animation:ask${k} ${T}s infinite}.reply${k} .bub{animation:reply${k} ${T}s infinite}.dots${k} .bub{animation:dots${k} ${T}s infinite}</style>`)
    els.push(bubble(R - aw, yAsk, aw, C.imsg, '#fff', asks[k], `ask${k}`, 0, 'end'))
    els.push(`<g class="dots${k}"><g class="bub" style="transform-origin:${L}px ${yReply + BH}px">
      <rect x="${L}" y="${yReply}" width="70" height="${BH}" rx="21" fill="${t.them}"/>
      ${[0, 1, 2].map((d) => `<circle class="dot" style="animation-delay:${d * 0.18}s" cx="${L + 20 + d * 15}" cy="${yReply + 21}" r="4.5" fill="${t.hint}"/>`).join('')}
    </g></g>`)
    els.push(bubble(L, yReply, rw, t.them, t.themInk, k ? replies[1] : replies[0], `reply${k}`, 0))
  })

  // The field: each ask types out under a sliding cover, caret riding its edge.
  const FX = WX + 76, FY = WY + WH - 64, FW = WW - 76 - 24, TX = FX + 18
  const fieldText = plan.map((pl, k) => {
    const xs = typed[k].xs
    const frames = xs.map((x, i) => `${p(pl.typeStart + i * CPS)}{transform:translateX(${x.toFixed(1)}px)}`)
    kfs.push(`@keyframes type${k}{0%{transform:translateX(0)}${frames.join('')}${p(pl.sent - 0.01)}{transform:translateX(${typed[k].w.toFixed(1)}px)}${p(pl.sent)},100%{transform:translateX(0)}}`)
    kfs.push(`@keyframes text${k}{0%,${p(pl.typeStart - 0.02)}{opacity:0}${p(pl.typeStart)},${p(pl.sent - 0.01)}{opacity:1}${p(pl.sent)},100%{opacity:0}}`)
    return `<g style="animation:text${k} ${T}s infinite;opacity:0">
      <text x="${TX}" y="${FY + 26}" class="sans" font-size="${FS}" letter-spacing="-0.2" fill="${t.ink}">${esc(asks[k])}</text>
      <g style="animation:type${k} ${T}s step-end infinite"><rect x="${TX}" y="${FY + 4}" width="${FW - 60}" height="32" fill="${t.field}"/>
      <rect x="${TX + 1}" y="${FY + 10}" width="2" height="21" rx="1" fill="${C.imsg}"/></g>
    </g>`
  }).join('')
  const typing = plan.map((pl) => [pl.typeStart, pl.sent])
  kfs.push(`@keyframes hint{0%{opacity:1}${typing.map(([a, b]) => `${p(a - 0.02)}{opacity:1}${p(a)}{opacity:0}${p(b - 0.01)}{opacity:0}${p(b)}{opacity:1}`).join('')}100%{opacity:1}}`)
  kfs.push(`@keyframes send{0%{opacity:.35}${typing.map(([a, b]) => `${p(a + 0.1)}{opacity:.35}${p(a + 0.15)}{opacity:1}${p(b)}{opacity:1}${p(b + 0.05)}{opacity:.35}`).join('')}100%{opacity:.35}}`)

  return `${svgOpen(W, H, 'Messages with Lark: "Lark, build me a dashboard my team will actually open." "Dashboards are my favourite. Seriously."')}
<style>${fontCss('sans')}
  .bub{opacity:0}
  .still .bub{opacity:1}
  .dot{animation:dot 1s ease-in-out infinite}
  .float{animation:float 6s ease-in-out infinite}
  .blink{animation:blink 1.1s steps(1) infinite}
  @keyframes dot{0%,100%{opacity:.35;transform:translateY(0)}40%{opacity:1;transform:translateY(-4px)}}
  @keyframes float{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-8px) rotate(4deg)}}
  @keyframes blink{0%{opacity:1}50%{opacity:0}}
  ${kfs.join('\n  ')}
  @media (prefers-reduced-motion:reduce){*{animation:none!important}.bub{opacity:1}.dots0 .bub,.dots1 .bub{opacity:0}}
</style>
<defs>
  <filter id="win" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="24" stdDeviation="26" flood-color="#100c46" flood-opacity="${t.shadow}"/></filter>
  <filter id="sticker" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#100c46" flood-opacity=".35"/></filter>
  <linearGradient id="tile" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7b5cff"/><stop offset="1" stop-color="#2f6bff"/></linearGradient>
  <clipPath id="window"><rect x="${WX}" y="${WY}" width="${WW}" height="${WH}" rx="28"/></clipPath>
  ${[[C.blue, 0.15, 0.35], [C.pink, 0.9, 0.75], [C.violet, 0.55, 0.05]].map(([c], i) => `<radialGradient id="g${i}"><stop offset="0" stop-color="${c}" stop-opacity="${t.glow}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`).join('')}
</defs>
${[[0.22, 0.5, 215], [0.78, 0.6, 215], [0.5, 0.2, 110]].map(([x, y, r], i) => `<circle cx="${x * W}" cy="${y * H}" r="${r}" fill="url(#g${i})"/>`).join('')}

<rect x="${WX}" y="${WY}" width="${WW}" height="${WH}" rx="28" fill="${t.win}" filter="url(#win)"/>
<g clip-path="url(#window)">
  <rect x="${WX}" y="${WY}" width="${WW}" height="88" fill="${t.head}"/>
  <rect x="${WX}" y="${WY + 88}" width="${WW}" height="1" fill="${t.rule}"/>
  <circle cx="${WX + 24}" cy="${WY + 22}" r="6" fill="#ff5f57"/><circle cx="${WX + 44}" cy="${WY + 22}" r="6" fill="#febc2e"/><circle cx="${WX + 64}" cy="${WY + 22}" r="6" fill="#28c840"/>
  <circle cx="${WX + WW / 2}" cy="${WY + 36}" r="22" fill="url(#tile)"/>
  ${mark(WX + WW / 2 - 13, WY + 36 - 11.3, 26, '#fff')}
  <text x="${WX + WW / 2}" y="${WY + 76}" text-anchor="middle" class="sans" font-size="12.5" font-weight="500" fill="${t.ink}">Lark ›</text>
  ${els.join('')}
  <!-- the field -->
  <circle cx="${WX + 44}" cy="${FY + 20}" r="18" fill="${t.plus}"/>
  <path d="M${WX + 44} ${FY + 13}v14M${WX + 37} ${FY + 20}h14" stroke="${t.hint}" stroke-width="2" stroke-linecap="round"/>
  <rect x="${FX}" y="${FY}" width="${FW}" height="40" rx="20" fill="${t.field}" stroke="${t.fieldStroke}"/>
  <text x="${TX}" y="${FY + 26}" class="sans" font-size="${FS}" letter-spacing="-0.2" fill="${t.hint}" style="animation:hint ${T}s infinite">Lark, build me<tspan class="blink" fill="${C.imsg}">|</tspan></text>
  ${fieldText}
  <g style="animation:send ${T}s infinite;opacity:.35"><circle cx="${FX + FW - 20}" cy="${FY + 20}" r="14" fill="${C.imsg}"/>
  <path d="M${FX + FW - 20} ${FY + 27}v-13m-5.5 5.5 5.5-5.5 5.5 5.5" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>
</g>
<g transform="translate(${WX + WW - 70} ${WY - 16}) rotate(12)"><g class="float">
  <image href="${STICKER.hearts}" width="96" height="${96 * STICKER_RATIO.hearts}" filter="url(#sticker)"/></g></g>
</svg>`
}

// ---------- Write, then preview ----------
const files = {
  hero: await hero(),
  dock: await dock(),
  'experience-light': experience('light'),
  'experience-dark': experience('dark'),
  'messages-light': await messages('light'),
  'messages-dark': await messages('dark'),
}
for (const [name, svg] of Object.entries(files)) writeFileSync(`${OUT}/${name}.svg`, svg)

const PREVIEW = process.env.PREVIEW
if (PREVIEW) {
  mkdirSync(PREVIEW, { recursive: true })
  for (const name of Object.keys(files)) {
    const bg = name.endsWith('dark') ? '#0d1117' : '#ffffff'
    const html = join(TMP, `${name}.html`)
    writeFileSync(html, `<body style="margin:0;padding:20px;background:${bg}"><img src="file://${OUT}/${name}.svg" width="1000"></body>`)
    await page.setViewportSize({ width: 1040, height: 700 })
    await page.goto(`file://${html}`)
    await page.waitForTimeout(Number(process.env.WAIT ?? 2500))
    await page.screenshot({ path: join(PREVIEW, `${name}.png`) })
  }
}
await browser.close()
console.log(Object.entries(files).map(([k, v]) => `${k}: ${(v.length / 1024).toFixed(0)} KB`).join('\n'))
