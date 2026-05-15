'use client'

import type { AnyFormApi } from '@tanstack/react-form'
import { useCallback, useRef, useState } from 'react'
import type { StepDirection, StepInfo } from './form-steps-context'

/**
 * Parameters for useStepNavigation hook
 */
export interface UseStepNavigationParams {
  /** TanStack Form API */
  form: AnyFormApi
  /** Current step index */
  currentStep: number
  /** Total number of steps */
  stepCount: number
  /** Sorted steps */
  sortedSteps: StepInfo[]
  /** Hidden fields (excluded from validation) */
  hiddenFields: Set<string>
  /** Externally controlled step */
  controlledStep?: number
  /** Callback on step change */
  onStepChange?: (step: number) => void
  /** Callback on step completion */
  onStepComplete?: (stepIndex: number, values: unknown) => Promise<void> | void
  /** Validate when navigating to next step */
  validateOnNext?: boolean
  /** Setter for internal step state */
  setInternalStep: (step: number) => void
}

/**
 * Result of useStepNavigation hook
 */
export interface UseStepNavigationResult {
  /** Transition direction (for animation) */
  direction: StepDirection
  /** Go to next step (with validation) */
  goToNext: () => Promise<boolean>
  /** Go to previous step */
  goToPrev: () => Promise<void>
  /** Go to specific step */
  goToStep: (step: number) => void
  /** Skip to end (without validation) */
  skipToEnd: () => void
  /** Trigger form submission */
  triggerSubmit: () => void
  /** Validate current step */
  validateCurrentStep: () => Promise<boolean>
}

/**
 * Hook for navigating between form steps
 *
 * Manages:
 * - Transitions between steps
 * - Validation before transition
 * - Animation direction
 * - Step callbacks (onEnter, onLeave)
 *
 * IMPORTANT: All callbacks use refs for unstable values (sortedSteps, stepCount,
 * currentStep, hiddenFields, onStepChange, onStepComplete). This prevents callback
 * recreation on each step registration, which caused an infinite loop:
 * registerStep -> new sortedSteps/stepCount -> new callbacks -> new contextValue ->
 * re-render -> re-registration -> infinite loop.
 */
export function useStepNavigation({
  form,
  currentStep,
  stepCount,
  sortedSteps,
  hiddenFields,
  controlledStep,
  onStepChange,
  onStepComplete,
  validateOnNext = true,
  setInternalStep,
}: UseStepNavigationParams): UseStepNavigationResult {
  // Animation direction (for slide effect)
  const [direction, setDirection] = useState<StepDirection>('forward')

  // All unstable values via refs — callbacks are NEVER recreated
  const sortedStepsRef = useRef(sortedSteps)
  sortedStepsRef.current = sortedSteps

  const stepCountRef = useRef(stepCount)
  stepCountRef.current = stepCount

  const currentStepRef = useRef(currentStep)
  currentStepRef.current = currentStep

  const hiddenFieldsRef = useRef(hiddenFields)
  hiddenFieldsRef.current = hiddenFields

  const onStepChangeRef = useRef(onStepChange)
  onStepChangeRef.current = onStepChange

  const onStepCompleteRef = useRef(onStepComplete)
  onStepCompleteRef.current = onStepComplete

  const controlledStepRef = useRef(controlledStep)
  controlledStepRef.current = controlledStep

  const validateOnNextRef = useRef(validateOnNext)
  validateOnNextRef.current = validateOnNext

  // Validate current step fields (excluding hidden fields)

  const validateCurrentStep = useCallback(async (): Promise<boolean> => {
    if (!validateOnNextRef.current) {
      return true
    }

    const currentStepInfo = sortedStepsRef.current[currentStepRef.current]
    if (!currentStepInfo || currentStepInfo.fieldNames.length === 0) {
      return true
    }

    // Filter hidden fields — they should not be validated
    const visibleFieldNames = currentStepInfo.fieldNames.filter((name) => !hiddenFieldsRef.current.has(name))

    if (visibleFieldNames.length === 0) {
      return true
    }

    // Mark fields as touched to show errors
    for (const fieldName of visibleFieldNames) {
      form.setFieldMeta(fieldName, (prev) => ({
        ...prev,
        isTouched: true,
      }))
    }

    // Validate each visible field on the current step
    for (const fieldName of visibleFieldNames) {
      await form.validateField(fieldName, 'change')
    }

    // Check for errors
    const state = form.store.state
    for (const fieldName of visibleFieldNames) {
      const fieldMeta = state.fieldMeta[fieldName]
      if (fieldMeta?.errors && fieldMeta.errors.length > 0) {
        return false
      }
    }

    return true
  }, [form])

  // Go to next step

  const goToNext = useCallback(async (): Promise<boolean> => {
    const isValid = await validateCurrentStep()
    if (!isValid) {
      return false
    }

    const step = currentStepRef.current
    const currentStepInfo = sortedStepsRef.current[step]

    // Call onLeave callback if exists (can cancel transition)
    if (currentStepInfo?.onLeave) {
      const canLeave = await currentStepInfo.onLeave('forward')
      if (!canLeave) {
        return false
      }
    }

    // Call onStepComplete callback
    if (onStepCompleteRef.current) {
      await onStepCompleteRef.current(step, form.state.values)
    }

    const nextStep = step + 1
    if (nextStep < stepCountRef.current) {
      setDirection('forward')
      if (controlledStepRef.current === undefined) {
        setInternalStep(nextStep)
      }
      onStepChangeRef.current?.(nextStep)

      // Call onEnter callback of next step
      const nextStepInfo = sortedStepsRef.current[nextStep]
      if (nextStepInfo?.onEnter) {
        nextStepInfo.onEnter()
      }

      return true
    }
    return false
  }, [form, validateCurrentStep, setInternalStep])

  // Go to previous step

  const goToPrev = useCallback(async () => {
    const step = currentStepRef.current
    const prevStep = step - 1
    if (prevStep >= 0) {
      const currentStepInfo = sortedStepsRef.current[step]

      // Call onLeave callback if exists (can cancel transition)
      if (currentStepInfo?.onLeave) {
        const canLeave = await currentStepInfo.onLeave('backward')
        if (!canLeave) {
          return
        }
      }

      setDirection('backward')
      if (controlledStepRef.current === undefined) {
        setInternalStep(prevStep)
      }
      onStepChangeRef.current?.(prevStep)

      // Call onEnter callback of previous step
      const prevStepInfo = sortedStepsRef.current[prevStep]
      if (prevStepInfo?.onEnter) {
        prevStepInfo.onEnter()
      }
    }
  }, [setInternalStep])

  // Go to specific step

  const goToStep = useCallback(
    (step: number) => {
      if (step >= 0 && step < stepCountRef.current) {
        setDirection(step > currentStepRef.current ? 'forward' : 'backward')
        if (controlledStepRef.current === undefined) {
          setInternalStep(step)
        }
        onStepChangeRef.current?.(step)
      }
    },
    [setInternalStep]
  )

  // Skip to end (without validation)

  const skipToEnd = useCallback(() => {
    const count = stepCountRef.current
    setDirection('forward')
    if (controlledStepRef.current === undefined) {
      setInternalStep(count) // Past last step — completed state
    }
    onStepChangeRef.current?.(count)
  }, [setInternalStep])

  // Programmatic form submission
  const triggerSubmit = useCallback(() => {
    form.handleSubmit()
  }, [form])

  return {
    direction,
    goToNext,
    goToPrev,
    goToStep,
    skipToEnd,
    triggerSubmit,
    validateCurrentStep,
  }
}
