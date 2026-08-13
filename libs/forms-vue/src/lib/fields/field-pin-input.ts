import { defineComponent, h, type PropType } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'
import { type PinInputCharType, splitPinChars, usePinInputField } from '../core/use-pin-input-field'
import { fieldWrapper } from './field-utils'

/**
 * FieldPinInput (headless) — N ячеек `<input maxlength="1">` вместо Ark UI `PinInput.Root`
 * (Chakra-версия, `libs/forms/.../field-pin-input.tsx`). Значение формы — строка (например
 * `"1234"`), как и в Chakra-скине. Логика клавиатуры/paste — в `usePinInputField`.
 */
export const FieldPinInput = defineComponent({
  name: 'FieldPinInput',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    count: { type: Number, required: false, default: 4 },
    mask: { type: Boolean, required: false, default: false },
    otp: { type: Boolean, required: false, default: false },
    type: { type: String as PropType<PinInputCharType>, required: false, default: 'numeric' },
    onComplete: { type: Function as PropType<(value: string) => void>, required: false, default: undefined },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, required, fullPath } = resolveFieldMeta(schema, props.name, props.label, undefined)

    const { setInputRef, handleInput, handleKeydown, handlePaste } = usePinInputField({
      count: props.count,
      type: props.type,
      getValue: () => (form.getFieldValue(props.name) as string | undefined) ?? '',
      onValueChange: (value) => form.setFieldValue(props.name, value),
      onComplete: props.onComplete,
    })

    return () =>
      withFieldValidation(form, fullPath, fieldSchema, (field, hasError, errorMessage) =>
        fieldWrapper(
          { name: props.name, label, required, hasError, errorMessage },
          h(
            'div',
            { class: 'letar-field__pin-input', role: 'group', 'aria-label': label },
            splitPinChars((field.state.value as string) ?? '', props.count).map((char, index) =>
              h('input', {
                key: index,
                ref: setInputRef(index),
                type: props.mask ? 'password' : 'text',
                inputmode: props.type === 'numeric' ? 'numeric' : 'text',
                maxlength: 1,
                value: char,
                autocomplete: props.otp && index === 0 ? 'one-time-code' : 'off',
                class: 'letar-field__pin-input-box',
                'data-field-name': index === 0 ? props.name : undefined,
                onInput: handleInput(index),
                onKeydown: handleKeydown(index),
                onPaste: handlePaste(index),
                onBlur: field.handleBlur,
              })
            ),
          ),
        ))
  },
})
