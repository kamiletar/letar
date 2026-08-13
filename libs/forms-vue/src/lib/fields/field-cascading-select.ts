import { defineComponent, h, type PropType, ref, watch } from 'vue'
import { useAppFormContext } from '../core/form-context'
import { useFormGroup } from '../core/form-group'

export interface CascadingSelectOption {
  value: string
  label: string
  disabled?: boolean
}

/**
 * Зависимый select: список опций зависит от значения ДРУГОГО поля (`dependsOn`), а не только
 * от своего состояния — поэтому собран напрямую через `form.useStore(selector)`
 * (`@tanstack/vue-form`, Vue-аналог React `form.Subscribe`), не через `resolveFieldMeta`/
 * `withFieldValidation` (у них нет доступа к значению постороннего поля). Портирован из
 * `forms-shadcn/field-cascading-select.tsx`: загрузка опций по значению родителя, сброс при
 * смене родителя, disable пока родитель пуст.
 */
export const FieldCascadingSelect = defineComponent({
  name: 'FieldCascadingSelect',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    dependsOn: { type: String, required: true },
    loadOptions: {
      type: Function as PropType<(parentValue: string | undefined) => Promise<CascadingSelectOption[]>>,
      required: true,
    },
    initialOptions: { type: Array as PropType<CascadingSelectOption[]>, required: false, default: () => [] },
    clearOnParentChange: { type: Boolean, required: false, default: true },
    disableWhenParentEmpty: { type: Boolean, required: false, default: true },
    placeholderWhenDisabled: { type: String, required: false, default: undefined },
  },
  setup(props) {
    const { form } = useAppFormContext()
    const parentGroup = useFormGroup()
    const fullPath = parentGroup ? `${parentGroup.name}.${props.name}` : props.name
    const fullDependsOnPath = parentGroup ? `${parentGroup.name}.${props.dependsOn}` : props.dependsOn

    const parentValueRef = form.useStore((state: { values: Record<string, unknown> }) => {
      const parts = fullDependsOnPath.split('.')
      let value: unknown = state.values
      for (const part of parts) {
        value = value && typeof value === 'object' ? (value as Record<string, unknown>)[part] : undefined
      }
      return value as string | undefined
    })

    const options = ref<CascadingSelectOption[]>(props.initialOptions)
    const isLoading = ref(false)
    let prevParentValue: string | undefined = parentValueRef.value

    watch(
      parentValueRef,
      async (parentValue) => {
        if (props.clearOnParentChange && prevParentValue !== parentValue && prevParentValue !== undefined) {
          form.setFieldValue(fullPath, '')
        }
        prevParentValue = parentValue

        if (!parentValue) {
          options.value = props.initialOptions
          return
        }
        isLoading.value = true
        try {
          options.value = await props.loadOptions(parentValue)
        } catch {
          options.value = []
        } finally {
          isLoading.value = false
        }
      },
      { immediate: true },
    )

    return () =>
      h(
        form.Field,
        { name: fullPath },
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          default: ({ field }: { field: any }) => {
            const errors = (field.state.meta.errors ?? []) as unknown[]
            const hasError = errors.length > 0
            const firstError = errors[0] as { message?: string } | string | undefined
            const errorMessage = hasError
              ? typeof firstError === 'string' ? firstError : firstError?.message ?? ''
              : ''

            const isParentEmpty = !parentValueRef.value
            const isDisabled = isLoading.value || (props.disableWhenParentEmpty && isParentEmpty)
            const effectivePlaceholder = isParentEmpty && props.placeholderWhenDisabled
              ? props.placeholderWhenDisabled
              : undefined

            return h('div', { class: 'letar-field', 'data-field-name': props.name }, [
              props.label ? h('span', { class: 'letar-field__label' }, props.label) : null,
              h(
                'select',
                {
                  class: 'letar-field__control',
                  'data-field-name': props.name,
                  disabled: isDisabled,
                  value: field.state.value ?? '',
                  onChange: (e: Event) => field.handleChange((e.target as HTMLSelectElement).value),
                  onBlur: field.handleBlur,
                },
                [
                  h('option', { value: '' }, effectivePlaceholder ?? ''),
                  ...options.value.map((opt) =>
                    h('option', { key: opt.value, value: opt.value, disabled: opt.disabled }, opt.label)
                  ),
                ],
              ),
              hasError ? h('p', { class: 'letar-field__error', role: 'alert' }, errorMessage) : null,
            ])
          },
        },
      )
  },
})
