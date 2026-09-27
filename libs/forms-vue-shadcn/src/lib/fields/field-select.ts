import type { UIKitOptionRenderState } from '@letar/forms-core/uikit'
import { resolveFieldMeta, useAppFormContext, withFieldValidation } from '@letar/forms-vue/core'
import { defineComponent, onErrorCaptured, type PropType, ref } from 'vue'
import type { UINode } from '../uikit/ui-node'
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
  /** Вторая строка пункта списка (под `label`), как в shadcn-React-скине — не отображается в триггере */
  description?: string
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
    /** Своё содержимое пункта списка; служебные пункты (здесь их нет) через рендерер не проходят */
    renderOption: {
      type: Function as PropType<(option: FieldSelectOption, state: UIKitOptionRenderState) => UINode>,
      required: false,
      default: undefined,
    },
    /** Своя подпись выбранного значения в триггере; пустой результат откатывается на текст опции */
    renderValue: {
      type: Function as PropType<(option: FieldSelectOption) => UINode>,
      required: false,
      default: undefined,
    },
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

        // Ключ примитива (после подмены `''` → токен) → исходная опция приложения. Нужен, чтобы
        // `renderOption`/`renderValue` приложения никогда не увидели `EMPTY_OPTION_TOKEN` — как
        // `optionByValue` в shadcn-React-скине (`field-select.tsx`), только без create/update-конвейера
        const optionByKey = new Map(
          props.options.map((opt) => [opt.value === '' ? EMPTY_OPTION_TOKEN : opt.value, opt]),
        )

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
              renderOption: props.renderOption
                ? (opt, state) => props.renderOption!(optionByKey.get(opt.value) ?? (opt as FieldSelectOption), state)
                : undefined,
              renderValue: props.renderValue
                ? (opt) => props.renderValue!(optionByKey.get(opt.value) ?? (opt as FieldSelectOption))
                : undefined,
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
