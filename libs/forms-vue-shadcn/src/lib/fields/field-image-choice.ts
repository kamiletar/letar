import { resolveFieldMeta, useAppFormContext, withFieldValidation } from '@letar/forms-vue/core'
import { cn } from '@letar/tailwind-utils'
import { Check } from 'lucide-vue-next'
import { defineComponent, h, onErrorCaptured, type PropType, ref } from 'vue'
import { FieldWrapper } from '../uikit/primitives'
import { rekaUIKit } from '../uikit/uikit-reka'

export interface ImageChoiceOption {
  value: string
  label: string
  image: string
  description?: string
}

/**
 * Grid карточек с изображениями — `string` (single) или `string[]` (multiple). Портирован из
 * `forms-shadcn/field-image-choice.tsx` (логика 1:1).
 */
export const FieldImageChoice = defineComponent({
  name: 'FieldImageChoice',
  props: {
    name: { type: String, required: true },
    label: { type: String as PropType<string | undefined>, required: false, default: undefined },
    options: { type: Array as PropType<ImageChoiceOption[]>, required: true },
    columns: { type: Number, required: false, default: 3 },
    multiple: { type: Boolean, required: false, default: false },
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
        const value = field.state.value as string | string[] | undefined

        const isSelected = (optValue: string): boolean =>
          props.multiple ? Array.isArray(value) && value.includes(optValue) : value === optValue

        const handleSelect = (optValue: string) => {
          if (props.multiple) {
            const current = Array.isArray(value) ? value : []
            const next = current.includes(optValue) ? current.filter((v) => v !== optValue) : [...current, optValue]
            field.handleChange(next)
          } else {
            field.handleChange(optValue)
          }
        }

        return FieldWrapper({
          label,
          required,
          hasError,
          errorMessage,
          children: h(
            'div',
            {
              role: 'group',
              'aria-label': label,
              'data-field-name': props.name,
              class: 'grid gap-3',
              style: { gridTemplateColumns: `repeat(${props.columns}, minmax(0, 1fr))` },
            },
            props.options.map((opt) => {
              const selected = isSelected(opt.value)
              return h('button', {
                key: opt.value,
                type: 'button',
                role: props.multiple ? 'checkbox' : 'radio',
                'aria-checked': selected,
                class: cn(
                  'relative overflow-hidden rounded-lg border-2 text-left transition-colors',
                  selected ? 'border-primary' : 'border-border hover:border-primary/50',
                ),
                onClick: () => handleSelect(opt.value),
              }, [
                h('img', { src: opt.image, alt: opt.label, class: 'h-[120px] w-full object-cover' }),
                selected
                  ? h(
                    'span',
                    {
                      class:
                        'bg-primary text-primary-foreground absolute top-2 right-2 flex size-6 items-center justify-center rounded-full',
                    },
                    h(Check, { class: 'size-3.5' }),
                  )
                  : null,
                h('div', { class: 'p-2' }, [
                  h('p', { class: 'text-sm font-medium' }, opt.label),
                  opt.description ? h('p', { class: 'text-muted-foreground text-xs' }, opt.description) : null,
                ]),
              ])
            }),
          ),
        })
      })
    }
  },
})
