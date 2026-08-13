import { getOptionLabel, groupOptions } from '@letar/forms-core/uikit'
import { defineComponent, h, type PropType } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'

export interface ListboxOption {
  value: string
  label: string
  disabled?: boolean
  group?: string
}

/**
 * Все опции видны сразу (не выпадающий список) — `string | string[]`, `single`/`multiple`
 * selectionMode. Группировка через `groupOptions` из `@letar/forms-core/uikit`
 * (framework-free). Портирован из `forms-shadcn/field-listbox.tsx`.
 */
export const FieldListbox = defineComponent({
  name: 'FieldListbox',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    options: { type: Array as PropType<ListboxOption[]>, required: true },
    selectionMode: { type: String as PropType<'single' | 'multiple'>, required: false, default: 'single' },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, required, fullPath } = resolveFieldMeta(schema, props.name, props.label, undefined)

    return () =>
      withFieldValidation(form, fullPath, fieldSchema, (field, hasError, errorMessage) => {
        const currentValue = field.state.value as string | string[] | undefined
        const valueArray: string[] = Array.isArray(currentValue) ? currentValue : currentValue ? [currentValue] : []

        const toggle = (optionValue: string) => {
          if (props.selectionMode === 'single') {
            field.handleChange(valueArray[0] === optionValue ? '' : optionValue)
            return
          }
          const next = valueArray.includes(optionValue)
            ? valueArray.filter((v) => v !== optionValue)
            : [...valueArray, optionValue]
          field.handleChange(next)
        }

        const groups = groupOptions(props.options)

        const renderOption = (opt: ListboxOption) => {
          const selected = valueArray.includes(opt.value)
          return h('button', {
            key: opt.value,
            type: 'button',
            role: 'option',
            'aria-selected': selected,
            disabled: opt.disabled,
            'data-selected': selected || undefined,
            class: 'letar-field__listbox-option',
            onClick: () => toggle(opt.value),
          }, getOptionLabel(opt))
        }

        return h('div', { class: 'letar-field', 'data-field-name': props.name }, [
          label ? h('span', { class: 'letar-field__label' }, `${label}${required ? ' *' : ''}`) : null,
          h(
            'div',
            {
              role: 'listbox',
              'aria-multiselectable': props.selectionMode === 'multiple',
              'data-field-name': props.name,
              class: 'letar-field__listbox',
            },
            groups
              ? Array.from(groups.entries()).map(([groupName, groupOpts]) =>
                h('div', { key: groupName || '_' }, [
                  groupName ? h('div', { class: 'letar-field__listbox-group' }, groupName) : null,
                  ...groupOpts.map(renderOption),
                ])
              )
              : props.options.map(renderOption),
          ),
          hasError ? h('p', { class: 'letar-field__error', role: 'alert' }, errorMessage) : null,
        ])
      })
  },
})
