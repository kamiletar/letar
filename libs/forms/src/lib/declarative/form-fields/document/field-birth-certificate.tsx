'use client'

import { Field, Icon, Input, InputGroup } from '@chakra-ui/react'
import { normalizeBirthCertificate, validateBirthCertificate } from '@letar/forms-core/validators/ru'
import { useStore } from '@tanstack/react-form'
import type { ReactElement } from 'react'
import { LuBaby } from 'react-icons/lu'
import type { FieldTooltipMeta } from '../../types'
import { createField, FieldError, FieldLabel } from '../base'

export interface BirthCertificateFieldProps {
  name?: string
  label?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  tooltip?: FieldTooltipMeta
}

interface BirthCertificateFieldState {
  rawValue: string
}

/**
 * Form.Document.BirthCertificate — свидетельство о рождении.
 *
 * БЕЗ маски (MASK_ENGINE.md §7.1, критерий §5.3) — римская часть серии переменной длины
 * (1-5 знаков), структурная маска дала бы ложный отказ. Свободный ввод: пользователь печатает
 * как удобно, нормализация гомоглифов (`|||`→`III`, позиционные X/Х) и разделителей происходит
 * на blur — не на каждый символ, иначе неоконченная римская часть искажается раньше времени.
 */
export const FieldBirthCertificate = createField<BirthCertificateFieldProps, string, BirthCertificateFieldState>({
  displayName: 'FieldBirthCertificate',

  useFieldState: (_props, _resolved, context) => {
    const { form, fullPath } = context
    const rawValue = (useStore(form.store, () => form.getFieldValue(fullPath)) as string | undefined) ?? ''
    return { rawValue }
  },

  render: ({ field, resolved, hasError, errorMessage, fieldState }): ReactElement => {
    const customError = fieldState.rawValue && !validateBirthCertificate(fieldState.rawValue)
      ? 'Формат: римская часть-две буквы № шесть цифр (например, II-МЮ № 123456)'
      : undefined
    const showError = hasError || !!customError
    const displayError = customError ?? errorMessage

    return (
      <Field.Root invalid={showError} required={resolved.required} disabled={resolved.disabled}>
        <FieldLabel label={resolved.label} tooltip={resolved.tooltip} required={resolved.required} />

        <InputGroup
          startElement={
            <Icon color="fg.muted">
              <LuBaby />
            </Icon>
          }
        >
          <Input
            value={fieldState.rawValue}
            onChange={(event) => field.handleChange(event.target.value)}
            onBlur={() => {
              if (fieldState.rawValue) {
                field.handleChange(normalizeBirthCertificate(fieldState.rawValue))
              }
              field.handleBlur()
            }}
            placeholder="II-МЮ № 123456"
          />
        </InputGroup>

        <FieldError hasError={showError} errorMessage={displayError} helperText={resolved.helperText} />
      </Field.Root>
    )
  },
})
