import * as hy from './hy'
import * as kk from './kk'
import * as ky from './ky'
import * as ru from './ru'
import * as tg from './tg'
import * as tk from './tk'

type NumberFn = (n: number) => string

const cardinalMap: Record<string, NumberFn> = {
  ru: ru.cardinal,
  kk: kk.cardinal,
  ky: ky.cardinal,
  tg: tg.cardinal,
  tk: tk.cardinal,
  hy: hy.cardinal,
}

const ordinalMap: Record<string, NumberFn> = {
  ru: ru.ordinal,
  kk: kk.ordinal,
  ky: ky.ordinal,
  tg: tg.ordinal,
  tk: tk.ordinal,
  hy: hy.ordinal,
}

/** Кардинальное числительное для кастомных локалей */
export function customCardinal(n: number, locale: string): string {
  const fn = cardinalMap[locale]
  if (!fn) {
    throw new Error(`Нет кастомной реализации для локали: ${locale}`)
  }
  return fn(n)
}

/** Порядковое числительное для кастомных локалей */
export function customOrdinal(n: number, locale: string): string {
  const fn = ordinalMap[locale]
  if (!fn) {
    throw new Error(`Нет кастомной реализации для локали: ${locale}`)
  }
  return fn(n)
}
