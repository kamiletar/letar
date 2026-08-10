'use client'

import type { StepDirection, StepInfo } from '@letar/forms-react'
import { createContext, type RefObject, useContext } from 'react'

export type { StepDirection, StepInfo }

export interface FormStepsContextValue {
  currentStep: number
  stepCount: number
  steps: StepInfo[]
  goToNext: () => Promise<boolean>
  goToPrev: () => void
  goToStep: (step: number) => void
  skipToEnd: () => void
  triggerSubmit: () => void
  canGoNext: boolean
  canGoPrev: boolean
  isCompleted: boolean
  isLastStep: boolean
  isFirstStep: boolean
  registerStep: (step: StepInfo) => void
  unregisterStep: (index: number) => void
  claimedIndicesRef: RefObject<Set<number>>
  validateOnNext: boolean
  linear: boolean
  direction: StepDirection
  onStepComplete?: (stepIndex: number, values: unknown) => Promise<void> | void
  clearStepPersistence: () => void
}

export const FormStepsContext = createContext<FormStepsContextValue | null>(null)

/** Хук доступа к контексту Form.Steps. @throws вне Form.Steps */
export function useFormStepsContext(): FormStepsContextValue {
  const context = useContext(FormStepsContext)
  if (!context) {
    throw new Error('useFormStepsContext must be used inside FormSteps')
  }
  return context
}
