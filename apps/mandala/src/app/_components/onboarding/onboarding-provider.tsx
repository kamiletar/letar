'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ONBOARDING_STEPS, ONBOARDING_STORAGE_KEY, type OnboardingStep } from './onboarding-types'

interface OnboardingContextValue {
  /** Текущий шаг онбординга (null если не активен) */
  currentStep: OnboardingStep | null
  /** Индекс текущего шага */
  currentStepIndex: number
  /** Общее количество шагов */
  totalSteps: number
  /** Онбординг активен */
  isActive: boolean
  /** Переход к следующему шагу */
  nextStep: () => void
  /** Переход к предыдущему шагу */
  prevStep: () => void
  /** Пропустить онбординг */
  skip: () => void
  /** Запустить онбординг заново */
  restart: () => void
  /** Проверить, завершён ли онбординг */
  isCompleted: boolean
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null)

interface OnboardingProviderProps {
  children: React.ReactNode
}

/**
 * Провайдер онбординга.
 * Управляет состоянием пошаговых подсказок для новых пользователей.
 */
export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [isCompleted, setIsCompleted] = useState(true)
  const [isReady, setIsReady] = useState(false)

  // Проверка localStorage при монтировании
  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY)
    if (!completed) {
      setIsCompleted(false)
      // Не запускаем автоматически — пользователь может запустить через меню
    }
    setIsReady(true)
  }, [])

  const isActive = currentStepIndex >= 0 && currentStepIndex < ONBOARDING_STEPS.length

  const currentStep = useMemo(() => {
    if (!isActive) {
      return null
    }
    return ONBOARDING_STEPS[currentStepIndex]
  }, [isActive, currentStepIndex])

  const nextStep = useCallback(() => {
    if (currentStepIndex < ONBOARDING_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1)
    } else {
      // Завершение онбординга
      setCurrentStepIndex(-1)
      setIsCompleted(true)
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
    }
  }, [currentStepIndex])

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1)
    }
  }, [currentStepIndex])

  const skip = useCallback(() => {
    setCurrentStepIndex(-1)
    setIsCompleted(true)
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
  }, [])

  const restart = useCallback(() => {
    setCurrentStepIndex(0)
    setIsCompleted(false)
  }, [])

  const value = useMemo(
    (): OnboardingContextValue => ({
      currentStep,
      currentStepIndex,
      totalSteps: ONBOARDING_STEPS.length,
      isActive,
      nextStep,
      prevStep,
      skip,
      restart,
      isCompleted,
    }),
    [currentStep, currentStepIndex, isActive, nextStep, prevStep, skip, restart, isCompleted]
  )

  // Не рендерим до проверки localStorage
  if (!isReady) {
    return <>{children}</>
  }

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
}

// Функция-заглушка для дефолтных значений
const noop = () => {
  // no-op
}

/** Значения по умолчанию, когда контекст не готов */
const DEFAULT_VALUE: OnboardingContextValue = {
  currentStep: null,
  currentStepIndex: -1,
  totalSteps: ONBOARDING_STEPS.length,
  isActive: false,
  nextStep: noop,
  prevStep: noop,
  skip: noop,
  restart: noop,
  isCompleted: true,
}

/**
 * Хук для доступа к онбордингу.
 * Возвращает безопасные значения по умолчанию, если контекст ещё не готов.
 */
export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext)
  // Возвращаем дефолтные значения вместо ошибки (для SSR и начальной загрузки)
  return context ?? DEFAULT_VALUE
}
