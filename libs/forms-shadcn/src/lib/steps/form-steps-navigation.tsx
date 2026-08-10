'use client'

import { useDeclarativeForm } from '@letar/forms-react'
import { type ReactNode, useCallback, useState } from 'react'
import { cn } from '../utils/cn'
import { useFormStepsContext } from './form-steps-context'

export interface FormStepsNavigationProps {
  prevLabel?: ReactNode
  nextLabel?: ReactNode
  submitLabel?: ReactNode
  skipLabel?: ReactNode
  showPrev?: boolean
  showNext?: boolean
  showSkip?: boolean
  onStepChange?: (step: number) => void
  onSubmit?: () => void
  onSkip?: () => Promise<boolean> | boolean | void
}

const buttonBase = 'rounded-md px-4 py-2 text-sm font-medium disabled:pointer-events-none disabled:opacity-50'

/**
 * Form.Steps.Navigation — shadcn-скин (beta). Кнопки Назад/Далее с автоматической валидацией;
 * на последнем шаге «Далее» превращается в «Отправить». Нативные `<button>` вместо Chakra
 * `Button`/`ButtonGroup`.
 */
export function FormStepsNavigation({
  prevLabel = 'Назад',
  nextLabel = 'Далее',
  submitLabel = 'Отправить',
  skipLabel = 'Пропустить',
  showPrev = true,
  showNext = true,
  showSkip = false,
  onStepChange,
  onSubmit,
  onSkip,
}: FormStepsNavigationProps) {
  const { form } = useDeclarativeForm()
  const { goToNext, goToPrev, skipToEnd, isFirstStep, isLastStep, canGoPrev, currentStep } = useFormStepsContext()

  const [isNavigating, setIsNavigating] = useState(false)
  const [isSkipping, setIsSkipping] = useState(false)
  const [isSubmittingForm, setIsSubmittingForm] = useState(false)

  const handleNext = useCallback(async () => {
    setIsNavigating(true)
    try {
      const success = await goToNext()
      if (success) { onStepChange?.(currentStep + 1) }
    } finally {
      setIsNavigating(false)
    }
  }, [goToNext, currentStep, onStepChange])

  const handlePrev = useCallback(() => {
    goToPrev()
    onStepChange?.(currentStep - 1)
  }, [goToPrev, currentStep, onStepChange])

  const handleSubmit = useCallback(async () => {
    if (isSubmittingForm) { return }
    setIsSubmittingForm(true)
    try {
      onSubmit?.()
      await form.handleSubmit()
    } finally {
      setIsSubmittingForm(false)
    }
  }, [form, onSubmit, isSubmittingForm])

  const handleSkip = useCallback(async () => {
    setIsSkipping(true)
    try {
      if (onSkip) {
        const result = await onSkip()
        if (result === false) { return }
      }
      skipToEnd()
    } finally {
      setIsSkipping(false)
    }
  }, [onSkip, skipToEnd])

  return (
    <div className="flex gap-2">
      {showPrev && (
        <button
          type="button"
          onClick={handlePrev}
          disabled={isFirstStep || !canGoPrev || isNavigating || isSkipping}
          className={cn(buttonBase, 'border-input border bg-transparent hover:bg-accent')}
        >
          {prevLabel}
        </button>
      )}

      {showSkip && (
        <button
          type="button"
          onClick={() => void handleSkip()}
          disabled={isNavigating}
          className={cn(buttonBase, 'hover:bg-accent')}
        >
          {isSkipping ? '…' : skipLabel}
        </button>
      )}

      {showNext && (isLastStep
        ? (
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSubmittingForm || isNavigating || isSkipping}
            className={cn(buttonBase, 'bg-primary text-primary-foreground')}
          >
            {isSubmittingForm ? '…' : submitLabel}
          </button>
        )
        : (
          <button
            type="button"
            onClick={() => void handleNext()}
            disabled={isNavigating}
            className={cn(buttonBase, 'bg-primary text-primary-foreground')}
          >
            {isNavigating ? '…' : nextLabel}
          </button>
        ))}
    </div>
  )
}

FormStepsNavigation.displayName = 'FormStepsNavigation'
