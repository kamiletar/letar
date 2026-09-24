import { resolveFieldMeta, useAppFormContext, withFieldValidation } from '@letar/forms-vue/core'
import { defineComponent, onErrorCaptured, type PropType, ref } from 'vue'
import { rekaUIKit } from '../uikit/uikit-reka'

/**
 * Reka `SelectItem` запрещает `value=""` (пустая строка у `SelectRoot` — «сбросить выбор и
 * показать placeholder») и бросает ошибку при рендере. Опция «Все категории» со значением `''`
 * внутри примитива подменяется служебным токеном; наружу (в форму) всегда уходит настоящее `''`.
 */
const EMPTY_OPTION_TOKEN = '__letar_empty_option__'

export interface FieldSelectOption {
  value: string
  label: string
  disabled?: boolean
}

/**
 * `options` — проп, которого нет в контракте `createField` (`name`/`label`/`placeholder`),
 * поэтому поле, как и в headless `forms-vue`, собрано напрямую по `useAppFormContext`, не через
 * фабрику.
 */
export const FieldSelect = defineComponent({
  name: 'FieldSelect',
  props: {
    name: { type: String, required: true },
    label: { type: String as PropType<string | undefined>, required: false, default: undefined },
    placeholder: { type: String as PropType<string | undefined>, required: false, default: undefined },
    options: { type: Array as PropType<FieldSelectOption[]>, required: true },
    clearable: { type: Boolean, required: false, default: undefined },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, placeholder, required, fullPath } = resolveFieldMeta(
      schema,
      props.name,
      props.label,
      props.placeholder,
    )

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
        const clearable = props.clearable ?? !required
        const hasEmptyOption = props.options.some((opt) => opt.value === '')
        const rawValue = field.state.value as string | undefined
        // `''` при наличии опции с пустым значением — выбранная опция, а не «пусто»
        const value = rawValue === '' && hasEmptyOption ? EMPTY_OPTION_TOKEN : rawValue || undefined

        // `Select` рисует свою метку сам (см. `uikit/primitives/select.ts`) — в отличие от
        // остальных полей, здесь не `FieldWrapper` (он бы продублировал `FieldLabel`), а
        // `FieldRoot` напрямую вокруг `Select` + `FieldError`, как и в React-скине.
        return rekaUIKit.FieldRoot({
          invalid: hasError,
          required,
          children: [
            rekaUIKit.Select({
              value,
              onValueChange: (next) => field.handleChange(next === EMPTY_OPTION_TOKEN ? '' : next ?? ''),
              onBlur: field.handleBlur,
              options: hasEmptyOption
                ? props.options.map((opt) => (opt.value === '' ? { ...opt, value: EMPTY_OPTION_TOKEN } : opt))
                : props.options,
              label,
              placeholder,
              clearable,
              'data-field-name': props.name,
            }),
            rekaUIKit.FieldError({ hasError, errorMessage }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- children принимает VNode[], контракт типизирован как единичный TNode
          ] as any,
        })
      })
    }
  },
})
