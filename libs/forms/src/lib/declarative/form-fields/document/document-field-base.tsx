'use client'

import { Field, Icon, Input, InputGroup } from '@chakra-ui/react'
import { useMaskField } from '@letar/forms-react'
import { useStore } from '@tanstack/react-form'
import type { ReactElement, ReactNode } from 'react'
import type { FieldTooltipMeta } from '../../types'
import { createField, FieldError, FieldLabel } from '../base'

/**
 * Базовые пропсы для документных полей.
 */
export interface DocumentFieldProps {
  /** Имя поля */
  name?: string
  /** Лейбл */
  label?: string
  /** Подсказка */
  helperText?: string
  /** Обязательное */
  required?: boolean
  /** Отключено */
  disabled?: boolean
  /** Tooltip */
  tooltip?: FieldTooltipMeta
}

/**
 * Конфигурация для createDocumentField — фабрика документных полей.
 */
export interface DocumentFieldConfig {
  /** Имя для React DevTools */
  displayName: string
  /** Маска движка `@letar/forms-core/mask` (9=цифра, a=буква, *=любой) */
  mask: string
  /**
   * `'live'` (по умолчанию) — группировка литералами маски на каждое нажатие. `'off'` — только
   * фильтрация по алфавиту токенов, без группировки: для полей переменной длины (ИНН — 10 или
   * 12 цифр), где структурная маска дала бы ложный отказ (MASK_ENGINE.md §5.3).
   */
  formatMode?: 'live' | 'off'
  /** HTML `maxLength` — актуален вместе с `formatMode: 'off'`, где сама маска длину не ограничивает. */
  maxLength?: number
  /** Placeholder с примером */
  placeholder: string
  /** Иконка слева */
  icon: ReactNode
  /** Функция валидации значения (возвращает сообщение об ошибке или undefined) */
  validate?: (value: string) => string | undefined
}

interface DocumentFieldState {
  inputProps: ReturnType<typeof useMaskField>['inputProps']
  onFocus: () => void
  onBlur: () => void
}

/**
 * Фабрика для создания document-полей с маской + иконкой + валидацией.
 *
 * Все документные поля (ИНН, ОГРН, БИК и т.д.) используют одинаковую структуру:
 * - InputGroup с иконкой слева
 * - Маска ввода через `@letar/forms-core/mask` (Фаза 8, Этап 4 — заменяет `use-mask-input`)
 * - Realtime валидация
 */
export function createDocumentField(config: DocumentFieldConfig) {
  return createField<DocumentFieldProps, string, DocumentFieldState>({
    displayName: config.displayName,

    // useFieldState вызывается ДО form.Field (hooks-safe), в отличие от render callback —
    // тот же приём, что в Form.Field.MaskedInput (см. её комментарий про useStore).
    useFieldState: (_props, _resolved, context) => {
      const { form, fullPath } = context
      const rawValue = (useStore(form.store, () => form.getFieldValue(fullPath)) as string | undefined) ?? ''

      const { inputProps, onFocus, onBlur } = useMaskField({
        mask: config.mask,
        value: rawValue,
        onValueChange: (raw) => form.setFieldValue(fullPath, raw),
        formatMode: config.formatMode,
      })

      return { inputProps, onFocus, onBlur }
    },

    render: ({ field, resolved, hasError, errorMessage, fieldState }): ReactElement => {
      // Дополнительная валидация (контрольная сумма)
      const customError = config.validate ? config.validate(String(field.state.value ?? '')) : undefined
      const showError = hasError || !!customError
      const displayError = customError ?? errorMessage

      return (
        <Field.Root invalid={showError} required={resolved.required} disabled={resolved.disabled}>
          <FieldLabel label={resolved.label} tooltip={resolved.tooltip} required={resolved.required} />

          <InputGroup startElement={<Icon color="fg.muted">{config.icon}</Icon>}>
            <Input
              {...fieldState.inputProps}
              onFocus={fieldState.onFocus}
              onBlur={() => {
                fieldState.onBlur()
                field.handleBlur()
              }}
              placeholder={config.placeholder}
              maxLength={config.maxLength}
            />
          </InputGroup>

          <FieldError hasError={showError} errorMessage={displayError} helperText={resolved.helperText} />
        </Field.Root>
      )
    },
  })
}
