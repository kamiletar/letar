'use client'

import { Box, Code, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { mapServerErrors } from '@letar/forms'
import { useState } from 'react'
import { DemoPageLayout } from '../_components'

// Имитация серверных ошибок разных типов
const ERROR_EXAMPLES = {
  'Prisma P2002 (unique)': { code: 'P2002', message: 'Unique constraint failed', meta: { target: ['email'] } },
  'Prisma P2002 (composite)': { code: 'P2002', message: 'Unique', meta: { target: ['organizationId', 'name'] } },
  'Prisma P2003 (FK)': { code: 'P2003', message: 'FK failed', meta: { field_name: 'categoryId' } },
  'Prisma P2025 (not found)': { code: 'P2025', message: 'Record not found' },
  'ZenStack policy': { reason: 'rejected-by-policy' as const },
  'ZenStack cannot-read-back': {
    reason: 'rejected-by-policy' as const,
    rejectedByPolicyReason: 'cannot-read-back' as const,
  },
  'ZenStack db-query + P2002': { reason: 'db-query-error' as const, code: 'P2002', meta: { target: ['email'] } },
  'Zod flatten': {
    formErrors: ['Пароли не совпадают'],
    fieldErrors: { email: ['Некорректный email'], password: ['Минимум 8 символов'] },
  },
  'ActionResult string': { success: false as const, error: 'Пользователь уже существует' },
  'ActionResult nested': {
    success: false as const,
    error: { formErrors: [], fieldErrors: { name: ['Обязательное поле'] } },
  },
  'Error объект': new Error('Что-то пошло не так'),
  null: null,
} as const

export default function ServerErrorsDemoPage() {
  const [selectedError, setSelectedError] = useState<string>('Prisma P2002 (unique)')

  const error = ERROR_EXAMPLES[selectedError as keyof typeof ERROR_EXAMPLES]
  const mapped = mapServerErrors(error, {
    fieldMap: {
      email: { field: 'email', message: 'Этот email уже зарегистрирован' },
      organizationId_name: { field: 'name', message: 'Такое название уже занято в организации' },
    },
  })

  return (
    <DemoPageLayout title="mapServerErrors()" description="Автоматический маппинг серверных ошибок на поля формы">
      <VStack gap={8} align="stretch">
        {/* Выбор типа ошибки */}
        <Box>
          <Heading size="md" mb={3}>
            Тип серверной ошибки
          </Heading>
          <HStack gap={2} flexWrap="wrap">
            {Object.keys(ERROR_EXAMPLES).map((key) => (
              <Box
                key={key}
                as="button"
                px={3}
                py={1.5}
                fontSize="sm"
                borderRadius="md"
                bg={selectedError === key ? 'blue.600' : 'gray.700'}
                color="white"
                cursor="pointer"
                onClick={() => setSelectedError(key)}
                _hover={{ bg: selectedError === key ? 'blue.500' : 'gray.600' }}
              >
                {key}
              </Box>
            ))}
          </HStack>
        </Box>

        {/* Входная ошибка */}
        <Box>
          <Heading size="sm" mb={2} color="red.400">
            Входные данные (error)
          </Heading>
          <Code display="block" whiteSpace="pre-wrap" fontSize="xs" p={4} borderRadius="md">
            {JSON.stringify(error, null, 2)}
          </Code>
        </Box>

        {/* Результат маппинга */}
        <Box>
          <Heading size="sm" mb={2} color="green.400">
            Результат mapServerErrors()
          </Heading>
          <Code display="block" whiteSpace="pre-wrap" fontSize="xs" p={4} borderRadius="md">
            {JSON.stringify(mapped, null, 2)}
          </Code>
        </Box>

        {/* Fieldmap конфиг */}
        <Box>
          <Heading size="sm" mb={2} color="blue.400">
            Конфигурация fieldMap
          </Heading>
          <Code display="block" whiteSpace="pre-wrap" fontSize="xs" p={4} borderRadius="md">
            {`fieldMap: {
  email: { field: 'email', message: 'Этот email уже зарегистрирован' },
  organizationId_name: { field: 'name', message: 'Такое название уже занято' },
}`}
          </Code>
        </Box>

        {/* Пример использования */}
        <Box>
          <Heading size="md" mb={3}>
            Пример использования в onSubmit
          </Heading>
          <Code display="block" whiteSpace="pre" fontSize="xs" p={4} borderRadius="md">
            {`import { mapServerErrors, applyServerErrors } from '@letar/forms'

<Form schema={UserSchema} onSubmit={async ({ value }) => {
  try {
    await createUser(value)
  } catch (error) {
    // Автодетект: Prisma P2002 → поле email
    const mapped = mapServerErrors(error, {
      fieldMap: {
        email: { field: 'email', message: 'Этот email занят' },
      },
    })

    // Вариант 1: применить к форме
    applyServerErrors(form, mapped)

    // Вариант 2: показать в toast
    if (mapped.formErrors.length) {
      toaster.error({ title: mapped.formErrors[0] })
    }
  }
}}>
  <Form.Field.String name="email" />
  <Form.Errors /> {/* Покажет ошибки из applyServerErrors */}
</Form>`}
          </Code>
        </Box>

        {/* Поддерживаемые форматы */}
        <Box>
          <Heading size="md" mb={3}>
            Поддерживаемые форматы
          </Heading>
          <VStack align="start" gap={2} fontSize="sm">
            <Text>
              <strong>Prisma P2002</strong> — unique constraint → маппинг meta.target на поле
            </Text>
            <Text>
              <strong>Prisma P2003</strong> — foreign key → маппинг meta.field_name
            </Text>
            <Text>
              <strong>Prisma P2025</strong> — not found → глобальная ошибка
            </Text>
            <Text>
              <strong>Prisma P2014</strong> — relation violation → "есть связанные записи"
            </Text>
            <Text>
              <strong>ZenStack policy</strong> — rejected-by-policy → "Нет доступа"
            </Text>
            <Text>
              <strong>ZenStack db-query</strong> — оборачивает Prisma, автодетект кода
            </Text>
            <Text>
              <strong>Zod flatten</strong> — {'{ fieldErrors, formErrors }'} → прямой маппинг
            </Text>
            <Text>
              <strong>ActionResult</strong> — {'{ success: false, error }'} → строка или nested
            </Text>
            <Text>
              <strong>Error с .info</strong> — ZenStack стиль (.info.reason)
            </Text>
          </VStack>
        </Box>
      </VStack>
    </DemoPageLayout>
  )
}
