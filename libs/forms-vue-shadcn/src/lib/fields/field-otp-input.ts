import {
  type PinInputCharType,
  resolveFieldMeta,
  splitPinChars,
  useAppFormContext,
  usePinInputField,
  withFieldValidation,
} from '@letar/forms-vue/core'
import { cn } from '@letar/tailwind-utils'
import { defineComponent, h, onBeforeUnmount, type PropType, ref } from 'vue'
import { FieldWrapper } from '../uikit/primitives'
import { rekaUIKit } from '../uikit/uikit-reka'

const PIN_BOX_CLASS =
  'h-10 w-10 rounded-md border border-input bg-transparent text-center text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive'

/** FieldOTPInput (Reka-скин) — `usePinInputField` из `@letar/forms-vue/core` + таймер повторной отправки. */
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
          children: h('div', { class: 'space-y-2' }, [
            h(
              'div',
              { class: 'flex gap-2', role: 'group', 'aria-label': label },
              splitPinChars((field.state.value as string) ?? '', props.length).map((char, index) =>
                h('input', {
                  key: index,
                  ref: setInputRef(index),
                  type: props.mask ? 'password' : 'text',
                  inputmode: props.type === 'numeric' ? 'numeric' : 'text',
                  maxlength: 1,
                  value: char,
                  autocomplete: index === 0 ? 'one-time-code' : 'off',
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
            props.onResend
              ? h('div', { class: 'flex justify-center' }, [
                countdown.value > 0
                  ? h(
                    'span',
                    { class: 'text-muted-foreground text-sm', 'data-testid': 'otp-countdown' },
                    `Повторно через ${formatCountdown(countdown.value)}`,
                  )
                  : h('button', {
                    type: 'button',
                    class: 'text-sm underline disabled:opacity-50',
                    disabled: isResending.value,
                    onClick: handleResend,
                  }, 'Отправить повторно'),
              ])
              : null,
          ]),
        }))
    }
  },
})
