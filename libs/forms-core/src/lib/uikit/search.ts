/**
 * Поиск внутри Select — framework-free половина: порог показа поля поиска и фильтр опций.
 * Отрисовка поля, клавиши и ARIA остаются в скине, состояние строки поиска — в `forms-react`.
 */
import { correctKeyboardLayout } from './keyboard-layout'

/** Поле поиска показывается, когда опций больше порога: по умолчанию с 10-й */
export const SELECT_SEARCH_THRESHOLD = 9

/** Настройки поиска в Select (`searchable={{...}}`); всё необязательно */
export interface SelectSearchSettings<TOption = unknown> {
  /** Поиск показывается, когда опций больше порога. По умолчанию 9 (то есть с 10). 0 — всегда */
  threshold?: number
  /** Подсказка поля поиска. По умолчанию — из i18n */
  placeholder?: string
  /** Своё сообщение пустого результата. По умолчанию — из i18n */
  emptyMessage?: string
  /** Свой предикат. По умолчанию — подстрока без регистра и диакритики по тексту опции (и по раскладке) */
  filter?: (option: TOption, query: string) => boolean
}

/** `'auto'` — по порогу; `true` ≡ `{ threshold: 0 }`; `false` — выключено; объект — `'auto'` со своими настройками */
export type SelectSearchable<TOption = unknown> = boolean | 'auto' | SelectSearchSettings<TOption>

/**
 * Состояние поиска, которое поле передаёт скину. Скин получает ПОЛНЫЙ список опций и
 * `visibleValues`: `selected` и «пустой вариант» (`value: ''`) считаются по полному списку — иначе
 * отфильтрованное «Все категории» визуально сбросило бы поле посреди поиска.
 */
export interface UIKitSelectSearch {
  query: string
  onQueryChange: (query: string) => void
  placeholder: string
  ariaLabel: string
  /** `value` опций, прошедших фильтр; коллекция списка строится по ним */
  visibleValues: ReadonlySet<string>
}

/**
 * Показывать ли поле поиска.
 *
 * `count` — число опций в НЕфильтрованном списке (без служебного «+ Добавить»): иначе поле
 * исчезало бы при вводе. Гистерезис: пока строка поиска непустая, поле не пропадает, даже если
 * опций стало не больше порога (справочник перезапросился при открытом списке) — иначе
 * пользователь застрял бы в невидимом фильтре.
 */
export function resolveSearchable(
  searchable: SelectSearchable<never> | undefined,
  count: number,
  query: string,
): boolean {
  if (searchable === false) {
    return false
  }
  if (searchable === true) {
    return true
  }
  const threshold = typeof searchable === 'object' && typeof searchable.threshold === 'number'
    ? searchable.threshold
    : SELECT_SEARCH_THRESHOLD
  return count > threshold || query.length > 0
}

/** Приводит текст к виду для сравнения: регистр, диакритика, «ё» ≡ «е» */
function normalizeForSearch(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0451/gi, '\u0435').toLowerCase()
}

/** Предикат по умолчанию: `text` содержит `query` без учёта регистра, диакритики и «ё»/«е» */
export function matchesSearchQuery(text: string, query: string): boolean {
  return normalizeForSearch(text).includes(normalizeForSearch(query))
}

/**
 * Предикат «текст подходит под запрос» с учётом раскладки: текст проходит, если совпал с запросом
 * ИЛИ с запросом, набранным не в той раскладке («ghbdtn» → «привет»). Объединение, а не замена:
 * латинская опция находится по латинскому запросу, даже если он выглядит как ошибка раскладки.
 *
 * `match` — предикат подстроки скина (по умолчанию `matchesSearchQuery`). Пустой запрос (после
 * `trim`) — `null`: фильтровать нечего. Запрос исправляется один раз, а не на каждую опцию.
 */
export function createSearchMatcher(
  query: string,
  match: (text: string, query: string) => boolean = matchesSearchQuery,
): ((text: string) => boolean) | null {
  const needle = query.trim()
  if (!needle) {
    return null
  }
  const corrected = correctKeyboardLayout(needle)
  const queries = corrected.toLowerCase() !== needle.toLowerCase() ? [needle, corrected] : [needle]
  return (text) => queries.some((q) => match(text, q))
}

/**
 * Один фильтр для Select и для статичного пути Combobox (см. `createSearchMatcher`).
 * `getText` — текст опции (`getOptionText`). Пустой запрос возвращает копию списка.
 */
export function filterSelectionOptions<T>(
  options: readonly T[],
  query: string,
  getText: (option: T) => string,
  match: (text: string, query: string) => boolean = matchesSearchQuery,
): T[] {
  const matcher = createSearchMatcher(query, match)
  return matcher ? options.filter((option) => matcher(getText(option))) : options.slice()
}
