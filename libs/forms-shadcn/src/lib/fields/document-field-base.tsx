'use client'

import { useMaskField } from '@letar/forms-react'
import { cn, NATIVE_INPUT_CLASS } from '@letar/tailwind-utils'
import { useStore } from '@tanstack/react-form'
import type { ComponentType, ReactElement } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import type { BaseFieldProps } from './types'

/** Пропсы документных полей (shadcn-скин) — без специфики поверх базового набора. */
export type DocumentFieldProps = BaseFieldProps

/**
 * Конфигурация для `createDocumentField` — фабрика документных полей (аналог Chakra-версии
 * из `@letar/forms`, `document-field-base.tsx`).
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
  /**
   * Иконка слева — ссылка на компонент, не готовый JSX-элемент. `createDocumentField(...)`
   * вызывается на верхнем уровне модуля каждого документного поля; `icon: <LuX />` создавал бы
   * элемент сразу при импорте, до всякого рендера — падает `ReferenceError: React is not defined`
   * под tsx/esbuild (`nx db:seed`). См. тот же фикс в Chakra-версии (`document-field-base.tsx`)
   * и `rich-text-toolbar-config.tsx`.
   */
  icon: ComponentType
  /** Функция валидации значения (возвращает сообщение об ошибке или undefined) */
  validate?: (value: string) => string | undefined
}

interface DocumentFieldState {
  inputProps: ReturnType<typeof useMaskField>['inputProps']
  onFocus: () => void
  onBlur: () => void
}

/**
 * Фабрика документных полей для shadcn-скина (Фаза 8, Этап 6).
 *
 * `useMaskField` в `formatMode: 'live'` отдаёт неконтролируемый `<input>` (`ref`+`defaultValue`,
 * DOM — источник истины, `MaskController` пишет напрямую через `setRangeText`) — контракт
 * `UIKitInputProps` требует `value`/`onChange`, поэтому здесь, как и в Chakra-версии, рендерится
 * сырой `<input>` в обход `shadcnUIKit.Input`, стилизованный тем же `NATIVE_INPUT_CLASS`.
 */
export function createDocumentField(config: DocumentFieldConfig) {
  return createField<DocumentFieldProps, string, DocumentFieldState>({
    displayName: config.displayName,

    // useFieldState вызывается ДО form.Field (hooks-safe), в отличие от render callback —
    // тот же приём, что в Chakra-версии (см. её комментарий про useStore).
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

    render: ({ field, fullPath, resolved, hasError, errorMessage, fieldState }): ReactElement => {
      // Дополнительная валидация (контрольная сумма)
      const customError = config.validate ? config.validate(String(field.state.value ?? '')) : undefined
      const showError = hasError || !!customError
      const displayError = customError ?? errorMessage

      return (
        <FieldWrapper resolved={resolved} hasError={showError} errorMessage={displayError} fullPath={fullPath}>
          <div className="relative">
            <span
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute inset-y-0 left-2.5 flex items-center [&_svg]:size-4"
            >
              <config.icon />
            </span>
            <input
              {...fieldState.inputProps}
              onFocus={fieldState.onFocus}
              onBlur={() => {
                fieldState.onBlur()
                field.handleBlur()
              }}
              placeholder={config.placeholder}
              maxLength={config.maxLength}
              disabled={resolved.disabled}
              readOnly={resolved.readOnly}
              data-field-name={fullPath}
              data-slot="input"
              aria-invalid={showError || undefined}
              className={cn(
                NATIVE_INPUT_CLASS,
                'pl-8',
                'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
              )}
            />
          </div>
        </FieldWrapper>
      )
    },
  })
}
