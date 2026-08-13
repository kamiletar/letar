import { defineComponent, h, type PropType } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'

/**
 * Шкала Лайкерта (headless) — значение `number` (1-based индекс точки). `anchors` — проп сверх
 * контракта `createField` (массив), поле собрано напрямую как `FieldRadioGroup`/`FieldYesNo`:
 * `role="radiogroup"` на обёртке, `role="radio"`/`aria-checked` на каждой точке. Портировано из
 * `libs/forms-shadcn/src/lib/fields/field-likert.tsx` без изменений логики.
 */
export const FieldLikert = defineComponent({
  name: 'FieldLikert',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    anchors: { type: Array as PropType<string[]>, required: true },
    showNumbers: { type: Boolean, required: false, default: false },
    disabled: { type: Boolean, required: false, default: false },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, required, fullPath } = resolveFieldMeta(schema, props.name, props.label, undefined)

    return () =>
      withFieldValidation(form, fullPath, fieldSchema, (field, hasError, errorMessage) => {
        const value = field.state.value as number | undefined

        const handleSelect = (point: number) => {
          if (props.disabled) {
            return
          }
          field.handleChange(point)
        }

        return h('div', { class: 'letar-field', 'data-field-name': props.name }, [
          label ? h('span', { class: 'letar-field__label' }, `${label}${required ? ' *' : ''}`) : null,
          h(
            'div',
            {
              role: 'radiogroup',
              'aria-label': label,
              'data-field-name': props.name,
              class: 'letar-field__likert',
            },
            props.anchors.map((anchor, i) => {
              const point = i + 1
              const selected = value === point
              return h(
                'button',
                {
                  key: point,
                  type: 'button',
                  role: 'radio',
                  'aria-checked': selected,
                  disabled: props.disabled,
                  onClick: () => handleSelect(point),
                  class: 'letar-field__likert-option',
                  'data-selected': selected,
                },
                [
                  props.showNumbers ? h('span', { class: 'letar-field__likert-number' }, String(point)) : null,
                  h('span', { class: 'letar-field__likert-dot', 'data-selected': selected }),
                  h('span', { class: 'letar-field__likert-anchor', 'data-selected': selected }, anchor),
                ],
              )
            }),
          ),
          hasError ? h('p', { class: 'letar-field__error', role: 'alert' }, errorMessage) : null,
        ])
      })
  },
})
