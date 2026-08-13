import {
  getPersistedStep,
  provideFormSteps,
  type StepPersistenceConfig,
  useAppFormContext,
  useStepNavigation,
  useStepPersistence,
  useStepState,
} from '@letar/forms-vue/core'
import { cn } from '@letar/tailwind-utils'
import { computed, defineComponent, h, type PropType, type Ref, ref } from 'vue'

export type { StepPersistenceConfig }

/**
 * `Form.Steps` — shadcn-скин (beta), Vue-порт `FormStepsRoot` из `@letar/forms-shadcn`
 * (`libs/forms-shadcn/src/lib/steps/form-steps-root.tsx`). Работает поверх `useAppFormContext()`
 * (`@letar/forms-vue/core`) — тот же принцип, что у React-версии (`useDeclarativeForm()`
 * напрямую, без полноценного `createForm()`).
 *
 * Композиционная логика (регистрация шагов, навигация, персистенция) — не своя: переиспользует
 * `useStepState`/`useStepNavigation`/`useStepPersistence`/`provideFormSteps` из
 * `@letar/forms-vue/core`, те же самые, что и headless-версия `Form.Steps` в `@letar/forms-vue`.
 * Отличается только Tailwind-разметка обёртки и компонентов ниже.
 *
 * Beta-упрощения — как у React-скина: без `Form.When`-интеграции и без анимаций перехода.
 */
export const FormSteps = defineComponent({
  name: 'FormSteps',
  props: {
    defaultStep: { type: Number, required: false, default: 0 },
    step: { type: Number as PropType<number | undefined>, required: false, default: undefined },
    onStepChange: { type: Function as PropType<(step: number) => void>, required: false, default: undefined },
    validateOnNext: { type: Boolean, required: false, default: true },
    linear: { type: Boolean, required: false, default: false },
    orientation: { type: String as PropType<'horizontal' | 'vertical'>, required: false, default: 'horizontal' },
    onStepComplete: {
      type: Function as PropType<(stepIndex: number, values: unknown) => void | Promise<void>>,
      required: false,
      default: undefined,
    },
    stepPersistence: { type: Object as PropType<StepPersistenceConfig>, required: false, default: undefined },
  },
  setup(props, { slots }) {
    const { form } = useAppFormContext()

    // storagePrefix свой (`form-steps-shadcn:`) — не путать с сохранённым прогрессом headless-версии
    // той же формы; явный storagePrefix в props имеет приоритет.
    const persistenceConfig = computed<StepPersistenceConfig | undefined>(() =>
      props.stepPersistence ? { storagePrefix: 'form-steps-shadcn:', ...props.stepPersistence } : undefined
    )

    const controlledStep = computed(() => props.step)

    const internalStep = ref(getPersistedStep(persistenceConfig.value) ?? props.defaultStep) as Ref<number>
    function setInternalStep(step: number): void {
      internalStep.value = step
    }

    const currentStep = computed(() => controlledStep.value ?? internalStep.value)

    const { clearPersistence } = useStepPersistence(currentStep, persistenceConfig.value)

    const { sortedSteps, stepCount, registerStep, unregisterStep, claimedIndices } = useStepState()

    const { direction, goToNext, goToPrev, goToStep: navigateToStep, skipToEnd, triggerSubmit } = useStepNavigation({
      form,
      currentStep,
      stepCount,
      sortedSteps,
      controlledStep,
      onStepChange: props.onStepChange,
      onStepComplete: props.onStepComplete,
      validateOnNext: props.validateOnNext,
      setInternalStep,
    })

    function goToStep(targetStep: number): void {
      if (props.linear && targetStep > currentStep.value) {
        return
      }
      navigateToStep(targetStep)
    }

    provideFormSteps({
      currentStep,
      stepCount,
      steps: sortedSteps,
      goToNext,
      goToPrev,
      goToStep,
      skipToEnd,
      triggerSubmit,
      canGoNext: computed(() => currentStep.value < stepCount.value - 1),
      canGoPrev: computed(() => currentStep.value > 0),
      isCompleted: computed(() => currentStep.value >= stepCount.value),
      isLastStep: computed(() => currentStep.value === stepCount.value - 1),
      isFirstStep: computed(() => currentStep.value === 0),
      registerStep,
      unregisterStep,
      claimedIndices,
      validateOnNext: props.validateOnNext,
      linear: props.linear,
      direction,
      onStepComplete: props.onStepComplete,
      clearStepPersistence: clearPersistence,
    })

    return () =>
      h(
        'div',
        {
          class: cn('space-y-4', props.orientation === 'vertical' && 'flex gap-6 space-y-0'),
          'data-orientation': props.orientation,
        },
        slots.default?.(),
      )
  },
})
