'use client'

import type { FieldTooltipMeta } from '@letar/forms-core/schema'
import type { ReactNode } from 'react'

/**
 * Базовые пропсы, общие для всех полей формы — независимо от того, какой UI-библиотекой
 * поле нарисовано.
 *
 * Здесь намеренно нет ничего про оформление (`size`, `variant`, `colorPalette`): всё это —
 * словарь конкретного скина и живёт в его собственных `*FieldProps`, которые расширяют
 * этот интерфейс.
 */
export interface BaseFieldProps {
  /** Field name (optional for primitive arrays) */
  name?: string
  /** Field label (can be a string or ReactNode for complex labels with links) */
  label?: ReactNode
  /** Placeholder text */
  placeholder?: string
  /** Helper text below the field (can be a string or ReactNode) */
  helperText?: ReactNode
  /** Whether the field is required */
  required?: boolean
  /** Whether the field is disabled */
  disabled?: boolean
  /** Read-only mode */
  readOnly?: boolean
  /** Tooltip for hint next to label (overrides value from schema) */
  tooltip?: FieldTooltipMeta
  /** Async-функция валидации (серверная проверка уникальности и т.д.) */
  asyncValidate?: (value: unknown) => Promise<string | undefined>
  /** Задержка debounce для async-валидации (мс, по умолчанию 500) */
  asyncDebounce?: number
  /** Триггер async-валидации: 'onBlur' (по умолчанию) или 'onChange' */
  asyncTrigger?: 'onBlur' | 'onChange'
}
