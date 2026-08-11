'use client'

import { formatFieldErrors, hasFieldErrors, useDeclarativeForm, useFormGroup, useResolvedFieldProps } from '@letar/forms-react'
import { type ReactElement, useEffect, useRef, useState } from 'react'
import { shadcnUIKit } from '../uikit/uikit-shadcn'
import type { CascadingSelectFieldProps, SelectOption } from './types'

/**
 * Form.Field.CascadingSelect — shadcn-скин. Значение — `string`.
 *
 * Компонует `form.Subscribe` напрямую (не `createField()`) — тот же приём, что у
 * `FieldCascadingSelect` Chakra-версии: рендер зависит от значения ДРУГОГО поля
 * (`dependsOn`), а не только от своего собственного состояния. Портирован без изменений
 * логики: загрузка опций по значению родителя, сброс при смене родителя, disable пока родитель
 * пуст. Beta: без generic-параметров `<TParent, TValue>` (только `string`), без визуального
 * спиннера загрузки (только disabled-state на время `loadOptions`).
 */
export function FieldCascadingSelect(props: CascadingSelectFieldProps): ReactElement {
  const {
    name,
    dependsOn,
    loadOptions,
    initialOptions = [],
    clearOnParentChange = true,
    disableWhenParentEmpty = true,
    clearable,
    placeholderWhenDisabled,
    ...baseProps
  } = props

  const { form } = useDeclarativeForm()
  const parentGroup = useFormGroup()
  const { fullPath, label, placeholder, helperText, required, disabled } = useResolvedFieldProps(name, baseProps)

  const fullDependsOnPath = parentGroup ? `${parentGroup.name}.${dependsOn}` : dependsOn

  const parentSelector = (state: { values: Record<string, unknown> }): string | undefined => {
    const parts = fullDependsOnPath.split('.')
    let value: unknown = state.values
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[part]
      } else {
        return undefined
      }
    }
    return value as string | undefined
  }

  return (
    <form.Subscribe selector={parentSelector}>
      {(parentValue: string | undefined) => (
        <CascadingSelectContent
          parentValue={parentValue}
          form={form}
          fullPath={fullPath}
          label={label}
          placeholder={placeholder}
          helperText={helperText}
          required={required}
          disabled={disabled}
          loadOptions={loadOptions}
          initialOptions={initialOptions}
          clearOnParentChange={clearOnParentChange}
          disableWhenParentEmpty={disableWhenParentEmpty}
          clearable={clearable}
          placeholderWhenDisabled={placeholderWhenDisabled}
        />
      )}
    </form.Subscribe>
  )
}

FieldCascadingSelect.displayName = 'FieldCascadingSelect'

interface CascadingSelectContentProps {
  parentValue: string | undefined
  form: ReturnType<typeof useDeclarativeForm>['form']
  fullPath: string
  label: React.ReactNode
  placeholder: string | undefined
  helperText: React.ReactNode
  required: boolean | undefined
  disabled: boolean | undefined
  loadOptions: CascadingSelectFieldProps['loadOptions']
  initialOptions: SelectOption[]
  clearOnParentChange: boolean
  disableWhenParentEmpty: boolean
  clearable: boolean | undefined
  placeholderWhenDisabled: string | undefined
}

function CascadingSelectContent({
  parentValue,
  form,
  fullPath,
  label,
  placeholder,
  helperText,
  required,
  disabled,
  loadOptions,
  initialOptions,
  clearOnParentChange,
  disableWhenParentEmpty,
  clearable,
  placeholderWhenDisabled,
}: CascadingSelectContentProps): ReactElement {
  const [options, setOptions] = useState<SelectOption[]>(initialOptions)
  const [isLoading, setIsLoading] = useState(false)
  const prevParentValueRef = useRef<string | undefined>(parentValue)
  const loadOptionsRef = useRef(loadOptions)
  loadOptionsRef.current = loadOptions

  useEffect(() => {
    const doLoad = async () => {
      if (!parentValue) {
        setOptions(initialOptions)
        return
      }
      setIsLoading(true)
      try {
        const result = await loadOptionsRef.current(parentValue)
        setOptions(result)
      } catch {
        setOptions([])
      } finally {
        setIsLoading(false)
      }
    }
    void doLoad()
  }, [parentValue, initialOptions])

  useEffect(() => {
    if (clearOnParentChange && prevParentValueRef.current !== parentValue) {
      if (prevParentValueRef.current !== undefined) {
        form.setFieldValue(fullPath, '')
      }
      prevParentValueRef.current = parentValue
    }
  }, [parentValue, clearOnParentChange, form, fullPath])

  const isParentEmpty = !parentValue
  const isDisabled = disabled || isLoading || (disableWhenParentEmpty && isParentEmpty)
  const effectivePlaceholder = isParentEmpty && placeholderWhenDisabled ? placeholderWhenDisabled : placeholder
  const resolvedClearable = clearable ?? !required

  return (
    <form.Field name={fullPath}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {(field: any) => {
        const currentValue = field.state.value as string | undefined
        const errors = field.state.meta.errors
        const hasError = hasFieldErrors(errors)
        return (
          <shadcnUIKit.FieldRoot invalid={hasError} required={required} disabled={isDisabled}>
            <shadcnUIKit.Select
              value={currentValue}
              onValueChange={(v) => field.handleChange(v ?? '')}
              onBlur={field.handleBlur}
              options={options.map((opt) => ({ label: opt.label, value: String(opt.value), disabled: opt.disabled }))}
              label={label}
              placeholder={effectivePlaceholder}
              disabled={isDisabled}
              clearable={resolvedClearable}
              data-field-name={fullPath}
            />
            <shadcnUIKit.FieldError
              hasError={hasError}
              errorMessage={formatFieldErrors(errors)}
              helperText={helperText}
            />
          </shadcnUIKit.FieldRoot>
        )
      }}
    </form.Field>
  )
}
