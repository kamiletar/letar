'use client'

import { useEffect, useMemo } from 'react'

/**
 * Опции для useUrlPrefill
 */
export interface UrlPrefillOptions {
  /** Whitelist разрешённых полей (обязательный — безопасность!) */
  fields: string[]
  /** Маппинг URL-параметров на имена полей формы */
  mapping?: Record<string, string>
  /** Очистить URL после применения (replaceState) */
  cleanUrl?: boolean
  /** Zod-схема для валидации значений (опционально) */
  schema?: { safeParse: (data: unknown) => { success: boolean; data?: unknown } }
  /** Кастомный источник параметров (по умолчанию — window.location.search) */
  searchParams?: URLSearchParams
}

/**
 * Хук для автозаполнения формы из URL-параметров.
 *
 * Безопасность: работает ТОЛЬКО с whitelist полей.
 * Без указания `fields` — не извлечёт ни одного параметра.
 *
 * @returns Partial объект с извлечёнными значениями
 *
 * @example
 * ```tsx
 * // URL: /contact?name=Иван&email=ivan@test.com&utm_source=habr
 * const prefilled = useUrlPrefill({
 *   fields: ['name', 'email'],
 *   cleanUrl: true,
 * })
 * // prefilled = { name: 'Иван', email: 'ivan@test.com' }
 * // utm_source игнорируется — не в whitelist
 * ```
 *
 * @example С маппингом
 * ```tsx
 * // URL: /form?user_name=Иван&mail=test@test.com
 * const prefilled = useUrlPrefill({
 *   fields: ['name', 'email'],
 *   mapping: { user_name: 'name', mail: 'email' },
 * })
 * // prefilled = { name: 'Иван', email: 'test@test.com' }
 * ```
 */
export function useUrlPrefill(options: UrlPrefillOptions): Record<string, unknown> {
  const { fields, mapping, cleanUrl, schema, searchParams: customSearchParams } = options

  const result = useMemo(() => {
    const params = customSearchParams ?? getSearchParams()
    if (!params) return {}

    return extractParams(params, fields, mapping, schema)
  }, [fields, mapping, schema, customSearchParams])

  // Очистка URL
  useEffect(() => {
    if (cleanUrl && typeof window !== 'undefined' && Object.keys(result).length > 0) {
      const url = new URL(window.location.href)

      // Удаляем только извлечённые параметры
      for (const urlKey of getUrlKeysForFields(fields, mapping)) {
        url.searchParams.delete(urlKey)
      }

      // Если остались другие параметры — сохраняем их
      const newUrl = url.searchParams.toString()
        ? `${url.pathname}?${url.searchParams.toString()}${url.hash}`
        : `${url.pathname}${url.hash}`
      window.history.replaceState(window.history.state, '', newUrl)
    }
  }, [cleanUrl, result, fields, mapping])

  return result
}

/**
 * Сгенерировать URL с параметрами для автозаполнения формы.
 *
 * @param path — базовый путь
 * @param params — значения полей для предзаполнения
 * @returns URL с закодированными параметрами
 *
 * @example
 * ```tsx
 * const url = generatePrefillUrl('/contact', {
 *   name: 'Иван',
 *   email: 'ivan@test.com',
 *   tags: ['react', 'forms'],
 * })
 * // → "/contact?name=%D0%98%D0%B2%D0%B0%D0%BD&email=ivan%40test.com&tags=react&tags=forms"
 * ```
 */
export function generatePrefillUrl(path: string, params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue

    if (Array.isArray(value)) {
      // Массивы: ?tag=react&tag=forms
      for (const item of value) {
        searchParams.append(key, String(item))
      }
    } else if (typeof value === 'object') {
      // Вложенные объекты: ?address.city=Moscow
      for (const [nestedKey, nestedValue] of Object.entries(value as Record<string, unknown>)) {
        if (nestedValue !== null && nestedValue !== undefined) {
          searchParams.append(`${key}.${nestedKey}`, String(nestedValue))
        }
      }
    } else {
      searchParams.append(key, String(value))
    }
  }

  const queryString = searchParams.toString()
  return queryString ? `${path}?${queryString}` : path
}

// --- Внутренние функции ---

/** Получить URLSearchParams из текущего URL */
function getSearchParams(): URLSearchParams | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search)
}

/** Извлечь параметры с учётом whitelist, маппинга и валидации */
function extractParams(
  params: URLSearchParams,
  fields: string[],
  mapping?: Record<string, string>,
  schema?: { safeParse: (data: unknown) => { success: boolean; data?: unknown } },
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  // Инвертируем маппинг: urlKey → fieldName
  const reverseMapping: Record<string, string> = {}
  if (mapping) {
    for (const [urlKey, fieldName] of Object.entries(mapping)) {
      reverseMapping[urlKey] = fieldName
    }
  }

  // Обрабатываем все параметры URL
  const processedKeys = new Set<string>()

  for (const [urlKey, _value] of params.entries()) {
    if (processedKeys.has(urlKey)) continue
    processedKeys.add(urlKey)

    // Определяем имя поля
    const fieldName = reverseMapping[urlKey] ?? urlKey

    // Проверяем whitelist
    // Для вложенных (address.city) проверяем корневое поле (address)
    const rootField = fieldName.split('.')[0]
    if (!fields.includes(fieldName) && !fields.includes(rootField)) continue

    // Получаем все значения (для массивов)
    const allValues = params.getAll(urlKey)

    if (fieldName.includes('.')) {
      // Вложенные: address.city → { address: { city: value } }
      setNestedValue(result, fieldName, allValues.length > 1 ? allValues : allValues[0])
    } else if (allValues.length > 1) {
      // Массив: ?tag=react&tag=forms
      result[fieldName] = allValues
    } else {
      result[fieldName] = allValues[0]
    }
  }

  // Валидация через Zod (если передана схема)
  if (schema && Object.keys(result).length > 0) {
    const parsed = schema.safeParse(result)
    if (parsed.success && parsed.data && typeof parsed.data === 'object') {
      // Возвращаем только валидные поля
      return parsed.data as Record<string, unknown>
    }
    // Если схема не прошла — возвращаем результат без валидации
    // (частичное заполнение лучше чем ничего)
  }

  return result
}

/** Установить вложенное значение: "address.city" → { address: { city: v } } */
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.')
  let current: Record<string, unknown> = obj

  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {}
    }
    current = current[key] as Record<string, unknown>
  }

  current[parts[parts.length - 1]] = value
}

/** Получить URL-ключи для заданных полей (с учётом маппинга) */
function getUrlKeysForFields(fields: string[], mapping?: Record<string, string>): string[] {
  const urlKeys = [...fields]

  if (mapping) {
    for (const [urlKey, fieldName] of Object.entries(mapping)) {
      if (fields.includes(fieldName)) {
        urlKeys.push(urlKey)
      }
    }
  }

  return urlKeys
}
