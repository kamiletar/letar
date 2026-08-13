import { type AddressProvider, createDaDataProvider } from '@letar/forms-core/address'
import { resolveFieldMeta, useAddressSuggestions, useAppFormContext, withFieldValidation } from '@letar/forms-vue/core'
import { cn, NATIVE_INPUT_CLASS } from '@letar/tailwind-utils'
import { computed, defineComponent, h, onErrorCaptured, type PropType, ref } from 'vue'
import { FieldWrapper } from '../uikit/primitives'
import { rekaUIKit } from '../uikit/uikit-reka'

interface AddressValue {
  value: string
  data?: Record<string, unknown>
}

/**
 * FieldAddress (Reka-скин) — та же `useAddressSuggestions` (`@letar/forms-vue/core`), что
 * headless-пакет, Tailwind-разметка дропдауна вместо `letar-field__address-*` классов.
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
    const { fieldSchema, label, placeholder, required, fullPath } = resolveFieldMeta(
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

      return withFieldValidation(form, fullPath, fieldSchema, (field, hasError, errorMessage) =>
        FieldWrapper({
          label,
          required,
          hasError,
          errorMessage,
          children: h('div', { ref: containerRef, class: 'relative' }, [
            h('input', {
              'data-slot': 'input',
              type: 'text',
              value: inputValue.value,
              placeholder: placeholder ?? 'Начните вводить адрес...',
              'data-field-name': props.name,
              class: cn(NATIVE_INPUT_CLASS),
              onInput: (e: Event) => handleInput((e.target as HTMLInputElement).value),
              onFocus: handleFocus,
              onBlur: field.handleBlur,
              onKeydown: handleKeydown,
            }),
            isLoading.value
              ? h('span', { class: 'absolute top-2.5 right-2.5 text-muted-foreground text-xs' }, '…')
              : null,
            isOpen.value && suggestions.value.length > 0
              ? h(
                'ul',
                {
                  class:
                    'absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-input bg-popover shadow-md',
                },
                suggestions.value.map((suggestion, index) =>
                  h(
                    'li',
                    {
                      key: suggestion.value + index,
                      class: cn(
                        'cursor-pointer px-3 py-2 text-sm',
                        index === highlightedIndex.value ? 'bg-accent' : 'hover:bg-accent',
                      ),
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
          ]),
        }))
    }
  },
})
