import { useAppFormContext, useFormStepsContext } from '@letar/forms-vue/core'
import { cn } from '@letar/tailwind-utils'
import { defineComponent, h, type PropType, ref, type VNode } from 'vue'

const buttonBase = 'rounded-md px-4 py-2 text-sm font-medium disabled:pointer-events-none disabled:opacity-50'

/**
 * `Form.Steps.Navigation` — shadcn-скин (beta), Vue-порт `FormStepsNavigation` из
 * `@letar/forms-shadcn` (`libs/forms-shadcn/src/lib/steps/form-steps-navigation.tsx`). Кнопки
 * Назад/Далее с автоматической валидацией; на последнем шаге «Далее» превращается в «Отправить».
 */
export const FormStepsNavigation = defineComponent({
  name: 'FormStepsNavigation',
  props: {
    prevLabel: { type: [String, Object] as PropType<VNode | string>, required: false, default: 'Назад' },
    nextLabel: { type: [String, Object] as PropType<VNode | string>, required: false, default: 'Далее' },
    submitLabel: { type: [String, Object] as PropType<VNode | string>, required: false, default: 'Отправить' },
    skipLabel: { type: [String, Object] as PropType<VNode | string>, required: false, default: 'Пропустить' },
    showPrev: { type: Boolean, required: false, default: true },
    showNext: { type: Boolean, required: false, default: true },
    showSkip: { type: Boolean, required: false, default: false },
    onStepChange: { type: Function as PropType<(step: number) => void>, required: false, default: undefined },
    onSubmit: { type: Function as PropType<() => void>, required: false, default: undefined },
    onSkip: {
      type: Function as PropType<() => Promise<boolean> | boolean | void>,
      required: false,
      default: undefined,
    },
  },
  setup(props) {
    const { form } = useAppFormContext()
    const { goToNext, goToPrev, skipToEnd, isFirstStep, isLastStep, canGoPrev, currentStep } = useFormStepsContext()

    const isNavigating = ref(false)
    const isSkipping = ref(false)
    const isSubmittingForm = ref(false)

    async function handleNext(): Promise<void> {
      isNavigating.value = true
      try {
        const nextStepValue = currentStep.value + 1
        const success = await goToNext()
        if (success) {
          props.onStepChange?.(nextStepValue)
        }
      } finally {
        isNavigating.value = false
      }
    }

    function handlePrev(): void {
      const prevStepValue = currentStep.value - 1
      void goToPrev()
      props.onStepChange?.(prevStepValue)
    }

    async function handleSubmit(): Promise<void> {
      if (isSubmittingForm.value) {
        return
      }
      isSubmittingForm.value = true
      try {
        props.onSubmit?.()
        await form.handleSubmit()
      } finally {
        isSubmittingForm.value = false
      }
    }

    async function handleSkip(): Promise<void> {
      isSkipping.value = true
      try {
        if (props.onSkip) {
          const result = await props.onSkip()
          if (result === false) {
            return
          }
        }
        skipToEnd()
      } finally {
        isSkipping.value = false
      }
    }

    return () =>
      h('div', { class: 'flex gap-2' }, [
        props.showPrev
          ? h(
            'button',
            {
              type: 'button',
              onClick: handlePrev,
              disabled: isFirstStep.value || !canGoPrev.value || isNavigating.value || isSkipping.value,
              class: cn(buttonBase, 'border-input border bg-transparent hover:bg-accent'),
            },
            props.prevLabel,
          )
          : null,

        props.showSkip
          ? h(
            'button',
            {
              type: 'button',
              onClick: () => void handleSkip(),
              disabled: isNavigating.value,
              class: cn(buttonBase, 'hover:bg-accent'),
            },
            isSkipping.value ? '…' : props.skipLabel,
          )
          : null,

        props.showNext
          ? (isLastStep.value
            ? h(
              'button',
              {
                type: 'button',
                onClick: () => void handleSubmit(),
                disabled: isSubmittingForm.value || isNavigating.value || isSkipping.value,
                class: cn(buttonBase, 'bg-primary text-primary-foreground'),
              },
              isSubmittingForm.value ? '…' : props.submitLabel,
            )
            : h(
              'button',
              {
                type: 'button',
                onClick: () => void handleNext(),
                disabled: isNavigating.value,
                class: cn(buttonBase, 'bg-primary text-primary-foreground'),
              },
              isNavigating.value ? '…' : props.nextLabel,
            ))
          : null,
      ])
  },
})
