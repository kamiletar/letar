'use client'

import { PageH1 } from '@/components/page-h1'
import { Code, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'

/** Имитация проверки email */
async function checkEmail(value: unknown): Promise<string | undefined> {
  await new Promise((r) => setTimeout(r, 800))
  if (String(value) === 'taken@example.com') {
    return 'Email already registered'
  }
  return undefined
}

export default function AsyncValidationExamplePage() {
  const [result, setResult] = useState<string | null>(null)

  return (
    <Stack gap={8} maxW="lg">
      <Stack gap={2}>
        <PageH1 size="xl">Async Validation</PageH1>
        <Text color="fg.muted">
          Server-side validation with debounce and caching. Try &quot;taken@example.com&quot; to see the error.
        </Text>
      </Stack>

      <Form initialValue={{ email: '', name: '' }} onSubmit={(data) => setResult(JSON.stringify(data, null, 2))}>
        <Form.Field.String name="name" label="Name" />
        <Form.Field.String
          name="email"
          label="Email"
          placeholder="Try taken@example.com"
          asyncValidate={checkEmail}
          asyncDebounce={500}
          asyncTrigger="onBlur"
        />
        <Form.Button.Submit>Register</Form.Button.Submit>
      </Form>

      {result && (
        <Code p={4} borderRadius="md" display="block" whiteSpace="pre" overflow="auto" fontSize="sm">
          {result}
        </Code>
      )}
    </Stack>
  )
}
