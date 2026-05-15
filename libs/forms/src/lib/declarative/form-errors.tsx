'use client'

import { Alert, Box, List, Text } from '@chakra-ui/react'
import type { ReactElement, ReactNode } from 'react'
import { useDeclarativeForm } from './form-context'

interface FormErrorsProps {
  /** Section title ошибок */
  title?: ReactNode
  /** Show errors before first submit attempt (by default false) */
  showBeforeSubmit?: boolean
}

interface ZodIssue {
  message: string
  code?: string
  path?: string[]
  expected?: string
}

type FieldErrors = Record<string, ZodIssue[]>

/**
 * Extracts all error messages from TanStack Form + Zod structure
 * Format: { "field.path": [{ message: "...", code: "...", path: [...] }] }
 */
function extractAllErrors(errors: unknown[]): string[] {
  const messages: string[] = []

  for (const error of errors) {
    if (!error) {
      continue
    }

    if (typeof error === 'string') {
      const trimmed = error.trim()
      if (trimmed) {
        messages.push(trimmed)
      }
      continue
    }

    if (typeof error === 'object') {
      // Process field errors object: { "field.path": [{ message: "..." }] }
      const fieldErrors = error as FieldErrors
      for (const [fieldPath, issues] of Object.entries(fieldErrors)) {
        if (Array.isArray(issues)) {
          for (const issue of issues) {
            if (issue.message) {
              messages.push(`${fieldPath}: ${issue.message}`)
            }
          }
        }
      }
    }
  }

  return messages
}

/**
 * Form.Errors - Displays all form validation errors
 *
 * Shows summary of all validation errors across all fields.
 * Only renders when errors are present.
 *
 * @example
 * ```tsx
 * <Form initialValue={data} onSubmit={handleSubmit}>
 *   <Form.Field.String name="title" />
 *   <Form.Errors />
 *   <Form.Button.Submit />
 * </Form>
 * ```
 */
export function FormErrors({
  title = 'Please fix the following errors:',
  showBeforeSubmit = false,
}: FormErrorsProps): ReactElement | null {
  const { form, apiState } = useDeclarativeForm()

  // Extract server error message if available
  const serverError = apiState?.mutationError
  // Some libraries (e.g., ZenStack) add info to Error
  const errorInfo = serverError && 'info' in serverError ? (serverError as { info?: { message?: string } }).info : null
  const serverErrorMessage = serverError ? serverError.message || errorInfo?.message || 'Server error' : null

  return (
    <form.Subscribe
      selector={(state: { errors: unknown[]; submissionAttempts: number }) => ({
        errors: state.errors,
        submissionAttempts: state.submissionAttempts,
      })}
    >
      {({ errors, submissionAttempts }: { errors: unknown[]; submissionAttempts: number }) => {
        // Do not show validation errors before first submit attempt (unless specified otherwise)
        const showValidationErrors = showBeforeSubmit || submissionAttempts > 0
        const validErrors = showValidationErrors ? extractAllErrors(errors) : []
        const hasErrors = validErrors.length > 0 || serverErrorMessage

        if (!hasErrors) {
          return null
        }

        return (
          <Alert.Root status="error">
            <Alert.Indicator />
            <Box>
              <Alert.Title>{title}</Alert.Title>
              <Alert.Description>
                <List.Root>
                  {serverErrorMessage && (
                    <List.Item>
                      <Text fontWeight="bold">{serverErrorMessage}</Text>
                    </List.Item>
                  )}
                  {validErrors.map((error, index) => (
                    <List.Item key={index}>
                      <Text>{error}</Text>
                    </List.Item>
                  ))}
                </List.Root>
              </Alert.Description>
            </Box>
          </Alert.Root>
        )
      }}
    </form.Subscribe>
  )
}
