'use client'

import { useCallback, useMemo, useRef } from 'react'
import { unwrapSchema } from '../../zod-utils'

/**
 * Конфигурация async-валидации из .meta() или props.
 */
export interface AsyncValidateConfig {
  /** Async-функция валидации. Возвращает строку ошибки или undefined. */
  asyncValidate: (value: unknown) => Promise<string | undefined>
  /** Задержка перед запросом (мс). По умолчанию 500. */
  asyncDebounce?: number
  /** Триггер: 'onBlur' (по умолчанию) или 'onChange'. */
  asyncTrigger?: 'onBlur' | 'onChange'
}

/**
 * Результат хука — validators объект для form.Field + asyncDebounceMs.
 */
export interface AsyncFieldValidators {
  /** Validators prop для form.Field */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validators: Record<string, any> | undefined
  /** asyncDebounceMs prop для form.Field */
  asyncDebounceMs: number | undefined
  /** Есть ли async-валидация */
  hasAsyncValidation: boolean
}

/**
 * Извлечь async-валидацию из Zod schema .meta().
 *
 * Ожидаемый формат:
 * ```ts
 * z.string().meta({
 *   asyncValidate: async (value) => { ... },
 *   asyncDebounce: 500,
 *   asyncTrigger: 'onBlur',
 * })
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAsyncValidateFromSchema(schema: any, fieldPath: string): AsyncValidateConfig | undefined {
  if (!schema) return undefined

  try {
    const unwrapped = unwrapSchema(schema)
    if (!unwrapped?._zod?.def?.shape) return undefined

    // Навигация по dot-path к нужному полю
    const parts = fieldPath.split('.')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = unwrapped._zod.def.shape
    for (const part of parts) {
      // Пропускаем числовые индексы массива
      if (/^\d+$/.test(part)) continue
      const fieldSchema = current[part]
      if (!fieldSchema) return undefined

      const fieldUnwrapped = unwrapSchema(fieldSchema)
      const fieldType = fieldUnwrapped?._zod?.def?.type

      if (fieldType === 'object' && fieldUnwrapped._zod.def.shape) {
        current = fieldUnwrapped._zod.def.shape
        continue
      }

      if (fieldType === 'array' && fieldUnwrapped._zod.def.element) {
        const elementUnwrapped = unwrapSchema(fieldUnwrapped._zod.def.element)
        if (elementUnwrapped?._zod?.def?.shape) {
          current = elementUnwrapped._zod.def.shape
          continue
        }
      }

      // Конечное поле — проверяем meta
      if (fieldSchema?.meta) {
        const meta = fieldSchema.meta()
        if (meta?.asyncValidate && typeof meta.asyncValidate === 'function') {
          return {
            asyncValidate: meta.asyncValidate,
            asyncDebounce: meta.asyncDebounce,
            asyncTrigger: meta.asyncTrigger,
          }
        }
      }

      return undefined
    }
  } catch {
    return undefined
  }

  return undefined
}

/**
 * Хук для создания async validators из Zod meta или props.
 *
 * Приоритет: props > meta.
 *
 * @param schema - Zod schema формы
 * @param fieldPath - Полный путь к полю
 * @param propsConfig - Конфиг из props поля (приоритетнее meta)
 */
export function useAsyncFieldValidation(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: any,
  fieldPath: string,
  propsConfig?: Partial<AsyncValidateConfig>
): AsyncFieldValidators {
  // AbortController для отмены предыдущего запроса
  const abortRef = useRef<AbortController | null>(null)
  // Кэш результатов
  const cacheRef = useRef<Map<string, string | undefined>>(new Map())

  // Извлекаем конфиг из schema meta
  const schemaConfig = useMemo(() => getAsyncValidateFromSchema(schema, fieldPath), [schema, fieldPath])

  // Мержим: props > schema meta
  const asyncFn = propsConfig?.asyncValidate ?? schemaConfig?.asyncValidate
  const debounce = propsConfig?.asyncDebounce ?? schemaConfig?.asyncDebounce ?? 500
  const trigger = propsConfig?.asyncTrigger ?? schemaConfig?.asyncTrigger ?? 'onBlur'

  // Обёрнутая async-функция с abort + cache + offline check
  const wrappedAsyncFn = useCallback(
    async ({ value }: { value: unknown }): Promise<string | undefined> => {
      if (!asyncFn) return undefined

      // Пропускаем в офлайне
      if (typeof navigator !== 'undefined' && !navigator.onLine) return undefined

      // Кэш
      const cacheKey = String(value)
      if (cacheRef.current.has(cacheKey)) {
        return cacheRef.current.get(cacheKey)
      }

      // Отмена предыдущего запроса
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const result = await asyncFn(value)
        // Проверяем не был ли запрос отменён
        if (controller.signal.aborted) return undefined

        cacheRef.current.set(cacheKey, result)
        return result
      } catch (err) {
        // Отменённый запрос — не ошибка
        if (err instanceof DOMException && err.name === 'AbortError') return undefined
        return undefined
      }
    },
    [asyncFn]
  )

  // Собираем validators
  const validators = useMemo(() => {
    if (!asyncFn) return undefined

    if (trigger === 'onChange') {
      return { onChangeAsync: wrappedAsyncFn }
    }
    return { onBlurAsync: wrappedAsyncFn }
  }, [asyncFn, trigger, wrappedAsyncFn])

  return {
    validators,
    asyncDebounceMs: asyncFn ? debounce : undefined,
    hasAsyncValidation: !!asyncFn,
  }
}
