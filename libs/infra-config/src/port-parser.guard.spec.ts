/**
 * Guard-тест: регулярки разбора dev-портов не должны разъезжаться между двумя копиями парсера.
 *
 * `ENV_PORT_PATTERN` и `CLI_PORT_PATTERN` продублированы в `libs/generators/src/utils/ports.ts`
 * (поверх виртуального Nx `Tree`) и в `app-ports.ts` рядом (поверх реального диска). Схлопнуть
 * их в один модуль нельзя — проверено запуском, разбор причины в PLAN-INFRA.md §34.2 п.4:
 * `libs/generators` грузится как Nx-плагин и любой импорт `@letar/*` роняет генератор в рантайме.
 *
 * До этого теста синхронность держалась на комментарии «меняй оба файла». Тест переводит её в
 * проверяемое утверждение — тем же приёмом, которым `infra-config` уже сторожит локальную копию
 * `server-config.ts` в `dashboard-agent`.
 *
 * ⚠️ Сравнение ТЕКСТОМ, а не импортом: `@letar/generators` отсюда не импортируется по той же
 * причине, по которой генератор не импортирует `@letar/infra-config` — в воркспейсе нет
 * `node_modules/@letar/`. Тот же приём применён в `app-ports.ts` к `seed.ts` Ключницы.
 *
 * ⚠️ Границы диапазона портов НЕ сверяются намеренно. Они записаны в двух файлах по-разному:
 * в `generators` `MIN_DEV_PORT` = 3001 — это нижняя граница ВЫДАЧИ порта новому приложению, а
 * нижняя граница РАЗБОРА там зашита литералом 3000; здесь же `MIN_DEV_PORT` = 3000 и означает
 * именно границу разбора. Наивная сверка одноимённых констант дала бы ложное падение.
 *
 * ⚠️ Тело `extractPorts` тоже не сверяется: нормализованное сравнение исходников ломается от
 * правки комментариев и форматирования. Дрейф самой функции этот тест не поймает — известный
 * пробел, а не упущение.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { findWorkspaceRoot } from './app-ports'

/** Регулярки, которые обязаны совпадать посимвольно (вместе с флагами). */
const SHARED_PATTERNS = ['ENV_PORT_PATTERN', 'CLI_PORT_PATTERN'] as const

/** Копии парсера: путь от корня воркспейса. Ключ — как называть файл в тексте падения. */
const COPIES = {
  'infra-config': join('libs', 'infra-config', 'src', 'app-ports.ts'),
  generators: join('libs', 'generators', 'src', 'utils', 'ports.ts'),
} as const

const workspaceRoot = findWorkspaceRoot()

/**
 * Литерал регулярки, присвоенной константе `name` — вместе с флагами, как записано в исходнике.
 *
 * Тело литерала разбирается с учётом экранирования (`\d`, `\w`) и символьных классов (`[ \t]`,
 * `[\w-]`), иначе `-` и `]` внутри класса обрывают разбор раньше времени.
 */
function readPatternLiteral(source: string, name: string): string | undefined {
  const body = String.raw`(?:[^/\\\n[]|\\.|\[(?:[^\]\\]|\\.)*\])+`
  const declaration = new RegExp(String.raw`\bconst\s+${name}\s*=\s*(/${body}/[a-z]*)`)
  return source.match(declaration)?.[1]
}

const sources = Object.fromEntries(
  Object.entries(COPIES).map(([label, relativePath]) => [
    label,
    readFileSync(join(workspaceRoot, relativePath), 'utf-8'),
  ])
) as Record<keyof typeof COPIES, string>

describe('сверка парсера dev-портов между копиями', () => {
  it.each(SHARED_PATTERNS)('%s совпадает в обеих копиях', (name) => {
    const found = Object.entries(sources).map(([label, source]) => ({
      label,
      file: COPIES[label as keyof typeof COPIES],
      literal: readPatternLiteral(source, name),
    }))

    // Защита от молчаливо зелёного теста: константу переименовали/удалили — падаем здесь,
    // а не проходим на сравнении двух undefined.
    for (const { file, literal } of found) {
      expect(
        literal,
        `\nВ ${file} не найдена константа ${name}.\n\n` +
          'Либо её переименовали — поправь SHARED_PATTERNS в этом тесте,\n' +
          'либо парсер переехал — поправь COPIES.\n'
      ).toBeDefined()
    }

    const [first, second] = found
    expect(
      second?.literal,
      `\n${name} разъехался между копиями парсера:\n\n` +
        `  ${first?.file}\n    ${first?.literal}\n\n` +
        `  ${second?.file}\n    ${second?.literal}\n\n` +
        'Приведи обе копии к одному виду. Схлопнуть их в один модуль нельзя —\n' +
        'причина в PLAN-INFRA.md §34.2 п.4 (Nx-плагин не может импортировать @letar/*).\n'
    ).toBe(first?.literal)
  })
})
