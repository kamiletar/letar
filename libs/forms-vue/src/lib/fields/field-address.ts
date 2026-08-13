import { type AddressProvider, createDaDataProvider } from '@letar/forms-core/address'
import { computed, defineComponent, h, type PropType } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'
import { useAddressSuggestions } from '../core/use-address-suggestions'
import { fieldWrapper } from './field-utils'

interface AddressValue {
  value: string
  data?: Record<string, unknown>
}

/**
 * FieldAddress (headless) — инпут с автодополнением адреса. `createDaDataProvider`/
 * `AddressProvider` (`@letar/forms-core/address`) уже framework-agnostic, порт не потребовался —
 * Vue-специфика только в `useAddressSuggestions` (`@letar/forms-vue/core`). Значение —
 * `AddressValue` (`{ value, data? }`) либо голая строка при `valueOnly`.
 *
 * `useAddressSuggestions` вызван один раз в `setup()`, не в render-замыкании `withFieldValidation` —
 * тот же принцип, что у `useMaskField`/`usePinInputField`: composable с `ref()` внутри теряет
 * стабильную идентичность состояния, если вызывать его на каждый рендер. Запись значения — через
 * `form.setFieldValue` напрямую (composable не имеет доступа к `field` из render-замыкания).
 */
export const FieldAddress = defineComponent({
  name: 'FieldAddress',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    placeholder: { type: String, required: false, default: undefined },
    provider: { type: Object as PropType<AddressProvider>, required: false, default: undefined },
    token: { type: String, required: false, default: undefined },
    minChars: { type: Number, required: false, default: 3 },
    debounceMs: { type: Number, required: false, default: 300 },
    valueOnly: { type: Boolean, required: false, default: false },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, placeholder, required } = resolveFieldMeta(
      schema,
      props.name,
      props.label,
      props.placeholder,
    )

    const tokenProvider = computed(() => (props.token ? createDaDataProvider({ token: props.token }) : null))

    const initial = form.getFieldValue(props.name) as AddressValue | string | undefined
    const initialDisplay = typeof initial === 'string' ? initial : initial?.value

    const {
      inputValue,
      suggestions,
      isLoading,
      isOpen,
      highlightedIndex,
      containerRef,
      handleInput,
      handleFocus,
      handleKeydown,
      select,
    } = useAddressSuggestions({
      getProvider: () => props.provider ?? tokenProvider.value,
      minChars: props.minChars,
      debounceMs: props.debounceMs,
      onSelect: (suggestion) => {
        inputValue.value = suggestion.value
        if (props.valueOnly) {
          form.setFieldValue(props.name, suggestion.value)
        } else {
          form.setFieldValue(props.name, { value: suggestion.value, data: suggestion.data } satisfies AddressValue)
        }
      },
    })
    if (initialDisplay) {
      inputValue.value = initialDisplay
    }

    return () =>
      withFieldValidation(form, props.name, fieldSchema, (field, hasError, errorMessage) =>
        fieldWrapper(
          { name: props.name, label, required, hasError, errorMessage },
          h(
            'div',
            { ref: containerRef, class: 'letar-field__address', style: 'position: relative' },
            [
              h('input', {
                type: 'text',
                class: 'letar-field__control',
                value: inputValue.value,
                placeholder: placeholder ?? 'Начните вводить адрес...',
                'data-field-name': props.name,
                onInput: (e: Event) => handleInput((e.target as HTMLInputElement).value),
                onFocus: handleFocus,
                onBlur: field.handleBlur,
                onKeydown: handleKeydown,
              }),
              isLoading.value ? h('span', { class: 'letar-field__address-spinner' }, '…') : null,
              isOpen.value && suggestions.value.length > 0
                ? h(
                  'ul',
                  { class: 'letar-field__address-suggestions' },
                  suggestions.value.map((suggestion, index) =>
                    h(
                      'li',
                      {
                        key: suggestion.value + index,
                        class: index === highlightedIndex.value
                          ? 'letar-field__address-suggestion--highlighted'
                          : undefined,
                        onMousedown: (e: Event) => {
                          e.preventDefault()
                          select(suggestion)
                        },
                      },
                      suggestion.label,
                    )
                  ),
                )
                : null,
            ],
          ),
        ))
  },
})
