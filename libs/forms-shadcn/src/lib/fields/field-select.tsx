'use client'

import {
  CREATE_OPTION_VALUE,
  type CreatedOption,
  isCreateOptionValue,
  mergeCreatedOptions,
} from '@letar/forms-core/uikit'
import type { ReactElement } from 'react'
import { useCallback, useMemo, useRef, useState } from 'react'
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
  /** Добавляет опцию, возвращённую `onCreate`, в локальный список */
  addCreatedOption: (option: CreatedOption) => void
  /** `true`, пока `onCreate` не завершился (повторный выбор пункта игнорируется) */
  creatingRef: { current: boolean }
}

/** Form.Field.Select — shadcn-скин. */
export const FieldSelect = createField<SelectFieldProps, string | number, SelectFieldState>({
  displayName: 'FieldSelect',
  useFieldState: (componentProps, resolved): SelectFieldState => {
    const sourceOptions = componentProps.options ?? resolved.options ?? []

    // Опции, созданные через `onCreate`, живут локально, пока поле смонтировано
    const [createdOptions, setCreatedOptions] = useState<CreatedOption[]>([])
    const addCreatedOption = useCallback((option: CreatedOption) => {
      setCreatedOptions((prev) => [...prev, option])
    }, [])
    const creatingRef = useRef(false)
    const hasOnCreate = !!componentProps.onCreate
    const createLabel = componentProps.createLabel ?? 'Добавить…'

    const normalizedOptions: NormalizedOption[] = useMemo(() => {
      // Опция приложения сильнее созданной с тем же значением — дубля после перезагрузки нет
      const merged = mergeCreatedOptions(sourceOptions, createdOptions)
      const normalized: NormalizedOption[] = merged.map((opt) => ({
        label: opt.label,
        value: String(opt.value),
        disabled: opt.disabled,
      }))
      // Служебный пункт: перехватывается в onValueChange, в форму не попадает
      return hasOnCreate ? [...normalized, { label: `+ ${createLabel}`, value: CREATE_OPTION_VALUE }] : normalized
    }, [sourceOptions, createdOptions, hasOnCreate, createLabel])

    const resolvedClearable = componentProps.clearable ?? !resolved.required

    return { normalizedOptions, resolvedClearable, addCreatedOption, creatingRef }
  },
  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    const currentValue = field.state.value
    const stringValue = currentValue !== null && currentValue !== undefined ? String(currentValue) : undefined

    return (
      <shadcnUIKit.FieldRoot invalid={hasError} required={resolved.required} disabled={resolved.disabled}>
        <shadcnUIKit.Select
          value={stringValue}
          onValueChange={(newStringValue) => {
            const applyValue = (raw: string | undefined) => {
              if (componentProps.valueType === 'number') {
                field.handleChange(raw ? Number(raw) : 0)
              } else {
                field.handleChange(raw ?? '')
              }
            }

            if (isCreateOptionValue(newStringValue)) {
              // Служебный пункт: значение не применяется. Ошибки `onCreate` — забота приложения,
              // всплывают как unhandled rejection, здесь не глотаются
              if (componentProps.onCreate && !fieldState.creatingRef.current) {
                fieldState.creatingRef.current = true
                void componentProps.onCreate('').then((created) => {
                  if (created) {
                    fieldState.addCreatedOption(created)
                    applyValue(String(created.value))
                  }
                }).finally(() => {
                  fieldState.creatingRef.current = false
                })
              }
              return
            }
            applyValue(newStringValue)
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
