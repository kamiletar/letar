import { resolveFieldMeta, useAppFormContext, withFieldValidation } from '@letar/forms-vue/core'
import { cn } from '@letar/tailwind-utils'
import { Star } from 'lucide-vue-next'
import { defineComponent, h, onErrorCaptured, ref } from 'vue'
import type { UINode } from '../uikit/ui-node'
import { rekaUIKit } from '../uikit/uikit-reka'

/**
 * Ряд кнопок-звёзд (`lucide-vue-next` `Star`) — не входит в UIKit-контракт (нет `Rating` в
 * `UIKitExtendedPrimitives`), тот же принцип, что у `FieldSwitch`/`FieldSlider`.
 */
export const FieldRating = defineComponent({
  name: 'FieldRating',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    count: { type: Number, required: false, default: 5 },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, required } = resolveFieldMeta(schema, props.name, props.label, undefined)

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

      return withFieldValidation(form, props.name, fieldSchema, (field, hasError, errorMessage) => {
        const value = (field.state.value as number | undefined) ?? 0
        const stars = Array.from({ length: props.count }, (_, i) => i + 1)

        return rekaUIKit.FieldRoot({
          invalid: hasError,
          required,
          children: [
            rekaUIKit.FieldLabel({ label, required }),
            h(
              'div',
              { role: 'radiogroup', 'data-field-name': props.name, class: 'flex gap-1' },
              stars.map((star) =>
                h('button', {
                  key: star,
                  type: 'button',
                  role: 'radio',
                  'aria-checked': star === value,
                  'aria-label': `${star} из ${props.count}`,
                  disabled: false,
                  onClick: () => field.handleChange(star),
                  onBlur: field.handleBlur,
                  class: 'disabled:cursor-not-allowed disabled:opacity-50',
                }, [
                  h(Star, {
                    class: cn('size-5', star <= value ? 'fill-primary text-primary' : 'text-muted-foreground'),
                  }),
                ])
              ),
            ),
            rekaUIKit.FieldError({ hasError, errorMessage }),
          ] as unknown as UINode,
        })
      })
    }
  },
})
