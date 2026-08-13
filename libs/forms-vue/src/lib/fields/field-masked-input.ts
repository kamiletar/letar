import { defineComponent, h, type PropType, ref } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'
import { type MaskFieldFormatMode, type MaskFieldMask, useMaskField } from '../core/use-mask-field'
import { fieldWrapper } from './field-utils'

/**
 * FieldMaskedInput (headless) — движок масок общего назначения (Фаза 9, Этап 3), замена
 * `use-mask-input`. Vue-аналог `libs/forms-shadcn/src/lib/fields/field-masked-input.tsx`.
 *
 * @example Код подразделения
 * ```ts
 * h(FieldMaskedInput, { name: 'departmentCode', label: 'Код подразделения', mask: '999-999',
 *   formatDescription: 'Формат: 3 цифры, дефис, 3 цифры' })
 * ```
 */
export const FieldMaskedInput = defineComponent({
  name: 'FieldMaskedInput',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    placeholder: { type: String, required: false, default: undefined },
    mask: { type: [String, Array, Function] as PropType<MaskFieldMask>, required: true },
    formatMode: { type: String as PropType<MaskFieldFormatMode>, required: false, default: 'live' },
    onPaste: { type: String as PropType<'normalize' | 'reject'>, required: false, default: 'normalize' },
    /** Обязательное по WCAG 3.3.2 — формат ввода должен быть известен до начала ввода. */
    formatDescription: { type: String, required: true },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, placeholder, required } = resolveFieldMeta(
      schema,
      props.name,
      props.label,
      props.placeholder,
    )
    const rejectedMessage = ref('')

    const getValue = () => (form.getFieldValue(props.name) as string | undefined) ?? ''
    const { uncontrolled, displayValue, inputRef, onInput, onFocus, onBlur } = useMaskField({
      mask: props.mask,
      getValue,
      onValueChange: (raw) => form.setFieldValue(props.name, raw),
      formatMode: props.formatMode,
      onPasteMode: props.onPaste,
      onRejectedInput: () => {
        rejectedMessage.value = 'Символ не соответствует формату поля'
      },
    })

    return () =>
      withFieldValidation(form, props.name, fieldSchema, (field, hasError, errorMessage) => {
        const descriptionId = `${props.name}-format-description`

        return fieldWrapper(
          { name: props.name, label, required, hasError, errorMessage },
          h('div', {}, [
            h('p', { id: descriptionId, class: 'letar-field__hint' }, props.formatDescription),
            h('input', {
              ref: inputRef,
              id: props.name,
              class: 'letar-field__control',
              placeholder,
              ...(uncontrolled ? {} : { value: displayValue.value, onInput }),
              onFocus,
              onBlur: () => {
                onBlur()
                field.handleBlur()
              },
              'data-field-name': props.name,
              'aria-describedby': descriptionId,
            }),
            // Объявление отвергнутого символа — только "polite", никогда "assertive"
            h('span', { 'aria-live': 'polite', class: 'letar-field__visually-hidden' }, rejectedMessage.value),
          ]),
        )
      })
  },
})
