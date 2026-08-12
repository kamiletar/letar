import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { buildFieldRegistry, getFields } from './field-registry.js'
import { loadDocs } from './loader.js'

/**
 * Реальный `docsPath` — не мок. Ловит класс регрессии из бэклога PLAN.md
 * («list_fields отдаёт 49 вместо 56 полей»): рассинхрон между новыми полями
 * в коде и их описанием в `fields.md`, от которого зависят все три MCP-тула
 * (`list_fields`/`get_field_props`/`get_field_example`).
 */
const docsPath = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..', 'forms', 'docs')

describe('buildFieldRegistry — реальный fields.md', () => {
  const docs = loadDocs(docsPath)
  const registry = buildFieldRegistry(docs.sections.fields)

  it('загружает fields.md из libs/forms/docs (не пустой список секций)', () => {
    expect(docs.sections.fields.length).toBeGreaterThan(0)
  })

  it.each([
    'Phone',
    'MaskedInput',
    'CreditCard',
    'INN',
    'KPP',
    'OGRN',
    'SNILS',
    'BIK',
    'BankAccount',
    'CorrAccount',
    'Passport',
    'ForeignPassport',
    'DepartmentCode',
    'BirthCertificate',
  ])('поле движка масок "%s" присутствует в реестре', (name) => {
    expect(registry.has(name.toLowerCase())).toBe(true)
  })

  it('документные поля отнесены к категории document', () => {
    const documentFields = getFields(registry, 'document')
    const names = documentFields.map((f) => f.name)
    expect(names).toEqual(
      expect.arrayContaining([
        'INN',
        'KPP',
        'OGRN',
        'SNILS',
        'BIK',
        'BankAccount',
        'CorrAccount',
        'Passport',
        'ForeignPassport',
        'DepartmentCode',
        'BirthCertificate',
      ]),
    )
  })
})
