import { defineComponent, h, type PropType, ref, type VNode } from 'vue'
import { useAppFormContext } from '../../core/form-context'
import { useFormStepsContext } from '../../core/form-steps-context'

/**
 * `Form.Steps.Navigation` — headless-версия. Кнопки Назад/Далее с автоматической валидацией; на
 * последнем шаге «Далее» превращается в «Отправить». Нативные `<button>`, без стилей.
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
      h('div', { class: 'letar-form-steps__navigation' }, [
        props.showPrev
          ? h(
            'button',
            {
              type: 'button',
              onClick: handlePrev,
              disabled: isFirstStep.value || !canGoPrev.value || isNavigating.value || isSkipping.value,
              class: 'letar-form-steps__nav-button letar-form-steps__nav-button--prev',
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
              class: 'letar-form-steps__nav-button letar-form-steps__nav-button--skip',
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
                class: 'letar-form-steps__nav-button letar-form-steps__nav-button--submit',
              },
              isSubmittingForm.value ? '…' : props.submitLabel,
            )
            : h(
              'button',
              {
                type: 'button',
                onClick: () => void handleNext(),
                disabled: isNavigating.value,
                class: 'letar-form-steps__nav-button letar-form-steps__nav-button--next',
              },
              isNavigating.value ? '…' : props.nextLabel,
            ))
          : null,
      ])
  },
})
