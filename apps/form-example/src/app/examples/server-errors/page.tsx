'use client'

import { PageH1 } from '@/components/page-h1'
import { Box, Code, HStack, Text, VStack } from '@chakra-ui/react'
import { actionFailure, Form, mapServerErrors, useFormRef, useFormServerAction } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'

const ERRORS: Record<string, unknown> = {
  'Prisma P2002': { code: 'P2002', message: 'Unique', meta: { target: ['email'] } },
  'ZenStack policy': { reason: 'rejected-by-policy' },
  'Zod flatten': { formErrors: ['Пароли не совпадают'], fieldErrors: { email: ['Некорректный'] } },
  ActionResult: { success: false, error: 'Email уже занят' },
  ActionFailure: { success: false, error: 'Такой адрес уже занят', field: 'slug' },
}

const SignupSchema = z.object({
  email: z.string().min(1).meta({ ui: { title: 'Email' } }),
}).strip()

/** Имитация server action — «занятый» email ведёт себя как Prisma P2002 на уникальном поле. */
async function fakeCreateUser(data: { email: string }): Promise<{ id: string }> {
  await new Promise((resolve) => setTimeout(resolve, 500))
  if (data.email === 'taken@example.com') {
    throw { code: 'P2002', message: 'Unique constraint failed', meta: { target: ['email'] } }
  }
  return { id: crypto.randomUUID() }
}

function UseFormServerActionExample() {
  const formRef = useFormRef()
  const { run, pending } = useFormServerAction(formRef, {
    fieldMap: { email: { field: 'email', message: 'Этот email уже зарегистрирован' } },
  })

  return (
    <VStack align="stretch" gap={3}>
      <Text fontSize="sm" color="fg.muted">
        Введите <Code>taken@example.com</Code>, чтобы увидеть ошибку на поле. Любой другой email — успех.
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

const CategorySchema = z.object({
  slug: z.string().min(1).meta({ ui: { title: 'Адрес (slug)' } }),
}).strip()

/**
 * Имитация server action, которая ВОЗВРАЩАЕТ отказ значением: в production Next.js стирает текст
 * брошенной из Server Action ошибки. На сервере это делает `catchActionFailure`.
 */
async function fakeCreateCategory(data: { slug: string }) {
  await new Promise((resolve) => setTimeout(resolve, 500))
  if (data.slug === 'taken') {
    return actionFailure('Такой адрес уже занят — задайте другой', 'slug')
  }
  return { id: crypto.randomUUID() }
}

function ActionFailureExample() {
  const formRef = useFormRef()
  const { run, pending } = useFormServerAction(formRef)

  return (
    <VStack align="stretch" gap={3}>
      <Text fontSize="sm" color="fg.muted">
        Введите <Code>taken</Code>, чтобы увидеть отказ под полем и в общем блоке. Любой другой адрес — успех.
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

export default function ServerErrorsExamplePage() {
  const [selected, setSelected] = useState('Prisma P2002')
  const error = ERRORS[selected]
  const mapped = mapServerErrors(error, {
    fieldMap: { email: { field: 'email', message: 'Этот email уже зарегистрирован' } },
  })

  return (
    <VStack gap={8} align="stretch" maxW="600px" mx="auto" py={8}>
      <Box>
        <PageH1 size="lg">Server Error Mapping</PageH1>
        <Text color="fg.muted" mt={2}>
          mapServerErrors() автоматически определяет формат и маппит на поля формы.
        </Text>
      </Box>

      <HStack gap={2} flexWrap="wrap">
        {Object.keys(ERRORS).map((key) => (
          <Box
            key={key}
            asChild
            px={3}
            py={1.5}
            fontSize="sm"
            borderRadius="md"
            bg={selected === key ? 'blue.600' : 'gray.subtle'}
            color={selected === key ? 'white' : 'fg.default'}
          >
            <button onClick={() => setSelected(key)}>{key}</button>
          </Box>
        ))}
      </HStack>

      <Box>
        <Text fontSize="xs" fontWeight="bold" color="red.500" mb={1}>
          Вход:
        </Text>
        <Code display="block" whiteSpace="pre-wrap" fontSize="xs" p={3} borderRadius="md">
          {JSON.stringify(error, null, 2)}
        </Code>
      </Box>

      <Box>
        <Text fontSize="xs" fontWeight="bold" color="green.500" mb={1}>
          Результат:
        </Text>
        <Code display="block" whiteSpace="pre-wrap" fontSize="xs" p={3} borderRadius="md">
          {JSON.stringify(mapped, null, 2)}
        </Code>
      </Box>

      <Box>
        <Text fontSize="sm" fontWeight="bold" mb={2}>
          useFormServerAction — та же связка в один вызов
        </Text>
        <Text fontSize="xs" color="fg.muted" mb={3}>
          `formRef` + `mapServerErrors`/`applyServerErrors` + pending-состояние в одном хуке.
        </Text>
        <UseFormServerActionExample />
      </Box>

      <Box>
        <Text fontSize="sm" fontWeight="bold" mb={2}>
          Отказ Server Action значением — ActionFailure
        </Text>
        <Text fontSize="xs" color="fg.muted" mb={3}>
          Ожидаемый отказ сервер возвращает значением, `run` сам бросает его как `ActionFailureError`.
        </Text>
        <ActionFailureExample />
      </Box>
    </VStack>
  )
}
