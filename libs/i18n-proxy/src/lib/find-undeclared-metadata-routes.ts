import { existsSync, readdirSync } from 'node:fs'

import { KNOWN_METADATA_ROUTE_STEMS, type KnownMetadataRouteStem } from './build-intl-matcher'

const METADATA_FILE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js', '.png', '.jpg', '.jpeg', '.svg', '.ico']

/**
 * Node-only проверка (fs), рассчитанная на unit-тест приложения, а не на runtime Edge-прокси —
 * `proxy.ts` под next-intl исполняется в Edge Runtime, где `fs` недоступен.
 *
 * Сканирует каталог `src/app` приложения на файлы вида `icon.tsx`/`apple-icon.png`/... на верхнем
 * уровне (вне `[locale]`) и сверяет найденное с тем, что передано в {@link buildIntlMatcher} через
 * `metadataRoutes`. Возвращает имена роутов, которые физически существуют, но не перечислены явно —
 * то есть matcher их пропускает, и next-intl middleware даст на них 404.
 */
export function findUndeclaredMetadataRoutes(
  appDir: string,
  declaredRoutes: readonly string[],
): KnownMetadataRouteStem[] {
  const entries = existsSync(appDir) ? readdirSync(appDir) : []
  const found = new Set<KnownMetadataRouteStem>()

  for (const entry of entries) {
    for (const stem of KNOWN_METADATA_ROUTE_STEMS) {
      if (entry === stem || METADATA_FILE_EXTENSIONS.some((ext) => entry === `${stem}${ext}`)) {
        found.add(stem)
      }
    }
  }

  return [...found].filter((stem) => !declaredRoutes.includes(stem))
}
