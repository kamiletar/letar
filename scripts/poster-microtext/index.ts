#!/usr/bin/env bun
/**
 * poster-microtext — нанесение адаптивного микротекста на изображение для печати.
 *
 * Надписи из списка равномерно тайлятся по всей картинке «кирпичной» сеткой.
 * Цвет не фиксированный: каждый пиксель буквы сдвигается по яркости относительно
 * локального фона (на тёмном — светлее, на светлом — темнее), поэтому текст
 * читается с 10–15 см и не виден с дистанции на любой картинке.
 *
 * Запуск:
 *   bun scripts/poster-microtext/index.ts -i poster.jpg -o out.jpg --texts phrases.txt
 *   bun scripts/poster-microtext/index.ts -i poster.jpg -o out.png -t "первая фраза" -t "вторая"
 *
 * Ключевые параметры (все размеры — физические, пересчёт по --width-cm):
 *   --width-cm   ширина отпечатка в см (по умолчанию 90) — задаёт масштаб px/мм
 *   --letter-mm  высота заглавной буквы в мм (по умолчанию 1.2)
 *   --delta      сдвиг яркости 0–255 (по умолчанию 10 ≈ 4%); калибровать тест-печатью
 *   --gap-x-mm   промежуток между фразами в строке, мм (по умолчанию 25)
 *   --gap-y-mm   шаг строк, мм (по умолчанию 18)
 *   --font       font-family системного шрифта (по умолчанию Arial)
 *   --save-mask  путь для отладочного PNG с маской текста
 *   --quality    качество JPEG (по умолчанию 95, всегда 4:4:4)
 *
 * Формат вывода определяется расширением: .png / .jpg / .tif
 * В файл прописывается DPI, вычисленный из --width-cm.
 */
import { readFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import sharp from 'sharp'

const { values: args } = parseArgs({
  options: {
    input: { type: 'string', short: 'i' },
    output: { type: 'string', short: 'o' },
    text: { type: 'string', short: 't', multiple: true },
    texts: { type: 'string' },
    'width-cm': { type: 'string', default: '90' },
    'letter-mm': { type: 'string', default: '1.2' },
    delta: { type: 'string', default: '10' },
    'gap-x-mm': { type: 'string', default: '25' },
    'gap-y-mm': { type: 'string', default: '18' },
    font: { type: 'string', default: 'Arial' },
    'save-mask': { type: 'string' },
    quality: { type: 'string', default: '95' },
    help: { type: 'boolean', short: 'h' },
  },
})

if (args.help || !args.input || !args.output || (!args.text?.length && !args.texts)) {
  console.log(
    'Использование: bun index.ts -i <вход> -o <выход.png|jpg|tif> (--texts <файл-со-списком> | -t "фраза" [-t ...])\n'
      + 'Опции: --width-cm 90 --letter-mm 1.2 --delta 10 --gap-x-mm 25 --gap-y-mm 18 --font Arial --save-mask mask.png --quality 95',
  )
  process.exit(args.help ? 0 : 1)
}

const phrases: string[] = [
  ...(args.text ?? []),
  ...(args.texts ? readFileSync(args.texts, 'utf8').split(/\r?\n/) : []),
].map((s) => s.trim()).filter(Boolean)

if (phrases.length === 0) {
  console.error('Список надписей пуст')
  process.exit(1)
}

const widthCm = Number(args['width-cm'])
const letterMm = Number(args['letter-mm'])
const delta = Number(args.delta)
const gapXmm = Number(args['gap-x-mm'])
const gapYmm = Number(args['gap-y-mm'])
const fontFamily = args.font!
const jpegQuality = Number(args.quality)

const escXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const t0 = performance.now()
const log = (msg: string) => console.log(`[${((performance.now() - t0) / 1000).toFixed(1)}s] ${msg}`)

// ── 1. Исходник ────────────────────────────────────────────────────────────────
const input = sharp(args.input, { limitInputPixels: false }).rotate() // rotate() — учёт EXIF-ориентации
const { data: rgb, info } = await input
  .removeAlpha()
  .toColourspace('srgb')
  .raw()
  .toBuffer({ resolveWithObject: true })

const W = info.width
const H = info.height
const pxPerMm = W / (widthCm * 10)
const dpi = Math.round(pxPerMm * 25.4)
// ~0.72 — отношение высоты заглавной буквы к кеглю у типовых sans-шрифтов
const fontSize = (letterMm * pxPerMm) / 0.72

log(`Вход: ${W}×${H}px, ${info.channels} канала → ${dpi} DPI при ширине ${widthCm} см`)
log(`Кегль: ${fontSize.toFixed(1)}px (заглавные ≈ ${letterMm} мм)`)

// ── 2. Фактическая ширина каждой фразы (рендер + trim) ─────────────────────────
async function measure(text: string): Promise<number> {
  const w = Math.ceil(fontSize * (text.length + 4))
  const h = Math.ceil(fontSize * 3)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">`
    + `<text x="${fontSize}" y="${fontSize * 1.5}" font-family="${
      escXml(fontFamily)
    }" font-size="${fontSize}" fill="#fff">${escXml(text)}</text></svg>`
  const { info: ti } = await sharp(Buffer.from(svg)).trim().toBuffer({ resolveWithObject: true })
  return ti.width
}

const widths = new Map<string, number>()
for (const p of phrases) {
  if (!widths.has(p)) widths.set(p, await measure(p))
}
log(`Фраз: ${phrases.length} (уникальных: ${widths.size})`)

// ── 3. Раскладка: кирпичная сетка, фразы по кругу ──────────────────────────────
const gapX = gapXmm * pxPerMm
const rowStep = gapYmm * pxPerMm
const avgW = [...widths.values()].reduce((a, b) => a + b, 0) / widths.size
const avgStep = avgW + gapX

const els: string[] = []
let idx = 0
let row = 0
for (let y = rowStep / 2 + fontSize / 2; y < H + fontSize; y += rowStep, row++) {
  // сдвиг чётных/нечётных строк на полшага — «кирпичная кладка»
  let x = -avgStep + (row % 2) * (avgStep / 2)
  while (x < W) {
    const text = phrases[idx++ % phrases.length]
    els.push(
      `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-family="${
        escXml(fontFamily)
      }" font-size="${fontSize}" fill="#fff">${escXml(text)}</text>`,
    )
    x += widths.get(text)! + gapX
  }
}
log(`Надписей размещено: ${els.length} (${row} строк)`)

// ── 4. Маска текста (grayscale, антиалиасинг = сила эффекта) ───────────────────
const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`
  + `<rect width="100%" height="100%" fill="#000"/>${els.join('')}</svg>`
const { data: mask } = await sharp(Buffer.from(maskSvg), { limitInputPixels: false, unlimited: true })
  .greyscale()
  .raw()
  .toBuffer({ resolveWithObject: true })
log('Маска отрендерена')

if (args['save-mask']) {
  await sharp(mask, { raw: { width: W, height: H, channels: 1 }, limitInputPixels: false })
    .png()
    .toFile(args['save-mask'])
  log(`Маска сохранена: ${args['save-mask']}`)
}

// ── 5. Карта локальной яркости фона (даунскейл + blur — быстро и сглаженно) ────
const { data: lum, info: li } = await sharp(args.input, { limitInputPixels: false })
  .rotate()
  .resize({ width: Math.max(64, Math.round(W / 16)) })
  .greyscale()
  .blur(2)
  .raw()
  .toBuffer({ resolveWithObject: true })
const fx = li.width / W
const fy = li.height / H

// ── 6. Попиксельное нанесение: фон тёмный → буква светлее, светлый → темнее ────
for (let y = 0; y < H; y++) {
  const lrow = Math.min(li.height - 1, (y * fy) | 0) * li.width
  const mrow = y * W
  for (let x = 0; x < W; x++) {
    const m = mask[mrow + x]!
    if (m === 0) continue
    const L = lum[lrow + Math.min(li.width - 1, (x * fx) | 0)]!
    const d = Math.round((L < 128 ? 1 : -1) * delta * (m / 255))
    const i = (mrow + x) * 3
    for (let c = 0; c < 3; c++) {
      const v = rgb[i + c]! + d
      rgb[i + c] = v < 0 ? 0 : v > 255 ? 255 : v
    }
  }
}
log(`Текст нанесён (delta ±${delta})`)

// ── 7. Сохранение с DPI ────────────────────────────────────────────────────────
const out = sharp(rgb, { raw: { width: W, height: H, channels: 3 }, limitInputPixels: false })
  .withMetadata({ density: dpi })
const ext = args.output!.toLowerCase().split('.').pop()
if (ext === 'png') out.png()
else if (ext === 'tif' || ext === 'tiff') out.tiff({ compression: 'lzw' })
else out.jpeg({ quality: jpegQuality, chromaSubsampling: '4:4:4' })
await out.toFile(args.output!)
log(`Готово: ${args.output}`)
