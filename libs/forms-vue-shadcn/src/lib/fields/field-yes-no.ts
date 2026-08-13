import { resolveFieldMeta, useAppFormContext, withFieldValidation } from '@letar/forms-vue/core'
import { cn } from '@letar/tailwind-utils'
import { defineComponent, h } from 'vue'

/** Два кликабельных блока для бинарного выбора (значение — `boolean`). Не использует UIKit. */
export const FieldYesNo = defineComponent({
  name: 'FieldYesNo',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    yesLabel: { type: String, required: false, default: 'Да' },
    noLabel: { type: String, required: false, default: 'Нет' },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, required } = resolveFieldMeta(schema, props.name, props.label, undefined)

    return () =>
      withFieldValidation(form, props.name, fieldSchema, (field, hasError, errorMessage) => {
        const value = field.state.value as boolean | undefined
        const select = (val: boolean) => field.handleChange(val)

        const optionClass = (selected: boolean, tone: 'green' | 'red') =>
          cn(
            'flex-1 rounded-lg border-2 p-4 text-center text-sm font-medium transition-colors cursor-pointer',
            selected
              ? tone === 'green'
                ? 'border-green-500 bg-green-50 text-green-600'
                : 'border-red-500 bg-red-50 text-red-600'
              : 'border-input',
          )

        return h('div', { class: 'flex flex-col gap-2', 'data-field-name': props.name }, [
          label ? h('span', { class: 'text-sm font-medium' }, `${label}${required ? ' *' : ''}`) : null,
          h('div', { class: 'flex gap-3' }, [
            h('div', {
              class: optionClass(value === true, 'green'),
              role: 'radio',
              'aria-checked': value === true,
              onClick: () => select(true),
            }, props.yesLabel),
            h('div', {
              class: optionClass(value === false, 'red'),
              role: 'radio',
              'aria-checked': value === false,
              onClick: () => select(false),
            }, props.noLabel),
          ]),
          hasError ? h('p', { class: 'text-destructive text-sm', role: 'alert' }, errorMessage) : null,
        ])
      })
  },
})
