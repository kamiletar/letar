'use client'

import { Button, ButtonGroup, type ButtonProps } from '@chakra-ui/react'
import { type ReactNode, useCallback, useState } from 'react'
import { useDeclarativeForm } from '../form-context'
import { useFormStepsContext } from './form-steps-context'

export interface FormStepsNavigationProps {
  /** Label for previous button */
  prevLabel?: ReactNode
  /** Label for next button */
  nextLabel?: ReactNode
  /** Label for submit button (shown on last step) */
  submitLabel?: ReactNode
  /** Label for skip button */
  skipLabel?: ReactNode
  /** Show previous button */
  showPrev?: boolean
  /** Show next/submit button */
  showNext?: boolean
  /** Show skip button (allows skipping all steps to end) */
  showSkip?: boolean
  /** Button size */
  size?: ButtonProps['size']
  /** Button variant for prev button */
  prevVariant?: ButtonProps['variant']
  /** Button variant for next/submit button */
  nextVariant?: ButtonProps['variant']
  /** Button variant for skip button */
  skipVariant?: ButtonProps['variant']
  /** Color palette for buttons */
  colorPalette?: string
  /** Gap between buttons */
  gap?: number | string
  /** Callback after successful step change */
  onStepChange?: (step: number) => void
  /** Callback when form is submitted */
  onSubmit?: () => void
  /** Callback when skip is clicked (if returns false, skip is cancelled) */
  onSkip?: () => Promise<boolean> | boolean | void
}

/**
 * Form.Steps.Navigation - Navigation buttons for multi-step form
 *
 * Provides Previous/Next buttons with automatic validation.
 * On the last step, shows Submit button instead of Next.
 *
 * @example
 * ```tsx
 * <Form.Steps.Navigation
 *   prevLabel="Back"
 *   nextLabel="Continue"
 *   submitLabel="Create Account"
 * />
 * ```
 */
export function FormStepsNavigation({
  prevLabel = 'Back',
  nextLabel = 'Next',
  submitLabel = 'Submit',
  skipLabel = 'Skip',
  showPrev = true,
  showNext = true,
  showSkip = false,
  size = 'md',
  prevVariant = 'outline',
  nextVariant = 'solid',
  skipVariant = 'ghost',
  colorPalette = 'brand',
  gap = 2,
  onStepChange,
  onSubmit,
  onSkip,
}: FormStepsNavigationProps) {
  const { form } = useDeclarativeForm()
  const { goToNext, goToPrev, skipToEnd, isFirstStep, isLastStep, canGoPrev, currentStep } = useFormStepsContext()

  const [isNavigating, setIsNavigating] = useState(false)
  const [isSkipping, setIsSkipping] = useState(false)
  const [isSubmittingForm, setIsSubmittingForm] = useState(false)

  // Handle next button click
  const handleNext = useCallback(async () => {
    setIsNavigating(true)
    try {
      const success = await goToNext()
      if (success) {
        onStepChange?.(currentStep + 1)
      }
    } finally {
      setIsNavigating(false)
    }
  }, [goToNext, currentStep, onStepChange])

  // Handle prev button click
  const handlePrev = useCallback(() => {
    goToPrev()
    onStepChange?.(currentStep - 1)
  }, [goToPrev, currentStep, onStepChange])

  // Handle submit - trigger form submission with double-click protection
  const handleSubmit = useCallback(async () => {
    if (isSubmittingForm) {
      return
    }
    setIsSubmittingForm(true)
    try {
      onSubmit?.()
      await form.handleSubmit()
    } finally {
      setIsSubmittingForm(false)
    }
  }, [form, onSubmit, isSubmittingForm])

  // Handle skip button click
  const handleSkip = useCallback(async () => {
    setIsSkipping(true)
    try {
      // Call onSkip callback if provided
      if (onSkip) {
        const result = await onSkip()
        // If onSkip returns false, cancel skip
        if (result === false) {
          return
        }
      }
      skipToEnd()
    } finally {
      setIsSkipping(false)
    }
  }, [onSkip, skipToEnd])

  return (
    <ButtonGroup gap={gap}>
      {showPrev && (
        <Button
          variant={prevVariant}
          size={size}
          onClick={handlePrev}
          disabled={isFirstStep || !canGoPrev || isNavigating || isSkipping}
          colorPalette={colorPalette}
        >
          {prevLabel}
        </Button>
      )}

      {showSkip && (
        <Button
          variant={skipVariant}
          size={size}
          onClick={handleSkip}
          loading={isSkipping}
          disabled={isNavigating}
          colorPalette={colorPalette}
        >
          {skipLabel}
        </Button>
      )}

      {showNext &&
        (isLastStep ? (
          <Button
            type="submit"
            variant={nextVariant}
            size={size}
            colorPalette={colorPalette}
            onClick={handleSubmit}
            loading={isSubmittingForm}
            disabled={isSubmittingForm || isNavigating || isSkipping}
          >
            {submitLabel}
          </Button>
        ) : (
          <Button
            variant={nextVariant}
            size={size}
            onClick={handleNext}
            loading={isNavigating}
            colorPalette={colorPalette}
          >
            {nextLabel}
          </Button>
        ))}
    </ButtonGroup>
  )
}

FormStepsNavigation.displayName = 'FormStepsNavigation'
