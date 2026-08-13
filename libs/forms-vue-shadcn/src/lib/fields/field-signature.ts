import { resolveFieldMeta, useAppFormContext, useSignatureField, withFieldValidation } from '@letar/forms-vue/core'
import { cn, NATIVE_INPUT_CLASS } from '@letar/tailwind-utils'
import { defineComponent, h, onErrorCaptured, type PropType, ref } from 'vue'
import { FieldWrapper } from '../uikit/primitives'
import { rekaUIKit } from '../uikit/uikit-reka'

/**
 * FieldSignature (Reka-скин) — та же `useSignatureField` (`@letar/forms-vue/core`), что
 * headless-пакет, Tailwind-разметка тулбара/canvas-обёртки вместо `letar-field__signature-*`.
 */
export const FieldSignature = defineComponent({
  name: 'FieldSignature',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    width: { type: Number, required: false, default: 400 },
    height: { type: Number, required: false, default: 150 },
    strokeColor: { type: String, required: false, default: 'black' },
    strokeWidth: { type: Number, required: false, default: 2 },
    backgroundColor: { type: String, required: false, default: 'white' },
    clearLabel: { type: String, required: false, default: 'Очистить' },
    placeholder: { type: String, required: false, default: 'Подпишите здесь' },
    allowTyped: { type: Boolean, required: false, default: true },
    exportFormat: { type: String as PropType<'png' | 'svg'>, required: false, default: 'png' },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, required } = resolveFieldMeta(schema, props.name, props.label, undefined)

    const { canvasRef, mode, typedText, isEmpty, setMode, handleTypedInput, startDrawing, draw, stopDrawing, clear } =
      useSignatureField({
        width: props.width,
        height: props.height,
        strokeColor: props.strokeColor,
        strokeWidth: props.strokeWidth,
        backgroundColor: props.backgroundColor,
        exportFormat: props.exportFormat,
        onChange: (dataUrl) => form.setFieldValue(props.name, dataUrl),
      })

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

      return withFieldValidation(form, props.name, fieldSchema, (field, hasError, errorMessage) =>
        FieldWrapper({
          label,
          required,
          hasError,
          errorMessage,
          children: h('div', {
            class: 'space-y-2 rounded-md border border-input p-2',
            style: `max-width:${props.width + 16}px`,
          }, [
            props.allowTyped
              ? h('div', { class: 'flex gap-1' }, [
                h('button', {
                  type: 'button',
                  'aria-pressed': mode.value === 'draw',
                  class: cn(
                    'rounded px-2 py-1 text-xs',
                    mode.value === 'draw' ? 'bg-accent font-medium' : 'text-muted-foreground',
                  ),
                  onClick: () => setMode('draw'),
                }, 'Рисовать'),
                h('button', {
                  type: 'button',
                  'aria-pressed': mode.value === 'typed',
                  class: cn(
                    'rounded px-2 py-1 text-xs',
                    mode.value === 'typed' ? 'bg-accent font-medium' : 'text-muted-foreground',
                  ),
                  onClick: () => setMode('typed'),
                }, 'Ввести текст'),
              ])
              : null,
            mode.value === 'typed'
              ? h('input', {
                type: 'text',
                placeholder: 'Введите имя...',
                value: typedText.value,
                class: cn(NATIVE_INPUT_CLASS, 'font-serif italic'),
                onInput: (e: Event) => handleTypedInput((e.target as HTMLInputElement).value),
              })
              : null,
            h('div', { class: 'relative' }, [
              h('canvas', {
                ref: canvasRef,
                width: props.width,
                height: props.height,
                role: 'img',
                'aria-label': 'Поле подписи',
                tabindex: 0,
                'data-field-name': props.name,
                class: 'block max-w-full rounded border border-input',
                style: `cursor:${mode.value === 'draw' ? 'crosshair' : 'default'};touch-action:none`,
                onMousedown: mode.value === 'draw' ? startDrawing : undefined,
                onMousemove: mode.value === 'draw' ? draw : undefined,
                onMouseup: mode.value === 'draw' ? stopDrawing : undefined,
                onMouseleave: mode.value === 'draw' ? stopDrawing : undefined,
                onTouchstart: mode.value === 'draw' ? startDrawing : undefined,
                onTouchmove: mode.value === 'draw' ? draw : undefined,
                onTouchend: mode.value === 'draw' ? stopDrawing : undefined,
                onBlur: field.handleBlur,
              }),
              isEmpty.value && mode.value === 'draw'
                ? h(
                  'div',
                  {
                    class:
                      'pointer-events-none absolute inset-0 flex items-center justify-center text-muted-foreground text-sm',
                  },
                  props.placeholder,
                )
                : null,
            ]),
            !isEmpty.value
              ? h('div', { class: 'flex justify-end' }, [
                h('button', {
                  type: 'button',
                  class: 'text-destructive text-xs hover:underline',
                  onClick: clear,
                }, props.clearLabel),
              ])
              : null,
          ]),
        }))
    }
  },
})
