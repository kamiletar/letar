import { computed, defineComponent, h, type PropType, type Ref, ref } from 'vue'
import { useAppFormContext } from '../../core/form-context'
import { provideFormSteps } from '../../core/form-steps-context'
import { useStepNavigation } from '../../core/use-step-navigation'
import { getPersistedStep, type StepPersistenceConfig, useStepPersistence } from '../../core/use-step-persistence'
import { useStepState } from '../../core/use-step-state'

export type { StepPersistenceConfig }

/**
 * `Form.Steps` — headless-версия (Этап 6, часть 4). Мультистеп-обёртка форм-уровня, не
 * `createField()`-поле. Работает поверх `useAppFormContext()` (`@letar/forms-vue/core`), как и
 * все headless-поля этого пакета — отдельного `createForm()`-инстанса не требует.
 *
 * Beta-упрощения, унаследованные от `@letar/forms-shadcn` (React-скин, тот же уровень зрелости):
 * без `Form.When`-интеграции (`hiddenFields`/`segment`) и без анимаций перехода — `<div>`-обёртка
 * без transition-библиотек.
 */
export const FormSteps = defineComponent({
  name: 'FormSteps',
  props: {
    /** Начальный индекс шага (0-based) */
    defaultStep: { type: Number, required: false, default: 0 },
    /** Управляемый индекс шага */
    step: { type: Number as PropType<number | undefined>, required: false, default: undefined },
    /** Колбэк при смене шага */
    onStepChange: { type: Function as PropType<(step: number) => void>, required: false, default: undefined },
    /** Валидировать поля текущего шага перед переходом дальше (по умолчанию true) */
    validateOnNext: { type: Boolean, required: false, default: true },
    /** Линейный режим — обязательное прохождение по порядку, без прыжков через Indicator */
    linear: { type: Boolean, required: false, default: false },
    /** Ориентация индикатора (по умолчанию 'horizontal') */
    orientation: { type: String as PropType<'horizontal' | 'vertical'>, required: false, default: 'horizontal' },
    /** Колбэк при успешном завершении шага (после валидации, до перехода) */
    onStepComplete: {
      type: Function as PropType<(stepIndex: number, values: unknown) => void | Promise<void>>,
      required: false,
      default: undefined,
    },
    /** Персистенция текущего шага в localStorage */
    stepPersistence: { type: Object as PropType<StepPersistenceConfig>, required: false, default: undefined },
  },
  setup(props, { slots }) {
    const { form } = useAppFormContext()

    const controlledStep = computed(() => props.step)

    const internalStep = ref(getPersistedStep(props.stepPersistence) ?? props.defaultStep) as Ref<number>
    function setInternalStep(step: number): void {
      internalStep.value = step
    }

    const currentStep = computed(() => controlledStep.value ?? internalStep.value)

    const { clearPersistence } = useStepPersistence(currentStep, props.stepPersistence)

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

    // В linear-режиме прыжки вперёд через Indicator запрещены — тот же оверрайд `goToStep`,
    // что делает `FormStepsRoot` у `@letar/forms-shadcn`.
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
          class: ['letar-form-steps', props.orientation === 'vertical' ? 'letar-form-steps--vertical' : null],
          'data-orientation': props.orientation,
        },
        slots.default?.(),
      )
  },
})
