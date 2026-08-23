/**
 * Generates placeholder PWA icons (violet→indigo gradient, white disc).
 * Zero-dependency PNG writer using node:zlib — replaced with real brand
 * icons in T4. Usage: node scripts/make-icons.mjs
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/** width/height RGBA PNG; px(x,y) -> [r,g,b,a] */
function png(width, height, px) {
  const raw = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0 // filter: none
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = px(x, y)
      const o = y * (1 + width * 4) + 1 + x * 4
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const VIOLET = [139, 92, 246]
const INDIGO = [99, 102, 241]
const WHITE = [255, 255, 255]

function makeIcon(size, { rounded }) {
  const r = rounded ? size * 0.22 : 0
  const cx = size / 2
  const discR = size * 0.27
  const barW = size * 0.055
  const barH = size * 0.42
  return png(size, size, (x, y) => {
    if (rounded) {
      const dx = Math.max(r - x, x - (size - 1 - r), 0)
      const dy = Math.max(r - y, y - (size - 1 - r), 0)
      if (dx * dx + dy * dy > r * r) return [0, 0, 0, 0]
    }
    const t = (x + y) / (2 * size) // diagonal gradient
    let c = [
      Math.round(VIOLET[0] + (INDIGO[0] - VIOLET[0]) * t),
      Math.round(VIOLET[1] + (INDIGO[1] - VIOLET[1]) * t),
      Math.round(VIOLET[2] + (INDIGO[2] - VIOLET[2]) * t),
      255,
    ]
    const d = Math.hypot(x - cx, y - cx)
    const inDisc = d <= discR
    const inBar =
      Math.abs(y - cx) <= barH / 2 && Math.abs(x - cx) <= barW / 2 &&
      y >= cx - barH / 2 + size * 0.06
    if (inBar || inDisc) c = [...WHITE, 235]
    if (inDisc) {
      const innerR = discR - barW
      const ringGap = Math.abs(d - (innerR + discR) / 2)
      if (!(ringGap < (discR - innerR) / 2 || (Math.abs(x - cx) <= barW / 2 && y > cx))) {
        if (!(Math.abs(y - cx) <= barH / 2 && Math.abs(x - cx) <= barW / 2)) c = [...WHITE, 235]
      }
    }
    return c
  })
}

mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, 'pwa-192.png'), makeIcon(192, { rounded: true }))
writeFileSync(join(outDir, 'pwa-512.png'), makeIcon(512, { rounded: true }))
// maskable: full-bleed square, content inside the 80% safe zone is fine here
writeFileSync(join(outDir, 'maskable-512.png'), makeIcon(512, { rounded: false }))
console.log('icons written to', outDir)
