'use client'

import { getOptionLabel, groupOptions } from '@letar/forms-core/uikit'
import type { ReactElement } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { cn } from '@letar/tailwind-utils'
import type { ListboxFieldProps, ListboxOption } from './types'

function optionButtonClass(selected: boolean, disabled: boolean | undefined): string {
  return cn(
    'w-full rounded-md px-3 py-2 text-left text-sm outline-none',
    selected ? 'bg-primary text-primary-foreground' : 'hover:bg-accent hover:text-accent-foreground',
    disabled && 'pointer-events-none opacity-50',
  )
}

/**
 * Form.Field.Listbox — shadcn-скин.
 *
 * В отличие от Select/Combobox все опции видны сразу — список кнопок с `aria-selected`, не
 * выпадающий список. Нет отдельного Radix-примитива для listbox — обычные кнопки, тот же класс
 * стилей, что у пунктов `shadcnUIKit.Combobox`. Группировка через `groupOptions` из
 * `@letar/forms-core/uikit` (framework-free, не требует адаптера).
 */
export const FieldListbox = createField<ListboxFieldProps, string | string[]>({
  displayName: 'FieldListbox',

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => {
    const { options, selectionMode = 'single' } = componentProps
    const currentValue = field.state.value as string | string[] | undefined
    const valueArray: string[] = Array.isArray(currentValue) ? currentValue : currentValue ? [currentValue] : []

    const toggle = (optionValue: string) => {
      if (selectionMode === 'single') {
        field.handleChange(valueArray[0] === optionValue ? '' : optionValue)
        return
      }
      const next = valueArray.includes(optionValue)
        ? valueArray.filter((v) => v !== optionValue)
        : [...valueArray, optionValue]
      field.handleChange(next)
    }

    const groups = groupOptions(options)

    const renderOption = (opt: ListboxOption) => {
      const optValue = String(opt.value)
      const selected = valueArray.includes(optValue)
      return (
        <button
          key={optValue}
          type="button"
          role="option"
          aria-selected={selected}
          disabled={opt.disabled || resolved.disabled}
          onClick={() => toggle(optValue)}
          className={optionButtonClass(selected, opt.disabled)}
        >
          {getOptionLabel(opt)}
        </button>
      )
    }

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        <div
          role="listbox"
          aria-multiselectable={selectionMode === 'multiple'}
          data-field-name={fullPath}
          className="space-y-1"
        >
          {groups
            ? Array.from(groups.entries()).map(([groupName, groupOpts]) => (
              <div key={groupName}>
                {groupName && <div className="text-muted-foreground px-3 py-1 text-xs font-medium">{groupName}</div>}
                {groupOpts.map(renderOption)}
              </div>
            ))
            : options.map(renderOption)}
        </div>
      </FieldWrapper>
    )
  },
})
