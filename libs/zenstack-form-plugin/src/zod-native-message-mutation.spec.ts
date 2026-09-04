import { ZodUtils } from '@zenstackhq/zod'
import { describe, expect, it } from 'vitest'
import { z } from 'zod/v4'

/**
 * Canary-тест на недокументированный контракт Zod v4 + `@zenstackhq/zod`, на котором держится
 * message-i18n (`applyNativeMessages`, эмитится инлайн в `generateModelCode`, `model-generator.ts`).
 * `ZodUtils.*` не читает `message` ни в одном `case`-ветвлении (см. `node_modules/@zenstackhq/zod/
 * dist/index.mjs`) — единственный способ подставить кастомный текст ошибки найден живым прогоном,
 * не документацией: мутация `check._zod.def.error` ПОСЛЕ того, как `ZodUtils.*` построил схему.
 *
 * Оба поля (`_zod.def.checks`, `_zod.def.error`) — внутренние, не публичный API Zod. Апгрейд
 * зависимостей может их переименовать/переструктурировать без записи в changelog как breaking
 * change (это internals). Если этот файл красный после `bun update` — значит подмена сообщений
 * молча перестала работать, чинить `model-generator.ts` (`applyNativeMessages`,
 * `deriveNativeCheckCount`, `NATIVE_ATTRS_REQUIRING_ARG`) под новую форму `_zod.def`, не просто
 * скипать тест.
 *
 * Копия рантайм-хелпера ниже — намеренный дубль эмитимой строки из `model-generator.ts`
 * (`applyNativeMessages`), а не импорт: сгенерированный код — самодостаточный файл без
 * зависимости от `@letar/zenstack-form-plugin` в рантайме, поэтому и его канарейка должна
 * воспроизводить ровно то, что окажется в файле пользователя, а не вызывать внутренности плагина.
 */
function applyNativeMessages<T extends z.ZodTypeAny>(
  schema: T,
  entries: Array<{ count: number; message?: string }>,
): T {
  const checks = (schema as unknown as { _zod?: { def?: { checks?: unknown[] } } })._zod?.def?.checks
  if (!Array.isArray(checks)) {
    return schema
  }
  let index = 0
  for (const entry of entries) {
    for (let i = 0; i < entry.count; i++) {
      const check = checks[index] as { _zod?: { def?: { error?: unknown } } } | undefined
      if (check?._zod?.def && entry.message !== undefined) {
        check._zod.def.error = () => entry.message
      }
      index++
    }
  }
  return schema
}

function firstIssueMessage(schema: z.ZodTypeAny, input: unknown): string | undefined {
  const result = schema.safeParse(input)
  return result.success ? undefined : result.error.issues[0]?.message
}

