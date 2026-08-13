import { resolveFieldMeta, useAppFormContext, withFieldValidation } from '@letar/forms-vue/core'
import { cn, NATIVE_INPUT_CLASS } from '@letar/tailwind-utils'
import { defineComponent, h, type PropType, ref } from 'vue'
import { FieldWrapper } from '../uikit/primitives'
import { rekaUIKit } from '../uikit/uikit-reka'

const DEFAULT_SWATCHES = [
  '#000000',
  '#4A5568',
  '#F56565',
  '#ED64A6',
  '#9F7AEA',
  '#6B46C1',
  '#4299E1',
  '#0BC5EA',
  '#38B2AC',
  '#48BB78',
  '#ECC94B',
  '#DD6B20',
]

/**
 * FieldColorPicker (Reka-скин) — та же Vue-идиоматичная схема, что headless (нативный
 * `<input type="color">` + hex-инпут + свотчи), стилизована Tailwind. `ColorPicker` не входит в
 * `UIKitExtendedPrimitives` контракт.
 */
export const FieldColorPicker = defineComponent({
  name: 'FieldColorPicker',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    swatches: { type: Array as PropType<string[]>, required: false, default: () => DEFAULT_SWATCHES },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, required } = resolveFieldMeta(schema, props.name, props.label, undefined)

    const renderError = ref<Error | null>(null)

    return () => {
      if (renderError.value) {
        return rekaUIKit.ErrorFallback({ fieldName: props.name, message: renderError.value.message })
      }

      return withFieldValidation(form, props.name, fieldSchema, (field, hasError, errorMessage) => {
        const value = (field.state.value as string) || '#000000'

        return FieldWrapper({
          label,
          required,
          hasError,
          errorMessage,
          children: h('div', { class: 'space-y-2' }, [
            h('div', { class: 'flex items-center gap-2' }, [
              h('input', {
                type: 'color',
                value,
                class: 'h-9 w-12 cursor-pointer rounded-md border border-input p-1',
                onInput: (e: Event) => field.handleChange((e.target as HTMLInputElement).value),
                onBlur: field.handleBlur,
                'data-field-name': props.name,
              }),
              h('input', {
                type: 'text',
                value,
                class: cn(NATIVE_INPUT_CLASS, 'flex-1'),
                onChange: (e: Event) => field.handleChange((e.target as HTMLInputElement).value),
                onBlur: field.handleBlur,
              }),
            ]),
            props.swatches.length > 0
              ? h(
                'div',
                { class: 'flex flex-wrap gap-1.5' },
                props.swatches.map((swatch) =>
                  h('button', {
                    key: swatch,
                    type: 'button',
                    'aria-label': swatch,
                    'data-selected': swatch.toLowerCase() === value.toLowerCase(),
                    class:
                      'size-6 rounded-full border border-border data-[selected=true]:ring-2 data-[selected=true]:ring-ring data-[selected=true]:ring-offset-1',
                    style: { backgroundColor: swatch },
                    onClick: () => field.handleChange(swatch),
                  })
                ),
              )
              : null,
          ]),
        })
      })
    }
  },
})
