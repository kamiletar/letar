import { defineComponent, h, type PropType, watch } from 'vue'
import { useAppFormContext } from '../core/form-context'
import { useFormGroup } from '../core/form-group'

/**
 * Вычисляемое поле формы — значение readonly, пересчитывается при изменении любого значения
 * формы (`deps`, если задан, ограничивает пересчёт до перечисленных путей). Реактивность — через
 * `form.useStore` (`@tanstack/vue-form`, Vue-эквивалент `useSyncExternalStore` из React-версии
 * `use-computed-value.ts`) вместо ручной подписки на `form.store` — Vue-идиоматичный путь той же
 * задачи. Портирован из `forms-shadcn/field-calculated.tsx`.
 */
export const FieldCalculated = defineComponent({
  name: 'FieldCalculated',
  props: {
    name: { type: String, required: false, default: undefined },
    label: { type: String, required: false, default: undefined },
    compute: { type: Function as PropType<(values: Record<string, unknown>) => unknown>, required: true },
    format: { type: Function as PropType<(value: unknown) => string>, required: false, default: undefined },
    deps: { type: Array as PropType<string[]>, required: false, default: undefined },
    hidden: { type: Boolean, required: false, default: false },
    helperText: { type: String, required: false, default: undefined },
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

      return h('div', { class: 'letar-field', 'data-field-name': props.name }, [
        props.label ? h('span', { class: 'letar-field__label' }, props.label) : null,
        h('p', { class: 'letar-field__calculated-value', 'data-testid': 'calculated-value' }, displayValue),
        props.helperText ? h('p', { class: 'letar-field__helper' }, props.helperText) : null,
      ])
    }
  },
})
