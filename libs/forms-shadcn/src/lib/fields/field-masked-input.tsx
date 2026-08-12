'use client'

import { useMaskField } from '@letar/forms-react'
import { cn, NATIVE_INPUT_CLASS } from '@letar/tailwind-utils'
import { useStore } from '@tanstack/react-form'
import { type CSSProperties, type ReactElement, useState } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import type { MaskedInputFieldProps } from './types'

/** Стандартная визуально-скрытая, но доступная скринридеру разметка. */
const visuallyHiddenStyle: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

interface MaskedInputFieldState {
  inputProps: ReturnType<typeof useMaskField>['inputProps']
  onFocus: () => void
  onBlur: () => void
  rejectedMessage: string
}

/**
 * Form.Field.MaskedInput (shadcn) — движок масок (Фаза 8, Этап 6), замена `use-mask-input`.
 *
 * `useMaskField('live')` отдаёт неконтролируемый `<input>` (см. `document-field-base.tsx`) —
 * рендерится сырой `<input>` в обход `shadcnUIKit.Input`, стилизованный `NATIVE_INPUT_CLASS`.
 *
 * @example Код подразделения
 * ```tsx
 * <Form.Field.MaskedInput name="departmentCode" label="Код подразделения" mask="999-999"
 *   formatDescription="Формат: 3 цифры, дефис, 3 цифры" />
 * ```
 */
export const FieldMaskedInput = createField<MaskedInputFieldProps, string, MaskedInputFieldState>({
  displayName: 'FieldMaskedInput',

  useFieldState: (props, _resolved, context) => {
    const { form, fullPath } = context
    const { mask, formatMode = 'live', onPaste = 'normalize' } = props
    const [rejectedMessage, setRejectedMessage] = useState('')

    if (!mask) {
      console.error(`[Form.Field.MaskedInput] Поле "${fullPath}": не задан обязательный проп "mask".`)
    }
    const resolvedMaskProp = mask ?? (() => null)

    const rawValue = (useStore(form.store, () => form.getFieldValue(fullPath)) as string | undefined) ?? ''

    const { inputProps, onFocus, onBlur } = useMaskField({
      mask: resolvedMaskProp,
      value: rawValue,
      onValueChange: (raw) => form.setFieldValue(fullPath, raw),
      formatMode,
      onPasteMode: onPaste,
      onRejectedInput: () => setRejectedMessage('Символ не соответствует формату поля'),
    })

    return { inputProps, onFocus, onBlur, rejectedMessage }
  },

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    const { formatDescription } = componentProps

    if (!formatDescription) {
      // Без NODE_ENV-гейта (запрещён — .claude/docs/node-env-not-production-signal.md): предупреждение
      // безвредно в любой сборке, это обязательное по WCAG 3.3.2 требование к разметке.
      console.error(
        `[Form.Field.MaskedInput] Поле "${fullPath}": не задан formatDescription — формат ввода должен быть известен `
          + 'пользователю до начала ввода (WCAG 3.3.2).',
      )
    }

    const descriptionId = formatDescription ? `${fullPath}-format-description` : undefined

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        {formatDescription && (
          <p id={descriptionId} className="text-muted-foreground mb-1 text-xs">
            {formatDescription}
          </p>
        )}
        <input
          {...fieldState.inputProps}
          onFocus={fieldState.onFocus}
          onBlur={() => {
            fieldState.onBlur()
            field.handleBlur()
          }}
          placeholder={resolved.placeholder}
          disabled={resolved.disabled}
          readOnly={resolved.readOnly}
          data-field-name={fullPath}
          data-slot="input"
          aria-describedby={descriptionId}
          aria-invalid={hasError || undefined}
          className={cn(NATIVE_INPUT_CLASS, 'aria-invalid:border-destructive aria-invalid:ring-destructive/20')}
        />
        {/* Объявление отвергнутого символа — MASK_ENGINE.md §6.6, только "polite", никогда "assertive" */}
        <span aria-live="polite" style={visuallyHiddenStyle}>
          {fieldState.rejectedMessage}
        </span>
      </FieldWrapper>
    )
  },
})
