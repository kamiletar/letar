import { getOptionText, type UIKitOptionRenderState } from '@letar/forms-core/uikit'
import { resolveFieldMeta, useAppFormContext, withFieldValidation } from '@letar/forms-vue/core'
import { computed, defineComponent, onErrorCaptured, type PropType, ref } from 'vue'
import { FieldWrapper } from '../uikit/primitives'
// Прямой импорт примитива, не через `rekaUIKit.Combobox`: `renderValue` — расширение контракта
// сверх `UIKitComboboxProps` (`RekaComboboxExtraProps`, см. `combobox.ts`), которого нет в
// `forms-core`, и `rekaUIKit.Combobox` типизирован строго по нему (excess property error).
// Тот же приём — прямой импорт `Combobox as ComboboxControl` — в React-скине (`field-combobox.tsx`)
import { Combobox } from '../uikit/primitives/combobox'
import type { UINode } from '../uikit/ui-node'
import { rekaUIKit } from '../uikit/uikit-reka'
import type { FieldSelectOption } from './field-select'

/**
 * `options` — тот же случай, что и `FieldSelect`: проп сверх контракта `createField`, поле
 * собрано напрямую по `useAppFormContext`. Фильтрация по подстроке — обязанность поля, не
 * примитива (`rekaUIKit.Combobox` ничего не фильтрует сам, см. `uikit/primitives/combobox.ts`).
 */
export const FieldCombobox = defineComponent({
  name: 'FieldCombobox',
  props: {
    name: { type: String, required: true },
    label: { type: String as PropType<string | undefined>, required: false, default: undefined },
    placeholder: { type: String as PropType<string | undefined>, required: false, default: undefined },
    options: { type: Array as PropType<FieldSelectOption[]>, required: true },
    /** Своё содержимое пункта списка; примитив рисует вторую строку (`description`) сам, только без этого пропа */
    renderOption: {
      type: Function as PropType<(option: FieldSelectOption, state: UIKitOptionRenderState) => UINode>,
      required: false,
      default: undefined,
    },
    /**
     * Свой текст поля ввода для выбранного значения (аналог `renderValue` у `Field.Select`, но
     * результат — строка: у Combobox отдельного триггера нет, «значение» — это и есть текст поля
     * ввода). Примитив передаёт его в нативный `displayValue` Reka (см. `uikit/primitives/combobox.ts`),
     * пустой результат откатывается на текст опции (`textValue`/`label`)
     */
    renderValue: {
      type: Function as PropType<(option: FieldSelectOption) => string>,
      required: false,
      default: undefined,
    },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, placeholder: metaPlaceholder, required, fullPath } = resolveFieldMeta(
      schema,
      props.name,
      props.label,
      props.placeholder,
    )
    const placeholder = metaPlaceholder ?? 'Поиск...'

    const inputValue = ref('')

    // Снимок значения поля вне render-замыкания (как `fieldValueRef` у `FieldSelect`) — только для
    // распознавания «в поле ввода подпись выбранного значения, не активный поиск» ниже
    const fieldValueRef = form.useStore((state: { values: Record<string, unknown> }) => {
      const parts = fullPath.split('.')
      let value: unknown = state.values
      for (const part of parts) {
        value = value && typeof value === 'object' ? (value as Record<string, unknown>)[part] : undefined
      }
      return value as string | undefined
    })

    // Текст поля ввода для опции — тот же приём, что `renderValue` в примитиве (`combobox.ts`):
    // своя подпись, пустой результат — текст опции
    const getValueText = (opt: FieldSelectOption) => props.renderValue?.(opt) || getOptionText(opt)

    const filteredOptions = computed(() => {
      const needle = inputValue.value.toLowerCase()
      if (!needle) { return props.options }
      // В поле подпись выбранного значения (Reka выставляет её сама через `displayValue`,
      // см. `combobox.ts`), а не активный поисковый запрос — список показываем целиком, как в
      // React-скине (`field-combobox.tsx`, `matchedOptions`): иначе подпись фильтрует список сама
      // на себя и прячет остальные опции сразу после открытия
      const currentValue = fieldValueRef.value || undefined
      const selected = currentValue !== undefined ? props.options.find((opt) => opt.value === currentValue) : undefined
      if (selected && inputValue.value === getValueText(selected)) {
        return props.options
      }
      return props.options.filter((opt) => opt.label.toLowerCase().includes(needle))
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
        const value = (field.state.value as string | undefined) || undefined

        return FieldWrapper({
          label,
          required,
          hasError,
          errorMessage,
          children: Combobox({
            value,
            inputValue: inputValue.value,
            onInputChange: (next) => {
              inputValue.value = next
            },
            onValueChange: (next) => field.handleChange(next ?? ''),
            options: filteredOptions.value,
            // Обёртка, а не прямой проброс: примитив типизирован по `UIKitSelectOption<UINode>`
            // (`label: UINode`), опции приложения — по `FieldSelectOption` (`label: string`);
            // ищем исходную опцию приложения по значению и передаём её, как `optionByKey` в
            // `field-select.ts` (там та же контравариантная нестыковка сигнатур)
            renderOption: props.renderOption
              ? (opt, state) => {
                const source = props.options.find((o) => o.value === opt.value)
                return source ? props.renderOption!(source, state) : opt.label
              }
              : undefined,
            renderValue: props.renderValue
              ? (opt) => {
                const source = props.options.find((o) => o.value === opt.value)
                return source ? props.renderValue!(source) : ''
              }
              : undefined,
            placeholder,
            'data-field-name': props.name,
          }),
        })
      })
    }
  },
})
