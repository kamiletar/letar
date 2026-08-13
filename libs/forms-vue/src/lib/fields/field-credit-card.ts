import type { CardBrand } from '@letar/forms-core/credit-card'
import { defineComponent, h, type PropType } from 'vue'
import { cardBrandIcon } from '../core/card-brand-icon'
import { useCreditCardField } from '../core/use-credit-card-field'

/** Раскладка компонента */
export type CreditCardLayout = 'inline' | 'stacked'

/**
 * Compound-поле для ввода данных банковской карты — Vue-порт React `Form.Field.CreditCard`
 * (`libs/forms/src/lib/declarative/form-fields/specialized/credit-card/credit-card-field.tsx`).
 * Логика (форматирование, Luhn, автопереход фокуса) — в общем composable `useCreditCardField`
 * (`@letar/forms-vue/core`), здесь только референсная HTML-разметка без UIKit-абстракции, как и
 * у остальных полей этого пакета.
 *
 * ⚠️ PCI DSS: для реальных платежей используйте Stripe Elements.
 *
 * @example
 * ```ts
 * h(FieldCreditCard, { name: 'card', label: 'Данные карты' })
 * ```
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

    return () => {
      return h('div', { class: 'letar-field', 'data-field-name': props.name }, [
        props.label ? h('span', { class: 'letar-field__label' }, props.label) : null,
        h(
          'div',
          {
            role: 'group',
            'aria-label': props.label,
            class: `letar-field__credit-card letar-field__credit-card--${props.layout}`,
          },
          [
            // Иконка бренда + номер
            h('div', { class: 'letar-field__credit-card-number-group' }, [
              props.showBrandIcon
                ? h('div', { class: 'letar-field__credit-card-brand' }, [cardBrandIcon(cc.brand.value.brand, 28)])
                : null,
              h('div', { class: 'letar-field__credit-card-number-wrap' }, [
                h('input', {
                  class: 'letar-field__control',
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
                  'data-status': cc.numberStatus.value,
                }),
              ]),
            ]),
            // Срок + CVC
            h('div', { class: 'letar-field__credit-card-row' }, [
              h('input', {
                ref: cc.expiryInputRef,
                class: 'letar-field__control',
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
                'data-status': cc.expiryStatus.value,
              }),
              h('input', {
                ref: cc.cvcInputRef,
                class: 'letar-field__control',
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
                'data-status': cc.cvcStatus.value,
              }),
            ]),
          ],
        ),
        cc.numberError.value ? h('p', { class: 'letar-field__error', role: 'alert' }, cc.numberError.value) : null,
        cc.expiryError.value ? h('p', { class: 'letar-field__error', role: 'alert' }, cc.expiryError.value) : null,
      ])
    }
  },
})
