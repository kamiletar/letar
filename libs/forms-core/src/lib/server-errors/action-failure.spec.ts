import { describe, expect, it } from 'vitest'

import {
  actionFailure,
  ActionFailureError,
  catchActionFailure,
  isActionFailure,
  isDbErrorCode,
  isUniqueViolation,
  uniqueFieldsFromConstraint,
  unwrapActionResult,
  UserFacingError,
} from './action-failure'
import { mapServerErrors } from './map-server-errors'
import { parseActionFailureError, parseActionResultError } from './parsers'

/** Ошибка в форме, которую отдаёт ZenStack ORM: SQLSTATE в `dbErrorCode`, ограничение — в `cause`. */
function uniqueError(constraint?: string) {
  return Object.assign(new Error('unique'), {
    dbErrorCode: '23505',
    ...(constraint ? { cause: { constraint } } : {}),
  })
}

describe('actionFailure / isActionFailure', () => {
  it('фабрика собирает значение с явным маркером success: false', () => {
    expect(actionFailure('Дубль')).toEqual({ success: false, error: 'Дубль' })
    expect(actionFailure('Дубль', 'slug')).toEqual({ success: false, error: 'Дубль', field: 'slug' })
  })

  it('различает отказ и успех', () => {
    expect(isActionFailure({ success: false, error: 'x' })).toBe(true)
    expect(isActionFailure({ success: false, error: 'x', field: 'slug' })).toBe(true)
    expect(isActionFailure({ id: 'a' })).toBe(false)
    expect(isActionFailure(null)).toBe(false)
    expect(isActionFailure(undefined)).toBe(false)
    expect(isActionFailure('error')).toBe(false)
    expect(isActionFailure({ success: false, error: 5 })).toBe(false)
  })

  it('не принимает за отказ успешный результат с полем error без маркера', () => {
    // частичный успех: список и предупреждение — это данные, а не отказ
    expect(isActionFailure({ items: [1, 2], error: 'часть строк пропущена' })).toBe(false)
    expect(isActionFailure({ error: 'x' })).toBe(false)
    expect(isActionFailure({ success: true, error: 'x' })).toBe(false)
  })
})

describe('unwrapActionResult', () => {
  it('возвращает успех как есть', () => {
    expect(unwrapActionResult({ id: 'a' })).toEqual({ id: 'a' })
    expect(unwrapActionResult(undefined)).toBeUndefined()
  })

  it('пропускает успех с полем error без маркера', () => {
    const partial = { items: [1], error: 'часть строк пропущена' }
    expect(unwrapActionResult(partial)).toBe(partial)
  })

  it('бросает ActionFailureError с текстом и полем', () => {
    expect(() => unwrapActionResult(actionFailure('Дубль', 'slug'))).toThrow(ActionFailureError)
    try {
      unwrapActionResult(actionFailure('Дубль', 'slug'))
    } catch (error) {
      expect((error as ActionFailureError).field).toBe('slug')
      expect((error as Error).message).toBe('Дубль')
      expect((error as Error).name).toBe('ActionFailureError')
    }
  })
})

describe('isDbErrorCode / isUniqueViolation', () => {
  it('читает SQLSTATE из dbErrorCode (ZenStack v3)', () => {
    expect(isDbErrorCode(uniqueError(), '23505')).toBe(true)
    expect(isDbErrorCode(uniqueError(), '40001')).toBe(false)
    expect(isDbErrorCode(null, '23505')).toBe(false)
    expect(isDbErrorCode('23505', '23505')).toBe(false)
  })

  it('читает SQLSTATE и с исходной pg-ошибки в cause.code', () => {
    const error = Object.assign(new Error('x'), { cause: { code: '23505', constraint: 'A_b_key' } })
    expect(isUniqueViolation(error)).toBe(true)
  })

  it('не путает Prisma-код P2002 с SQLSTATE — его разбирает parsePrismaError', () => {
    expect(isUniqueViolation({ code: 'P2002' })).toBe(false)
  })

  it('фильтр по фрагменту имени ограничения', () => {
    expect(isUniqueViolation(uniqueError('Counterparty_inn_key'), 'inn')).toBe(true)
    expect(isUniqueViolation(uniqueError('Counterparty_inn_key'), 'slug')).toBe(false)
    expect(isUniqueViolation(uniqueError(), 'inn')).toBe(false)
  })
})

describe('uniqueFieldsFromConstraint', () => {
  it('Table_field_key → одно поле', () => {
    expect(uniqueFieldsFromConstraint('MaterialCategory_slug_key')).toEqual(['slug'])
    expect(uniqueFieldsFromConstraint('Counterparty_inn_key')).toEqual(['inn'])
  })

  it('составной ключ неоднозначен (таблица с «_» или несколько полей) → пусто', () => {
    expect(uniqueFieldsFromConstraint('WorkMaterialNorm_workId_materialId_effectiveFrom_key')).toEqual([])
  })

  it('таблица с подчёркиванием (@@map) → пусто, а не «material_slug»', () => {
    expect(uniqueFieldsFromConstraint('material_category_slug_key')).toEqual([])
  })

  it('колонка с подчёркиванием (@map) → пусто', () => {
    expect(uniqueFieldsFromConstraint('User_created_at_key')).toEqual([])
  })

  it('имя не по схеме (частичный индекс, усечённое до 63 символов) → пусто', () => {
    expect(uniqueFieldsFromConstraint('Order_number_idx')).toEqual([])
    expect(uniqueFieldsFromConstraint('Order_active_partial')).toEqual([])
    expect(uniqueFieldsFromConstraint(undefined)).toEqual([])
  })
})

