import { resolveFieldMeta, useAppFormContext, withFieldValidation } from '@letar/forms-vue/core'
import { cn } from '@letar/tailwind-utils'
import { X } from 'lucide-vue-next'
import { defineComponent, h, onErrorCaptured, ref } from 'vue'
import { FieldWrapper } from '../uikit/primitives'
import { rekaUIKit } from '../uikit/uikit-reka'

/**
 * Тег-инпут — нативный `<input>` + чипы, Enter добавляет тег. Не входит в UIKit-контракт (нет
 * `Tags` в `UIKitExtendedPrimitives`) — как `Switch`. Портирован из `forms-shadcn/field-tags.tsx`.
 */
export const FieldTags = defineComponent({
  name: 'FieldTags',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    maxTags: { type: Number, required: false, default: undefined },
    minTagLength: { type: Number, required: false, default: 1 },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, required, fullPath } = resolveFieldMeta(schema, props.name, props.label, undefined)
    const draft = ref('')

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
        const tags = (field.state.value as string[]) ?? []

        const addTag = (raw: string) => {
          const trimmed = raw.trim()
          if (trimmed.length < props.minTagLength) { return }
          if (props.maxTags && tags.length >= props.maxTags) { return }
          if (tags.includes(trimmed)) { return }
          field.handleChange([...tags, trimmed])
          draft.value = ''
        }

        const removeTag = (index: number) => field.handleChange(tags.filter((_: string, i: number) => i !== index))

        return FieldWrapper({
          label,
          required,
          hasError,
          errorMessage,
          children: h(
            'div',
            {
              'data-field-name': props.name,
              class: cn(
                'border-input flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border bg-transparent px-2 py-1',
                'has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-ring/50 has-[input:focus-visible]:ring-[3px]',
              ),
            },
            [
              ...tags.map((tag, index) =>
                h(
                  'span',
                  {
                    key: tag,
                    class: 'bg-secondary text-secondary-foreground flex items-center gap-1 rounded px-2 py-0.5 text-xs',
                  },
                  [
                    tag,
                    h('button', {
                      type: 'button',
                      'aria-label': `Удалить ${tag}`,
                      class: 'hover:text-destructive',
                      onClick: () => removeTag(index),
                    }, h(X, { class: 'size-3' })),
                  ],
                )
              ),
              h('input', {
                value: draft.value,
                class: 'min-w-24 flex-1 bg-transparent text-sm outline-none',
                'data-field-name': `${props.name}-input`,
                onInput: (e: Event) => (draft.value = (e.target as HTMLInputElement).value),
                onKeydown: (e: KeyboardEvent) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag(draft.value)
                  }
                  if (e.key === 'Backspace' && !draft.value && tags.length > 0) {
                    removeTag(tags.length - 1)
                  }
                },
                onBlur: field.handleBlur,
              }),
            ],
          ),
        })
      })
    }
  },
})
