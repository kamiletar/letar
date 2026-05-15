'use client'

import { Button } from '@chakra-ui/react'
import type { ReactElement } from 'react'
import { useDeclarativeForm } from '../form-context'
import type { SubmitButtonProps } from '../types'

/**
 * Form.Button.Submit - Submit button with automatic loading state
 *
 * Automatically shows loading spinner when form is submitting.
 *
 * @example
 * ```tsx
 * <Form.Button.Submit>Save</Form.Button.Submit>
 * ```
 *
 * @example With styling
 * ```tsx
 * <Form.Button.Submit colorPalette="brand" size="lg">
 *   Save Changes
 * </Form.Button.Submit>
 * ```
 */
export function ButtonSubmit({
  children = 'Submit',
  loadingText,
  disabled,
  colorPalette,
  size,
  variant,
  width,
}: SubmitButtonProps): ReactElement {
  const { form } = useDeclarativeForm()

  return (
    <form.Subscribe selector={(state: { isSubmitting: boolean }) => state.isSubmitting}>
      {(isSubmitting: boolean) => (
        <Button
          type="submit"
          loading={isSubmitting}
          loadingText={loadingText}
          disabled={disabled || isSubmitting}
          colorPalette={colorPalette}
          size={size}
          variant={variant}
          width={width}
        >
          {children}
        </Button>
      )}
    </form.Subscribe>
  )
}
