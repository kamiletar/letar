import { useAppFormContext, useFormGroup } from '@letar/forms-vue/core'
import { defineComponent, h, onErrorCaptured, type PropType, ref, watch } from 'vue'
import { rekaUIKit } from '../uikit/uikit-reka'

export interface CascadingSelectOption {
  value: string
  label: string
  disabled?: boolean
}

/**
 * Зависимый select — опции зависят от значения ДРУГОГО поля (`dependsOn`), поэтому собран
 * напрямую через `form.useStore(selector)` (`@tanstack/vue-form`), не через
 * `resolveFieldMeta`/`withFieldValidation`. Портирован из
 * `forms-shadcn/field-cascading-select.tsx`: загрузка опций по значению родителя, сброс при
 * смене родителя, disable пока родитель пуст, `rekaUIKit.Select` вместо голого `<select>`.
 */
export const FieldCascadingSelect = defineComponent({
  name: 'FieldCascadingSelect',
  props: {
    name: { type: String, required: true },
    label: { type: String as PropType<string | undefined>, required: false, default: undefined },
    dependsOn: { type: String, required: true },
    loadOptions: {
      type: Function as PropType<(parentValue: string | undefined) => Promise<CascadingSelectOption[]>>,
      required: true,
    },
    initialOptions: { type: Array as PropType<CascadingSelectOption[]>, required: false, default: () => [] },
    clearOnParentChange: { type: Boolean, required: false, default: true },
    disableWhenParentEmpty: { type: Boolean, required: false, default: true },
    clearable: { type: Boolean as PropType<boolean | undefined>, required: false, default: undefined },
    placeholderWhenDisabled: { type: String as PropType<string | undefined>, required: false, default: undefined },
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

    const renderError = ref<Error | null>(null)
    onErrorCaptured((error) => {
      renderError.value = error instanceof Error ? error : new Error(String(error))
      console.error(`[@letar/forms-vue-shadcn] Ошибка в поле "${props.name}":`, error)
      return false
    })

    return () => {
      if (renderError.value) {
        return rekaUIKit.ErrorFallback({ fieldName: props.name, message: renderError.value.message })
      }

      return h(
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

            return rekaUIKit.FieldRoot({
              invalid: hasError,
              disabled: isDisabled,
              children: [
                rekaUIKit.Select({
                  value: field.state.value as string | undefined,
                  onValueChange: (v) => field.handleChange(v ?? ''),
                  onBlur: field.handleBlur,
                  options: options.value,
                  label: props.label,
                  placeholder: effectivePlaceholder,
                  disabled: isDisabled,
                  clearable: props.clearable,
                  'data-field-name': props.name,
                }),
                rekaUIKit.FieldError({ hasError, errorMessage }),
              ] as unknown as ReturnType<typeof rekaUIKit.Select>,
            })
          },
        },
      )
    }
  },
})
