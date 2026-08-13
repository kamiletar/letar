import { resolveFieldMeta, useAppFormContext, useMaskField, withFieldValidation } from '@letar/forms-vue/core'
import type { MaskFieldFormatMode } from '@letar/forms-vue/core'
import { cn, NATIVE_INPUT_CLASS } from '@letar/tailwind-utils'
import { defineComponent, h, onErrorCaptured, ref } from 'vue'
import { FieldWrapper } from '../uikit/primitives'
import { rekaUIKit } from '../uikit/uikit-reka'

/**
 * Конфигурация для `createDocumentField` — Reka-скин, аналог headless
 * `@letar/forms-vue/lib/fields/document-field-base.ts` и React
 * `libs/forms-shadcn/src/lib/fields/document-field-base.tsx`.
 */
export interface DocumentFieldConfig {
  displayName: string
  mask: string
  formatMode?: MaskFieldFormatMode
  maxLength?: number
  placeholder: string
  validate?: (value: string) => string | undefined
}

/**
 * `useMaskField` в `'live'` отдаёт неконтролируемый `<input>` — контракт `UIKitInputProps`
 * требует `value`/`onChange`, поэтому здесь, как и в React shadcn-скине, рендерится сырой
 * `<input>` в обход `rekaUIKit.Input`, стилизованный тем же `NATIVE_INPUT_CLASS`.
 */
export function createDocumentField(config: DocumentFieldConfig) {
  return defineComponent({
    name: config.displayName,
    props: {
      name: { type: String, required: true },
      label: { type: String, required: false, default: undefined },
    },
    setup(props) {
      const { form, schema } = useAppFormContext()
      const { fieldSchema, label, required } = resolveFieldMeta(schema, props.name, props.label, undefined)

      const getValue = () => (form.getFieldValue(props.name) as string | undefined) ?? ''
      const { uncontrolled, displayValue, inputRef, onInput, onFocus, onBlur } = useMaskField({
        mask: config.mask,
        getValue,
        onValueChange: (raw) => form.setFieldValue(props.name, raw),
        formatMode: config.formatMode,
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

        return withFieldValidation(form, props.name, fieldSchema, (field, hasError, errorMessage) => {
          const customError = config.validate ? config.validate(String(field.state.value ?? '')) : undefined
          const showError = hasError || !!customError
          const displayError = customError ?? errorMessage

          return FieldWrapper({
            label,
            required,
            hasError: showError,
            errorMessage: displayError,
            children: h('input', {
              ref: inputRef,
              'data-slot': 'input',
              placeholder: config.placeholder,
              maxlength: config.maxLength,
              ...(uncontrolled ? {} : { value: displayValue.value, onInput }),
              onFocus,
              onBlur: () => {
                onBlur()
                field.handleBlur()
              },
              'data-field-name': props.name,
              'aria-invalid': showError || undefined,
              class: cn(NATIVE_INPUT_CLASS, 'aria-invalid:border-destructive aria-invalid:ring-destructive/20'),
            }),
          })
        })
      }
    },
  })
}
