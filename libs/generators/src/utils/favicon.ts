/**
 * Генератор нейтральных монограммных фавиконок для приложений монорепо.
 *
 * Каждое приложение получает плоский квадрат фирменного/нейтрального цвета с первой буквой
 * имени по центру — без градиентов и свечения (в отличие от фосфорного курсора `apps/studio`,
 * который специфичен именно дизайну студии). Схема одна на все размеры: буква читается и на
 * 16 px, поэтому отдельного упрощения для мелких кадров, как в `apps/studio/design/make-icons.mjs`,
 * не требуется.
 */
import sharp from 'sharp'

/** Кадры, которые кладём внутрь `favicon.ico`. */
const ICO_SIZES = [16, 32, 48]

export interface FaviconOptions {
  /** Фон квадрата — фирменный цвет приложения или нейтральный, если своей палитры нет. */
  background: string
  /** Цвет буквы. */
  foreground: string
  /** Одна буква монограммы (обычно первая буква имени приложения), в верхнем регистре. */
  letter: string
}

function svg(size: number, { background, foreground, letter }: FaviconOptions): string {
  const fontSize = Math.round(size * 0.58)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`
    + `<rect width="${size}" height="${size}" fill="${background}"/>`
    + `<text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" `
    + `font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-weight="700" `
    + `font-size="${fontSize}" fill="${foreground}">${letter.toUpperCase()}</text>`
    + `</svg>`
}

async function renderPng(size: number, options: FaviconOptions): Promise<Buffer> {
  return sharp(Buffer.from(svg(size, options))).png({ compressionLevel: 9 }).toBuffer()
}

/**
 * Сборка ICO-контейнера. Формат простой: заголовок, таблица записей по 16 байт, затем сами
 * PNG-кадры подряд — PNG внутрь ICO кладут начиная с Vista, отдельный BMP с маской не нужен.
 */
function buildIco(frames: Array<{ size: number; data: Buffer }>): Buffer {
  const head = Buffer.alloc(6)
  head.writeUInt16LE(0, 0) // reserved
  head.writeUInt16LE(1, 2) // тип: иконка
  head.writeUInt16LE(frames.length, 4)

  let offset = 6 + frames.length * 16
  const table = frames.map(({ size, data }) => {
    const e = Buffer.alloc(16)
    e.writeUInt8(size === 256 ? 0 : size, 0)
    e.writeUInt8(size === 256 ? 0 : size, 1)
    e.writeUInt8(0, 2)
    e.writeUInt8(0, 3)
    e.writeUInt16LE(1, 4)
    e.writeUInt16LE(32, 6)
    e.writeUInt32LE(data.length, 8)
    e.writeUInt32LE(offset, 12)
    offset += data.length
    return e
  })

  return Buffer.concat([head, ...table, ...frames.map((f) => f.data)])
}

/** Собирает `favicon.ico` (16/32/48 px) для переданных цветов и буквы. */
export async function buildFaviconIco(options: FaviconOptions): Promise<Buffer> {
  const frames = await Promise.all(
    ICO_SIZES.map(async (size) => ({ size, data: await renderPng(size, options) })),
  )
  return buildIco(frames)
}

/** Исходник `icon.tsx` (App Router, `next/og` `ImageResponse`) с той же монограммой. */
export function iconTsxSource(options: FaviconOptions): string {
  const { background, foreground, letter } = options
  return `import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '${background}',
          color: '${foreground}',
          fontSize: 20,
          fontWeight: 700,
        }}
      >
        ${letter.toUpperCase()}
      </div>
    ),
    { ...size },
  )
}
`
}
