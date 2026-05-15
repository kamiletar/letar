'use client'

import { Box, Code, Heading, HStack, Separator, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { DemoPageLayout, SubmittedDataPreview } from '../_components'

/**
 * Демонстрация автоматического извлечения constraints из Zod схемы
 *
 * Поля автоматически получают:
 * - min/max/step для чисел
 * - minLength/maxLength для строк
 * - type="email"/"url" для email/url
 * - pattern для regex
 * - min/max для дат
 * - minItems/maxItems для массивов (отключение Add/Remove кнопок)
 */
const ConstraintsSchema = z.object({
  // === СТРОКИ ===

  // minLength + maxLength → автоматический helperText "От 2 до 50 символов"
  title: z
    .string()
    .min(2)
    .max(50)
    .meta({
      ui: { title: 'Название (2-50 символов)', placeholder: 'Введите название' },
    }),

  // maxLength → автоматический helperText "Максимум 200 символов"
  description: z
    .string()
    .max(200)
    .meta({
      ui: { title: 'Описание (макс. 200)', placeholder: 'Краткое описание' },
    }),

  // email() → type="email"
  email: z
    .string()
    .email()
    .meta({
      ui: { title: 'Email', placeholder: 'user@example.com' },
    }),

  // url() → type="url"
  website: z
    .string()
    .url()
    .optional()
    .meta({
      ui: { title: 'Веб-сайт', placeholder: 'https://example.com' },
    }),

  // length() → minLength=maxLength=6
  code: z
    .string()
    .length(6)
    .meta({
      ui: { title: 'Код (ровно 6 символов)', placeholder: 'ABC123' },
    }),

  // regex() → pattern
  phone: z
    .string()
    .regex(/^\+7\d{10}$/)
    .optional()
    .meta({
      ui: { title: 'Телефон (regex)', placeholder: '+79991234567' },
    }),

  // === ЧИСЛА ===

  // min + max → автоматический helperText "От 1 до 10"
  rating: z
    .number()
    .min(1)
    .max(10)
    .meta({
      ui: { title: 'Рейтинг (1-10)' },
    }),

  // int() → step=1
  quantity: z
    .number()
    .int()
    .min(1)
    .max(100)
    .meta({
      ui: { title: 'Количество (целое)' },
    }),

  // multipleOf() → step
  price: z
    .number()
    .min(0)
    .max(10000)
    .multipleOf(0.01)
    .meta({
      ui: { title: 'Цена (шаг 0.01)' },
    }),

  // Слайдер с автоматическими min/max
  progress: z
    .number()
    .min(0)
    .max(100)
    .meta({
      ui: { title: 'Прогресс (слайдер)' },
    }),

  // === ДАТЫ ===

  // min + max для дат
  startDate: z.coerce
    .date()
    .min(new Date('2024-01-01'))
    .meta({
      ui: { title: 'Дата начала (мин: 2024-01-01)' },
    }),

  endDate: z.coerce
    .date()
    .max(new Date('2025-12-31'))
    .meta({
      ui: { title: 'Дата окончания (макс: 2025-12-31)' },
    }),

  // === МАССИВЫ ===

  // min + max для массивов → автоматическое отключение Add/Remove
  tags: z
    .array(z.string().min(1))
    .min(1)
    .max(5)
    .meta({
      ui: { title: 'Теги (1-5 элементов)' },
    }),
})

type ConstraintsFormData = z.infer<typeof ConstraintsSchema>

const initialValues: ConstraintsFormData = {
  title: '',
  description: '',
  email: '',
  website: '',
  code: '',
  phone: '',
  rating: 5,
  quantity: 1,
  price: 0,
  progress: 50,
  startDate: new Date('2024-06-01'),
  endDate: new Date('2025-06-01'),
  tags: ['example'],
}

export default function ConstraintsDemoPage() {
  const [submittedData, setSubmittedData] = useState<ConstraintsFormData | null>(null)

  const handleSubmit = (data: ConstraintsFormData) => {
    setSubmittedData(data)
  }

  return (
    <DemoPageLayout
      title="Constraints Demo"
      description="Автоматическое извлечение constraints из Zod схемы. Поля получают min/max/step/type автоматически из схемы."
      maxW="800px"
    >
      <Form initialValue={initialValues} schema={ConstraintsSchema} onSubmit={handleSubmit}>
        <VStack gap={6} align="stretch">
          {/* Секция: Строки */}
          <Box>
            <Heading size="md" mb={4}>
              Строки
            </Heading>
            <VStack gap={4} align="stretch">
              <Box>
                <Form.Field.String name="title" />
                <Code fontSize="xs" mt={1}>
                  z.string().min(2).max(50) → minLength=2 maxLength=50
                </Code>
              </Box>

              <Box>
                <Form.Field.Textarea name="description" />
                <Code fontSize="xs" mt={1}>
                  z.string().max(200) → maxLength=200
                </Code>
              </Box>

              <HStack gap={4} align="flex-start">
                <Box flex={1}>
                  <Form.Field.String name="email" />
                  <Code fontSize="xs" mt={1}>
                    z.string().email() → type="email"
                  </Code>
                </Box>
                <Box flex={1}>
                  <Form.Field.String name="website" />
                  <Code fontSize="xs" mt={1}>
                    z.string().url() → type="url"
                  </Code>
                </Box>
              </HStack>

              <HStack gap={4} align="flex-start">
                <Box flex={1}>
                  <Form.Field.String name="code" />
                  <Code fontSize="xs" mt={1}>
                    z.string().length(6) → min=max=6
                  </Code>
                </Box>
                <Box flex={1}>
                  <Form.Field.String name="phone" />
                  <Code fontSize="xs" mt={1}>
                    z.string().regex() → pattern
                  </Code>
                </Box>
              </HStack>
            </VStack>
          </Box>

          <Separator />

          {/* Секция: Числа */}
          <Box>
            <Heading size="md" mb={4}>
              Числа
            </Heading>
            <VStack gap={4} align="stretch">
              <HStack gap={4} align="flex-start">
                <Box flex={1}>
                  <Form.Field.Number name="rating" />
                  <Code fontSize="xs" mt={1}>
                    z.number().min(1).max(10) → min=1 max=10
                  </Code>
                </Box>
                <Box flex={1}>
                  <Form.Field.Number name="quantity" />
                  <Code fontSize="xs" mt={1}>
                    z.number().int() → step=1
                  </Code>
                </Box>
              </HStack>

              <Box>
                <Form.Field.Number name="price" />
                <Code fontSize="xs" mt={1}>
                  z.number().multipleOf(0.01) → step=0.01
                </Code>
              </Box>

              <Box>
                <Form.Field.Slider name="progress" showValue colorPalette="blue" />
                <Code fontSize="xs" mt={1}>
                  z.number().min(0).max(100) → Slider min=0 max=100
                </Code>
              </Box>
            </VStack>
          </Box>

          <Separator />

          {/* Секция: Даты */}
          <Box>
            <Heading size="md" mb={4}>
              Даты
            </Heading>
            <HStack gap={4} align="flex-start">
              <Box flex={1}>
                <Form.Field.Date name="startDate" />
                <Code fontSize="xs" mt={1}>
                  z.date().min(new Date) → min="2024-01-01"
                </Code>
              </Box>
              <Box flex={1}>
                <Form.Field.Date name="endDate" />
                <Code fontSize="xs" mt={1}>
                  z.date().max(new Date) → max="2025-12-31"
                </Code>
              </Box>
            </HStack>
          </Box>

          <Separator />

          {/* Секция: Массивы */}
          <Box>
            <Heading size="md" mb={4}>
              Массивы
            </Heading>
            <Form.Group.List
              name="tags"
              wrapper={({ children }) => (
                <VStack align="stretch" gap={2}>
                  {children}
                  <Form.Group.List.Button.Add defaultValue="">Добавить тег</Form.Group.List.Button.Add>
                  <Code fontSize="xs">z.array().min(1).max(5) → Add отключается при 5, Remove при 1</Code>
                </VStack>
              )}
            >
              <HStack gap={2}>
                <Form.Field.String placeholder="Введите тег" />
                <Form.Group.List.Button.Remove />
              </HStack>
            </Form.Group.List>
          </Box>

          <Separator />

          <Form.Button.Submit>Отправить</Form.Button.Submit>
        </VStack>
      </Form>

      {submittedData && (
        <SubmittedDataPreview
          data={Object.fromEntries(
            Object.entries(submittedData).map(([key, value]) => [
              key,
              value instanceof Date ? value.toISOString().split('T')[0] : value,
            ])
          )}
          title="Отправленные данные:"
        />
      )}
    </DemoPageLayout>
  )
}
