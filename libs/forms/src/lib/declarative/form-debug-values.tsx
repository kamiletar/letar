'use client'

import { Box, Heading } from '@chakra-ui/react'
import { redactAtPaths } from '@letar/forms-core/security'
import { useSensitiveFieldPaths } from '@letar/forms-react'
import type { ReactElement } from 'react'
import { useDeclarativeForm } from './form-context'

export interface FormDebugValuesProps {
  /** Block title */
  title?: string
  /**
   * Глубина раскрытия дерева. В простом варианте (`<pre>`) игнорируется: JSON всегда показан целиком.
   * Рабочее значение у `FormDebugJsonView` из `@letar/forms/debug`.
   */
  collapsed?: number
  /** Show in production (by default false) */
  showInProduction?: boolean
}

/** JSON значений для вывода; значения, которые не сериализуются (циклы, BigInt), не должны ронять страницу */
function stringifyValues(values: unknown): string {
  try {
    return JSON.stringify(values, null, 2) ?? String(values)
  } catch {
    return '[значения не сериализуются в JSON]'
  }
}

/**
 * Form.DebugValues — значения формы JSON-текстом (`<pre>`), без сторонних зависимостей.
 *
 * Значения чувствительных полей (`EditIntent`, пароли) замаскированы. В production скрыт по умолчанию, `showInProduction`
 * включает и там. Интерактивное дерево с раскрытием и темой — `FormDebugJsonView` из `@letar/forms/debug`.
 *
 * @example
 * ```tsx
 * <Form initialValue={data} onSubmit={handleSubmit}>
 *   <Form.Field.String name="title" />
 *   <Form.DebugValues />
 *   <Form.Button.Submit />
 * </Form>
 * ```
 */
export function FormDebugValues({
  title = 'Form Values',
  showInProduction = false,
}: FormDebugValuesProps): ReactElement | null {
  const { form } = useDeclarativeForm()
  const sensitivePaths = useSensitiveFieldPaths()

  // Hide in production unless specified otherwise
  if (process.env.NODE_ENV === 'production' && !showInProduction) {
    return null
  }

  return (
    <form.Subscribe selector={(state: { values: unknown }) => state.values}>
      {(values: unknown) => (
        <Box
          borderWidth="1px"
          borderColor="border.muted"
          borderRadius="md"
          p={3}
          mt={4}
          fontSize="sm"
          fontFamily="mono"
          bg="bg.subtle"
        >
          {title && (
            <Heading size="xs" mb={2} color="fg.muted">
              {title}
            </Heading>
          )}
          <Box asChild m={0} overflow="auto" whiteSpace="pre-wrap" wordBreak="break-word">
            <pre>{stringifyValues(redactAtPaths(values, sensitivePaths))}</pre>
          </Box>
        </Box>
      )}
    </form.Subscribe>
  )
}
