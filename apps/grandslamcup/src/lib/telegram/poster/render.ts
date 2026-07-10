/**
 * Рендеринг постеров для Telegram через satori + sharp.
 * Генерирует PNG из React-элемента.
 *
 * Шрифт Noto Sans (кириллица + latin) лежит локально в `public/fonts/` —
 * Google Fonts (`fonts.googleapis.com`) недоступен с РФ-хостинга s2,
 * поэтому runtime fetch к нему падал и постер получался пустым/битым.
 * См. fix в CHANGELOG v3.28.0.
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'

import satori from 'satori'
import sharp from 'sharp'

/** Размер постера (Instagram-friendly, хорошо смотрится в Telegram) */
const POSTER_WIDTH = 1200
const POSTER_HEIGHT = 630

/** Кэш загруженных шрифтов в памяти процесса (ленивая инициализация, один раз) */
let fontCache: { regular: Buffer; bold: Buffer } | null = null

/**
 * Возможные расположения `public/fonts/` в зависимости от окружения:
 * - dev (`nx dev`): cwd = `apps/grandslamcup`, путь = `public/fonts`
 * - prod Docker standalone: CMD `node apps/grandslamcup/server.js`, cwd = `/app`,
 *   public копируется в `/app/apps/grandslamcup/public` (см. Dockerfile.production)
 * - тесты: cwd может быть любой — пробуем абсолютный путь от корня монорепо
 */
const FONTS_DIR_CANDIDATES = [
  path.join(process.cwd(), 'public', 'fonts'),
  path.join(process.cwd(), 'apps', 'grandslamcup', 'public', 'fonts'),
  '/app/apps/grandslamcup/public/fonts',
]

/** Загрузить Noto Sans Regular + Bold с диска и закэшировать */
async function loadFonts(): Promise<{ regular: Buffer; bold: Buffer }> {
  if (fontCache) {
    return fontCache
  }
  let lastError: unknown = null
  for (const dir of FONTS_DIR_CANDIDATES) {
    try {
      const [regular, bold] = await Promise.all([
        readFile(path.join(dir, 'NotoSans-Regular.ttf')),
        readFile(path.join(dir, 'NotoSans-Bold.ttf')),
      ])
      fontCache = { regular, bold }
      return fontCache
    } catch (err) {
      lastError = err
    }
  }
  throw new Error(
    `Не удалось найти шрифты NotoSans-Regular.ttf/NotoSans-Bold.ttf ни в одном из путей: ${FONTS_DIR_CANDIDATES.join(
      ', '
    )}. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  )
}

/** Рендерит React-элемент в PNG Buffer */
export async function renderPoster(element: React.ReactNode): Promise<Buffer> {
  const { regular, bold } = await loadFonts()

  const svg = await satori(element as React.ReactElement, {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    fonts: [
      { name: 'Noto Sans', data: regular, weight: 400, style: 'normal' },
      { name: 'Noto Sans', data: bold, weight: 700, style: 'normal' },
    ],
  })

  return sharp(Buffer.from(svg)).png({ quality: 90 }).toBuffer()
}
