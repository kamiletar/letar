import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Строит Vite `resolve.alias` для всех подпутей `@letar/forms-core`, читая их из `exports`
 * пакета — используется в `vitest.config.ts` пакетов, зависящих от исходников forms-core
 * напрямую (forms, forms-react, forms-shadcn).
 *
 * Реализация лежит прямо в этом файле, а не в отдельном `vitest-alias.ts` с реэкспортом из
 * `index.ts` — `vitest.config.ts` резолвится нативным Node-загрузчиком Nx (не бандлером Vite),
 * который не умеет extensionless относительные импорты внутри `.ts`-модуля, полученного через
 * bare-специфайер пакета. Прямой импорт без промежуточного реэкспорта эту ловушку обходит.
 *
 * @param formsCoreDir — абсолютный путь до `libs/forms-core` (обычно `resolve(__dirname, '../forms-core')`)
 */
export function buildFormsCoreAlias(formsCoreDir: string): Record<string, string> {
  const formsCoreExports = JSON.parse(readFileSync(resolve(formsCoreDir, 'package.json'), 'utf-8'))
    .exports

  // Vite/rollup-plugin-alias матчит объектные алиасы по префиксу, первый подошедший выигрывает —
  // bare-ключ `@letar/forms-core` ОБЯЗАН сортироваться после каждого подпути, иначе он
  // перехватывает `/schema`, `/uikit` и т.д. до того, как очередь доходит до их собственной
  // (более специфичной) записи. `exports` перечисляет `.` первым, поэтому сортируем по длине
  // ключа по убыванию, а не полагаемся на порядок `Object.entries`.
  return Object.fromEntries(
    Object.entries(formsCoreExports)
      .filter(([subpath]) => subpath !== './package.json')
      .map(([subpath, target]) => [
        subpath === '.' ? '@letar/forms-core' : `@letar/forms-core${subpath.slice(1)}`,
        resolve(formsCoreDir, (target as Record<string, string>)['@letar/source']),
      ])
      .sort(([a], [b]) => b.length - a.length),
  )
}
