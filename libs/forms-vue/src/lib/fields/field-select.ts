import { getFieldMeta } from '@letar/forms-core/schema'
import { defineComponent, h, type PropType } from 'vue'
import { useAppFormContext } from '../form-context'
import { fieldWrapper } from './field-utils'

export interface FieldSelectOption {
  value: string
  label: string
}

/**
 * Select — единственное поле из пяти, которому нужен проп сверх `name`/`label`/`placeholder`
 * (`options`), поэтому оно не построено через `createField` (та фабрика — под однородный
 * набор пропсов пяти остальных полей), а собрано напрямую по тому же контракту контекста.
 */
export const FieldSelect = defineComponent({
  name: 'FieldSelect',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    placeholder: { type: String, required: false, default: undefined },
    options: { type: Array as PropType<FieldSelectOption[]>, required: true },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const meta = getFieldMeta(schema, props.name)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fieldSchema = (schema as any).shape?.[props.name]
    const label = props.label ?? meta.ui?.title
    const placeholder = props.placeholder ?? meta.ui?.placeholder

    return () =>
      h(
        form.Field,
        { name: props.name, validators: fieldSchema ? { onChange: fieldSchema } : undefined },
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          default: ({ field }: { field: any }) => {
            const errors = (field.state.meta.errors ?? []) as unknown[]
            const hasError = errors.length > 0
            const firstError = errors[0] as { message?: string } | string | undefined
            const errorMessage = hasError
              ? typeof firstError === 'string' ? firstError : firstError?.message ?? ''
              : ''

            return fieldWrapper(
              { name: props.name, label, required: meta.required, hasError, errorMessage },
              h(
                'select',
                {
                  id: props.name,
                  name: props.name,
                  class: 'letar-field__control',
                  value: field.state.value,
                  onChange: (event: Event) => field.handleChange((event.target as HTMLSelectElement).value),
                  onBlur: field.handleBlur,
                },
                [
                  placeholder ? h('option', { value: '' }, placeholder) : null,
                  ...props.options.map((option) => h('option', { value: option.value }, option.label)),
                ],
              ),
            )
          },
        },
      )
  },
})
