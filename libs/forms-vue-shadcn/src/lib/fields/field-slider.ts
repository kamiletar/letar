import { resolveFieldMeta, useAppFormContext, withFieldValidation } from '@letar/forms-vue/core'
import { cn } from '@letar/tailwind-utils'
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from 'reka-ui'
import { defineComponent, h, onErrorCaptured, ref } from 'vue'
import type { UINode } from '../uikit/ui-node'
import { rekaUIKit } from '../uikit/uikit-reka'

/**
 * `reka-ui` `SliderRoot`/`SliderTrack`/`SliderRange`/`SliderThumb` — не входит в UIKit-контракт
 * (нет `Slider` в `UIKitExtendedPrimitives`), рисуется напрямую, как и `FieldSwitch`.
 */
export const FieldSlider = defineComponent({
  name: 'FieldSlider',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    min: { type: Number, required: false, default: 0 },
    max: { type: Number, required: false, default: 100 },
    step: { type: Number, required: false, default: 1 },
    showValue: { type: Boolean, required: false, default: false },
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
        const value = (field.state.value as number | undefined) ?? props.min

        return rekaUIKit.FieldRoot({
          invalid: hasError,
          required,
          children: [
            h('div', { class: 'flex items-center justify-between' }, [
              rekaUIKit.FieldLabel({ label, required }),
              props.showValue
                ? h('span', {
                  'data-slot': 'slider-value',
                  class: 'text-muted-foreground text-sm',
                }, String(value))
                : null,
            ]),
            h(
              SliderRoot,
              {
                'data-slot': 'slider',
                modelValue: [value],
                'onUpdate:modelValue': ((next: number[] | undefined) => field.handleChange(next?.[0] ?? props.min)) as (
                  value: number[] | undefined,
                ) => void,
                onBlur: field.handleBlur,
                min: props.min,
                max: props.max,
                step: props.step,
                'data-field-name': props.name,
                class: 'relative flex h-4 w-full touch-none items-center select-none',
              },
              {
                default: () => [
                  h(
                    SliderTrack,
                    { class: 'bg-muted relative h-1.5 w-full grow overflow-hidden rounded-full' },
                    { default: () => h(SliderRange, { class: 'bg-primary absolute h-full' }) },
                  ),
                  h(SliderThumb, {
                    class: cn(
                      'border-primary bg-background block size-4 rounded-full border shadow transition-colors outline-none',
                      'focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                      'disabled:pointer-events-none disabled:opacity-50',
                    ),
                  }),
                ],
              },
            ),
            rekaUIKit.FieldError({ hasError, errorMessage }),
          ] as unknown as UINode,
        })
      })
    }
  },
})
