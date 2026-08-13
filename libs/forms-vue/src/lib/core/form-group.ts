import { defineComponent, inject, type InjectionKey, provide } from 'vue'

/**
 * Vue-эквивалент `FormGroupContextValue` из `@letar/forms-react` (`libs/forms-react/src/lib/context/form-group.tsx`).
 * `FormGroup` не имеет собственного визуального представления — он только задаёт префикс пути для
 * вложенных полей, поэтому у него нет skin-версии в `@letar/forms-vue-shadcn` (см. `libs/forms/PLAN.md`,
 * ту же роль в React-мире играет реэкспорт из `@letar/forms-react` без отдельного файла в `forms-shadcn`).
 */
export interface FormGroupContextValue {
  /** Исходный `name`, переданный этому `FormGroup` */
  originalName: string
  /** Полный dot-путь с учётом всех родительских `FormGroup` */
  name: string
}

const FORM_GROUP_KEY: InjectionKey<FormGroupContextValue> = Symbol('letar-forms-vue-form-group')

export interface FormGroupProps {
  /** Имя группы — конкатенируется с именами родительских групп через точку */
  name: string
}

/**
 * `FormGroup` для построения вложенных путей полей.
 *
 * @example
 * ```ts
 * h(FormGroup, { name: 'info' }, () => [
 *   h(FormGroup, { name: 'base' }, () => [
 *     h(FieldInput, { name: 'title' }), // fullPath: "info.base.title"
 *   ]),
 * ])
 * ```
 */
export const FormGroup = defineComponent({
  name: 'FormGroup',
  props: {
    name: { type: String, required: true },
  },
  setup(props, { slots }) {
    const parentGroup = useFormGroup()

    const contextValue: FormGroupContextValue = {
      originalName: props.name,
      name: parentGroup ? `${parentGroup.name}.${props.name}` : props.name,
    }

    provide(FORM_GROUP_KEY, contextValue)

    return () => slots.default?.()
  },
})

/**
 * Доступ к текущему контексту `FormGroup`.
 *
 * @returns Значение контекста с `originalName` и полным dot-путём `name`, либо `null` вне `FormGroup`
 */
export function useFormGroup(): FormGroupContextValue | null {
  return inject(FORM_GROUP_KEY, null)
}
