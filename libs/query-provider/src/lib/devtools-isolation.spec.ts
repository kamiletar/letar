// globals: true в vitest.config.mts — describe, expect, it доступны глобально
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Сторож на рецидив: девтулзы обязаны подключаться ровно из одного модуля.
 *
 * Любой второй путь к `@tanstack/react-devtools` в этой библиотеке валит production-сборку всех
 * её потребителей разом (`'use' is not exported from 'solid-js/web'`) — резолв импортов идёт
 * серверным компилятором независимо от `dynamic(ssr: false)` и от рантайм-флага `showDevtools`.
 * Баг возвращался трижды (driving-school 2026-08-14, studio 2026-08-26 и 2026-09-03), потому что
 * выглядит починенным на dev, при зелёных lint/typecheck/тестах. Разбор —
 * `.claude/docs/nextjs-dynamic-ssr-false-still-server-compiled.md`.
 *
 * Тест намеренно читает исходники, а не импортирует их: проверяется форма графа модулей, которую
 * видит бандлер, а не поведение в рантайме — именно её и ломает регрессия.
 */

const LIB_DIR = dirname(fileURLToPath(import.meta.url))

/** Единственный модуль, которому можно тянуть девтулзы, и его ленивая обёртка. */
const ALLOWED = new Set(['devtools-panel.tsx', 'devtools-panel-lazy.tsx'])

/** Признаки подключения девтулзов, которые бандлер обязан увидеть на этапе резолва. */
const DEVTOOLS_IMPORT = /from\s+'(@tanstack\/(react-)?(devtools|form-devtools|react-devtools)[^']*|\.\/devtools-panel)'/
const DEVTOOLS_DYNAMIC_IMPORT = /import\(\s*'\.\/devtools-panel'/

const sourceFiles = readdirSync(LIB_DIR).filter((f) =>
  /\.tsx?$/.test(f) && !f.endsWith('.spec.ts') && !f.endsWith('.spec.tsx')
)

describe('изоляция devtools в одном модуле', () => {
  it('находит исходники библиотеки (иначе тест зелёный вхолостую)', () => {
    expect(sourceFiles.length).toBeGreaterThan(3)
    expect(sourceFiles).toContain('devtools-panel-lazy.tsx')
  })

  it.each(sourceFiles.filter((f) => !ALLOWED.has(f)))('%s не подключает devtools напрямую', (file) => {
    const source = readFileSync(join(LIB_DIR, file), 'utf-8')

    expect(DEVTOOLS_IMPORT.test(source), `${file} импортирует devtools в обход devtools-panel-lazy.tsx`).toBe(false)
    expect(DEVTOOLS_DYNAMIC_IMPORT.test(source), `${file} тянет ./devtools-panel через dynamic import`).toBe(false)
  })

  it('вырезание из production-сборки завязано на литерал process.env.NODE_ENV на верхнем уровне', () => {
    const source = readFileSync(join(LIB_DIR, 'devtools-panel-lazy.tsx'), 'utf-8')

    // Внутри функции/компонента то же сравнение стало бы рантайм-проверкой и модуль из графа
    // не убрало бы — условие обязано стоять на верхнем уровне модуля.
    expect(source).toMatch(/^export const DevtoolsPanel = process\.env\.NODE_ENV === 'production'/m)
  })
})
