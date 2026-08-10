'use client'

import type { AnyFormApi } from '@tanstack/react-form'
import { useCallback, useRef, useState } from 'react'
import type { StepDirection, StepInfo } from './form-steps-context'

export interface UseStepNavigationParams {
  form: AnyFormApi
  currentStep: number
  stepCount: number
  sortedSteps: StepInfo[]
  controlledStep?: number
  onStepChange?: (step: number) => void
  onStepComplete?: (stepIndex: number, values: unknown) => Promise<void> | void
  validateOnNext?: boolean
  setInternalStep: (step: number) => void
}

export interface UseStepNavigationResult {
  direction: StepDirection
  goToNext: () => Promise<boolean>
  goToPrev: () => Promise<void>
  goToStep: (step: number) => void
  skipToEnd: () => void
  triggerSubmit: () => void
  validateCurrentStep: () => Promise<boolean>
}

/**
 * Хук навигации между шагами — валидация, переходы, callbacks `onEnter`/`onLeave`.
 * Портировано из Chakra-версии без изменений (кроме удалённого `hiddenFields` — здесь нет
 * интеграции с `Form.When`, см. README «Известные упрощения»). Все нестабильные значения — через
 * рефы, чтобы колбэки не пересоздавались при каждой регистрации шага (иначе — бесконечный цикл
 * регистрация → новый `sortedSteps` → новые колбэки → новый `contextValue` → ре-рендер → регистрация).
 */
export function useStepNavigation({
  form,
  currentStep,
  stepCount,
  sortedSteps,
  controlledStep,
  onStepChange,
  onStepComplete,
  validateOnNext = true,
  setInternalStep,
}: UseStepNavigationParams): UseStepNavigationResult {
  const [direction, setDirection] = useState<StepDirection>('forward')

  const sortedStepsRef = useRef(sortedSteps)
  sortedStepsRef.current = sortedSteps
  const stepCountRef = useRef(stepCount)
  stepCountRef.current = stepCount
  const currentStepRef = useRef(currentStep)
  currentStepRef.current = currentStep
  const onStepChangeRef = useRef(onStepChange)
  onStepChangeRef.current = onStepChange
  const onStepCompleteRef = useRef(onStepComplete)
  onStepCompleteRef.current = onStepComplete
  const controlledStepRef = useRef(controlledStep)
  controlledStepRef.current = controlledStep
  const validateOnNextRef = useRef(validateOnNext)
  validateOnNextRef.current = validateOnNext

  const validateCurrentStep = useCallback(async (): Promise<boolean> => {
    if (!validateOnNextRef.current) { return true }

    const currentStepInfo = sortedStepsRef.current[currentStepRef.current]
    if (!currentStepInfo || currentStepInfo.fieldNames.length === 0) { return true }

    for (const fieldName of currentStepInfo.fieldNames) {
      form.setFieldMeta(fieldName, (prev) => ({ ...prev, isTouched: true }))
    }
    for (const fieldName of currentStepInfo.fieldNames) {
      await form.validateField(fieldName, 'change')
    }

    const state = form.store.state
    for (const fieldName of currentStepInfo.fieldNames) {
      const fieldMeta = state.fieldMeta[fieldName]
      if (fieldMeta?.errors && fieldMeta.errors.length > 0) { return false }
    }
    return true
  }, [form])

  const goToNext = useCallback(async (): Promise<boolean> => {
    const isValid = await validateCurrentStep()
    if (!isValid) { return false }

    const step = currentStepRef.current
    const currentStepInfo = sortedStepsRef.current[step]

    if (currentStepInfo?.onLeave) {
      const canLeave = await currentStepInfo.onLeave('forward')
      if (!canLeave) { return false }
    }

    if (onStepCompleteRef.current) {
      await onStepCompleteRef.current(step, form.state.values)
    }

    const nextStep = step + 1
    if (nextStep < stepCountRef.current) {
      setDirection('forward')
      if (controlledStepRef.current === undefined) { setInternalStep(nextStep) }
      onStepChangeRef.current?.(nextStep)

      const nextStepInfo = sortedStepsRef.current[nextStep]
      nextStepInfo?.onEnter?.()
      return true
    }
    return false
  }, [form, validateCurrentStep, setInternalStep])

  const goToPrev = useCallback(async () => {
    const step = currentStepRef.current
    const prevStep = step - 1
    if (prevStep >= 0) {
      const currentStepInfo = sortedStepsRef.current[step]
      if (currentStepInfo?.onLeave) {
        const canLeave = await currentStepInfo.onLeave('backward')
        if (!canLeave) { return }
      }

      setDirection('backward')
      if (controlledStepRef.current === undefined) { setInternalStep(prevStep) }
      onStepChangeRef.current?.(prevStep)

      const prevStepInfo = sortedStepsRef.current[prevStep]
      prevStepInfo?.onEnter?.()
    }
  }, [setInternalStep])

  const goToStep = useCallback(
    (step: number) => {
      if (step >= 0 && step < stepCountRef.current) {
        setDirection(step > currentStepRef.current ? 'forward' : 'backward')
        if (controlledStepRef.current === undefined) { setInternalStep(step) }
        onStepChangeRef.current?.(step)
      }
    },
    [setInternalStep],
  )

  const skipToEnd = useCallback(() => {
    const count = stepCountRef.current
    setDirection('forward')
    if (controlledStepRef.current === undefined) { setInternalStep(count) }
    onStepChangeRef.current?.(count)
  }, [setInternalStep])

  const triggerSubmit = useCallback(() => {
    form.handleSubmit()
  }, [form])

  return { direction, goToNext, goToPrev, goToStep, skipToEnd, triggerSubmit, validateCurrentStep }
}
