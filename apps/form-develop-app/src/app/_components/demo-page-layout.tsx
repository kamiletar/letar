'use client'

import { Box, Code, Heading, Text, VStack } from '@chakra-ui/react'
import type { ReactNode } from 'react'

/**
 * Пропсы для DemoPageLayout
 */
export interface DemoPageLayoutProps {
  /** Заголовок демо-страницы */
  title: string
  /** Описание / пояснение к демо */
  description?: string
  /** Максимальная ширина контейнера (по умолчанию 600px) */
  maxW?: string
  /** Содержимое страницы (обычно Form компонент) */
  children: ReactNode
}

/**
 * DemoPageLayout — общий layout для всех демо-страниц form-develop-app
 *
 * Предоставляет единообразную структуру:
 * - Контейнер с отступами и центрированием
 * - Заголовок и описание
 * - Область для контента (формы)
 *
 * @example
 * ```tsx
 * <DemoPageLayout
 *   title="String Field Demo"
 *   description="Демонстрация текстовых полей"
 * >
 *   <Form ...>...</Form>
 *   <SubmittedDataPreview data={submitted} />
 * </DemoPageLayout>
 * ```
 */
export function DemoPageLayout({ title, description, maxW = '600px', children }: DemoPageLayoutProps) {
  return (
    <Box p={8} maxW={maxW} mx="auto">
      <VStack gap={6} align="stretch">
        {/* Заголовок страницы */}
        <Box>
          <Heading size="lg">{title}</Heading>
          {description && (
            <Text color="fg.muted" mt={2}>
              {description}
            </Text>
          )}
        </Box>

        {/* Контент страницы */}
        {children}
      </VStack>
    </Box>
  )
}

/**
 * Пропсы для SubmittedDataPreview
 */
export interface SubmittedDataPreviewProps<T = unknown> {
  /** Данные для отображения (null = не показывать) */
  data: T | null
  /** Заголовок блока (по умолчанию "Submitted Data:") */
  title?: string
  /** data-testid для E2E тестов */
  testId?: string
}

/**
 * SubmittedDataPreview — блок отображения отправленных данных формы
 *
 * Показывает JSON представление данных после успешного submit.
 * Рендерится только если data !== null.
 *
 * @example
 * ```tsx
 * const [submitted, setSubmitted] = useState<FormData | null>(null)
 *
 * <Form onSubmit={setSubmitted}>...</Form>
 * <SubmittedDataPreview data={submitted} />
 * ```
 */
export function SubmittedDataPreview<T = unknown>({
  data,
  title = 'Submitted Data:',
  testId = 'submitted-data',
}: SubmittedDataPreviewProps<T>) {
  if (data === null) {
    return null
  }

  return (
    <Box
      p={4}
      bg="green.50"
      borderWidth="1px"
      borderColor="green.200"
      borderRadius="md"
      data-testid={testId}
      _dark={{
        bg: 'green.900/20',
        borderColor: 'green.700',
      }}
    >
      <Heading size="sm" mb={2}>
        {title}
      </Heading>
      <Code whiteSpace="pre-wrap" display="block" p={2} bg="transparent" fontSize="sm">
        {JSON.stringify(data, null, 2)}
      </Code>
    </Box>
  )
}
