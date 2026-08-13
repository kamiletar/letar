import {
  type PinInputCharType,
  resolveFieldMeta,
  splitPinChars,
  useAppFormContext,
  usePinInputField,
  withFieldValidation,
} from '@letar/forms-vue/core'
import { cn } from '@letar/tailwind-utils'
import { defineComponent, h, type PropType, ref } from 'vue'
import { FieldWrapper } from '../uikit/primitives'
import { rekaUIKit } from '../uikit/uikit-reka'

const PIN_BOX_CLASS =
  'h-10 w-10 rounded-md border border-input bg-transparent text-center text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive'

/**
 * FieldPinInput (Reka-скин) — тот же грид, что headless (`usePinInputField` переиспользован
 * через `@letar/forms-vue/core`), стилизованный Tailwind. `PinInput` не входит в
 * `UIKitExtendedPrimitives` контракт (см. комментарий в `uikit-reka.ts`) — рисуется сырыми
 * `<input>`, тот же приём, что у `FieldSwitch`/`FieldSlider`.
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

    const renderError = ref<Error | null>(null)

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
          children: h(
            'div',
            { class: 'flex gap-2', role: 'group', 'aria-label': label },
            splitPinChars((field.state.value as string) ?? '', props.count).map((char, index) =>
              h('input', {
                key: index,
                ref: setInputRef(index),
                type: props.mask ? 'password' : 'text',
                inputmode: props.type === 'numeric' ? 'numeric' : 'text',
                maxlength: 1,
                value: char,
                autocomplete: props.otp && index === 0 ? 'one-time-code' : 'off',
                class: cn(PIN_BOX_CLASS),
                'aria-invalid': hasError,
                'data-field-name': index === 0 ? props.name : undefined,
                onInput: handleInput(index),
                onKeydown: handleKeydown(index),
                onPaste: handlePaste(index),
                onBlur: field.handleBlur,
              })
            ),
          ),
        }))
    }
  },
})
