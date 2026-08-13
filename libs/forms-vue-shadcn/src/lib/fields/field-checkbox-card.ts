import { resolveFieldMeta, useAppFormContext, withFieldValidation } from '@letar/forms-vue/core'
import { cn } from '@letar/tailwind-utils'
import { defineComponent, h, onErrorCaptured, type PropType, ref } from 'vue'
import { FieldWrapper } from '../uikit/primitives'
import { rekaUIKit } from '../uikit/uikit-reka'
import { cardClass } from '../utils/card-class'

export interface CheckboxCardOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

/**
 * `options`/`orientation` — пропы сверх контракта `createField`, поле собрано напрямую, как
 * `FieldRadioGroup`. Множественный выбор карточками — `role="checkbox"`/`aria-checked` на
 * каждой, без нового Radix-примитива (обычные кнопки). Портирован из
 * `forms-shadcn/field-checkbox-card.tsx`.
 */
export const FieldCheckboxCard = defineComponent({
  name: 'FieldCheckboxCard',
  props: {
    name: { type: String, required: true },
    label: { type: String as PropType<string | undefined>, required: false, default: undefined },
    options: { type: Array as PropType<CheckboxCardOption[]>, required: true },
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
        const currentValue = (field.state.value as string[] | undefined) ?? []

        const toggle = (optValue: string) => {
          const next = currentValue.includes(optValue)
            ? currentValue.filter((v: string) => v !== optValue)
            : [...currentValue, optValue]
          field.handleChange(next)
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
              class: cn('flex gap-2', props.orientation === 'horizontal' ? 'flex-row flex-wrap' : 'flex-col'),
            },
            props.options.map((opt) => {
              const selected = currentValue.includes(opt.value)
              return h('button', {
                key: opt.value,
                type: 'button',
                role: 'checkbox',
                'aria-checked': selected,
                disabled: opt.disabled,
                class: cardClass(selected, opt.disabled),
                onClick: () => toggle(opt.value),
              }, [
                h('span', { class: 'font-medium' }, opt.label),
                opt.description ? h('span', { class: 'text-muted-foreground text-xs' }, opt.description) : null,
              ])
            }),
          ),
        })
      })
    }
  },
})
