import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { buildIntlMatcher, findUndeclaredMetadataRoutes } from '@letar/i18n-proxy'
import { describe, expect, it } from 'vitest'

describe('proxy matcher', () => {
  it('перечисляет все metadata-роуты приложения явно (иначе next-intl middleware даст на них 404)', () => {
    const appDir = join(__dirname, 'app')
    // должно совпадать с metadataRoutes в proxy.ts
    const declared = ['icon']

    expect(findUndeclaredMetadataRoutes(appDir, declared)).toEqual([])
  })

  it('литерал matcher в proxy.ts не разошёлся с опциями buildIntlMatcher', () => {
    // config.matcher в proxy.ts ОБЯЗАН быть литералом (Next.js статически парсит его AST без
    // исполнения модуля, вызов функции не поддерживает — см. комментарий в proxy.ts). Импорт
    // самого proxy.ts сюда невозможен: он тянет next-intl/middleware → next/server, который в
    // vitest-окружении этого приложения не резолвится. Поэтому сверяем pattern-строку текстом
    // файла (только regex-извлечение готовой строки, без исполнения кода), не импортом модуля.
    const source = readFileSync(join(__dirname, 'proxy.ts'), 'utf-8')
    const match = source.match(/matcher:\s*\[\s*'((?:[^'\\]|\\.)*)'/)
    if (!match) { throw new Error('Не удалось найти литерал config.matcher в proxy.ts') }
    const actualPattern = match[1].replaceAll('\\\\', '\\')

    const [expectedPattern] = buildIntlMatcher({
      excludePrefixes: ['api', '_next', '_vercel'],
      metadataRoutes: ['icon'],
    })

    expect(actualPattern).toBe(expectedPattern)
  })
})
