import { resolveFieldMeta, useAppFormContext, withFieldValidation } from '@letar/forms-vue/core'
import { cn, NATIVE_INPUT_CLASS } from '@letar/tailwind-utils'
import { defineComponent, h, onErrorCaptured, ref } from 'vue'
import { FieldWrapper } from '../uikit/primitives'
import { rekaUIKit } from '../uikit/uikit-reka'

/**
 * Пароль с переключателем видимости — локальный `ref` должен жить в `setup()`, не в колбэке
 * `render`, вызываемом на каждый ре-рендер (`createField` из `../uikit/primitives` этого не
 * поддерживает — контракт без `useFieldState`), поэтому поле, как `FieldNumberInput`, собрано
 * напрямую.
 */
export const FieldPassword = defineComponent({
  name: 'FieldPassword',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    placeholder: { type: String, required: false, default: undefined },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, placeholder, required } = resolveFieldMeta(
      schema,
      props.name,
      props.label,
      props.placeholder,
    )
    const visible = ref(false)

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
          children: h('div', { class: 'relative flex items-center' }, [
            h('input', {
              'data-slot': 'input',
              type: visible.value ? 'text' : 'password',
              placeholder,
              value: (field.state.value as string) ?? '',
              onInput: (e: Event) => field.handleChange((e.target as HTMLInputElement).value),
              onBlur: field.handleBlur,
              'data-field-name': props.name,
              class: cn(NATIVE_INPUT_CLASS, 'pr-9'),
            }),
            h('button', {
              type: 'button',
              'aria-label': 'Toggle password visibility',
              class: 'absolute right-2 text-muted-foreground text-xs',
              onClick: () => {
                visible.value = !visible.value
              },
            }, visible.value ? 'Скрыть' : 'Показать'),
          ]),
        }))
    }
  },
})
