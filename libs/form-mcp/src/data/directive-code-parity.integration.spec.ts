import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { buildDirectiveRegistry } from './directive-registry.js'
import { loadDocs } from './loader.js'

/**
 * Страж «плагин = get_directives»: набор ключей `@meta("form.*", …)`, которые читает
 * `zenstack-form-plugin`, задан константой `KNOWN_FORM_DIRECTIVE_KEYS` в его `parser.ts`
 * (источник правды, она же питает детектор опечаток). Тест сверяет её с реестром директив
 * form-mcp в обе стороны. Константа не экспортируется — берём разбором исходника, чтобы
 * form-mcp не зависел от плагина.
 */
const repoRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..', '..')
const parserPath = join(repoRoot, 'libs', 'zenstack-form-plugin', 'src', 'parser.ts')
const docsPath = join(repoRoot, 'libs', 'forms', 'docs')

function parsePluginKeys(): string[] {
  const source = readFileSync(parserPath, 'utf-8')
  const match = source.match(/const KNOWN_FORM_DIRECTIVE_KEYS = new Set\(\[([\s\S]*?)\]\)/)
  if (!match) {
    throw new Error(`KNOWN_FORM_DIRECTIVE_KEYS не найдена в ${parserPath} — обнови разбор в directive-code-parity`)
  }
  return [...match[1].matchAll(/'(\w+)'/g)].map((m) => m[1])
}

const pluginKeys = parsePluginKeys()
/** Первый сегмент metaKey: `form.props.<dotpath>` → `props` */
const mcpKeys = [...buildDirectiveRegistry(loadDocs(docsPath).sections.zenstack).values()]
  .map((d) => d.metaKey.split('.')[1])

describe('директивы плагина = get_directives form-mcp', () => {
  it('разбор нашёл ключи плагина (защита от сломанной регулярки)', () => {
    expect(pluginKeys.length).toBeGreaterThan(5)
  })

  it('каждый ключ плагина описан в directive-registry.ts', () => {
    const missing = pluginKeys.filter((key) => !mcpKeys.includes(key))
    expect(
      missing,
      missing.map((key) =>
        `ключ \`form.${key}\` читает плагин (parser.ts), но get_directives его не знает — добавь запись в KNOWN_DIRECTIVES (libs/form-mcp/src/data/directive-registry.ts)`
      ).join('\n'),
    ).toEqual([])
  })

  it('каждая директива MCP читается плагином', () => {
    const extra = mcpKeys.filter((key) => !pluginKeys.includes(key))
    expect(
      extra,
      extra.map((key) =>
        `get_directives отдаёт \`form.${key}\`, но плагин его не читает — убери запись из KNOWN_DIRECTIVES или добавь ключ в KNOWN_FORM_DIRECTIVE_KEYS`
      ).join('\n'),
    ).toEqual([])
  })
})
