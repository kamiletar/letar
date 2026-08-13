import { type AddressProvider, createDaDataProvider } from '@letar/forms-core/address'
import { computed, defineComponent, h, type PropType } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'
import { useAddressSuggestions } from '../core/use-address-suggestions'
import { fieldWrapper } from './field-utils'

/**
 * FieldCity (headless) — инпут с автодополнением города (`bounds: {from: 'city', to: 'settlement'}`,
 * та же `useAddressSuggestions`, что у `FieldAddress`). Значение — голая строка (не `AddressValue`).
 * На blur без выбора подсказки сохраняет введённый текст как есть (тот же UX, что React-версия).
 */
export const FieldCity = defineComponent({
  name: 'FieldCity',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    placeholder: { type: String, required: false, default: undefined },
    provider: { type: Object as PropType<AddressProvider>, required: false, default: undefined },
    token: { type: String, required: false, default: undefined },
    minChars: { type: Number, required: false, default: 2 },
    debounceMs: { type: Number, required: false, default: 300 },
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

    const initialDisplay = form.getFieldValue(props.name) as string | undefined

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
      count: 7,
      bounds: { from: 'city', to: 'settlement' },
      onSelect: (suggestion) => {
        const cityName = (suggestion.data?.city as string) || (suggestion.data?.settlement as string)
          || suggestion.value
        inputValue.value = cityName
        form.setFieldValue(props.name, cityName)
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
                placeholder: placeholder ?? 'Введите город',
                'data-field-name': props.name,
                onInput: (e: Event) => {
                  const value = (e.target as HTMLInputElement).value
                  handleInput(value)
                  if (!value) {
                    form.setFieldValue(props.name, '')
                  }
                },
                onFocus: handleFocus,
                onBlur: () => {
                  if (inputValue.value && inputValue.value !== (field.state.value as string)) {
                    form.setFieldValue(props.name, inputValue.value)
                  }
                  field.handleBlur()
                },
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
