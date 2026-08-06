import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  collectEnumTranslations,
  collectModelTranslations,
  generateI18nFiles,
  getValidationTranslations,
} from './i18n-generator.js'
import type { EnumInfo, I18nConfig, I18nTranslations, ModelInfo, ValidationTranslations } from './types.js'

describe('collectModelTranslations', () => {
  it('собирает title/placeholder/description для полей модели', () => {
    const models: ModelInfo[] = [
      {
        name: 'Product',
        excludedFields: [],
        fields: [
          {
            name: 'name',
            type: 'String',
            isRequired: true,
            isList: false,
            isEnum: false,
            formMeta: { title: 'Название', placeholder: 'Введите название' },
          },
          {
            name: 'price',
            type: 'Float',
            isRequired: true,
            isList: false,
            isEnum: false,
            formMeta: { description: 'Цена в рублях' },
          },
        ],
      },
    ]

    const translations = collectModelTranslations(models)

    expect(translations).toEqual({
      Product: {
        name: { title: 'Название', placeholder: 'Введите название' },
        price: { description: 'Цена в рублях' },
      },
    })
  })

  it('пропускает поля без title/placeholder/description', () => {
    const models: ModelInfo[] = [
      {
        name: 'Product',
        excludedFields: [],
        fields: [
          { name: 'id', type: 'String', isRequired: true, isList: false, isEnum: false, formMeta: {} },
        ],
      },
    ]

    expect(collectModelTranslations(models)).toEqual({})
  })

  it('пропускает модели, у которых ни у одного поля нет переводимых свойств', () => {
    const models: ModelInfo[] = [
      { name: 'Empty', excludedFields: [], fields: [] },
    ]
    expect(collectModelTranslations(models)).toEqual({})
  })
})

describe('collectEnumTranslations', () => {
  it('собирает label для каждого значения enum', () => {
    const enums: EnumInfo[] = [
      { name: 'RecipeType', values: [{ name: 'SWEET', label: 'Сладкий' }, { name: 'SALTY', label: 'Солёный' }] },
    ]

    expect(collectEnumTranslations(enums)).toEqual({
      RecipeType: {
        SWEET: { label: 'Сладкий' },
        SALTY: { label: 'Солёный' },
      },
    })
  })

  it('обрабатывает несколько enum одновременно', () => {
    const enums: EnumInfo[] = [
      { name: 'A', values: [{ name: 'X', label: 'X-label' }] },
      { name: 'B', values: [{ name: 'Y', label: 'Y-label' }] },
    ]

    const result = collectEnumTranslations(enums)
    expect(Object.keys(result)).toEqual(['A', 'B'])
  })
})

describe('getValidationTranslations', () => {
  it('возвращает встроенные переводы для en', () => {
    const translations = getValidationTranslations('en')
    expect(translations.required).toBe('Required field')
  })

  it('возвращает встроенные переводы для ru', () => {
    const translations = getValidationTranslations('ru')
    expect(translations.required).toBe('Обязательное поле')
  })

  it('падает обратно на en для неизвестной локали без кастомных переводов', () => {
    const translations = getValidationTranslations('fr')
    expect(translations.required).toBe('Required field')
  })

  it('предпочитает кастомные переводы встроенным', () => {
    const custom: Record<string, ValidationTranslations> = {
      en: { ...getValidationTranslations('en'), required: 'Custom required message' },
    }
    const translations = getValidationTranslations('en', custom)
    expect(translations.required).toBe('Custom required message')
  })

  it('падает обратно на встроенные, если кастомный словарь не содержит локаль', () => {
    const custom: Record<string, ValidationTranslations> = {
      fr: { ...getValidationTranslations('en'), required: 'Requis' },
    }
    const translations = getValidationTranslations('ru', custom)
    expect(translations.required).toBe('Обязательное поле')
  })
})

