import { resolveFieldMeta, useAppFormContext, withFieldValidation } from '@letar/forms-vue/core'
import { cn } from '@letar/tailwind-utils'
import { defineComponent, h, onErrorCaptured, type PropType, ref } from 'vue'
import { FieldWrapper } from '../uikit/primitives'
import { rekaUIKit } from '../uikit/uikit-reka'

/**
 * Шкала Лайкерта — значение `number` (1-based индекс точки). `anchors` — проп сверх контракта
 * `createField` (массив), поле собрано напрямую как `FieldRadioGroup`/`FieldRating`:
 * `role="radiogroup"`/`role="radio"`. Портировано из
 * `libs/forms-shadcn/src/lib/fields/field-likert.tsx` без изменений логики — те же Tailwind-классы.
 */
export const FieldLikert = defineComponent({
  name: 'FieldLikert',
  props: {
    name: { type: String, required: true },
    label: { type: String as PropType<string | undefined>, required: false, default: undefined },
    anchors: { type: Array as PropType<string[]>, required: true },
    showNumbers: { type: Boolean, required: false, default: false },
    disabled: { type: Boolean, required: false, default: false },
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
        const value = field.state.value as number | undefined

        const handleSelect = (point: number) => {
          if (props.disabled) {
            return
          }
          field.handleChange(point)
        }

        return FieldWrapper({
          label,
          required,
          disabled: props.disabled,
          hasError,
          errorMessage,
          children: h(
            'div',
            {
              role: 'radiogroup',
              'aria-label': label,
              'data-field-name': props.name,
              class: 'flex flex-wrap justify-between gap-3 py-2',
            },
            props.anchors.map((anchor, i) => {
              const point = i + 1
              const selected = value === point
              return h(
                'button',
                {
                  key: point,
                  type: 'button',
                  role: 'radio',
                  'aria-checked': selected,
                  disabled: props.disabled,
                  onClick: () => handleSelect(point),
                  class: cn(
                    'flex max-w-20 flex-1 flex-col items-center gap-1 text-center',
                    props.disabled && 'cursor-not-allowed opacity-50',
                  ),
                },
                [
                  props.showNumbers
                    ? h('span', { class: 'text-muted-foreground text-xs' }, String(point))
                    : null,
                  h('span', {
                    class: cn(
                      'size-8 rounded-full border-2 transition-transform hover:scale-110',
                      selected ? 'border-primary bg-primary' : 'border-border bg-transparent',
                    ),
                  }),
                  h(
                    'span',
                    {
                      class: cn('text-xs', selected ? 'text-primary font-medium' : 'text-muted-foreground'),
                    },
                    anchor,
                  ),
                ],
              )
            }),
          ),
        })
      })
    }
  },
})
