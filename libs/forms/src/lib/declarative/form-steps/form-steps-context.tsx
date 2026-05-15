'use client'

import { createContext, type ReactNode, type RefObject, useContext } from 'react'

/**
 * Information about a single step
 */
export interface StepInfo {
  /** Step index (0-based) */
  index: number
  /** Step title */
  title: string
  /** Optional description */
  description?: string
  /** Optional icon */
  icon?: ReactNode
  /** Field names in this step (for validation) */
  fieldNames: string[]
  /** Callback when entering the step */
  onEnter?: () => void
  /** Callback when leaving the step (can cancel transition) */
  onLeave?: (direction: StepDirection) => Promise<boolean> | boolean
}

/** Animation direction */
export type StepDirection = 'forward' | 'backward'

/**
 * Context value for Form.Steps
 */
export interface FormStepsContextValue {
  /** Current step index (0-based) */
  currentStep: number
  /** Total number of steps */
  stepCount: number
  /** Registered steps info */
  steps: StepInfo[]
  /** Go to next step */
  goToNext: () => Promise<boolean>
  /** Go to previous step */
  goToPrev: () => void
  /** Go to specific step */
  goToStep: (step: number) => void
  /** Skip to end (completed state) without validation */
  skipToEnd: () => void
  /** Trigger form submission programmatically */
  triggerSubmit: () => void
  /** Check if can go to next step */
  canGoNext: boolean
  /** Check if can go to previous step */
  canGoPrev: boolean
  /** Whether all steps are completed */
  isCompleted: boolean
  /** Whether we're on the last step */
  isLastStep: boolean
  /** Whether we're on the first step */
  isFirstStep: boolean
  /** Register a step */
  registerStep: (step: StepInfo) => void
  /** Unregister a step */
  unregisterStep: (index: number) => void
  /** Shared mutable ref для атомарного назначения уникальных индексов шагам */
  claimedIndicesRef: RefObject<Set<number>>
  /** Validate fields on current step before navigation */
  validateOnNext: boolean
  /** Linear mode (must complete steps in order) */
  linear: boolean
  /** Orientation */
  orientation: 'horizontal' | 'vertical'
  /** Size */
  size: 'xs' | 'sm' | 'md' | 'lg'
  /** Variant */
  variant: 'solid' | 'subtle'
  /** Color palette */
  colorPalette: string
  /** Whether transition animations are enabled */
  animated: boolean
  /** Animation duration in seconds */
  animationDuration: number
  /** Direction of the last transition (for animation) */
  direction: StepDirection
  /** Hidden fields (excluded from validation via Form.When) */
  hiddenFields: Set<string>
  /** Hide fields from validation (called from Form.When when hiding) */
  hideFieldsFromValidation: (fieldNames: string[]) => void
  /** Show fields for validation (called from Form.When when showing) */
  showFieldsForValidation: (fieldNames: string[]) => void
  /** Callback on successful step completion */
  onStepComplete?: (stepIndex: number, values: unknown) => Promise<void> | void
  /** Clear step persistence (call after successful submission) */
  clearStepPersistence: () => void
}

export const FormStepsContext = createContext<FormStepsContextValue | null>(null)

/**
 * Hook to access Form.Steps context
 * @throws Error if used outside of Form.Steps
 */
export function useFormStepsContext(): FormStepsContextValue {
  const context = useContext(FormStepsContext)
  if (!context) {
    throw new Error('useFormStepsContext must be used inside Form.Steps')
  }
  return context
}