describe('canary: _zod.def.checks — порядок push совпадает с порядком attrs, переданных в ZodUtils.*', () => {
  it('ZodUtils.addStringValidation: @length(min,max) даёт 2 checks (min_length, затем max_length)', () => {
    const schema = ZodUtils.addStringValidation(z.string(), [
      {
        name: '@length',
        args: [{ name: 'min', value: { kind: 'literal', value: 2 } }, {
          name: 'max',
          value: { kind: 'literal', value: 5 },
        }],
      },
    ])
    const checks = (schema as unknown as { _zod: { def: { checks: Array<{ _zod: { def: { check: string } } }> } } })
      ._zod.def.checks
    expect(checks.map((c) => c._zod.def.check)).toEqual(['min_length', 'max_length'])
  })

  it('ZodUtils.addStringValidation: @email/@url/@regex дают ровно 1 check каждый (string_format)', () => {
    const schema = ZodUtils.addStringValidation(z.string(), [
      { name: '@email' },
      { name: '@url' },
      { name: '@regex', args: [{ name: 'regex', value: { kind: 'literal', value: '^[A-Z]+$' } }] },
    ])
    const checks = (schema as unknown as { _zod: { def: { checks: unknown[] } } })._zod.def.checks
    expect(checks).toHaveLength(3)
  })

  it('ZodUtils.addNumberValidation: @gte/@gt/@lte/@lt дают по 1 check в порядке вызова', () => {
    const schema = ZodUtils.addNumberValidation(z.number(), [
      { name: '@gte', args: [{ name: 'value', value: { kind: 'literal', value: 0 } }] },
      { name: '@lte', args: [{ name: 'value', value: { kind: 'literal', value: 100 } }] },
    ])
    const checks = (schema as unknown as { _zod: { def: { checks: Array<{ _zod: { def: { check: string } } }> } } })
      ._zod.def.checks
    expect(checks.map((c) => c._zod.def.check)).toEqual(['greater_than', 'less_than'])
  })

  it('z.number().int() пушит СВОЙ check (number_format) ДО ZodUtils.addNumberValidation — источник leading-offset для Int в model-generator.ts', () => {
    // PRISMA_TO_ZOD['Int'] === 'z.number().int()' (model-generator.ts) — .int() не проходит через
    // ZodUtils вообще, но добавляет check раньше native-атрибутов. Если это когда-нибудь
    // перестанет быть так, leading-offset в applyElementNativeAttributes надо убрать вместе с
    // этим тестом — иначе он молча начнёт съедать чужой check.
    const schema = ZodUtils.addNumberValidation(z.number().int(), [
      { name: '@gte', args: [{ name: 'value', value: { kind: 'literal', value: 1 } }] },
      { name: '@lte', args: [{ name: 'value', value: { kind: 'literal', value: 5 } }] },
    ])
    const checks = (schema as unknown as { _zod: { def: { checks: Array<{ _zod: { def: { check: string } } }> } } })
      ._zod.def.checks
    expect(checks.map((c) => c._zod.def.check)).toEqual(['number_format', 'greater_than', 'less_than'])
  })

  it('атрибут без литерала значения не порождает check вовсе (0, не 1) — гарантия ветки ATTRS_REQUIRING_ARG', () => {
    // @startsWith без args — то, что случилось бы, если бы наш кодоген передал атрибут без
    // обязательного литерала (в норме такого не бывает, но контракт ZodUtils именно такой).
    const schema = ZodUtils.addStringValidation(z.string(), [{ name: '@startsWith' }])
    const checks = (schema as unknown as { _zod: { def: { checks?: unknown[] } } })._zod.def.checks ?? []
    expect(checks).toHaveLength(0)
  })
})

