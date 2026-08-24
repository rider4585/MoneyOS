import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const VIOLET = [139, 92, 246]
const INDIGO = [99, 102, 241]
const WHITE = [255, 255, 255]

const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2))
  const cx = ax + t * dx
  const cy = ay + t * dy
  return Math.hypot(px - cx, py - cy)
}

const CHART = [
  [0.3, 0.68],
  [0.45, 0.52],
  [0.56, 0.61],
  [0.72, 0.38],
]

function render(size, { maskable = false } = {}) {
  const px = Buffer.alloc(size * size * 4)
  const s = size / 512
  const radius = 96 * s
  const margin = maskable ? 0 : 16 * s
  const lo = margin
  const hi = size - margin
  const scale = maskable ? 0.62 : 0.86
  const stroke = (maskable ? 30 : 42) * s * (scale / 0.86)

  const pts = CHART.map(([x, y]) => [
    size / 2 + ((x - 0.5) * 512 * s * scale),
    size / 2 + ((y - 0.5) * 512 * s * scale),
  ])

  const tipX = pts[pts.length - 1][0]
  const tipY = pts[pts.length - 1][1]
  const headLen = 74 * s * (scale / 0.86)
  const headAngle = Math.atan2(pts[3][1] - pts[2][1], pts[3][0] - pts[2][0])

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      let inside
      if (maskable) {
        inside = true
      } else {
        const rx = Math.abs(x - size / 2)
        const ry = Math.abs(y - size / 2)
        if (rx > size / 2 - radius && ry > size / 2 - radius) {
          const ox = rx - (size / 2 - radius)
          const oy = ry - (size / 2 - radius)
          inside = ox * ox + oy * oy <= radius * radius
        } else {
          inside = x >= lo && x <= hi && y >= lo && y <= hi
        }
      }
      if (!inside) continue

      const t = (x + y) / (2 * size)
      let r = VIOLET[0] + (INDIGO[0] - VIOLET[0]) * t
      let g = VIOLET[1] + (INDIGO[1] - VIOLET[1]) * t
      let b = VIOLET[2] + (INDIGO[2] - VIOLET[2]) * t

      let glyph = false
      for (let k = 0; k < pts.length - 1; k++) {
        if (segDist(x + 0.5, y + 0.5, pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1]) <= stroke / 2) {
          glyph = true
          break
        }
      }
      if (!glyph) {
        const hx = tipX - Math.cos(headAngle - Math.PI / 5) * headLen
        const hy = tipY - Math.sin(headAngle - Math.PI / 5) * headLen
        const bx = tipX - Math.cos(headAngle + Math.PI / 5) * headLen
        const by = tipY - Math.sin(headAngle + Math.PI / 5) * headLen
        const area = Math.abs((bx - hx) * (tipY - hy) - (tipX - hx) * (by - hy)) / 2
        const a1 = Math.abs((bx - hx) * (y + 0.5 - hy) - (x + 0.5 - hx) * (by - hy)) / 2
        const a2 = Math.abs((x + 0.5 - hx) * (tipY - hy) - (tipX - hx) * (y + 0.5 - hy)) / 2
        const a3 = Math.abs((bx - x - 0.5) * (tipY - y - 0.5) - (tipX - x - 0.5) * (by - y - 0.5)) / 2
        if (Math.abs(a1 + a2 + a3 - area) < 0.75) glyph = true
      }

      if (glyph) {
        r = WHITE[0]
        g = WHITE[1]
        b = WHITE[2]
      }

      px[i] = Math.round(r)
      px[i + 1] = Math.round(g)
      px[i + 2] = Math.round(b)
      px[i + 3] = 255
    }
  }
  return encodePng(size, px)
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

const targets = [
  ['pwa-192.png', 192, {}],
  ['pwa-512.png', 512, {}],
  ['apple-touch-icon.png', 180, {}],
  ['maskable-512.png', 512, { maskable: true }],
]

for (const [name, size, opts] of targets) {
  writeFileSync(join(outDir, name), render(size, opts))
  console.log('wrote', name, size + 'x' + size)
}
