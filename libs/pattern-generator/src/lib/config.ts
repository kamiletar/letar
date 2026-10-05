/** Допустимые стили узоров (алгоритмы реализуются отдельно от ядра). */
export const PATTERN_STYLES = ['geometry', 'waves', 'branching'] as const

export type PatternStyle = (typeof PATTERN_STYLES)[number]

export interface PatternPalette {
  /** Цвет фона, `#RRGGBB` в верхнем регистре. */
  background: string
  /** От 2 до 5 цветов узора, `#RRGGBB` в верхнем регистре. */
  colors: string[]
}

/** Настройки узора, версия 1. Только JSON-совместимые значения. */
export interface PatternConfigV1 {
  version: 1
  style: PatternStyle
  /** Целое 0…4 294 967 295. */
  seed: number
  /** Ширина в мм, целое 100…3000. */
  widthMm: number
  /** Высота в мм, целое 100…3000. */
  heightMm: number
  palette: PatternPalette
  /** Плотность, целое 1…5. */
  density: number
  /** Масштаб, целое 1…5. */
  scale: number
}

export const SEED_MAX = 4_294_967_295
export const SIZE_MM_MIN = 100
export const SIZE_MM_MAX = 3000
export const PALETTE_COLORS_MIN = 2
export const PALETTE_COLORS_MAX = 5

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

function readInteger(source: Record<string, unknown>, field: string, min: number, max: number, label: string): number {
  const value = source[field]
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${label}: нужно целое число от ${min} до ${max}`)
  }
  return value
}

function readColor(value: unknown, label: string): string {
  if (typeof value !== 'string' || !HEX_COLOR.test(value)) {
    throw new Error(`${label}: нужен цвет в формате #RRGGBB`)
  }
  return value.toUpperCase()
}

/** Проверяет ГПСЧ-seed: целое 0…4 294 967 295. */
export function assertPatternSeed(seed: unknown): asserts seed is number {
  if (typeof seed !== 'number' || !Number.isInteger(seed) || seed < 0 || seed > SEED_MAX) {
    throw new Error(`Seed: нужно целое число от 0 до ${SEED_MAX}`)
  }
}

/**
 * Проверяет настройки узора и возвращает чистый объект: неизвестные поля отсекаются,
 * цвета приводятся к верхнему регистру. Ошибка — обычный `Error` с русским сообщением.
 */
export function parsePatternConfig(input: unknown): PatternConfigV1 {
  if (!isPlainObject(input)) {
    throw new Error('Настройки узора: ожидался объект')
  }
  if (input.version !== 1) {
    throw new Error('Версия настроек: поддерживается только 1')
  }
  if (typeof input.style !== 'string' || !(PATTERN_STYLES as readonly string[]).includes(input.style)) {
    throw new Error(`Стиль: допустимо ${PATTERN_STYLES.join(', ')}`)
  }

  const seed = readInteger(input, 'seed', 0, SEED_MAX, 'Seed')
  const widthMm = readInteger(input, 'widthMm', SIZE_MM_MIN, SIZE_MM_MAX, 'Ширина, мм')
  const heightMm = readInteger(input, 'heightMm', SIZE_MM_MIN, SIZE_MM_MAX, 'Высота, мм')
  const density = readInteger(input, 'density', 1, 5, 'Плотность')
  const scale = readInteger(input, 'scale', 1, 5, 'Масштаб')

  if (!isPlainObject(input.palette)) {
    throw new Error('Палитра: ожидался объект')
  }
  const rawColors = input.palette.colors
  if (!Array.isArray(rawColors) || rawColors.length < PALETTE_COLORS_MIN || rawColors.length > PALETTE_COLORS_MAX) {
    throw new Error(`Палитра: нужно от ${PALETTE_COLORS_MIN} до ${PALETTE_COLORS_MAX} цветов`)
  }

  return {
    version: 1,
    style: input.style as PatternStyle,
    seed,
    widthMm,
    heightMm,
    palette: {
      background: readColor(input.palette.background, 'Цвет фона'),
      colors: rawColors.map((color, index) => readColor(color, `Цвет палитры №${index + 1}`)),
    },
    density,
    scale,
  }
}
