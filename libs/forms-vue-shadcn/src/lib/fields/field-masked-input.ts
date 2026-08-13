import {
  type MaskFieldFormatMode,
  type MaskFieldMask,
  resolveFieldMeta,
  useAppFormContext,
  useMaskField,
  withFieldValidation,
} from '@letar/forms-vue/core'
import { cn, NATIVE_INPUT_CLASS } from '@letar/tailwind-utils'
import { defineComponent, h, onErrorCaptured, type PropType, ref } from 'vue'
import { FieldWrapper } from '../uikit/primitives'
import { rekaUIKit } from '../uikit/uikit-reka'

const visuallyHiddenClass = 'absolute h-px w-px overflow-hidden whitespace-nowrap p-0 -m-px'

/**
 * FieldMaskedInput (Reka-скин) — движок масок общего назначения (Фаза 9, Этап 3).
 *
 * `'live'`-режим отдаёт неконтролируемый `<input>` — рендерится сырой `<input>` в обход
 * `rekaUIKit.Input`, стилизованный `NATIVE_INPUT_CLASS` (см. `document-field-base.ts`).
 */
export const FieldMaskedInput = defineComponent({
  name: 'FieldMaskedInput',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    placeholder: { type: String, required: false, default: undefined },
    mask: { type: [String, Array, Function] as PropType<MaskFieldMask>, required: true },
    formatMode: { type: String as PropType<MaskFieldFormatMode>, required: false, default: 'live' },
    onPaste: { type: String as PropType<'normalize' | 'reject'>, required: false, default: 'normalize' },
    /** Обязательное по WCAG 3.3.2 — формат ввода должен быть известен до начала ввода. */
    formatDescription: { type: String, required: true },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, placeholder, required, fullPath } = resolveFieldMeta(
      schema,
      props.name,
      props.label,
      props.placeholder,
    )
    const rejectedMessage = ref('')

    const getValue = () => (form.getFieldValue(props.name) as string | undefined) ?? ''
    const { uncontrolled, displayValue, inputRef, onInput, onFocus, onBlur } = useMaskField({
      mask: props.mask,
      getValue,
      onValueChange: (raw) => form.setFieldValue(props.name, raw),
      formatMode: props.formatMode,
      onPasteMode: props.onPaste,
      onRejectedInput: () => {
        rejectedMessage.value = 'Символ не соответствует формату поля'
      },
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

      return withFieldValidation(form, fullPath, fieldSchema, (field, hasError, errorMessage) => {
        const descriptionId = `${props.name}-format-description`

        return FieldWrapper({
          label,
          required,
          hasError,
          errorMessage,
          children: h('div', {}, [
            h('p', { id: descriptionId, class: 'text-muted-foreground mb-1 text-xs' }, props.formatDescription),
            h('input', {
              ref: inputRef,
              'data-slot': 'input',
              placeholder,
              ...(uncontrolled ? {} : { value: displayValue.value, onInput }),
              onFocus,
              onBlur: () => {
                onBlur()
                field.handleBlur()
              },
              'data-field-name': props.name,
              'aria-describedby': descriptionId,
              'aria-invalid': hasError || undefined,
              class: cn(NATIVE_INPUT_CLASS, 'aria-invalid:border-destructive aria-invalid:ring-destructive/20'),
            }),
            // Объявление отвергнутого символа — только "polite", никогда "assertive"
            h('span', { 'aria-live': 'polite', class: visuallyHiddenClass }, rejectedMessage.value),
          ]),
        })
      })
    }
  },
})
