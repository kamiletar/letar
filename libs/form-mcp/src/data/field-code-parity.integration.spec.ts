import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { buildFieldRegistry } from './field-registry.js'
import { loadDocs } from './loader.js'

/**
 * Страж «код = fields.md»: список полей `@letar/forms` живёт в объектах `FormField` и
 * `FormDocument` (`libs/forms/src/lib/declarative/index.ts`), а описания — в `fields.md`, из
 * которого form-mcp строит `list_fields`/`get_field_props`/`get_field_example`. Тест сверяет
 * ключи кода и реестра в обе стороны, чтобы новое поле нельзя было добавить, забыв доки.
 *
 * Ключи берутся разбором исходника, а не импортом: form-mcp не должен тянуть React/Chakra.
 */
const repoRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..', '..')
const declarativeIndex = join(repoRoot, 'libs', 'forms', 'src', 'lib', 'declarative', 'index.ts')
const docsPath = join(repoRoot, 'libs', 'forms', 'docs')

/**
 * Ключи объектов, которые не являются полями. Сейчас пусто: кнопки (`Submit`, `Reset`) живут в
 * отдельном объекте `FormButton`, `List` — в `FormGroup`, их разбор не затрагивает. Если в
 * `FormField`/`FormDocument` появится служебный ключ — добавь его сюда с причиной «почему не поле».
 */
const NOT_FIELDS = new Set<string>()

/** Ключи верхнего уровня объекта `const <name> = { ... }` в исходнике */
function parseObjectKeys(source: string, name: string): string[] {
  const start = source.search(new RegExp(`const ${name} = \\{`))
  if (start === -1) {
    throw new Error(`объект ${name} не найден в ${declarativeIndex} — обнови разбор в field-code-parity`)
  }
  const body = source.slice(source.indexOf('{', start) + 1, source.indexOf('\n}', start))
  return [...body.matchAll(/^\s{2}(\w+):/gm)].map((m) => m[1])
}

const source = readFileSync(declarativeIndex, 'utf-8')
const codeFields = [...parseObjectKeys(source, 'FormField'), ...parseObjectKeys(source, 'FormDocument')]
  .filter((key) => !NOT_FIELDS.has(key))
const registry = buildFieldRegistry(loadDocs(docsPath).sections.fields)
const docNames = new Set([...registry.values()].map((f) => f.name))

describe('FormField/FormDocument в коде = таблицы fields.md', () => {
  it('разбор нашёл поля в коде (защита от сломанной регулярки)', () => {
    expect(codeFields.length).toBeGreaterThan(50)
  })

  it('каждое поле из кода описано в fields.md', () => {
    const missing = codeFields.filter((key) => !docNames.has(key))
    expect(
      missing,
      missing.map((key) =>
        `поле \`${key}\` есть в коде, но нет в libs/forms/docs/fields.md — добавь строку в таблицу нужной категории`
      ).join('\n'),
    ).toEqual([])
  })

  it('каждое поле из fields.md есть в коде', () => {
    const inCode = new Set(codeFields)
    const extra = [...docNames].filter((name) => !inCode.has(name))
    expect(
      extra,
      extra.map((name) =>
        `поле \`${name}\` описано в fields.md, но нет в FormField/FormDocument (libs/forms/src/lib/declarative/index.ts) — убери строку или добавь поле`
      ).join('\n'),
    ).toEqual([])
  })
})