describe('catchActionFailure', () => {
  it('возвращает результат работы, если отказа нет', async () => {
    await expect(catchActionFailure(async () => ({ id: 'a' }))).resolves.toEqual({ id: 'a' })
  })

  it('превращает UserFacingError в отказ', async () => {
    const result = await catchActionFailure(async () => {
      throw new UserFacingError('Поставщик не найден')
    })
    expect(result).toEqual({ success: false, error: 'Поставщик не найден' })
  })

  it('переносит поле из UserFacingError', async () => {
    const result = await catchActionFailure(async () => {
      throw new UserFacingError('Не заполнено', 'name')
    })
    expect(result).toEqual({ success: false, error: 'Не заполнено', field: 'name' })
  })

  it('дубль без своих сообщений → общий текст и поле', async () => {
    const result = await catchActionFailure(async () => {
      throw uniqueError('MaterialCategory_slug_key')
    })
    expect(result).toEqual({ success: false, error: 'Такая запись уже существует', field: 'slug' })
  })

  it('общий текст по locale', async () => {
    const result = await catchActionFailure(async () => {
      throw uniqueError('MaterialCategory_slug_key')
    }, { locale: 'en' })
    expect(result).toEqual({ success: false, error: 'This record already exists', field: 'slug' })
  })

  it('своё сообщение по полю', async () => {
    const result = await catchActionFailure(
      async () => {
        throw uniqueError('Counterparty_inn_key')
      },
      { uniqueMessages: { inn: 'Контрагент с этим ИНН уже заведён' } },
    )
    expect(result).toEqual({ success: false, error: 'Контрагент с этим ИНН уже заведён', field: 'inn' })
  })

  it('составной ключ: без опции — общий текст без поля, с опцией — по хвосту имени', async () => {
    const constraint = 'WorkMaterialNorm_workId_materialId_effectiveFrom_key'
    expect(
      await catchActionFailure(async () => {
        throw uniqueError(constraint)
      }),
    ).toEqual({ success: false, error: 'Такая запись уже существует' })
    expect(
      await catchActionFailure(
        async () => {
          throw uniqueError(constraint)
        },
        { uniqueMessages: { workId_materialId_effectiveFrom: 'Норма на эту дату уже есть' } },
      ),
    ).toEqual({ success: false, error: 'Норма на эту дату уже есть' })
  })

  it('таблица с подчёркиванием: своё сообщение находится, поле не выдумывается', async () => {
    const result = await catchActionFailure(
      async () => {
        throw uniqueError('material_category_slug_key')
      },
      { uniqueMessages: { slug: 'Адрес занят' } },
    )
    expect(result).toEqual({ success: false, error: 'Адрес занят' })
  })

  it('из нескольких подходящих ключей берётся самый длинный', async () => {
    const result = await catchActionFailure(
      async () => {
        throw uniqueError('material_category_slug_key')
      },
      { uniqueMessages: { slug: 'короткий', category_slug: 'длинный' } },
    )
    expect(result).toMatchObject({ error: 'длинный' })
  })

  it('unique без имени ограничения → общее сообщение', async () => {
    const result = await catchActionFailure(async () => {
      throw uniqueError()
    })
    expect(result).toEqual({ success: false, error: 'Такая запись уже существует' })
  })

  it('прочие ошибки пробрасывает — это настоящая неполадка', async () => {
    await expect(
      catchActionFailure(async () => {
        throw new Error('connection reset')
      }),
    ).rejects.toThrow('connection reset')
  })
})

describe('разбор отказа в mapServerErrors', () => {
  it('ActionFailureError с полем → и под полем, и в общем блоке', () => {
    const error = new ActionFailureError(actionFailure('Дубль', 'slug'))
    expect(mapServerErrors(error)).toEqual({
      fieldErrors: [{ field: 'slug', message: 'Дубль' }],
      formErrors: ['Дубль'],
    })
  })

  it('ActionFailureError без поля → только в общем блоке', () => {
    const error = new ActionFailureError(actionFailure('Нельзя удалить'))
    expect(mapServerErrors(error)).toEqual({ fieldErrors: [], formErrors: ['Нельзя удалить'] })
  })

  it('парсер стоит раньше parseErrorObject: текст берётся из отказа, а не из message «как у любой Error»', () => {
    const error = new ActionFailureError(actionFailure('Дубль', 'slug'))
    // parseErrorObject положил бы message только в formErrors и потерял бы поле
    expect(parseActionFailureError(error)?.fieldErrors).toEqual([{ field: 'slug', message: 'Дубль' }])
    expect(mapServerErrors(error).fieldErrors).toHaveLength(1)
  })

  it('обычная Error парсер отказа не трогает', () => {
    expect(parseActionFailureError(new Error('boom'))).toBeNull()
    expect(parseActionFailureError({ success: false, error: 'x' })).toBeNull()
  })

  it('значение отказа с полем тоже раскладывается по полю (ActionResult-формат)', () => {
    expect(parseActionResultError(actionFailure('Дубль', 'slug'))).toEqual({
      fieldErrors: [{ field: 'slug', message: 'Дубль' }],
      formErrors: ['Дубль'],
    })
    expect(mapServerErrors(actionFailure('Дубль', 'slug'))).toEqual({
      fieldErrors: [{ field: 'slug', message: 'Дубль' }],
      formErrors: ['Дубль'],
    })
  })

  it('прежний ActionResult без поля разбирается как раньше', () => {
    expect(parseActionResultError({ success: false, error: 'a', message: 'b' })).toEqual({
      fieldErrors: [],
      formErrors: ['a', 'b'],
    })
  })
})
