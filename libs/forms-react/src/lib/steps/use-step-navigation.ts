'use client'

import type { AnyFormApi } from '@tanstack/react-form'
import { useCallback, useRef, useState } from 'react'
import type { StepDirection, StepInfo } from './step-types'

const EMPTY_HIDDEN_FIELDS: Set<string> = new Set()

/**
 * Параметры useStepNavigation
 */
export interface UseStepNavigationParams {
  /** TanStack Form API */
  form: AnyFormApi
  /** Текущий индекс шага */
  currentStep: number
  /** Общее число шагов */
  stepCount: number
  /** Отсортированные шаги */
  sortedSteps: StepInfo[]
  /**
   * Скрытые поля (исключены из валидации, интеграция с Form.When).
   * Скины без Form.When-интеграции опускают параметр — фильтрация по пустому множеству
   * не меняет поведение (валидируются все поля шага, как и раньше).
   */
  hiddenFields?: Set<string>
  /** Внешне управляемый шаг */
  controlledStep?: number
  /** Колбэк при смене шага */
  onStepChange?: (step: number) => void
  /** Колбэк при завершении шага */
  onStepComplete?: (stepIndex: number, values: unknown) => Promise<void> | void
  /** Валидировать при переходе к следующему шагу */
  validateOnNext?: boolean
  /** Сеттер внутреннего состояния шага */
  setInternalStep: (step: number) => void
}

/**
 * Результат useStepNavigation
 */
export interface UseStepNavigationResult {
  /** Направление перехода (для анимации) */
  direction: StepDirection
  /** Перейти к следующему шагу (с валидацией) */
  goToNext: () => Promise<boolean>
  /** Перейти к предыдущему шагу */
  goToPrev: () => Promise<void>
  /** Перейти к конкретному шагу */
  goToStep: (step: number) => void
  /** Перескочить в конец (без валидации) */
  skipToEnd: () => void
  /** Программно отправить форму */
  triggerSubmit: () => void
  /** Валидировать текущий шаг */
  validateCurrentStep: () => Promise<boolean>
}

/**
 * Хук навигации между шагами формы
 *
 * ВАЖНО: все нестабильные значения (sortedSteps, stepCount, currentStep, hiddenFields,
 * onStepChange, onStepComplete) передаются через рефы. Это предотвращает пересоздание
 * колбэков при каждой регистрации шага — иначе возникает бесконечный цикл:
 * registerStep -> новые sortedSteps/stepCount -> новые колбэки -> новый contextValue ->
 * ре-рендер -> повторная регистрация -> бесконечный цикл.
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
  const [direction, setDirection] = useState<StepDirection>('forward')

  const sortedStepsRef = useRef(sortedSteps)
  sortedStepsRef.current = sortedSteps

  const stepCountRef = useRef(stepCount)
  stepCountRef.current = stepCount

  const currentStepRef = useRef(currentStep)
  currentStepRef.current = currentStep

  const hiddenFieldsRef = useRef(hiddenFields ?? EMPTY_HIDDEN_FIELDS)
  hiddenFieldsRef.current = hiddenFields ?? EMPTY_HIDDEN_FIELDS

  const onStepChangeRef = useRef(onStepChange)
  onStepChangeRef.current = onStepChange

  const onStepCompleteRef = useRef(onStepComplete)
  onStepCompleteRef.current = onStepComplete

  const controlledStepRef = useRef(controlledStep)
  controlledStepRef.current = controlledStep

  const validateOnNextRef = useRef(validateOnNext)
  validateOnNextRef.current = validateOnNext

  // Валидация полей текущего шага (кроме скрытых)

  const validateCurrentStep = useCallback(async (): Promise<boolean> => {
    if (!validateOnNextRef.current) {
      return true
    }

    const currentStepInfo = sortedStepsRef.current[currentStepRef.current]
    if (!currentStepInfo || currentStepInfo.fieldNames.length === 0) {
      return true
    }

    // Скрытые поля не валидируются
    const visibleFieldNames = currentStepInfo.fieldNames.filter((name) => !hiddenFieldsRef.current.has(name))

    if (visibleFieldNames.length === 0) {
      return true
    }

    // Отметить поля как touched — показать ошибки
    for (const fieldName of visibleFieldNames) {
      form.setFieldMeta(fieldName, (prev) => ({
        ...prev,
        isTouched: true,
      }))
    }

    // Провалидировать каждое видимое поле текущего шага
    for (const fieldName of visibleFieldNames) {
      await form.validateField(fieldName, 'change')
    }

    // Проверить наличие ошибок
    const state = form.store.state
    for (const fieldName of visibleFieldNames) {
      const fieldMeta = state.fieldMeta[fieldName]
      if (fieldMeta?.errors && fieldMeta.errors.length > 0) {
        return false
      }
    }

    return true
  }, [form])

  // Перейти к следующему шагу

  const goToNext = useCallback(async (): Promise<boolean> => {
    const isValid = await validateCurrentStep()
    if (!isValid) {
      return false
    }

    const step = currentStepRef.current
    const currentStepInfo = sortedStepsRef.current[step]

    // Колбэк onLeave, если есть (может отменить переход)
    if (currentStepInfo?.onLeave) {
      const canLeave = await currentStepInfo.onLeave('forward')
      if (!canLeave) {
        return false
      }
    }

    // Колбэк onStepComplete
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

      // Колбэк onEnter следующего шага
      const nextStepInfo = sortedStepsRef.current[nextStep]
      if (nextStepInfo?.onEnter) {
        nextStepInfo.onEnter()
      }

      return true
    }
    return false
  }, [form, validateCurrentStep, setInternalStep])

  // Перейти к предыдущему шагу

  const goToPrev = useCallback(async () => {
    const step = currentStepRef.current
    const prevStep = step - 1
    if (prevStep >= 0) {
      const currentStepInfo = sortedStepsRef.current[step]

      // Колбэк onLeave, если есть (может отменить переход)
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

      // Колбэк onEnter предыдущего шага
      const prevStepInfo = sortedStepsRef.current[prevStep]
      if (prevStepInfo?.onEnter) {
        prevStepInfo.onEnter()
      }
    }
  }, [setInternalStep])

  // Перейти к конкретному шагу

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
    [setInternalStep],
  )

  // Перескочить в конец (без валидации)

  const skipToEnd = useCallback(() => {
    const count = stepCountRef.current
    setDirection('forward')
    if (controlledStepRef.current === undefined) {
      setInternalStep(count) // За последним шагом — состояние "завершено"
    }
    onStepChangeRef.current?.(count)
  }, [setInternalStep])

  // Программная отправка формы
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