describe('generateI18nFiles', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'zenstack-form-plugin-i18n-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  const translations: I18nTranslations = {
    models: { Product: { name: { title: 'Название' } } },
    enums: { RecipeType: { SWEET: { label: 'Сладкий' } } },
  }

  it('пишет по одному JSON-файлу на локаль с моделями/enum/validation', async () => {
    const config: I18nConfig = {
      enabled: true,
      output: './messages',
      defaultLocale: 'en',
      locales: ['en', 'ru'],
    }

    await generateI18nFiles(translations, config, dir)

    const en = JSON.parse(await readFile(join(dir, 'messages', 'en.json'), 'utf-8'))
    expect(en.Product.name.title).toBe('Название')
    expect(en.RecipeType.SWEET.label).toBe('Сладкий')
    expect(en.validation.required).toBe('Required field')
  })

  it('генерирует keys.ts с типом FormI18nKey', async () => {
    const config: I18nConfig = {
      enabled: true,
      output: './messages',
      defaultLocale: 'en',
      locales: ['en'],
    }

    await generateI18nFiles(translations, config, dir)

    const keys = await readFile(join(dir, 'messages', 'keys.ts'), 'utf-8')
    expect(keys).toContain('export type FormI18nKey =')
    expect(keys).toContain(`'Product.name.title'`)
    expect(keys).toContain(`'RecipeType.SWEET.label'`)
    expect(keys).toContain(`'validation.required'`)
  })

  it('не-дефолтная локаль при первом запуске создаётся с пустыми строками (плейсхолдер)', async () => {
    const config: I18nConfig = {
      enabled: true,
      output: './messages',
      defaultLocale: 'en',
      locales: ['en', 'ru'],
    }

    await generateI18nFiles(translations, config, dir)

    const ru = JSON.parse(await readFile(join(dir, 'messages', 'ru.json'), 'utf-8'))
    expect(ru.Product.name.title).toBe('')
    expect(ru.validation.required).toBe('')
  })

  it('дефолтная локаль перезаписывается полностью (источник истины) при повторной генерации', async () => {
    const config: I18nConfig = {
      enabled: true,
      output: './messages',
      defaultLocale: 'en',
      locales: ['en'],
    }

    await generateI18nFiles(translations, config, dir)

    const changedTranslations: I18nTranslations = {
      models: { Product: { name: { title: 'Новое название' } } },
      enums: {},
    }
    await generateI18nFiles(changedTranslations, config, dir)

    const en = JSON.parse(await readFile(join(dir, 'messages', 'en.json'), 'utf-8'))
    expect(en.Product.name.title).toBe('Новое название')
    expect(en.RecipeType).toBeUndefined()
  })

  it('не-дефолтная локаль сохраняет существующие переводы при повторной генерации (merge)', async () => {
    const config: I18nConfig = {
      enabled: true,
      output: './messages',
      defaultLocale: 'en',
      locales: ['en', 'ru'],
    }

    // Первый запуск создаёт пустой ru.json
    await generateI18nFiles(translations, config, dir)

    // Кто-то вручную заполнил перевод
    const ruPath = join(dir, 'messages', 'ru.json')
    const ru = JSON.parse(await readFile(ruPath, 'utf-8'))
    ru.Product.name.title = 'Заполненный вручную перевод'
    await writeFile(ruPath, JSON.stringify(ru, null, 2))

    // Повторная генерация с тем же набором ключей должна сохранить перевод
    await generateI18nFiles(translations, config, dir)

    const merged = JSON.parse(await readFile(ruPath, 'utf-8'))
    expect(merged.Product.name.title).toBe('Заполненный вручную перевод')
  })

  it('не-дефолтная локаль удаляет устаревшие ключи при merge', async () => {
    const config: I18nConfig = {
      enabled: true,
      output: './messages',
      defaultLocale: 'en',
      locales: ['en', 'ru'],
    }

    await generateI18nFiles(translations, config, dir)

    const ruPath = join(dir, 'messages', 'ru.json')
    const ru = JSON.parse(await readFile(ruPath, 'utf-8'))
    ru.Product.name.title = 'Название по-русски'
    await writeFile(ruPath, JSON.stringify(ru, null, 2))

    // Следующая генерация без поля enums.RecipeType — устаревший ключ должен исчезнуть
    const shrunkTranslations: I18nTranslations = {
      models: { Product: { name: { title: 'Name' } } },
      enums: {},
    }
    await generateI18nFiles(shrunkTranslations, config, dir)

    const merged = JSON.parse(await readFile(ruPath, 'utf-8'))
    expect(merged.Product.name.title).toBe('Название по-русски')
    expect(merged.RecipeType).toBeUndefined()
  })
})
