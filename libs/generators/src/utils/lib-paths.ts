/**
 * Сборка `compilerOptions.paths` и `transpilePackages` нового приложения из `exports` библиотек.
 *
 * Захардкоженный список подпутей устаревает при первом же новом экспорте библиотеки, и
 * `scripts/check-lib-subpath-paths.mjs` краснеет у свежесгенерированного приложения (так было у
 * flora, 2026-09-26). Поэтому читаем `libs/<lib>/package.json` → `exports` с диска.
 *
 * ⚠️ Читаем реальный диск, а не виртуальный `Tree`: библиотек в Tree нет (в тестах он пустой), а
 * генератор всегда запускается из этого же монорепо. Без импортов `@letar/*` — см. шапку `ports.ts`.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** Библиотеки, которые шаблон приложения подключает по умолчанию (providers.tsx, layout.tsx, implicitDependencies). */
export const DEFAULT_APP_LIBS = [
  'chakra-provider',
  'ui',
  'analytics',
  'env-load',
  'forms',
  'forms-core',
  'forms-react',
] as const

/** `libs/` рядом с `libs/generators/src/utils/` */
const libsDir = fileURLToPath(new URL('../../../', import.meta.url))

type ExportTarget = string | Record<string, unknown> | null | undefined

/** Файл, на который указывает запись `exports`: условие `@letar/source` приоритетнее, как у `customConditions`. */
function resolveExportTarget(target: ExportTarget): string | undefined {
  if (typeof target === 'string') {
    return target
  }
  if (target && typeof target === 'object') {
    for (const condition of ['@letar/source', 'types', 'import', 'default']) {
      const value = target[condition]
      if (typeof value === 'string') {
        return value
      }
    }
  }
  return undefined
}

/** `paths` для одной библиотеки: `@letar/<lib>[/subpath]` → путь от `apps/<app>/`. */
export function buildLibPaths(lib: string, dir = libsDir): Record<string, string[]> {
  const pkg = JSON.parse(readFileSync(`${dir}${lib}/package.json`, 'utf-8')) as {
    name?: string
    exports?: Record<string, ExportTarget>
  }
  const alias = pkg.name ?? `@letar/${lib}`
  const result: Record<string, string[]> = {}

  for (const [exportKey, target] of Object.entries(pkg.exports ?? {})) {
    if (exportKey === './package.json') {
      continue
    }
    const file = resolveExportTarget(target)
    if (!file) {
      throw new Error(`libs/${lib}/package.json: у exports["${exportKey}"] нет пути к файлу`)
    }
    const key = exportKey === '.' ? alias : `${alias}${exportKey.slice(1)}`
    result[key] = [`../../libs/${lib}/${file.replace(/^\.\//, '')}`]
  }
  return result
}

/** Полный набор `paths` приложения: алиас `@/*` + все exports подключаемых библиотек. */
export function buildAppTsconfigPaths(libs: readonly string[] = DEFAULT_APP_LIBS, dir = libsDir) {
  const paths: Record<string, string[]> = { '@/*': ['./src/*'] }
  for (const lib of libs) {
    Object.assign(paths, buildLibPaths(lib, dir))
  }
  return paths
}

/** Список `transpilePackages` — базовые имена подключаемых библиотек без подпутей. */
export function buildTranspilePackages(libs: readonly string[] = DEFAULT_APP_LIBS): string[] {
  return libs.map((lib) => `@letar/${lib}`).sort()
}
