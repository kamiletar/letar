'use client'

import { Field, HStack, Spinner } from '@chakra-ui/react'
import type { ReactElement, ReactNode } from 'react'

/**
 * Chakra-реализация вывода ошибки/подсказки под полем.
 *
 * Вынесена из `create-field.tsx` в Фазе 7.3: сам `createField` переехал в
 * UI-library-free `@letar/forms-react`, а этот хелпер — наоборот, чистая Chakra-вёрстка,
 * которую скин отдаёт композиционному слою через `chakraUIKit.FieldError`.
 *
 * @example
 * ```tsx
 * <FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolved.helperText} />
 * ```
 */
export function FieldError({
  hasError,
  errorMessage,
  helperText,
  isValidating,
}: {
  hasError: boolean
  errorMessage: string
  helperText: ReactNode
  isValidating?: boolean
}): ReactElement | null {
  if (isValidating) {
    return (
      <Field.HelperText color="blue.500">
        <HStack gap={1}>
          <Spinner size="xs" color="blue.500" />
          Проверяю...
        </HStack>
      </Field.HelperText>
    )
  }
  if (hasError) {
    return <Field.ErrorText>{errorMessage}</Field.ErrorText>
  }
  if (helperText) {
    return <Field.HelperText>{helperText}</Field.HelperText>
  }
  return null
}
