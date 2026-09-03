// globals: true в vitest.config.mts — describe, expect, it доступны глобально
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Сторож на рецидив: QueryClient создаётся ОДИН раз на монтирование провайдера.
 *
 * Голый `const queryClient = createQueryClient(config)` в теле компонента выглядит безобидно и
 * не ловится ни typecheck, ни lint, ни глазом на скриншоте — но выдаёт новый клиент на каждый
 * ре-рендер провайдера. Вместе с клиентом обнуляется кеш и рвётся связь с уже запущенными
 * мутациями: их `setQueryData`/`invalidateQueries` попадают в выброшенный клиент, а
 * смонтированные `useQuery` читают пустой новый.
 *
 * Провайдер стоит в layout, поэтому его перерисовывает любая мягкая навигация и любой
 * `revalidatePath` из server action — то есть на практике это происходит после каждого действия
 * пользователя. Снаружи баг выглядит как «первое действие применилось, а следующие молча не
 * доехали до экрана», хотя сервер отработал все (studio, `/owner/time`, 2026-09-03).
 *
 * Тест читает исходники, а не рендерит компоненты: у библиотеки окружение `node` без jsdom, а
 * проверяется здесь именно форма кода, которая и является регрессией.
 */

const LIB_DIR = dirname(fileURLToPath(import.meta.url))

/** Фабрики, результат которых обязан пережить ре-рендер. */
const STATEFUL_FACTORIES = ['createQueryClient', 'createIDBPersister']

function providerSources(): { file: string; source: string }[] {
  return readdirSync(LIB_DIR)
    .filter((f) => f.endsWith('-provider.tsx'))
    .map((file) => ({ file, source: readFileSync(join(LIB_DIR, file), 'utf8') }))
}

describe('стабильность клиента между ре-рендерами', () => {
  it('в библиотеке есть провайдеры для проверки', () => {
    expect(providerSources().length).toBeGreaterThan(0)
  })

  for (const factory of STATEFUL_FACTORIES) {
    it(`${factory}() вызывается только внутри ленивого инициализатора useState`, () => {
      const offenders: string[] = []

      for (const { file, source } of providerSources()) {
        source.split('\n').forEach((line, index) => {
          const code = line.trim()
          // Комментарии называют фабрику по имени (в том числе объясняя саму ловушку) — не находки.
          if (code.startsWith('//') || code.startsWith('*') || code.startsWith('/*')) {
            return
          }
          if (!line.includes(`${factory}(`)) {
            return
          }
          // Разрешена ровно одна форма: `const [x] = useState(() => factory(...))`.
          // Строки импорта и типов сюда не попадают — в них нет круглой скобки после имени.
          if (line.includes(`useState(() => ${factory}(`)) {
            return
          }
          offenders.push(`${file}:${index + 1} — ${line.trim()}`)
        })
      }

      expect(offenders, `оберни в useState(() => ...):\n${offenders.join('\n')}`).toEqual([])
    })
  }
})
