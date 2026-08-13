import { resolveFieldMeta, useAppFormContext, withFieldValidation } from '@letar/forms-vue/core'
import { cn } from '@letar/tailwind-utils'
import { defineComponent, h, onErrorCaptured, type PropType, ref } from 'vue'
import { FieldWrapper } from '../uikit/primitives'
import { rekaUIKit } from '../uikit/uikit-reka'
import { cardClass } from '../utils/card-class'

export interface RadioCardOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

/**
 * Одиночный выбор карточками — `role="radio"` в контейнере `role="radiogroup"`, тот же приём,
 * что у `FieldListbox`. Beta: без циклической навигации стрелками. Портирован из
 * `forms-shadcn/field-radio-card.tsx`.
 */
export const FieldRadioCard = defineComponent({
  name: 'FieldRadioCard',
  props: {
    name: { type: String, required: true },
    label: { type: String as PropType<string | undefined>, required: false, default: undefined },
    options: { type: Array as PropType<RadioCardOption[]>, required: true },
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
        const currentValue = field.state.value as string | undefined

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
              class: cn('flex gap-2', props.orientation === 'horizontal' ? 'flex-row flex-wrap' : 'flex-col'),
            },
            props.options.map((opt) => {
              const selected = currentValue === opt.value
              return h('button', {
                key: opt.value,
                type: 'button',
                role: 'radio',
                'aria-checked': selected,
                disabled: opt.disabled,
                class: cardClass(selected, opt.disabled),
                onClick: () => field.handleChange(opt.value),
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
