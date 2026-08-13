import { defineComponent, h, type PropType, ref } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'

export interface FieldComboboxOption {
  value: string
  label: string
  disabled?: boolean
}

/**
 * Beta-упрощение (как у React-версии): только статичные `options`, фильтрация по вхождению
 * подстроки в `label`, без асинхронного поиска и группировки. Портирован из
 * `forms-shadcn/field-combobox.tsx`.
 */
export const FieldCombobox = defineComponent({
  name: 'FieldCombobox',
  props: {
    name: { type: String, required: true },
    label: { type: String as PropType<string | undefined>, required: false, default: undefined },
    placeholder: { type: String as PropType<string | undefined>, required: false, default: undefined },
    options: { type: Array as PropType<FieldComboboxOption[]>, required: true },
    minChars: { type: Number, required: false, default: 0 },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, placeholder: metaPlaceholder, required, fullPath } = resolveFieldMeta(
      schema,
      props.name,
      props.label,
      props.placeholder,
    )
    const placeholder = metaPlaceholder ?? 'Поиск...'
    const inputValue = ref('')
    const isOpen = ref(false)

    return () =>
      withFieldValidation(form, fullPath, fieldSchema, (field, hasError, errorMessage) => {
        const filtered = (() => {
          if (inputValue.value.length < props.minChars) { return [] }
          if (!inputValue.value) { return props.options }
          const needle = inputValue.value.toLowerCase()
          return props.options.filter((opt) => opt.label.toLowerCase().includes(needle))
        })()

        return h('div', { class: 'letar-field', 'data-field-name': props.name }, [
          label ? h('span', { class: 'letar-field__label' }, `${label}${required ? ' *' : ''}`) : null,
          h('div', { class: 'letar-field__combobox' }, [
            h('input', {
              class: 'letar-field__control',
              type: 'text',
              value: inputValue.value,
              placeholder,
              'data-field-name': props.name,
              onInput: (e: Event) => {
                inputValue.value = (e.target as HTMLInputElement).value
                isOpen.value = true
              },
              onFocus: () => (isOpen.value = true),
              onBlur: () => {
                isOpen.value = false
                field.handleBlur()
              },
            }),
            isOpen.value && filtered.length > 0
              ? h(
                'ul',
                { class: 'letar-field__combobox-list', role: 'listbox' },
                filtered.map((opt) =>
                  h('li', {
                    key: opt.value,
                    role: 'option',
                    'aria-disabled': opt.disabled,
                    class: 'letar-field__combobox-option',
                    onMousedown: (e: Event) => {
                      e.preventDefault()
                      if (opt.disabled) { return }
                      field.handleChange(opt.value)
                      inputValue.value = opt.label
                      isOpen.value = false
                    },
                  }, opt.label)
                ),
              )
              : null,
          ]),
          hasError ? h('p', { class: 'letar-field__error', role: 'alert' }, errorMessage) : null,
        ])
      })
  },
})
