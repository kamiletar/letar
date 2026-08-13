import { defineComponent, h } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'

/** Ряд кнопок-звёзд на текстовых символах (`★`/`☆`) — без иконки-либы в headless-пакете. */
export const FieldRating = defineComponent({
  name: 'FieldRating',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    count: { type: Number, required: false, default: 5 },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, required } = resolveFieldMeta(schema, props.name, props.label, undefined)

    return () =>
      withFieldValidation(form, props.name, fieldSchema, (field, hasError, errorMessage) => {
        const value = (field.state.value as number | undefined) ?? 0
        const stars = Array.from({ length: props.count }, (_, i) => i + 1)

        return h('div', { class: 'letar-field', 'data-field-name': props.name }, [
          label ? h('span', { class: 'letar-field__label' }, `${label}${required ? ' *' : ''}`) : null,
          h(
            'div',
            { class: 'letar-field__rating', role: 'radiogroup' },
            stars.map((star) =>
              h('button', {
                key: star,
                type: 'button',
                role: 'radio',
                'aria-checked': star === value,
                'aria-label': `${star} из ${props.count}`,
                class: 'letar-field__rating-star',
                'data-selected': star <= value,
                onClick: () => field.handleChange(star),
                onBlur: field.handleBlur,
              }, star <= value ? '★' : '☆')
            ),
          ),
          hasError ? h('p', { class: 'letar-field__error', role: 'alert' }, errorMessage) : null,
        ])
      })
  },
})
