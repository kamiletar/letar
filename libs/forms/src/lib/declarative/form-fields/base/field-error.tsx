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
}): ReactElement {
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
  // Пустой слот того же размера, что и заполненный (не `null`) — иначе поля в одной строке
  // `SimpleGrid`/ряда получают разную высоту в зависимости от того, есть ли у соседа
  // helper/error текст. `visibility: hidden` убирает контент из видимости, но не из layout.
  return (
    <Field.HelperText aria-hidden visibility="hidden">
      &nbsp;
    </Field.HelperText>
  )
}
