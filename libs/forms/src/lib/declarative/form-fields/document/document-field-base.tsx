'use client'

import { Field, Icon, Input, InputGroup } from '@chakra-ui/react'
import type { ReactElement, ReactNode } from 'react'
import { useCallback } from 'react'
import { withMask } from 'use-mask-input'
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
  /** Маска ввода (use-mask-input синтаксис: 9=цифра, a=буква, *=любой) */
  mask: string
  /** Placeholder с примером */
  placeholder: string
  /** Иконка слева */
  icon: ReactNode
  /** Функция валидации значения (возвращает сообщение об ошибке или undefined) */
  validate?: (value: string) => string | undefined
}

/**
 * Фабрика для создания document-полей с маской + иконкой + валидацией.
 *
 * Все документные поля (ИНН, ОГРН, БИК и т.д.) используют одинаковую структуру:
 * - InputGroup с иконкой слева
 * - Маска ввода через use-mask-input
 * - Realtime валидация
 */
export function createDocumentField(config: DocumentFieldConfig) {
  return createField<DocumentFieldProps, string>({
    displayName: config.displayName,

    render: ({ field, resolved, hasError, errorMessage }): ReactElement => {
      // Маска через ref callback
      const maskRef = useCallback((element: HTMLInputElement | null) => {
        if (!element) return
        withMask(config.mask, {
          showMaskOnFocus: false,
          clearIncomplete: true,
          autoUnmask: false,
        })(element)
      }, [])

      // Дополнительная валидация (контрольная сумма)
      const customError = config.validate ? config.validate(String(field.state.value ?? '')) : undefined
      const showError = hasError || !!customError
      const displayError = customError ?? errorMessage

      return (
        <Field.Root invalid={showError} required={resolved.required} disabled={resolved.disabled}>
          <FieldLabel label={resolved.label} tooltip={resolved.tooltip} required={resolved.required} />

          <InputGroup startElement={<Icon color="fg.muted">{config.icon}</Icon>}>
            <Input
              ref={maskRef}
              value={String(field.state.value ?? '')}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              placeholder={config.placeholder}
            />
          </InputGroup>

          <FieldError hasError={showError} errorMessage={displayError} helperText={resolved.helperText} />
        </Field.Root>
      )
    },
  })
}
