'use client'

import { Steps } from '@chakra-ui/react'
import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react'
import { useDeclarativeForm } from '../form-context'
import { FormStepsContext, type FormStepsContextValue } from './form-steps-context'
import { useStepNavigation } from './use-step-navigation'
import { type StepPersistenceConfig, useStepPersistence } from './use-step-persistence'
import { useStepState } from './use-step-state'

export type { StepPersistenceConfig }

export interface FormStepsProps {
  /** Form.Steps content (Step, Indicator, Navigation, CompletedContent) */
  children: ReactNode
  /** Initial step index (0-based) */
  defaultStep?: number
  /** Controlled step index */
  step?: number
  /** Callback when step changes */
  onStepChange?: (step: number) => void
  /** Whether to validate current step fields before moving to next */
  validateOnNext?: boolean
  /** Linear mode - must complete steps in order (no skipping) */
  linear?: boolean
  /** Orientation */
  orientation?: 'horizontal' | 'vertical'
  /** Size */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** Variant */
  variant?: 'solid' | 'subtle'
  /** Color palette */
  colorPalette?: string
  /** Enable slide animations when transitioning between steps */
  animated?: boolean
  /** Animation duration in seconds (default 0.3) */
  animationDuration?: number
  /** Callback on successful step completion (called after validation, before transition) */
  onStepComplete?: (stepIndex: number, values: unknown) => Promise<void> | void
  /**
   * Enable localStorage persistence for step progress.
   * Saves and restores the current step index automatically.
   *
   * @example
   * ```tsx
   * <Form.Steps
   *   stepPersistence={{
   *     key: 'instructor-onboarding',
   *     debounceMs: 500,
   *   }}
   * >
   * ```
   */
  stepPersistence?: StepPersistenceConfig
}

/**
 * Form.Steps - Multi-step form container
 *
 * Wraps Chakra UI Steps with form validation integration.
 * Validates fields on current step before allowing navigation to next step.
 *
 * @example
 * ```tsx
 * <Form initialValue={data} onSubmit={handleSubmit}>
 *   <Form.Steps>
 *     <Form.Steps.Indicator />
 *
 *     <Form.Steps.Step title="Personal">
 *       <Form.Field.String name="firstName" label="First Name" />
 *       <Form.Field.String name="lastName" label="Last Name" />
 *     </Form.Steps.Step>
 *
 *     <Form.Steps.Step title="Contact">
 *       <Form.Field.String name="email" label="Email" />
 *     </Form.Steps.Step>
 *
 *     <Form.Steps.CompletedContent>
 *       All done! Review your data.
 *     </Form.Steps.CompletedContent>
 *
 *     <Form.Steps.Navigation />
 *   </Form.Steps>
 * </Form>
 * ```
 */
export function FormSteps({
  children,
  defaultStep = 0,
  step: controlledStep,
  onStepChange,
  validateOnNext = true,
  linear = false,
  orientation = 'horizontal',
  size = 'md',
  variant = 'solid',
  colorPalette = 'brand',
  animated = false,
  animationDuration = 0.3,
  onStepComplete,
  stepPersistence,
}: FormStepsProps) {
  const { form } = useDeclarativeForm()

  // Persistence hook
  const { getPersistedStep, clearPersistence } = useStepPersistence(0, stepPersistence)

  // Step state (uses persisted value if available)
  const [internalStep, setInternalStep] = useState(() => {
    const persisted = getPersistedStep()
    return persisted ?? defaultStep
  })
  const currentStep = controlledStep ?? internalStep

  // Step state hook (step registration, hidden fields)
  const {
    sortedSteps,
    stepCount,
    registerStep,
    unregisterStep,
    claimedIndicesRef,
    hiddenFields,
    hideFieldsFromValidation,
    showFieldsForValidation,
  } = useStepState()

  // Persistence: save step changes
  useStepPersistence(currentStep, stepPersistence)

  // Navigation hook
  const { direction, goToNext, goToPrev, goToStep, skipToEnd, triggerSubmit } = useStepNavigation({
    form,
    currentStep,
    stepCount,
    sortedSteps,
    hiddenFields,
    controlledStep,
    onStepChange,
    onStepComplete,
    validateOnNext,
    setInternalStep,
  })

  // Refs for unstable values — prevents contextValue recreation
  // on each step registration (sortedSteps and hiddenFields change on registration)
  const sortedStepsRef = useRef(sortedSteps)
  sortedStepsRef.current = sortedSteps

  const hiddenFieldsRef = useRef(hiddenFields)
  hiddenFieldsRef.current = hiddenFields

  const onStepCompleteRef = useRef(onStepComplete)
  onStepCompleteRef.current = onStepComplete

  // Context value — depends only on stable values
  // sortedSteps, hiddenFields and onStepComplete via refs
  const contextValue: FormStepsContextValue = useMemo(
    () => ({
      currentStep,
      stepCount,
      // Getter for steps — returns current value via ref
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
      orientation,
      size,
      variant,
      colorPalette,
      animated,
      animationDuration,
      direction,
      get hiddenFields() {
        return hiddenFieldsRef.current
      },
      hideFieldsFromValidation,
      showFieldsForValidation,
      get onStepComplete() {
        return onStepCompleteRef.current
      },
      clearStepPersistence: clearPersistence,
    }),
    // IMPORTANT: sortedSteps, hiddenFields, onStepComplete NOT in deps —
    // accessed via refs/getters, prevents infinite loop

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
      validateOnNext,
      linear,
      orientation,
      size,
      variant,
      colorPalette,
      animated,
      animationDuration,
      direction,
      hideFieldsFromValidation,
      showFieldsForValidation,
    ],
  )

  // Handle step change from Chakra Steps
  const handleStepChange = useCallback(
    (details: { step: number }) => {
      // In linear mode, only allow going to previous steps or next if valid
      if (linear && details.step > currentStep) {
        // Don't allow skipping - must use goToNext which validates
        return
      }
      goToStep(details.step)
    },
    [linear, currentStep, goToStep],
  )

  return (
    <FormStepsContext.Provider value={contextValue}>
      <Steps.Root
        step={currentStep}
        onStepChange={handleStepChange}
        count={stepCount}
        orientation={orientation}
        size={size}
        variant={variant}
        colorPalette={colorPalette}
        linear={linear}
      >
        {children}
      </Steps.Root>
    </FormStepsContext.Provider>
  )
}
