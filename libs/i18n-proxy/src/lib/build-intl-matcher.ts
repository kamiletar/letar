/**
 * Имена metadata-роутов Next.js, которые генерируются из `icon.tsx`/`apple-icon.tsx`/
 * `opengraph-image.tsx`/`twitter-image.tsx` (и их `.png`/`.jpg`/`.svg`-аналогов) и отдаются
 * БЕЗ расширения в URL (кэш-бастинг — через query, не через имя файла). Правило "путь с точкой —
 * статика" (`.*\..*`) их не ловит — без явного перечисления next-intl middleware переписывает
 * такой путь в несуществующий локализованный (`/ru/apple-icon`) → 404.
 */
export const KNOWN_METADATA_ROUTE_STEMS = ['icon', 'apple-icon', 'opengraph-image', 'twitter-image'] as const

export type KnownMetadataRouteStem = (typeof KNOWN_METADATA_ROUTE_STEMS)[number]

export interface BuildIntlMatcherOptions {
  /** Доп. префиксы вне `[locale]`, которые должны миновать intl-middleware (api, trpc, admin, keystatic, ...) */
  excludePrefixes?: string[]
  /**
   * Metadata-роуты без расширения в URL, реально присутствующие в приложении вне `[locale]`
   * (обычно подмножество {@link KNOWN_METADATA_ROUTE_STEMS}) — перечисляются явно, а не
   * угадываются, чтобы не выдать пропуск в matcher как проверенный факт.
   */
  metadataRoutes?: string[]
}

/**
 * Строит `matcher` для `config` в `proxy.ts` next-intl-приложения — тот же паттерн, что был
 * вручную выведен в `apps/studio/src/proxy.ts` после разбора 404 на metadata-роутах.
 */
export function buildIntlMatcher(options: BuildIntlMatcherOptions = {}): string[] {
  const { excludePrefixes = [], metadataRoutes = [] } = options
  const excluded = [...excludePrefixes, ...metadataRoutes]
  const negativeLookahead = excluded.length > 0 ? `${excluded.join('|')}|` : ''

  return [`/((?!${negativeLookahead}.*\\..*).*)`, '/']
}
