import type { CardBrand } from '@letar/forms-core/credit-card'
import { cardBrandIcon, useCreditCardField } from '@letar/forms-vue/core'
import { cn, NATIVE_INPUT_CLASS } from '@letar/tailwind-utils'
import { defineComponent, h, onErrorCaptured, type PropType, ref } from 'vue'
import { rekaUIKit } from '../uikit/uikit-reka'

/** Раскладка компонента */
export type CreditCardLayout = 'inline' | 'stacked'

const statusClass = (status: 'idle' | 'valid' | 'error', isInline: boolean): string => {
  if (isInline) {
    return ''
  }
  if (status === 'valid') {
    return 'border-green-500'
  }
  if (status === 'error') {
    return 'border-destructive'
  }
  return ''
}

/**
 * Compound-поле для ввода данных банковской карты — Reka/Tailwind-скин, Vue-порт React
 * `forms-shadcn/credit-card-field.tsx`. Логика — общий composable `useCreditCardField`
 * (`@letar/forms-vue/core`), здесь только Tailwind-разметка на голых `<input>` (тот же приём,
 * что у документных полей: multi-part виджет не укладывается в `UIKitInputProps`).
 *
 * ⚠️ PCI DSS: для реальных платежей используйте Stripe Elements.
 */
export const FieldCreditCard = defineComponent({
  name: 'FieldCreditCard',
  props: {
    name: { type: String, required: false, default: 'card' },
    label: { type: String, required: false, default: 'Данные карты' },
    brands: { type: Array as PropType<CardBrand[]>, required: false, default: undefined },
    showBrandIcon: { type: Boolean, required: false, default: true },
    layout: { type: String as PropType<CreditCardLayout>, required: false, default: 'inline' },
    disabled: { type: Boolean, required: false, default: false },
    readOnly: { type: Boolean, required: false, default: false },
    numberPlaceholder: { type: String, required: false, default: '0000 0000 0000 0000' },
    expiryPlaceholder: { type: String, required: false, default: 'MM / YY' },
    cvcPlaceholder: { type: String, required: false, default: 'CVC' },
  },
  setup(props) {
    const cc = useCreditCardField({ name: props.name, brands: props.brands })

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

      const isInline = props.layout === 'inline'

      return h(
        'div',
        {
          'data-slot': 'field-root',
          'data-invalid': (cc.numberStatus.value === 'error' || cc.expiryStatus.value === 'error') || undefined,
          class: 'space-y-2',
        },
        [
          props.label ? h('span', { class: 'text-sm leading-none font-medium' }, props.label) : null,

          h(
            'div',
            {
              role: 'group',
              'aria-label': props.label,
              class: cn(
                'flex',
                isInline ? 'flex-row items-center overflow-hidden rounded-md border' : 'flex-col items-stretch gap-3',
                isInline && 'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
              ),
            },
            [
              // Иконка бренда + Номер карты
              h('div', { class: cn('flex gap-0', isInline ? 'flex-1' : 'flex-col') }, [
                props.showBrandIcon
                  ? h('div', { class: cn('flex items-center px-2', isInline && 'border-r') }, [
                    cardBrandIcon(cc.brand.value.brand, 28),
                  ])
                  : null,
                h('div', { class: 'relative flex-1' }, [
                  h('input', {
                    value: cc.numberDisplay.value,
                    onInput: cc.onNumberInput,
                    onBlur: cc.onNumberBlur,
                    placeholder: props.numberPlaceholder,
                    inputmode: 'numeric',
                    autocomplete: 'cc-number',
                    name: 'cardnumber',
                    maxlength: cc.numberMaxLength.value,
                    disabled: props.disabled,
                    readonly: props.readOnly,
                    'aria-label': 'Номер карты',
                    'data-slot': 'input',
                    class: cn(
                      'text-base',
                      isInline
                        ? 'w-full border-0 bg-transparent px-3 py-1 outline-none focus-visible:ring-0'
                        : cn(NATIVE_INPUT_CLASS, statusClass(cc.numberStatus.value, isInline)),
                    ),
                  }),
                  cc.numberStatus.value === 'valid'
                    ? h(
                      'span',
                      { class: 'absolute top-1/2 right-2 -translate-y-1/2 text-sm font-bold text-green-500' },
                      '✓',
                    )
                    : null,
                ]),
              ]),

              // Срок + CVC
              h('div', { class: cn('flex', isInline ? 'gap-0' : 'gap-2') }, [
                h('div', { class: 'relative' }, [
                  h('input', {
                    ref: cc.expiryInputRef,
                    value: cc.expiryDisplay.value,
                    onInput: cc.onExpiryInput,
                    onBlur: cc.onExpiryBlur,
                    placeholder: props.expiryPlaceholder,
                    inputmode: 'numeric',
                    autocomplete: 'cc-exp',
                    name: 'cc-exp',
                    maxlength: 5,
                    disabled: props.disabled,
                    readonly: props.readOnly,
                    'aria-label': 'Срок действия',
                    'data-slot': 'input',
                    class: cn(
                      'text-base',
                      isInline
                        ? 'w-[100px] border-0 border-l bg-transparent px-3 py-1 outline-none focus-visible:ring-0'
                        : cn(NATIVE_INPUT_CLASS, statusClass(cc.expiryStatus.value, isInline)),
                    ),
                  }),
                  cc.expiryStatus.value === 'valid'
                    ? h(
                      'span',
                      { class: 'absolute top-1/2 right-2 -translate-y-1/2 text-sm font-bold text-green-500' },
                      '✓',
                    )
                    : null,
                ]),

                h('div', { class: 'relative' }, [
                  h('input', {
                    ref: cc.cvcInputRef,
                    value: cc.cvcValue.value,
                    onInput: cc.onCvcInput,
                    onBlur: cc.onCvcBlur,
                    placeholder: props.cvcPlaceholder,
                    inputmode: 'numeric',
                    autocomplete: 'cc-csc',
                    name: 'cvc',
                    maxlength: cc.brand.value.cvcLength,
                    disabled: props.disabled,
                    readonly: props.readOnly,
                    'aria-label': `CVC (${cc.brand.value.cvcLength} цифры)`,
                    title: cc.cvcHint.value,
                    'data-slot': 'input',
                    class: cn(
                      'text-base',
                      isInline
                        ? 'w-[80px] border-0 border-l bg-transparent px-3 py-1 outline-none focus-visible:ring-0'
                        : cn(NATIVE_INPUT_CLASS, statusClass(cc.cvcStatus.value, isInline)),
                    ),
                  }),
                  cc.cvcStatus.value === 'valid'
                    ? h(
                      'span',
                      { class: 'absolute top-1/2 right-2 -translate-y-1/2 text-sm font-bold text-green-500' },
                      '✓',
                    )
                    : null,
                ]),
              ]),
            ],
          ),

          cc.numberError.value
            ? h('p', { role: 'alert', class: 'text-destructive text-sm' }, cc.numberError.value)
            : null,
          cc.expiryError.value
            ? h('p', { role: 'alert', class: 'text-destructive text-sm' }, cc.expiryError.value)
            : null,
        ],
      )
    }
  },
})
