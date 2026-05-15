'use client'

import { Button } from '@chakra-ui/react'
import type { ReactElement, ReactNode } from 'react'
import { useDeclarativeForm } from '../form-context'

/**
 * Props for Reset button
 */
export interface ResetButtonProps {
  /** Button text (default: "Reset") */
  children?: ReactNode
  /** Whether button is disabled */
  disabled?: boolean
  /** Button variant (default: outline) */
  variant?: 'solid' | 'outline' | 'ghost' | 'plain'
  /** Button color palette */
  colorPalette?: string
  /** Callback after form is reset */
  onReset?: () => void
}

/**
 * Form.Button.Reset - Reset button to restore form to initial values
 *
 * Resets all form fields to their initial (default) values.
 *
 * @example Basic usage
 * ```tsx
 * <Form.Button.Reset />
 * ```
 *
 * @example With custom text and callback
 * ```tsx
 * <Form.Button.Reset onReset={() => console.log('Form reset!')}>
 *   Clear Form
 * </Form.Button.Reset>
 * ```
 *
 * @example Styled variant
 * ```tsx
 * <Form.Button.Reset variant="ghost" colorPalette="red">
 *   Discard Changes
 * </Form.Button.Reset>
 * ```
 */
export function ButtonReset({
  children = 'Reset',
  disabled,
  variant = 'outline',
  colorPalette,
  onReset,
}: ResetButtonProps): ReactElement {
  const { form } = useDeclarativeForm()

  const handleClick = () => {
    form.reset()
    onReset?.()
  }

  return (
    <form.Subscribe selector={(state: { canSubmit: boolean; isSubmitting: boolean }) => state.isSubmitting}>
      {(isSubmitting: boolean) => (
        <Button
          type="button"
          variant={variant}
          colorPalette={colorPalette}
          disabled={disabled || isSubmitting}
          onClick={handleClick}
        >
          {children}
        </Button>
      )}
    </form.Subscribe>
  )
}
