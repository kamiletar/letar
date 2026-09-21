/**
 * Актуальный `BUILD_ON_S1_APPS` на момент вызова — без рестарта процесса MCP.
 *
 * Зачем. `letar.ts` один раз импортирует `server.ts`, а тот — `@letar/infra-config`; массив
 * `BUILD_ON_S1_APPS` вычисляется при первом импорте и живёт в памяти до перезапуска сессии. Когда
 * приложение добавляют в список (пилоты §157 PLAN-INFRA-6.md), уже запущенный процесс про него не
 * знает: `deploy_app` уходит на s2 и собирает образ на прод-хосте вместо s1. Обнаружено 2026-09-22
 * на mandala (пилот 3): deploy-agent-dev сверял время старта процесса со временем коммита и
 * останавливал деплой до перезапуска сессии — так уже случалось в пилотах 1–3.
 *
 * Как. Файл `libs/infra-config/src/index.ts` читается текстом при КАЖДОМ production-деплое и
 * массив разбирается сканером литералов — не `import()` с cache-busting: у Bun (рантайм `letar.ts`)
 * и у vite-node (тесты) разная семантика кеша модулей по query-строке, а чтение файла даёт одно
 * поведение везде и не копит в памяти по экземпляру модуля на каждую правку.
 *
 * ⛔ Никакого «слепого» fallback на s2: если файл не прочитан или массив записан не литералом
 * строк, функция БРОСАЕТ — `deploy_app` отказывает с текстом причины. Молча подставить прежний
 * список из памяти значило бы вернуть ровно тот баг, который здесь чинится.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Файл, из которого процесс получил `@letar/infra-config` (workspace-симлинк ведёт в
 * `libs/infra-config/src/index.ts`). Путь от расположения этого модуля, а не от `REPO_ROOT`:
 * читается тот же файл, что импортирован, даже если процесс запущен не из корня репозитория.
 */
export const INFRA_CONFIG_SOURCE = fileURLToPath(new URL('../../infra-config/src/index.ts', import.meta.url))

/** Допустимое имя приложения — то же ограничение, что у аргумента `app` в `deploy_app`. */
const APP_NAME = /^[a-z0-9-]+$/

/**
 * Токены внутри `[ ... ]`: пробелы, комментарии, запятая, строка в кавычках без escape-символов
 * либо закрывающая скобка. Любой другой символ (идентификатор, `...spread`, шаблонная строка,
 * вложенный вызов) — не литерал, и разбор отказывает, а не гадает. Флаг `y` — каждый токен обязан
 * начинаться ровно там, где закончился предыдущий, пропусков «мусора» между ними нет.
 */
const ARRAY_TOKEN = /\s+|\/\/[^\n]*|\/\*[\s\S]*?\*\/|,|'([^'\\\n]*)'|"([^"\\\n]*)"|(\])/gy

/**
 * Достаёт строковые элементы из `export const <name>[: тип] = [ 'a', 'b' ]` в исходнике TS.
 * Бросает, если объявление не найдено или массив не является литералом строк допустимых имён.
 */
export function parseStringArrayConst(source: string, name: string): string[] {
  if (!/^\w+$/.test(name)) {
    throw new Error(`недопустимое имя константы "${name}"`)
  }
  const declaration = source.match(new RegExp(`export\\s+const\\s+${name}\\s*(?::[^=]+)?=\\s*\\[`))
  if (declaration?.index === undefined) {
    throw new Error(`объявление "export const ${name} = [...]" не найдено`)
  }

  const start = declaration.index + declaration[0].length
  const items: string[] = []
  let consumed = start
  for (const token of source.slice(start).matchAll(ARRAY_TOKEN)) {
    consumed = start + token.index + token[0].length
    if (token[3] !== undefined) {
      return items
    }
    const value = token[1] ?? token[2]
    if (value !== undefined) {
      if (!APP_NAME.test(value)) {
        throw new Error(`${name}: "${value}" не похоже на имя приложения (ожидается [a-z0-9-]+)`)
      }
      items.push(value)
    }
  }

  const snippet = source.slice(consumed, consumed + 40).replace(/\s+/g, ' ')
  throw new Error(
    `${name} записан не литералом строк (или не закрыт) — разбор остановился на «${snippet}». `
      + "Массив должен оставаться литералом: ['app-a', 'app-b'], без spread и вычислений.",
  )
}

/** Читает актуальный `BUILD_ON_S1_APPS` из файла (при каждом вызове — без кеша). */
export function readBuildOnS1Apps(path: string = INFRA_CONFIG_SOURCE): string[] {
  let source: string
  try {
    source = readFileSync(path, 'utf8')
  } catch (err) {
    throw new Error(`не удалось прочитать ${path}: ${err instanceof Error ? err.message : String(err)}`, { cause: err })
  }
  return parseStringArrayConst(source, 'BUILD_ON_S1_APPS')
}
