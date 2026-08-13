import { defineComponent, h, type PropType } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'

export interface ImageChoiceOption {
  value: string
  label: string
  image: string
  description?: string
}

/**
 * Grid карточек с изображениями — `string` (single) или `string[]` (multiple). Портирован из
 * `forms-shadcn/field-image-choice.tsx` (логика 1:1: toggle, single/multiple selection).
 */
export const FieldImageChoice = defineComponent({
  name: 'FieldImageChoice',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    options: { type: Array as PropType<ImageChoiceOption[]>, required: true },
    columns: { type: Number, required: false, default: 3 },
    multiple: { type: Boolean, required: false, default: false },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, required, fullPath } = resolveFieldMeta(schema, props.name, props.label, undefined)

    return () =>
      withFieldValidation(form, fullPath, fieldSchema, (field, hasError, errorMessage) => {
        const value = field.state.value as string | string[] | undefined

        const isSelected = (optValue: string): boolean =>
          props.multiple ? Array.isArray(value) && value.includes(optValue) : value === optValue

        const handleSelect = (optValue: string) => {
          if (props.multiple) {
            const current = Array.isArray(value) ? value : []
            const next = current.includes(optValue) ? current.filter((v) => v !== optValue) : [...current, optValue]
            field.handleChange(next)
          } else {
            field.handleChange(optValue)
          }
        }

        return h('div', { class: 'letar-field', 'data-field-name': props.name }, [
          label ? h('span', { class: 'letar-field__label' }, `${label}${required ? ' *' : ''}`) : null,
          h(
            'div',
            {
              role: 'group',
              'aria-label': label,
              'data-field-name': props.name,
              class: 'letar-field__image-choice',
              style: { gridTemplateColumns: `repeat(${props.columns}, minmax(0, 1fr))` },
            },
            props.options.map((opt) => {
              const selected = isSelected(opt.value)
              return h('button', {
                key: opt.value,
                type: 'button',
                role: props.multiple ? 'checkbox' : 'radio',
                'aria-checked': selected,
                'data-selected': selected || undefined,
                class: 'letar-field__image-choice-item',
                onClick: () => handleSelect(opt.value),
              }, [
                h('img', { src: opt.image, alt: opt.label, class: 'letar-field__image-choice-img' }),
                h('span', { class: 'letar-field__image-choice-label' }, opt.label),
                opt.description
                  ? h('span', { class: 'letar-field__image-choice-description' }, opt.description)
                  : null,
              ])
            }),
          ),
          hasError ? h('p', { class: 'letar-field__error', role: 'alert' }, errorMessage) : null,
        ])
      })
  },
})
