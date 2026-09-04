import { correctKeyboardLayout } from './keyboard-layout'

export interface SearchThreshold {
  /** Ниже этого числа результатов по буквальному запросу — пробуем раскладку. */
  minResults: number
  /** Показывать исправленный вариант, только если результатов в X раз больше буквального. */
  correctedMultiplier: number
}

export const DEFAULT_SEARCH_THRESHOLD: SearchThreshold = {
  minResults: 3,
  correctedMultiplier: 2,
}

export interface SearchOutcome<T> {
  items: T[]
  usedQuery: string
  literalQuery: string
  wasCorrected: boolean
  fallbackSuggestions?: T[]
}

export interface OrchestrateSearchParams<T> {
  query: string
  /** Выполняет реальный запрос к БД (ZenStack `@fuzzy`/`@fullText`) для одной строки. */
  runSearch: (q: string) => Promise<{ items: T[]; total: number }>
  threshold?: SearchThreshold
  /** Вызывается, если и буквальный, и исправленный запрос дали ноль результатов. */
  suggestFallback?: () => Promise<T[]>
}

/**
 * Заповедь №17: два прогона запроса, прозрачная подмена, не тупик на нуле результатов.
 * Не трогает БД напрямую — оркестрирует уже выполненные вызывающей стороной запросы, поэтому
 * не завязана на конкретную ZenStack-модель/поле.
 */
export async function orchestrateSearch<T>(
  params: OrchestrateSearchParams<T>,
): Promise<SearchOutcome<T>> {
  const { query, runSearch, threshold = DEFAULT_SEARCH_THRESHOLD, suggestFallback } = params

  const literal = await runSearch(query)

  if (literal.total >= threshold.minResults) {
    return { items: literal.items, usedQuery: query, literalQuery: query, wasCorrected: false }
  }

  const correctedQuery = correctKeyboardLayout(query)
  const shouldTryCorrected = correctedQuery !== query
  const corrected = shouldTryCorrected
    ? await runSearch(correctedQuery)
    : { items: [] as T[], total: 0 }

  const correctedIsBetter = shouldTryCorrected
    && corrected.total > 0
    && corrected.total >= literal.total * threshold.correctedMultiplier

  if (correctedIsBetter) {
    return {
      items: corrected.items,
      usedQuery: correctedQuery,
      literalQuery: query,
      wasCorrected: true,
    }
  }

  if (literal.total > 0) {
    return { items: literal.items, usedQuery: query, literalQuery: query, wasCorrected: false }
  }

  const fallbackSuggestions = suggestFallback ? await suggestFallback() : undefined
  return {
    items: [],
    usedQuery: query,
    literalQuery: query,
    wasCorrected: false,
    fallbackSuggestions,
  }
}
