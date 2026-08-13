import { resolveFieldMeta, useAppFormContext, withFieldValidation } from '@letar/forms-vue/core'
import { cn } from '@letar/tailwind-utils'
import { defineComponent, h, onErrorCaptured, type PropType, ref } from 'vue'
import { FieldWrapper } from '../uikit/primitives'
import { rekaUIKit } from '../uikit/uikit-reka'

const inputClass = cn(
  'border-input placeholder:text-muted-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none',
  'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
)

/**
 * Клик по превью переключает в режим редактирования. Beta (как у React-версии):
 * `submitOnBlur` (по умолчанию true) + Enter/Escape вместо Cancel/Submit/Edit-кнопок,
 * `activationMode` — `click` (по умолчанию) и `none`. Портирован из
 * `forms-shadcn/field-editable.tsx`.
 */
export const FieldEditable = defineComponent({
  name: 'FieldEditable',
  props: {
    name: { type: String, required: true },
    label: { type: String as PropType<string | undefined>, required: false, default: undefined },
    placeholder: { type: String as PropType<string | undefined>, required: false, default: undefined },
    multiline: { type: Boolean, required: false, default: false },
    activationMode: { type: String as PropType<'click' | 'none'>, required: false, default: 'click' },
    submitOnBlur: { type: Boolean, required: false, default: true },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, placeholder, required, fullPath } = resolveFieldMeta(
      schema,
      props.name,
      props.label,
      props.placeholder,
    )
    const isEditing = ref(props.activationMode === 'none')

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

        const commit = () => {
          if (props.activationMode !== 'none') { isEditing.value = false }
          field.handleBlur()
        }

        if (!isEditing.value) {
          return FieldWrapper({
            label,
            required,
            hasError,
            errorMessage,
            children: h('button', {
              type: 'button',
              'data-field-name': props.name,
              class: cn(
                'w-full rounded-md border border-transparent px-3 py-1 text-left text-sm outline-none',
                'hover:border-input',
                !currentValue && 'text-muted-foreground',
              ),
              onClick: () => (isEditing.value = true),
            }, currentValue || placeholder || 'Нажмите для редактирования'),
          })
        }

        const sharedProps = {
          value: currentValue,
          placeholder,
          'data-field-name': props.name,
          class: inputClass,
          onInput: (e: Event) => field.handleChange((e.target as HTMLInputElement | HTMLTextAreaElement).value),
          onBlur: () => {
            if (props.submitOnBlur) { commit() }
          },
          onKeydown: (e: KeyboardEvent) => {
            if (e.key === 'Enter' && !props.multiline) { commit() }
            if (e.key === 'Escape') { isEditing.value = props.activationMode === 'none' }
          },
        }

        return FieldWrapper({
          label,
          required,
          hasError,
          errorMessage,
          children: props.multiline
            ? h('textarea', { ...sharedProps, rows: 3 })
            : h('input', { ...sharedProps, type: 'text' }),
        })
      })
    }
  },
})
