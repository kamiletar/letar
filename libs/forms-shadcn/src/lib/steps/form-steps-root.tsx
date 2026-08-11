'use client'

import {
  type StepPersistenceConfig,
  useDeclarativeForm,
  useStepNavigation,
  useStepPersistence,
  useStepState,
} from '@letar/forms-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@letar/tailwind-utils'
import { FormStepsContext, type FormStepsContextValue } from './form-steps-context'

export type { StepPersistenceConfig }

const SHADCN_STORAGE_PREFIX = 'form-steps-shadcn:'

export interface FormStepsProps {
  children: ReactNode
  /** Начальный индекс шага (0-based) */
  defaultStep?: number
  /** Управляемый индекс шага */
  step?: number
  /** Колбэк при смене шага */
  onStepChange?: (step: number) => void
  /** Валидировать поля текущего шага перед переходом дальше (по умолчанию true) */
  validateOnNext?: boolean
  /** Линейный режим — обязательное прохождение по порядку, без прыжков через `Indicator` */
  linear?: boolean
  /** Ориентация индикатора (по умолчанию 'horizontal') */
  orientation?: 'horizontal' | 'vertical'
  /** Колбэк при успешном завершении шага (после валидации, до перехода) */
  onStepComplete?: (stepIndex: number, values: unknown) => Promise<void> | void
  /** Персистенция текущего шага в localStorage */
  stepPersistence?: StepPersistenceConfig
}

/**
 * Form.Steps — shadcn-скин (beta). Мультистеп-обёртка форм-уровня, не `createField()`-поле —
 * та же категория, что `Form.Steps` у Chakra-версии, только `@letar/forms-shadcn` пока не несёт
 * своего `createForm()` (backlog `libs/forms/PLAN.md` §7.3), поэтому это самостоятельный
 * compound-экспорт, читающий `useDeclarativeForm()` напрямую — работает с любым
 * `DeclarativeFormContext.Provider`, включая временный `DemoForm` песочницы.
 *
 * Beta-упрощения относительно Chakra-версии: без `Form.When`-интеграции (`hiddenFields`/
 * `segment`-обёртки в `Form.Group`) и без анимаций перехода (`framer-motion` — новая зависимость,
 * не оправдана для первого прохода). Индикатор — нативная разметка вместо Chakra `Steps.Root`.
 */
export function FormStepsRoot({
  children,
  defaultStep = 0,
  step: controlledStep,
  onStepChange,
  validateOnNext = true,
  linear = false,
  orientation = 'horizontal',
  onStepComplete,
  stepPersistence,
}: FormStepsProps) {
  const { form } = useDeclarativeForm()

  // storagePrefix свой (`form-steps-shadcn:`, не `form-steps:`) — не путать с сохранённым
  // прогрессом Chakra-скина той же формы; явный storagePrefix в props имеет приоритет.
  const persistenceConfig = useMemo(
    () => (stepPersistence ? { storagePrefix: SHADCN_STORAGE_PREFIX, ...stepPersistence } : undefined),
    [stepPersistence],
  )

  const { getPersistedStep, clearPersistence } = useStepPersistence(0, persistenceConfig)

  const [internalStep, setInternalStep] = useState(() => getPersistedStep() ?? defaultStep)
  const currentStep = controlledStep ?? internalStep

  const { sortedSteps, stepCount, registerStep, unregisterStep, claimedIndicesRef } = useStepState()

  useStepPersistence(currentStep, persistenceConfig)

  const { direction, goToNext, goToPrev, goToStep, skipToEnd, triggerSubmit } = useStepNavigation({
    form,
    currentStep,
    stepCount,
    sortedSteps,
    controlledStep,
    onStepChange,
    onStepComplete,
    validateOnNext,
    setInternalStep,
  })

  const sortedStepsRef = useRef(sortedSteps)
  sortedStepsRef.current = sortedSteps
  const onStepCompleteRef = useRef(onStepComplete)
  onStepCompleteRef.current = onStepComplete

  const contextValue: FormStepsContextValue = useMemo(
    () => ({
      currentStep,
      stepCount,
      get steps() {
        return sortedStepsRef.current
      },
      goToNext,
      goToPrev,
      goToStep,
      skipToEnd,
      triggerSubmit,
      canGoNext: currentStep < stepCount - 1,
      canGoPrev: currentStep > 0,
      isCompleted: currentStep >= stepCount,
      isLastStep: currentStep === stepCount - 1,
      isFirstStep: currentStep === 0,
      registerStep,
      unregisterStep,
      claimedIndicesRef,
      validateOnNext,
      linear,
      direction,
      get onStepComplete() {
        return onStepCompleteRef.current
      },
      clearStepPersistence: clearPersistence,
    }),
    // sortedSteps/onStepComplete — через рефы/геттеры, не в deps (иначе бесконечный цикл
    // регистрации, см. use-step-navigation.ts)
    [
      currentStep,
      stepCount,
      goToNext,
      goToPrev,
      goToStep,
      skipToEnd,
      triggerSubmit,
      clearPersistence,
      registerStep,
      unregisterStep,
      claimedIndicesRef,
      validateOnNext,
      linear,
      direction,
    ],
  )

  const handleIndicatorNavigate = useCallback(
    (targetStep: number) => {
      if (linear && targetStep > currentStep) { return }
      goToStep(targetStep)
    },
    [linear, currentStep, goToStep],
  )

  return (
    <FormStepsContext.Provider value={{ ...contextValue, goToStep: handleIndicatorNavigate }}>
      <div
        className={cn('space-y-4', orientation === 'vertical' && 'flex gap-6 space-y-0')}
        data-orientation={orientation}
      >
        {children}
      </div>
    </FormStepsContext.Provider>
  )
}

FormStepsRoot.displayName = 'FormStepsRoot'