describe('canary: мутация check._zod.def.error реально подменяет issue.message при safeParse', () => {
  it('строковый check (min_length)', () => {
    const built = ZodUtils.addStringValidation(z.string(), [
      { name: '@length', args: [{ name: 'min', value: { kind: 'literal', value: 5 } }] },
    ])
    const schema = applyNativeMessages(built, [{ count: 1, message: 'Минимум 5 символов' }])
    expect(firstIssueMessage(schema, 'ab')).toBe('Минимум 5 символов')
  })

  it('string_format check (@email)', () => {
    const built = ZodUtils.addStringValidation(z.string(), [{ name: '@email' }])
    const schema = applyNativeMessages(built, [{ count: 1, message: 'Введите настоящий email' }])
    expect(firstIssueMessage(schema, 'not-an-email')).toBe('Введите настоящий email')
  })

  it('числовой check (greater_than, @gte)', () => {
    const built = ZodUtils.addNumberValidation(z.number(), [
      { name: '@gte', args: [{ name: 'value', value: { kind: 'literal', value: 0 } }] },
    ])
    const schema = applyNativeMessages(built, [{ count: 1, message: 'Цена не может быть отрицательной' }])
    expect(firstIssueMessage(schema, -5)).toBe('Цена не может быть отрицательной')
  })

  it('bigint check (less_than, @lt)', () => {
    const built = ZodUtils.addBigIntValidation(z.bigint(), [
      { name: '@lt', args: [{ name: 'value', value: { kind: 'literal', value: 100 } }] },
    ])
    const schema = applyNativeMessages(built, [{ count: 1, message: 'Слишком много' }])
    expect(firstIssueMessage(schema, 200n)).toBe('Слишком много')
  })

  it('Int (.int()) с leading {count:1}-offset — message достаётся правильному check, не number_format', () => {
    const built = ZodUtils.addNumberValidation(z.number().int(), [
      { name: '@gte', args: [{ name: 'value', value: { kind: 'literal', value: 1 } }] },
      { name: '@lte', args: [{ name: 'value', value: { kind: 'literal', value: 5 } }] },
    ])
    // leading {count:1} без message — «пропускает» number_format-check от .int(), в точности
    // как это делает applyElementNativeAttributes в model-generator.ts для prismaType === 'Int'.
    const schema = applyNativeMessages(built, [
      { count: 1 },
      { count: 1, message: 'Оценка — от 1 до 5 (gte)' },
      { count: 1, message: 'Оценка — от 1 до 5 (lte)' },
    ])
    expect(firstIssueMessage(schema, 0)).toBe('Оценка — от 1 до 5 (gte)')
    expect(firstIssueMessage(schema, 99)).toBe('Оценка — от 1 до 5 (lte)')
  })

  it('@length с общим message на min+max — применяется к ОБОИМ (count:2, один и тот же текст)', () => {
    const built = ZodUtils.addStringValidation(z.string(), [
      {
        name: '@length',
        args: [{ name: 'min', value: { kind: 'literal', value: 2 } }, {
          name: 'max',
          value: { kind: 'literal', value: 5 },
        }],
      },
    ])
    const schema = applyNativeMessages(built, [{ count: 2, message: 'От 2 до 5 символов' }])
    expect(firstIssueMessage(schema, 'a')).toBe('От 2 до 5 символов')
    expect(firstIssueMessage(schema, 'abcdef')).toBe('От 2 до 5 символов')
  })

  it('смешанный набор: атрибут без message не задет, атрибут с message после него — на своей позиции', () => {
    const built = ZodUtils.addStringValidation(z.string(), [
      { name: '@trim' },
      { name: '@length', args: [{ name: 'max', value: { kind: 'literal', value: 3 } }] },
    ])
    // @trim — count:1 без message (overwrite-check, не может дать issue), @length(max) — count:1 с message
    const schema = applyNativeMessages(built, [{ count: 1 }, { count: 1, message: 'Максимум 3 символа' }])
    expect(firstIssueMessage(schema, 'abcdef')).toBe('Максимум 3 символа')
  })

  it('addListValidation: @length на массиве — тот же механизм, что и на строке', () => {
    const built = ZodUtils.addListValidation(z.array(z.string()), [
      {
        name: '@length',
        args: [{ name: 'min', value: { kind: 'literal', value: 1 } }, {
          name: 'max',
          value: { kind: 'literal', value: 2 },
        }],
      },
    ])
    const schema = applyNativeMessages(built, [{ count: 2, message: 'От 1 до 2 элементов' }])
    expect(firstIssueMessage(schema, [])).toBe('От 1 до 2 элементов')
    expect(firstIssueMessage(schema, ['a', 'b', 'c'])).toBe('От 1 до 2 элементов')
  })

  it('без message (undefined) — дефолтное сообщение Zod не тронуто', () => {
    const built = ZodUtils.addNumberValidation(z.number(), [
      { name: '@gte', args: [{ name: 'value', value: { kind: 'literal', value: 0 } }] },
    ])
    const schema = applyNativeMessages(built, [{ count: 1, message: undefined }])
    const message = firstIssueMessage(schema, -1)
    expect(message).toBeDefined()
    expect(message).not.toBe('')
  })
})
