'use client'

import { Children, isValidElement, type ReactNode, useContext, useEffect, useMemo, useRef } from 'react'
import { useFormGroup } from '../form-group'
import { useDeclarativeForm } from './form-context'
import { FormStepsContext } from './form-steps/form-steps-context'

/**
 * Extract field names from children recursively (for step validation integration)
 */
function extractFieldNames(children: ReactNode, parentPath = ''): string[] {
  const names: string[] = []

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {
      return
    }

    const props = child.props as Record<string, unknown>

    // Check if component has a name prop
    if (typeof props.name === 'string') {
      const fullName = parentPath ? `${parentPath}.${props.name}` : props.name
      names.push(fullName)
    }

    // Check for Form.Group — it creates a namespace
    const displayName = (child.type as { displayName?: string })?.displayName
    if (displayName === 'FormGroupDeclarative' && typeof props.name === 'string') {
      const groupPath = parentPath ? `${parentPath}.${props.name}` : props.name
      if (props.children) {
        names.push(...extractFieldNames(props.children as ReactNode, groupPath))
      }
    } // Recurse into children (except Form.Group.List — arrays are handled separately)
    else if (props.children && displayName !== 'FormGroupListDeclarative') {
      names.push(...extractFieldNames(props.children as ReactNode, parentPath))
    }
  })

  return names
}

/**
 * Props for Form.When conditional rendering component
 */
export interface FormWhenProps<TValue = unknown> {
  /** Field name to watch (relative to current group context) */
  field: string
  /** Render children when field value equals this value */
  is?: TValue
  /** Render children when field value is NOT equal to this value */
  isNot?: TValue
  /** Render children when field value is in this array */
  in?: TValue[]
  /** Render children when field value is NOT in this array */
  notIn?: TValue[]
  /** Custom condition function */
  condition?: (value: TValue) => boolean
  /** Content to render when condition is true */
  children: ReactNode
  /** Content to render when condition is false (optional) */
  fallback?: ReactNode
}

/**
 * Form.When - Conditional field rendering based on other field values
 *
 * Renders children only when the specified field matches the condition.
 * Uses form.Subscribe for optimal performance (only re-renders when watched field changes).
 *
 * @example With exact value match
 * ```tsx
 * <Form.Field.Select name="type" options={['individual', 'company']} />
 *
 * <Form.When field="type" is="company">
 *   <Form.Field.String name="companyName" label="Company Name" />
 *   <Form.Field.String name="inn" label="INN" />
 * </Form.When>
 * ```
 *
 * @example With negation
 * ```tsx
 * <Form.When field="hasDiscount" isNot={true}>
 *   <Form.Field.Number name="fullPrice" label="Full Price" />
 * </Form.When>
 * ```
 *
 * @example With array of values
 * ```tsx
 * <Form.When field="role" in={['admin', 'moderator']}>
 *   <Form.Field.Checkbox name="canDelete" label="Can delete users" />
 * </Form.When>
 * ```
 *
 * @example With custom condition
 * ```tsx
 * <Form.When field="age" condition={(age) => age >= 18}>
 *   <Form.Field.Checkbox name="adultContent" label="Show adult content" />
 * </Form.When>
 * ```
 *
 * @example With fallback content
 * ```tsx
 * <Form.When field="isPremium" is={true} fallback={<Text>Upgrade to premium</Text>}>
 *   <Form.Field.Select name="premiumTheme" options={themes} />
 * </Form.When>
 * ```
 *
 * @example Nested in Form.Group
 * ```tsx
 * <Form.Group name="settings">
 *   <Form.Field.Switch name="notifications" label="Enable notifications" />
 *   <Form.When field="notifications" is={true}>
 *     <Form.Field.Select name="frequency" options={frequencies} />
 *   </Form.When>
 * </Form.Group>
 * ```
 */
/**
 * Internal component for handling field show/hide
 * Integrates with FormStepsContext to exclude hidden fields from validation
 */
function FormWhenContent({
  shouldRender,
  children,
  fallback,
  parentPath,
}: {
  shouldRender: boolean
  children: ReactNode
  fallback: ReactNode
  parentPath: string
}): ReactNode {
  const stepsContext = useContext(FormStepsContext)
  const prevShouldRender = useRef<boolean | null>(null)

  // Memoize field names — recalculate only when children change
  const fieldNames = useMemo(() => extractFieldNames(children, parentPath), [children, parentPath])

  // Single useEffect for managing field visibility in validation
  useEffect(() => {
    // No steps context or fields — nothing to do
    if (!stepsContext || fieldNames.length === 0) {
      return
    }

    const isFirstMount = prevShouldRender.current === null

    if (isFirstMount) {
      // First mount: if hidden — immediately exclude from validation
      if (!shouldRender) {
        stepsContext.hideFieldsFromValidation(fieldNames)
      }
    } else if (shouldRender && !prevShouldRender.current) {
      // Fields became visible — show for validation
      stepsContext.showFieldsForValidation(fieldNames)
    } else if (!shouldRender && prevShouldRender.current) {
      // Fields became hidden — exclude from validation
      stepsContext.hideFieldsFromValidation(fieldNames)
    }

    prevShouldRender.current = shouldRender

    // Cleanup: on unmount restore fields back
    return () => {
      if (!shouldRender && fieldNames.length > 0) {
        stepsContext.showFieldsForValidation(fieldNames)
      }
    }
  }, [shouldRender, stepsContext, fieldNames])

  return shouldRender ? children : fallback
}

export function FormWhen<TValue = unknown>({
  field,
  is,
  isNot,
  in: inArray,
  notIn,
  condition,
  children,
  fallback = null,
}: FormWhenProps<TValue>): ReactNode {
  const { form } = useDeclarativeForm()
  const parentGroup = useFormGroup()

  // Build full field path
  const fullPath = parentGroup ? `${parentGroup.name}.${field}` : field

  // Parent path for extracting field names
  const parentPath = parentGroup?.name ?? ''

  // Create selector function for the field value
  const selector = (state: { values: Record<string, unknown> }): TValue => {
    // Navigate to nested value using dot notation
    const parts = fullPath.split('.')
    let value: unknown = state.values
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[part]
      } else {
        value = undefined
        break
      }
    }
    return value as TValue
  }

  return (
    <form.Subscribe selector={selector}>
      {(value: TValue) => {
        let shouldRender = false

        if (condition !== undefined) {
          // Custom condition function
          shouldRender = condition(value)
        } else if (is !== undefined) {
          // Exact match
          shouldRender = value === is
        } else if (isNot !== undefined) {
          // Negation
          shouldRender = value !== isNot
        } else if (inArray !== undefined) {
          // Value in array
          shouldRender = inArray.includes(value)
        } else if (notIn !== undefined) {
          // Value not in array
          shouldRender = !notIn.includes(value)
        } else {
          // Default: render if truthy
          shouldRender = Boolean(value)
        }

        return (
          <FormWhenContent shouldRender={shouldRender} fallback={fallback} parentPath={parentPath}>
            {children}
          </FormWhenContent>
        )
      }}
    </form.Subscribe>
  )
}
