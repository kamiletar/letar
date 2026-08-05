'use client'

import { Box, Code, Text } from '@chakra-ui/react'

/**
 * Пропсы для SubmittedDataPreview
 */
export interface SubmittedDataPreviewProps {
  /** Данные последней отправки (`null`/`undefined` — форму ещё не отправляли) */
  data: unknown
  /** Заголовок блока */
  title?: string
}

/**
 * SubmittedDataPreview — блок с результатом отправки демо-формы.
 *
 * Демо-страницы рендерятся в iframe внутри документации, поэтому вывод в консоль
 * браузера читателю не виден — отправленные значения показываем прямо на странице.
 *
 * @example
 * ```tsx
 * const [submitted, setSubmitted] = useState<unknown>(null)
 *
 * <Form onSubmit={(data) => setSubmitted(data)}>...</Form>
 * <SubmittedDataPreview data={submitted} />
 * ```
 */
export function SubmittedDataPreview({ data, title = 'Submitted:' }: SubmittedDataPreviewProps) {
  if (data === null || data === undefined) {
    return null
  }

  return (
    <Box p={4} bg="green.subtle" borderRadius="md" data-testid="submitted-data">
      <Text fontWeight="bold" mb={2}>
        {title}
      </Text>
      <Code whiteSpace="pre-wrap" display="block" bg="transparent" fontSize="sm">
        {JSON.stringify(data, null, 2)}
      </Code>
    </Box>
  )
}
