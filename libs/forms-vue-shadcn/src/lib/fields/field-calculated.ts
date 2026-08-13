import { useAppFormContext, useFormGroup } from '@letar/forms-vue/core'
import { defineComponent, h, type PropType, watch } from 'vue'
import { rekaUIKit } from '../uikit/uikit-reka'

/**
 * Вычисляемое поле формы — значение readonly, пересчитывается при изменении значений формы
 * (`deps`, если задан, ограничивает пересчёт). Реактивность — `form.useStore`
 * (`@tanstack/vue-form`), Vue-эквивалент React `useSyncExternalStore` из `use-computed-value.ts`.
 * Портирован из `forms-shadcn/field-calculated.tsx`.
 */
export const FieldCalculated = defineComponent({
  name: 'FieldCalculated',
  props: {
    name: { type: String as PropType<string | undefined>, required: false, default: undefined },
    label: { type: String as PropType<string | undefined>, required: false, default: undefined },
    compute: { type: Function as PropType<(values: Record<string, unknown>) => unknown>, required: true },
    format: { type: Function as PropType<(value: unknown) => string>, required: false, default: undefined },
    hidden: { type: Boolean, required: false, default: false },
    helperText: { type: String as PropType<string | undefined>, required: false, default: undefined },
  },
  setup(props) {
    const { form } = useAppFormContext()
    const parentGroup = useFormGroup()
    const fullPath = props.name ? (parentGroup ? `${parentGroup.name}.${props.name}` : props.name) : undefined

    const valuesRef = form.useStore((state: { values: Record<string, unknown> }) => state.values)

    if (fullPath) {
      watch(
        valuesRef,
        (values) => {
          const computed = props.compute(values as Record<string, unknown>)
          if (!Object.is(form.getFieldValue(fullPath), computed)) {
            form.setFieldValue(fullPath, computed)
          }
        },
        { immediate: true, deep: true },
      )
    }

    return () => {
      const computedValue = props.compute((valuesRef.value ?? {}) as Record<string, unknown>)
      if (props.hidden) { return null }

      const displayValue = props.format ? props.format(computedValue) : String(computedValue ?? '')

      return rekaUIKit.FieldRoot({
        invalid: false,
        disabled: false,
        children: [
          rekaUIKit.FieldLabel({ label: props.label }),
          h('p', { class: 'py-2 text-sm font-medium', 'data-testid': 'calculated-value' }, displayValue),
          rekaUIKit.FieldError({ hasError: false, errorMessage: undefined, helperText: props.helperText }),
        ] as unknown as ReturnType<typeof h>,
      })
    }
  },
})
