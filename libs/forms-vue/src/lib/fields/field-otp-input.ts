import { defineComponent, h, onBeforeUnmount, type PropType, ref } from 'vue'
import { resolveFieldMeta, withFieldValidation } from '../core/field-wiring'
import { useAppFormContext } from '../core/form-context'
import { type PinInputCharType, splitPinChars, usePinInputField } from '../core/use-pin-input-field'
import { fieldWrapper } from './field-utils'

/**
 * FieldOTPInput (headless) — тот же грид ячеек, что `FieldPinInput`, плюс таймер повторной
 * отправки. Vue-аналог Chakra `libs/forms/.../field-otp-input.tsx`: там таймер живёт в
 * `useFieldState` (React), здесь — обычный `ref`/`setInterval` в `setup()`.
 */
export const FieldOTPInput = defineComponent({
  name: 'FieldOTPInput',
  props: {
    name: { type: String, required: true },
    label: { type: String, required: false, default: undefined },
    length: { type: Number, required: false, default: 6 },
    type: { type: String as PropType<PinInputCharType>, required: false, default: 'numeric' },
    mask: { type: Boolean, required: false, default: false },
    autoSubmit: { type: Boolean, required: false, default: false },
    resendTimeout: { type: Number, required: false, default: 60 },
    onResend: { type: Function as PropType<() => Promise<void>>, required: false, default: undefined },
  },
  setup(props) {
    const { form, schema } = useAppFormContext()
    const { fieldSchema, label, required, fullPath } = resolveFieldMeta(schema, props.name, props.label, undefined)

    const countdown = ref(0)
    const isResending = ref(false)
    let timer: ReturnType<typeof setInterval> | null = null

    function startCountdown() {
      countdown.value = props.resendTimeout
      timer = setInterval(() => {
        countdown.value -= 1
        if (countdown.value <= 0 && timer) {
          clearInterval(timer)
          timer = null
        }
      }, 1000)
    }

    onBeforeUnmount(() => {
      if (timer) {
        clearInterval(timer)
      }
    })

    async function handleResend() {
      if (!props.onResend || countdown.value > 0) {
        return
      }
      isResending.value = true
      try {
        await props.onResend()
        startCountdown()
      } finally {
        isResending.value = false
      }
    }

    const { setInputRef, handleInput, handleKeydown, handlePaste } = usePinInputField({
      count: props.length,
      type: props.type,
      getValue: () => (form.getFieldValue(props.name) as string | undefined) ?? '',
      onValueChange: (value) => form.setFieldValue(props.name, value),
      onComplete: () => {
        if (props.autoSubmit) {
          form.handleSubmit()
        }
      },
    })

    function formatCountdown(seconds: number): string {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return () =>
      withFieldValidation(form, fullPath, fieldSchema, (field, hasError, errorMessage) =>
        fieldWrapper(
          { name: props.name, label, required, hasError, errorMessage },
          h('div', { class: 'letar-field__otp' }, [
            h(
              'div',
              { class: 'letar-field__pin-input', role: 'group', 'aria-label': label },
              splitPinChars((field.state.value as string) ?? '', props.length).map((char, index) =>
                h('input', {
                  key: index,
                  ref: setInputRef(index),
                  type: props.mask ? 'password' : 'text',
                  inputmode: props.type === 'numeric' ? 'numeric' : 'text',
                  maxlength: 1,
                  value: char,
                  autocomplete: index === 0 ? 'one-time-code' : 'off',
                  class: 'letar-field__pin-input-box',
                  'data-field-name': index === 0 ? props.name : undefined,
                  onInput: handleInput(index),
                  onKeydown: handleKeydown(index),
                  onPaste: handlePaste(index),
                  onBlur: field.handleBlur,
                })
              ),
            ),
            props.onResend
              ? h('div', { class: 'letar-field__otp-resend' }, [
                countdown.value > 0
                  ? h(
                    'span',
                    { class: 'letar-field__hint', 'data-testid': 'otp-countdown' },
                    `Повторно через ${formatCountdown(countdown.value)}`,
                  )
                  : h('button', {
                    type: 'button',
                    disabled: isResending.value,
                    onClick: handleResend,
                  }, 'Отправить повторно'),
              ])
              : null,
          ]),
        ))
  },
})
