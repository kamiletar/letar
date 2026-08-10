'use client'

import type { ReactElement } from 'react'
import { useMemo } from 'react'
import { createField } from '../uikit/primitives'
import { shadcnUIKit } from '../uikit/uikit-shadcn'
import type { SelectFieldProps } from './types'

interface NormalizedOption {
  label: React.ReactNode
  value: string
  disabled?: boolean
}

interface SelectFieldState {
  normalizedOptions: NormalizedOption[]
  resolvedClearable: boolean
}

/** Form.Field.Select — shadcn-скин. */
export const FieldSelect = createField<SelectFieldProps, string | number, SelectFieldState>({
  displayName: 'FieldSelect',
  useFieldState: (componentProps, resolved): SelectFieldState => {
    const sourceOptions = componentProps.options ?? resolved.options ?? []

    const normalizedOptions: NormalizedOption[] = useMemo(
      () =>
        sourceOptions.map((opt) => ({
          label: opt.label,
          value: String(opt.value),
          disabled: opt.disabled,
        })),
      [sourceOptions],
    )

    const resolvedClearable = componentProps.clearable ?? !resolved.required

    return { normalizedOptions, resolvedClearable }
  },
  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    const currentValue = field.state.value
    const stringValue = currentValue !== null && currentValue !== undefined ? String(currentValue) : undefined

    return (
      <shadcnUIKit.FieldRoot invalid={hasError} required={resolved.required} disabled={resolved.disabled}>
        <shadcnUIKit.Select
          value={stringValue}
          onValueChange={(newStringValue) => {
            if (componentProps.valueType === 'number') {
              field.handleChange(newStringValue ? Number(newStringValue) : 0)
            } else {
              field.handleChange(newStringValue ?? '')
            }
          }}
          onBlur={field.handleBlur}
          options={fieldState.normalizedOptions}
          label={resolved.label}
          placeholder={resolved.placeholder}
          disabled={resolved.disabled}
          clearable={fieldState.resolvedClearable}
          data-field-name={fullPath}
        />
        <shadcnUIKit.FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolved.helperText} />
      </shadcnUIKit.FieldRoot>
    )
  },
})
