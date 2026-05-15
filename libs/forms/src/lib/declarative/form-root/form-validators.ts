'use client'

import type { ValidateOn } from '../types'

/**
 * Строит object validators для TanStack Form based on validateOn prop.
 *
 * @param schema - Zod schema for validation
 * @param validateOn - режим(ы) валидации ('change' | 'blur' | 'submit' | 'mount')
 * @returns object validators для useAppForm или undefined if schema не указана
 *
 * @example
 * // Валидация on change (by default)
 * buildValidators(MySchema) // { onChange: MySchema }
 *
 * // Валидация при blur
 * buildValidators(MySchema, 'blur') // { onBlur: MySchema }
 *
 * // Множественные режимы
 * buildValidators(MySchema, ['change', 'blur']) // { onChange: MySchema, onBlur: MySchema }
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildValidators(schema: any, validateOn?: ValidateOn | ValidateOn[]): Record<string, any> | undefined {
  if (!schema) {
    return undefined
  }

  // По умолчанию — validation на onChange
  if (!validateOn) {
    return { onChange: schema }
  }

  // Нормализуем в array
  const modes = Array.isArray(validateOn) ? validateOn : [validateOn]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validators: Record<string, any> = {}

  for (const mode of modes) {
    switch (mode) {
      case 'change':
        validators.onChange = schema
        break
      case 'blur':
        validators.onBlur = schema
        break
      case 'submit':
        validators.onSubmit = schema
        break
      case 'mount':
        validators.onMount = schema
        break
    }
  }

  return Object.keys(validators).length > 0 ? validators : undefined
}
