'use client'

import { Steps } from '@chakra-ui/react'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
import { Children, isValidElement, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { useDeclarativeForm } from '../form-context'
import { FormGroupDeclarative } from '../form-group/form-group-declarative'
import { type StepInfo, useFormStepsContext } from './form-steps-context'

/**
 * Step display condition
 */
export interface StepWhenCondition<TValue = unknown> {
  /** Field to watch */
  field: string
  /** Show step when value equals */
  is?: TValue
  /** Show step when value is NOT equal */
  isNot?: TValue
  /** Show step when value is in array */
  in?: TValue[]
  /** Show step when value is NOT in array */
  notIn?: TValue[]
  /** Custom condition function */
  condition?: (value: TValue) => boolean
}

export interface FormStepsStepProps {
  /** Step title shown in indicator */
  title: string
  /** Optional description shown in indicator */
  description?: string
  /** Optional icon for the step */
  icon?: ReactNode
  /** Step content (form fields) */
  children: ReactNode
  /** Callback when entering the step */
  onEnter?: () => void
  /** Callback when leaving the step (can cancel transition by returning false) */
  onLeave?: (direction: 'forward' | 'backward') => Promise<boolean> | boolean
  /** Step display condition (step is shown only if condition is true) */
  when?: StepWhenCondition
  /**
   * Segment name for automatic Form.Group wrapping.
   * When provided, all fields inside this step will be automatically
   * namespaced under this segment (e.g., segment="profile" makes
   * name="firstName" resolve to "profile.firstName").
   *
   * @example
   * ```tsx
   * <Form.Steps.Step title="Profile" segment="profile">
   *   <Form.Field.String name="firstName" /> // resolves to profile.firstName
   *   <Form.Field.String name="lastName" />  // resolves to profile.lastName
   * </Form.Steps.Step>
   * ```
   */
  segment?: string
}

/**
 * Extract field names from children recursively
 * Looks for components with 'name' prop
 */
function extractFieldNames(children: ReactNode, parentPath = ''): string[] {
  const names: string[] = []

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {
      return
    }

    const props = child.props as Record<string, unknown>

    // Check if this is a field component with name prop
    if (typeof props.name === 'string') {
      const fullName = parentPath ? `${parentPath}.${props.name}` : props.name
      names.push(fullName)
    }

    // Check for Form.Group - it creates a namespace
    const displayName = (child.type as { displayName?: string })?.displayName
    if (displayName === 'FormGroupDeclarative' && typeof props.name === 'string') {
      const groupPath = parentPath ? `${parentPath}.${props.name}` : props.name
      if (props.children) {
        names.push(...extractFieldNames(props.children as ReactNode, groupPath))
      }
    } // Recurse into children (but not into Form.Group.List - arrays are handled differently)
    else if (props.children && displayName !== 'FormGroupListDeclarative') {
      names.push(...extractFieldNames(props.children as ReactNode, parentPath))
    }
  })

  return names
}

/** Offset for slide animation in pixels */
const SLIDE_OFFSET = 50

/**
 * Evaluates the when condition value
 */
function evaluateWhenCondition(when: StepWhenCondition | undefined, fieldValue: unknown): boolean {
  if (!when) {
    return true // No condition — always show
  }

  if (when.condition !== undefined) {
    return when.condition(fieldValue)
  }
  if (when.is !== undefined) {
    return fieldValue === when.is
  }
  if (when.isNot !== undefined) {
    return fieldValue !== when.isNot
  }
  if (when.in !== undefined) {
    return when.in.includes(fieldValue as never)
  }
  if (when.notIn !== undefined) {
    return !when.notIn.includes(fieldValue as never)
  }

  // Default — truthy check
  return Boolean(fieldValue)
}

/**
 * Gets nested field value by dot-notation path
 */
