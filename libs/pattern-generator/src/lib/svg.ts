import { parsePatternConfig, type PatternConfigV1 } from './config'

const NUMBER_PRECISION = 3
const NUMBER_ABS_MAX = 1e15

/**
 * Число для SVG: не больше трёх знаков после точки, без локализованной запятой,
 * без `-0` и экспоненты. NaN и Infinity — ошибка.
 */
export function formatPatternNumber(value: number): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('Число для SVG должно быть конечным')
  }
  if (Math.abs(value) > NUMBER_ABS_MAX) {
    throw new Error('Число для SVG слишком велико')
  }
  const text = value.toFixed(NUMBER_PRECISION).replace(/\.?0+$/, '')
  return text === '-0' || text === '' ? '0' : text
}

/** Что не должно попадать в SVG, даже из доверенных алгоритмов: скрипты, ссылки, шрифты, id. */
const FORBIDDEN_ELEMENT_PATTERNS: readonly RegExp[] = [
  /<\s*script/i,
  /<\s*foreignObject/i,
  /<\s*(image|use|a|style|animate|set|iframe|text|tspan)\b/i,
  /\bon[a-z]+\s*=/i,
  /\b(xlink:)?href\s*=/i,
  /\burl\s*\(/i,
  /\bid\s*=/i,
  /\bfont[-a-z]*\s*[=:]/i,
  /javascript:/i,
  /@import/i,
]

/**
 * Собирает внешний SVG: физический размер в мм, `viewBox="0 0 1000 H"` с сохранением пропорций,
 * фон из палитры, затем элементы алгоритма.
 *
 * Низкоуровневый сборщик для доверенных алгоритмов, не API для SVG от клиента:
 * на всякий случай запрещённые конструкции в `elements` всё равно отвергаются.
 */
export function createPatternSvg(config: PatternConfigV1, elements: string[]): string {
  const safeConfig = parsePatternConfig(config)
  if (!Array.isArray(elements) || elements.some((element) => typeof element !== 'string')) {
    throw new Error('Элементы SVG: ожидался массив строк')
  }
  for (const element of elements) {
    if (FORBIDDEN_ELEMENT_PATTERNS.some((pattern) => pattern.test(element))) {
      throw new Error('Элемент SVG содержит запрещённую конструкцию')
    }
  }

  const height = formatPatternNumber((1000 * safeConfig.heightMm) / safeConfig.widthMm)
  const background = `<rect width="1000" height="${height}" fill="${safeConfig.palette.background}"/>`

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${safeConfig.widthMm}mm" height="${safeConfig.heightMm}mm"`
    + ` viewBox="0 0 1000 ${height}">`,
    background,
    ...elements,
    '</svg>',
  ].join('')
}
