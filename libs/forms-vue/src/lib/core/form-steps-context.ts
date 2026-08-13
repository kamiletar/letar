import { type ComputedRef, inject, type InjectionKey, provide, type Ref } from 'vue'
import type { StepDirection, StepInfo } from './step-types'

/**
 * Vue-эквивалент `FormStepsContextValue` из `@letar/forms-shadcn`
 * (`libs/forms-shadcn/src/lib/steps/form-steps-context.tsx`) — но живёт в `@letar/forms-vue/core`,
 * а не в headless-пакете скина, потому что в этой Фазе (9) headless- и shadcn-версия `Form.Steps`
 * используют один и тот же контекст (в отличие от React, где headless-пакета для `Form.Steps` нет
 * вовсе — Chakra-версия и shadcn-версия несут каждая свой контекст независимо).
 */
export interface FormStepsContextValue {
  currentStep: Ref<number>
  stepCount: ComputedRef<number>
  steps: ComputedRef<StepInfo[]>
  goToNext: () => Promise<boolean>
  goToPrev: () => Promise<void>
  goToStep: (step: number) => void
  skipToEnd: () => void
  triggerSubmit: () => void
  canGoNext: ComputedRef<boolean>
  canGoPrev: ComputedRef<boolean>
  isCompleted: ComputedRef<boolean>
  isLastStep: ComputedRef<boolean>
  isFirstStep: ComputedRef<boolean>
  registerStep: (step: StepInfo) => void
  unregisterStep: (index: number) => void
  claimedIndices: Set<number>
  validateOnNext: boolean
  linear: boolean
  direction: Ref<StepDirection>
  onStepComplete?: (stepIndex: number, values: unknown) => Promise<void> | void
  clearStepPersistence: () => void
}

const FORM_STEPS_KEY: InjectionKey<FormStepsContextValue> = Symbol('letar-forms-vue-form-steps')

export function provideFormSteps(context: FormStepsContextValue): void {
  provide(FORM_STEPS_KEY, context)
}

/** Хук доступа к контексту `Form.Steps`. @throws вне `<FormSteps>` */
export function useFormStepsContext(): FormStepsContextValue {
  const context = inject(FORM_STEPS_KEY)
  if (!context) {
    throw new Error('[@letar/forms-vue] useFormStepsContext использован вне <FormSteps>')
  }
  return context
}