function getNestedValue(values: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let value: unknown = values
  for (const part of parts) {
    if (value && typeof value === 'object') {
      value = (value as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }
  return value
}

/**
 * Form.Steps.Step - Individual step content
 *
 * Registers itself with Form.Steps and provides content for that step.
 * Field names are automatically extracted for validation.
 * Supports slide animations when Form.Steps has `animated` prop.
 *
 * @example Basic usage
 * ```tsx
 * <Form.Steps.Step title="Personal Info" description="Your details">
 *   <Form.Field.String name="firstName" label="First Name" />
 *   <Form.Field.String name="lastName" label="Last Name" />
 * </Form.Steps.Step>
 * ```
 *
 * @example Conditional step (shown only for a specific role)
 * ```tsx
 * <Form.Steps.Step
 *   title="Company Info"
 *   when={{ field: 'type', is: 'company' }}
 * >
 *   <Form.Field.String name="companyName" label="Company Name" />
 * </Form.Steps.Step>
 * ```
 */
export function FormStepsStep({
  title,
  description,
  icon,
  children,
  onEnter,
  onLeave,
  when,
  segment,
}: FormStepsStepProps) {
  const { form } = useDeclarativeForm()
  const { registerStep, unregisterStep, claimedIndicesRef, currentStep, animated, animationDuration, direction } =
    useFormStepsContext()

  // Wrap children in FormGroupDeclarative if segment is provided
  const wrappedChildren = segment ? <FormGroupDeclarative name={segment}>{children}</FormGroupDeclarative> : children

  // Parent path for field extraction (accounts for segment)
  const fieldExtractionPath = segment ?? ''

  // Track step visibility based on when condition
  const [isVisible, setIsVisible] = useState(() => {
    if (!when) {
      return true
    }
    const fieldValue = getNestedValue(form.state.values as Record<string, unknown>, when.field)
    return evaluateWhenCondition(when, fieldValue)
  })

  // Calculate index based on render order
  // We use a ref to track the registered index
  const indexRef = useRef<number>(-1)
  const wasVisibleRef = useRef(isVisible)

  // Subscribe to when field changes
  useEffect(() => {
    if (!when) {
      return
    }

    const subscription = form.store.subscribe(() => {
      const fieldValue = getNestedValue(form.state.values as Record<string, unknown>, when.field)
      const newIsVisible = evaluateWhenCondition(when, fieldValue)
      if (newIsVisible !== wasVisibleRef.current) {
        wasVisibleRef.current = newIsVisible
        setIsVisible(newIsVisible)
      }
    })

    // TanStack Store v0.9+ returns an object { unsubscribe }, not a function
    return () => subscription.unsubscribe()
  }, [form, when])

  // Назначение индекса и регистрация шага.
  // Используем claimedIndicesRef (shared mutable Set) вместо stepsRef —
  // это решает race condition, когда все useEffect-ы видели пустой stepsRef
  // и все шаги получали index=0.
  // Ref мутируется синхронно внутри effect-фазы — каждый следующий Step
  // видит уже занятые индексы предыдущих.
  useEffect(() => {
    if (!isVisible) {
      // Шаг скрыт — снимаем регистрацию
      if (indexRef.current >= 0) {
        unregisterStep(indexRef.current)
        indexRef.current = -1
      }
      return
    }

    // Занимаем следующий свободный индекс через shared ref
    if (indexRef.current < 0) {
      const claimed = claimedIndicesRef.current
      let nextIndex = 0
      while (claimed.has(nextIndex)) {
        nextIndex++
      }
      indexRef.current = nextIndex
      claimed.add(nextIndex)
    }

    // IMPORTANT: fieldNames извлекаются ОДИН раз при mount
    // children НЕ включены в deps — они меняются каждый рендер
    const fieldNames = extractFieldNames(children, fieldExtractionPath)

    const stepInfo: StepInfo = {
      index: indexRef.current,
      title,
      description,
      icon,
      fieldNames,
      onEnter,
      onLeave,
    }

    registerStep(stepInfo)

    return () => {
      if (indexRef.current >= 0) {
        unregisterStep(indexRef.current)
        // unregisterStep уже удаляет из claimedIndicesRef
        indexRef.current = -1
      }
    }
    // IMPORTANT: children и icon намеренно НЕ включены — вызывают infinite loop
    // icon — JSX элемент, пересоздаётся каждый рендер
  }, [
    description,
    registerStep,
    title,
    unregisterStep,
    onEnter,
    onLeave,
    isVisible,
    fieldExtractionPath,
    claimedIndicesRef,
  ])

  // Extract fieldNames and memoize their string representation
  // for use in dependency array instead of children
  const fieldNamesRef = useRef<string[]>([])
  const currentFieldNames = useMemo(
    () => extractFieldNames(children, fieldExtractionPath),
    // Use segment path as proxy to determine when structure may change
    // children NOT included — they change every render

    [fieldExtractionPath]
  )

  // Update ref only if fieldNames actually changed
  const fieldNamesChanged =
    currentFieldNames.length !== fieldNamesRef.current.length ||
    currentFieldNames.some((name, i) => name !== fieldNamesRef.current[i])
  if (fieldNamesChanged) {
    fieldNamesRef.current = currentFieldNames
  }

  // Update step info if props change (but keep same index)
  // IMPORTANT: children and icon NOT included in deps — they change every render and cause infinite loop
  // icon — JSX element, recreated on every render
  const iconRef = useRef(icon)
  iconRef.current = icon

  useEffect(() => {
    if (indexRef.current >= 0 && isVisible) {
      const stepInfo: StepInfo = {
        index: indexRef.current,
        title,
        description,
        icon: iconRef.current,
        fieldNames: fieldNamesRef.current,
        onEnter,
        onLeave,
      }
      registerStep(stepInfo)
    }
  }, [title, description, registerStep, onEnter, onLeave, isVisible, fieldExtractionPath])

  const index = indexRef.current

  // Animation variants for slide effect
  const slideVariants: Variants = useMemo(
    () => ({
      // Initial state: element appears from the appropriate side
      initial: {
        opacity: 0,
        x: direction === 'forward' ? SLIDE_OFFSET : -SLIDE_OFFSET,
      },
      // Final state: element in place
      animate: {
        opacity: 1,
        x: 0,
      },
      // Exit state: element leaves to the opposite side
      exit: {
        opacity: 0,
        x: direction === 'forward' ? -SLIDE_OFFSET : SLIDE_OFFSET,
      },
    }),
    [direction]
  )

  // Step hidden via when condition — don't render
  if (!isVisible) {
    return null
  }

  // Don't render until we have a valid index
  if (index < 0) {
    return null
  }

  // Check if this step is the current one
  const isActive = index === currentStep

  // If animations are disabled — render regular Steps.Content
  if (!animated) {
    return <Steps.Content index={index}>{wrappedChildren}</Steps.Content>
  }

  // With animations — wrap in AnimatePresence + motion.div
  return (
    <Steps.Content index={index}>
      <AnimatePresence mode="wait" initial={false}>
        {isActive && (
          <motion.div
            key={`step-${index}`}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={slideVariants}
            transition={{
              duration: animationDuration,
              ease: 'easeInOut',
            }}
          >
            {wrappedChildren}
          </motion.div>
        )}
      </AnimatePresence>
    </Steps.Content>
  )
}

FormStepsStep.displayName = 'FormStepsStep'
