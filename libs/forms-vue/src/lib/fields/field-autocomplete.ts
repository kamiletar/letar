import { defineComponent, h, ref } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'

/**
 * Упрощённая версия `FieldCombobox` — всегда принимает произвольный текст (не только значение
 * из списка), `allowCustomValue` из Chakra-версии всегда включён. Beta: только статичные
 * `suggestions`, без асинхронного поиска. Портирован из `forms-shadcn/field-autocomplete.tsx`.
 */
export const FieldAutocomplete = defineComponent({
  name: 'FieldAutocomplete',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    placeholder: { type: String, required: false, default: undefined },
    suggestions: { type: Array as () => string[], required: false, default: () => [] },
    minChars: { type: Number, required: false, default: 1 },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, placeholder, required, fullPath } = resolveFieldMeta(
      schema,
      props.name,
      props.label,
      props.placeholder,
    )
    const isOpen = ref(false)

    return () =>
      withFieldValidation(form, fullPath, fieldSchema, (field, hasError, errorMessage) => {
        const value = (field.state.value as string) ?? ''
        const options = props.suggestions.filter((s) => {
          if (value.length < props.minChars) { return false }
          return s.toLowerCase().includes(value.toLowerCase())
        })

        return h('div', { class: 'letar-field', 'data-field-name': props.name }, [
          label ? h('span', { class: 'letar-field__label' }, `${label}${required ? ' *' : ''}`) : null,
          h('div', { class: 'letar-field__autocomplete' }, [
            h('input', {
              class: 'letar-field__control',
              type: 'text',
              value,
              placeholder: placeholder ?? 'Начните вводить...',
              'data-field-name': props.name,
              onInput: (e: Event) => {
                field.handleChange((e.target as HTMLInputElement).value)
                isOpen.value = true
              },
              onFocus: () => (isOpen.value = true),
              onBlur: () => {
                isOpen.value = false
                field.handleBlur()
              },
            }),
            isOpen.value && options.length > 0
              ? h(
                'ul',
                { class: 'letar-field__autocomplete-list', role: 'listbox' },
                options.map((s) =>
                  h('li', {
                    key: s,
                    role: 'option',
                    class: 'letar-field__autocomplete-option',
                    // mousedown, не click — успевает сработать раньше onBlur инпута
                    onMousedown: (e: Event) => {
                      e.preventDefault()
                      field.handleChange(s)
                      isOpen.value = false
                    },
                  }, s)
                ),
              )
              : null,
          ]),
          hasError ? h('p', { class: 'letar-field__error', role: 'alert' }, errorMessage) : null,
        ])
      })
  },
})
