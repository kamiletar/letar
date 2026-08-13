import { defineComponent, h, type PropType } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'

export interface RadioCardOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

/**
 * Одиночный выбор карточками — `string`, `role="radio"` в контейнере `role="radiogroup"`.
 * Портирован из `forms-shadcn/field-radio-card.tsx` (логика 1:1).
 */
export const FieldRadioCard = defineComponent({
  name: 'FieldRadioCard',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    options: { type: Array as PropType<RadioCardOption[]>, required: true },
    orientation: { type: String as PropType<'horizontal' | 'vertical'>, required: false, default: 'horizontal' },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, required, fullPath } = resolveFieldMeta(schema, props.name, props.label, undefined)

    return () =>
      withFieldValidation(form, fullPath, fieldSchema, (field, hasError, errorMessage) => {
        const currentValue = field.state.value as string | undefined

        return h('div', { class: 'letar-field', 'data-field-name': props.name }, [
          label ? h('span', { class: 'letar-field__label' }, `${label}${required ? ' *' : ''}`) : null,
          h(
            'div',
            {
              role: 'radiogroup',
              'aria-label': label,
              'data-field-name': props.name,
              class: 'letar-field__card-group',
              'data-orientation': props.orientation,
            },
            props.options.map((opt) => {
              const selected = currentValue === opt.value
              return h('button', {
                key: opt.value,
                type: 'button',
                role: 'radio',
                'aria-checked': selected,
                disabled: opt.disabled,
                'data-selected': selected || undefined,
                class: 'letar-field__card',
                onClick: () => field.handleChange(opt.value),
              }, [
                h('span', { class: 'letar-field__card-label' }, opt.label),
                opt.description ? h('span', { class: 'letar-field__card-description' }, opt.description) : null,
              ])
            }),
          ),
          hasError ? h('p', { class: 'letar-field__error', role: 'alert' }, errorMessage) : null,
        ])
      })
  },
})
