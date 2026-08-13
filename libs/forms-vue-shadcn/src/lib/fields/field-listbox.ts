import { getOptionLabel, groupOptions } from '@letar/forms-core/uikit'
import { resolveFieldMeta, useAppFormContext, withFieldValidation } from '@letar/forms-vue/core'
import { cn } from '@letar/tailwind-utils'
import { defineComponent, h, onErrorCaptured, type PropType, ref } from 'vue'
import { FieldWrapper } from '../uikit/primitives'
import { rekaUIKit } from '../uikit/uikit-reka'

export interface ListboxOption {
  value: string
  label: string
  disabled?: boolean
  group?: string
}

function optionButtonClass(selected: boolean, disabled: boolean | undefined): string {
  return cn(
    'w-full rounded-md px-3 py-2 text-left text-sm outline-none',
    selected ? 'bg-primary text-primary-foreground' : 'hover:bg-accent hover:text-accent-foreground',
    disabled && 'pointer-events-none opacity-50',
  )
}

/**
 * Все опции видны сразу (не выпадающий список) — `string | string[]`, `single`/`multiple`.
 * Группировка через `groupOptions` из `@letar/forms-core/uikit`. Портирован из
 * `forms-shadcn/field-listbox.tsx`.
 */
export const FieldListbox = defineComponent({
  name: 'FieldListbox',
  props: {
    name: { type: String, required: true },
    label: { type: String as PropType<string | undefined>, required: false, default: undefined },
    options: { type: Array as PropType<ListboxOption[]>, required: true },
    selectionMode: { type: String as PropType<'single' | 'multiple'>, required: false, default: 'single' },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, required, fullPath } = resolveFieldMeta(schema, props.name, props.label, undefined)

    const renderError = ref<Error | null>(null)
    onErrorCaptured((error) => {
      renderError.value = error instanceof Error ? error : new Error(String(error))
      console.error(`[@letar/forms-vue-shadcn] Ошибка в поле "${props.name}":`, error)
      return false
    })

    return () => {
      if (renderError.value) {
        return rekaUIKit.ErrorFallback({ fieldName: props.name, message: renderError.value.message })
      }

      return withFieldValidation(form, fullPath, fieldSchema, (field, hasError, errorMessage) => {
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
            class: optionButtonClass(selected, opt.disabled),
            onClick: () => toggle(opt.value),
          }, getOptionLabel(opt))
        }

        return FieldWrapper({
          label,
          required,
          hasError,
          errorMessage,
          children: h(
            'div',
            {
              role: 'listbox',
              'aria-multiselectable': props.selectionMode === 'multiple',
              'data-field-name': props.name,
              class: 'space-y-1',
            },
            groups
              ? Array.from(groups.entries()).map(([groupName, groupOpts]) =>
                h('div', { key: groupName || '_' }, [
                  groupName
                    ? h('div', { class: 'text-muted-foreground px-3 py-1 text-xs font-medium' }, groupName)
                    : null,
                  ...groupOpts.map(renderOption),
                ])
              )
              : props.options.map(renderOption),
          ),
        })
      })
    }
  },
})
