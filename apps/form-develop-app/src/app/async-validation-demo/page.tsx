'use client'

import { Box, Heading, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { DemoPageLayout } from '../_components'

/** Имитация серверной проверки email */
async function checkEmailAvailability(value: unknown): Promise<string | undefined> {
  await new Promise((r) => setTimeout(r, 800))
  const taken = ['admin@test.com', 'user@test.com', 'test@test.com']
  if (taken.includes(String(value))) {
    return 'Этот email уже зарегистрирован'
  }
  return undefined
}

/** Имитация серверной проверки username */
async function checkUsernameAvailability(value: unknown): Promise<string | undefined> {
  await new Promise((r) => setTimeout(r, 600))
  const taken = ['admin', 'root', 'test', 'user']
  if (taken.includes(String(value).toLowerCase())) {
    return 'Username занят'
  }
  return undefined
}

export default function AsyncValidationDemoPage() {
  const [submittedData, setSubmittedData] = useState<Record<string, unknown> | null>(null)

  return (
    <DemoPageLayout
      title="Async Validation"
      description="Серверная валидация с debounce, отменой запросов и кэшированием"
    >
      <VStack gap={8} align="stretch">
        <Box>
          <Heading size="md" mb={3}>
            Регистрация с проверкой уникальности
          </Heading>
          <Text fontSize="sm" color="fg.muted" mb={4}>
            Email проверяется на blur (занятые: admin@test.com, user@test.com, test@test.com). Username проверяется
            onChange с debounce 300мс (занятые: admin, root, test, user).
          </Text>
          <Form
            debug
            initialValue={{ username: '', email: '', password: '' }}
            onSubmit={(data) => setSubmittedData(data as Record<string, unknown>)}
          >
            <Form.Field.String
              name="username"
              label="Username"
              placeholder="Введите имя пользователя"
              asyncValidate={checkUsernameAvailability}
              asyncDebounce={300}
              asyncTrigger="onChange"
            />
            <Form.Field.String
              name="email"
              label="Email"
              placeholder="Введите email"
              asyncValidate={checkEmailAvailability}
              asyncDebounce={500}
              asyncTrigger="onBlur"
            />
            <Form.Field.Password name="password" label="Пароль" />
            <Form.Button.Submit>Зарегистрироваться</Form.Button.Submit>
          </Form>
        </Box>

        {submittedData && (
          <Box p={4} bg="bg.subtle" borderRadius="md">
            <Heading size="sm" mb={2}>
              Отправленные данные:
            </Heading>
            <pre style={{ fontSize: '12px', overflow: 'auto' }}>{JSON.stringify(submittedData, null, 2)}</pre>
          </Box>
        )}
      </VStack>
    </DemoPageLayout>
  )
}
