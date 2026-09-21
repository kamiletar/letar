'use client'

import { Box, Code, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { actionFailure, Form, mapServerErrors, useFormRef, useFormServerAction } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { DemoPageLayout } from '../_components'
import { toaster } from '../_components/toaster'

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
  'ActionFailure (поле)': { success: false as const, error: 'Такой адрес уже занят', field: 'slug' },
  'Error объект': new Error('Что-то пошло не так'),
  null: null,
} as const

// --- Живой пример useFormServerAction ---

const SignupSchema = z.object({
  email: z.string().min(1).meta({ ui: { title: 'Email' } }),
}).strip()

type SignupData = z.infer<typeof SignupSchema>

/** Имитация server action — «занятый» email ведёт себя как Prisma P2002 на уникальном поле. */
async function fakeCreateUser(data: SignupData): Promise<{ id: string }> {
  await new Promise((resolve) => setTimeout(resolve, 600))
  if (data.email === 'taken@example.com') {
    throw { code: 'P2002', message: 'Unique constraint failed', meta: { target: ['email'] } }
  }
  return { id: crypto.randomUUID() }
}

function UseFormServerActionDemo() {
  const formRef = useFormRef()
  const { run, pending } = useFormServerAction(formRef, {
    fieldMap: { email: { field: 'email', message: 'Этот email уже зарегистрирован' } },
    toaster,
    successMessage: 'Пользователь создан',
  })

  return (
    <VStack align="stretch" gap={3} maxW="sm">
      <Text fontSize="sm" color="fg.muted">
        Введите{' '}
        <Code>taken@example.com</Code>, чтобы увидеть маппинг ошибки на поле + toast. Любой другой email — успех.
      </Text>
      <Form
        schema={SignupSchema}
        initialValue={{ email: '' }}
        formRef={formRef}
        onSubmit={async (data) => {
          await run(() => fakeCreateUser(data))
        }}
      >
        <Form.Errors />
        <Form.Field.String name="email" />
        <Form.Button.Submit loadingText="Отправка...">Создать</Form.Button.Submit>
      </Form>
      <Text fontSize="xs" color="fg.muted">
        pending: <Code>{String(pending)}</Code>
      </Text>
    </VStack>
  )
}

// --- Отказ Server Action значением (ActionFailure) ---

const CategorySchema = z.object({
  slug: z.string().min(1).meta({ ui: { title: 'Адрес (slug)' } }),
}).strip()

type CategoryData = z.infer<typeof CategorySchema>

/**
 * Имитация server action, которая ВОЗВРАЩАЕТ отказ значением (в production Next.js стирает текст
 * брошенной ошибки). На сервере это делает `catchActionFailure` из `@letar/forms/server-errors`.
 */
async function fakeCreateCategory(data: CategoryData) {
  await new Promise((resolve) => setTimeout(resolve, 600))
  if (data.slug === 'taken') {
    return actionFailure('Такой адрес уже занят — задайте другой', 'slug')
  }
  if (data.slug === 'locked') {
    return actionFailure('Категорию нельзя изменять: она используется в заказах')
  }
  return { id: crypto.randomUUID() }
}

function ActionFailureDemo() {
  const formRef = useFormRef()
  const { run, pending } = useFormServerAction(formRef, { toaster, successMessage: 'Категория создана' })

  return (
    <VStack align="stretch" gap={3} maxW="sm">
      <Text fontSize="sm" color="fg.muted">
        <Code>taken</Code> — отказ с полем (под полем и в общем блоке), <Code>locked</Code>{' '}
        — отказ без поля (только общий блок). Любой другой адрес — успех. Отказ приходит значением, а <Code>run</Code>
        {' '}
        сам бросает его как <Code>ActionFailureError</Code>.
      </Text>
      <Form
        schema={CategorySchema}
        initialValue={{ slug: '' }}
        formRef={formRef}
        onSubmit={async (data) => {
          await run(() => fakeCreateCategory(data))
        }}
      >
        <Form.Errors />
        <Form.Field.String name="slug" />
        <Form.Button.Submit loadingText="Отправка...">Создать</Form.Button.Submit>
      </Form>
      <Text fontSize="xs" color="fg.muted">
        pending: <Code>{String(pending)}</Code>
      </Text>
    </VStack>
  )
}

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

        {/* useFormServerAction — та же связка в один вызов */}
        <Box>
          <Heading size="md" mb={3}>
            useFormServerAction — та же связка в один вызов
          </Heading>
          <Text fontSize="sm" color="fg.muted" mb={3}>
            Обёртка над примером выше: `formRef` + `mapServerErrors`/`applyServerErrors` + pending-состояние +
            опциональный toaster в одном хуке, без `middleware.onError`.
          </Text>
          <UseFormServerActionDemo />
        </Box>

        {/* Отказ значением */}
        <Box>
          <Heading size="md" mb={3}>
            Отказ Server Action значением — ActionFailure
          </Heading>
          <Text fontSize="sm" color="fg.muted" mb={3}>
            В production Next.js стирает текст ошибки, брошенной из Server Action. Ожидаемый отказ сервер возвращает
            значением (<Code>actionFailure</Code> / <Code>catchActionFailure</Code>), а форма бросает его обратно.
          </Text>
          <ActionFailureDemo />
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
              <strong>ActionFailure</strong> — {'{ success: false, error, field? }'} → под поле и в общий блок
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
