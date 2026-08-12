'use client'

import { Input, Text } from '@chakra-ui/react'
import { useMaskField } from '@letar/forms-react'
import { useStore } from '@tanstack/react-form'
import { type CSSProperties, type ReactElement, useState } from 'react'
import type { MaskedInputFieldProps } from '../../types'
import { createField, FieldWrapper } from '../base'

/** Стандартная визуально-скрытая, но доступная скринридеру разметка (не зависит от Chakra-версии). */
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
 * Form.Field.MaskedInput — движок масок (Фаза 8, Этап 3), замена `use-mask-input`.
 *
 * API спроектирован заново (MASK_ENGINE.md §8, решение 3) — опции `showMaskOnFocus`,
 * `showMaskOnHover`, `clearIncomplete`, `autoUnmask` из imask не переносятся: нет продуктовых
 * потребителей старого API, ломать нечего.
 *
 * @example Код подразделения
 * ```tsx
 * <Form.Field.MaskedInput name="departmentCode" label="Код подразделения" mask="999-999"
 *   formatDescription="Формат: 3 цифры, дефис, 3 цифры" />
 * ```
 *
 * @example Несколько масок (движок выбирает лучше подходящую)
 * ```tsx
 * <Form.Field.MaskedInput name="phone" mask={['9999-9999', '99999-9999']}
 *   formatDescription="8 или 9 цифр номера" />
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
    // Без mask поле — обычный passthrough-инпут, не «зависшая» маска в неопределённом состоянии.
    const resolvedMaskProp = mask ?? (() => null)

    // `<form.Field>` ещё не смонтирован на этом этапе (useFieldState вызывается до него) —
    // `useStore` даёт живое значение поля напрямую из хранилища формы, тот же приём, что
    // в `FieldCity`/`FieldAddress` (см. их комментарии про «Cannot update a component while
    // rendering a different component» при попытке синхронизировать значение через effect).
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
      // Без NODE_ENV-гейта (запрещён — .claude/docs/node-env-not-production-signal.md, next build
      // ставит его в 'production' и в dev, и на staging): предупреждение безвредно в любой сборке,
      // это не секьюрити-развилка, а обязательное по WCAG 3.3.2 требование к разметке.
      console.error(
        `[Form.Field.MaskedInput] Поле "${fullPath}": не задан formatDescription — формат ввода должен быть известен `
          + 'пользователю до начала ввода (WCAG 3.3.2).',
      )
    }

    const descriptionId = formatDescription ? `${fullPath}-format-description` : undefined

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        {formatDescription && (
          <Text id={descriptionId} fontSize="xs" color="fg.muted" mb={1}>
            {formatDescription}
          </Text>
        )}
        <Input
          {...fieldState.inputProps}
          onFocus={fieldState.onFocus}
          onBlur={() => {
            fieldState.onBlur()
            field.handleBlur()
          }}
          placeholder={resolved.placeholder}
          data-field-name={fullPath}
          aria-describedby={descriptionId}
        />
        {/* Объявление отвергнутого символа — MASK_ENGINE.md §6.6, только "polite", никогда "assertive" */}
        <span aria-live="polite" style={visuallyHiddenStyle}>
          {fieldState.rejectedMessage}
        </span>
      </FieldWrapper>
    )
  },
})
