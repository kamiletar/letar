import { resolveFieldMeta, useAppFormContext, withFieldValidation } from '@letar/forms-vue/core'
import { cn } from '@letar/tailwind-utils'
import { defineComponent, h, onErrorCaptured, type PropType, ref } from 'vue'
import { FieldWrapper } from '../uikit/primitives'
import { rekaUIKit } from '../uikit/uikit-reka'

export interface SegmentedGroupOption {
  value: string
  label: string
  disabled?: boolean
}

/**
 * Сегментированный переключатель для одиночного выбора — `string`. В `forms-shadcn` не
 * портирован (только Chakra `SegmentGroup`, `libs/forms/.../field-segmented-group.tsx`) — здесь
 * порт логики (single-select) на голых кнопках `role="radio"` в `role="radiogroup"`, тот же
 * подход, что у `FieldRadioCard`.
 */
export const FieldSegmentedGroup = defineComponent({
  name: 'FieldSegmentedGroup',
  props: {
    name: { type: String, required: true },
    label: { type: String as PropType<string | undefined>, required: false, default: undefined },
    options: { type: Array as PropType<SegmentedGroupOption[]>, required: true },
    orientation: { type: String as PropType<'horizontal' | 'vertical'>, required: false, default: 'horizontal' },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, required, fullPath } = resolveFieldMeta(schema, props.name, props.label, undefined)

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

      return withFieldValidation(form, fullPath, fieldSchema, (field, hasError, errorMessage) => {
        const currentValue = (field.state.value as string) ?? ''

        return FieldWrapper({
          label,
          required,
          hasError,
          errorMessage,
          children: h(
            'div',
            {
              role: 'radiogroup',
              'aria-label': label,
              'data-field-name': props.name,
              class: cn(
                'bg-muted inline-flex gap-0.5 rounded-md p-1',
                props.orientation === 'vertical' && 'flex-col',
              ),
            },
            props.options.map((opt) => {
              const selected = currentValue === opt.value
              return h('button', {
                key: opt.value,
                type: 'button',
                role: 'radio',
                'aria-checked': selected,
                disabled: opt.disabled,
                class: cn(
                  'rounded-sm px-3 py-1 text-sm font-medium transition-colors',
                  selected ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  opt.disabled && 'pointer-events-none opacity-50',
                ),
                onClick: () => field.handleChange(opt.value),
              }, opt.label)
            }),
          ),
        })
      })
    }
  },
})
