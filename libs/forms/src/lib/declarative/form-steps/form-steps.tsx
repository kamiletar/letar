'use client'

import { Steps } from '@chakra-ui/react'
import { type StepPersistenceConfig, useStepNavigation, useStepPersistence, useStepState } from '@letar/forms-react'
import { Children, cloneElement, isValidElement, type ReactNode, useCallback, useMemo, useRef, useState } from 'react'
import { useDeclarativeForm } from '../form-context'
import { FormStepsContext, type FormStepsContextValue } from './form-steps-context'
import { FormStepsStep, type FormStepsStepProps } from './form-steps-step'

export type { StepPersistenceConfig }

/**
 * Синхронный (по дереву `children`, без ожидания эффектов регистрации) верхний предел числа
 * шагов — сколько `Form.Steps.Step` объявлено в разметке, включая скрытые через `when`.
 *
 * Нужен затем, чтобы `Steps.Root` монтировался с корректным `count` уже на ПЕРВОМ рендере, а не
 * только после того, как все `Form.Steps.Step` синхронизируют регистрацию через собственные
 * `useEffect` (двухфазный процесс — `stepCount` растёт 0 → N через несколько ре-рендеров).
 * `zag-js`-машина Chakra `Steps` не всегда пересчитывает свои внутренние индикаторы/прогресс при
 * ПОЗДНЕМ изменении `count` — если сам `Steps.Root` при первом коммите монтируется с `count=0`
 * (единственный вариант при чисто эффект-based регистрации), содержимое шагов может не
 * появиться вовсе, даже когда `stepCount` в React-состоянии позже становится верным. Подробности
 * найденного класса бага — `.claude/docs/forms-steps-count-must-be-synchronous.md`.
 */
function countDeclaredSteps(children: ReactNode): number {
  let count = 0
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {
      return
    }
    if (child.type === FormStepsStep) {
      count++
      return
    }
    const props = child.props as { children?: ReactNode } | undefined
    if (props?.children) {
      count += countDeclaredSteps(props.children)
    }
  })
  return count
}

/**
 * Клонирует дерево `children`, назначая КАЖДОМУ `Form.Steps.Step` без `when` последовательный
 * `__declaredIndex` — синхронный, по позиции в разметке, а не через `useEffect`-регистрацию.
 *
 * Устраняет ещё одно проявление того же класса бага, что и `countDeclaredSteps`: без него
 * `Form.Steps.Step` рендерит `null` до тех пор, пока его СОБСТВЕННЫЙ эффект регистрации не
 * присвоит ему индекс (`indexRef.current < 0`) — видимая вспышка пустого контента между первым
 * коммитом и первым проходом эффектов. Заметно на медленных dev-сборках и при монтировании
 * `Form.Steps` внутри `Tabs.Content` (все панели монтируются сразу, просто скрыты) — форма
 * успевает «мигнуть» пустой до появления полей.
 *
 * Останавливается на первом `Form.Steps.Step` с `when` (и на всех последующих) — их видимость и
 * итоговый индекс зависят от значения поля, синхронно не выводятся. Для формы без `when`-шагов
 * (типичный случай) это покрывает 100% шагов.
 */
function assignDeclaredIndices(children: ReactNode, counter: { next: number; stopped: boolean }): ReactNode {
  return Children.map(children, (child) => {
    if (!isValidElement(child)) {
      return child
    }
    if (child.type === FormStepsStep) {
      const stepProps = child.props as FormStepsStepProps
      if (counter.stopped || stepProps.when) {
        counter.stopped = true
        return child
      }
      const declaredIndex = counter.next
      counter.next += 1
      return cloneElement(child, { __declaredIndex: declaredIndex } as Partial<FormStepsStepProps>)
    }
    const props = child.props as { children?: ReactNode } | undefined
    if (props?.children) {
      return cloneElement(child, {
        children: assignDeclaredIndices(props.children, counter),
      } as Partial<{ children: ReactNode }>)
    }
    return child
  })
}

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

  // Верхний предел по дереву children — см. countDeclaredSteps. Пересчитывается только при
  // смене ссылки на children (обычно стабильна между рендерами одного и того же дерева).
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  const declaredStepCount = useMemo(() => countDeclaredSteps(children), [children])
  const effectiveStepCount = Math.max(stepCount, declaredStepCount)

  // Дети с проставленным __declaredIndex — см. assignDeclaredIndices. Убирает вспышку пустого
  // контента до первого прохода эффектов регистрации.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  const childrenWithDeclaredIndices = useMemo(
    () => assignDeclaredIndices(children, { next: 0, stopped: false }),
    [children],
  )

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
  const hiddenFieldsRef = useRef(hiddenFields)
  const onStepCompleteRef = useRef(onStepComplete)

  // ⚠️ Запись должна происходить синхронно в теле рендера, не в useEffect.
  // Причина: contextValue (useMemo ниже) пересчитывается в ТОМ ЖЕ рендере, где меняется
  // stepCount (например 0 → 4, когда все Step регистрируются одним батчем при монтировании).
  // Provider уведомляет consumers (FormStepsIndicator и др.) синхронно в этом же проходе
  // рендера — до того, как успевает отработать useEffect. Запись в ref внутри useEffect
  // всегда на один рендер позади: consumer читает geter `steps` и получает ПРЕДЫДУЩЕЕ значение
  // (пустой массив), а следующего рендера, который обновил бы ref, может больше не быть —
  // индикатор шагов навсегда остаётся пустым. Мутация ref в теле рендера безопасна здесь:
  // она не читается синхронно в этом же рендере (только лениво через геттер) и не вызывает
  // побочных setState.
  // oxlint-disable-next-line react/refs
  sortedStepsRef.current = sortedSteps
  // oxlint-disable-next-line react/refs
  hiddenFieldsRef.current = hiddenFields
  // oxlint-disable-next-line react/refs
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
        count={effectiveStepCount}
        orientation={orientation}
        size={size}
        variant={variant}
        colorPalette={colorPalette}
        linear={linear}
      >
        {childrenWithDeclaredIndices}
      </Steps.Root>
    </FormStepsContext.Provider>
  )
}
