import { defineComponent, h, type PropType } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'

export interface SegmentedGroupOption {
  value: string
  label: string
  disabled?: boolean
}

/**
 * Сегментированный переключатель — визуально связанные кнопки для одиночного выбора, `string`.
 * В `forms-shadcn` не портирован (только Chakra-версия, `libs/forms/.../field-segmented-group.tsx`)
 * — здесь порт логики (single-select, `role="radiogroup"`/`role="radio"`, тот же паттерн, что
 * `FieldRadioGroup`) на голой разметке без Chakra `SegmentGroup`.
 */
export const FieldSegmentedGroup = defineComponent({
  name: 'FieldSegmentedGroup',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    options: { type: Array as PropType<SegmentedGroupOption[]>, required: true },
    orientation: { type: String as PropType<'horizontal' | 'vertical'>, required: false, default: 'horizontal' },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, required, fullPath } = resolveFieldMeta(schema, props.name, props.label, undefined)

    return () =>
      withFieldValidation(form, fullPath, fieldSchema, (field, hasError, errorMessage) => {
        const currentValue = (field.state.value as string) ?? ''

        return h('div', { class: 'letar-field', 'data-field-name': props.name }, [
          label ? h('span', { class: 'letar-field__label' }, `${label}${required ? ' *' : ''}`) : null,
          h(
            'div',
            {
              role: 'radiogroup',
              'aria-label': label,
              'data-field-name': props.name,
              class: 'letar-field__segmented-group',
              'data-orientation': props.orientation,
            },
            props.options.map((opt) =>
              h('button', {
                key: opt.value,
                type: 'button',
                role: 'radio',
                'aria-checked': currentValue === opt.value,
                disabled: opt.disabled,
                'data-selected': currentValue === opt.value || undefined,
                class: 'letar-field__segment',
                onClick: () => field.handleChange(opt.value),
              }, opt.label)
            ),
          ),
          hasError ? h('p', { class: 'letar-field__error', role: 'alert' }, errorMessage) : null,
        ])
      })
  },
})
