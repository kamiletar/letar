'use client'

import { PageH1 } from '@/components/page-h1'
import { Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { z } from 'zod/v4'

const Schema = z.object({
  email: z
    .string()
    .email('Please enter a valid email')
    .meta({
      ui: { title: 'Email', placeholder: 'user@example.com' },
    }),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .meta({
      ui: { title: 'Password' },
    }),
  age: z
    .number()
    .min(18, 'Must be 18 or older')
    .max(120, 'Invalid age')
    .meta({
      ui: { title: 'Age' },
    }),
  website: z
    .string()
    .url('Must be a valid URL')
    .optional()
    .meta({
      ui: { title: 'Website (optional)', placeholder: 'https://...' },
    }),
})

export default function ValidationPage() {
  return (
    <Stack gap={6}>
      <div>
        <PageH1 size="lg">Validation</PageH1>
        <Text color="fg.muted">Zod schema validation with custom error messages and Form.Errors display.</Text>
      </div>

      <Form
        schema={Schema}
        initialValue={{ email: '', password: '', age: 0, website: '' }}
        onSubmit={async (data) => {
          await new Promise((r) => setTimeout(r, 1500))
          alert(`Valid! ${JSON.stringify(data)}`)
        }}
      >
        <Stack gap={4}>
          <Form.Field.String name="email" />
          <Form.Field.Password name="password" />
          <Form.Field.Number name="age" />
          <Form.Field.String name="website" />
          <Form.Errors title="Please fix these errors:" />
          <Form.DebugValues showInProduction />
          <Form.Button.Submit>Submit</Form.Button.Submit>
        </Stack>
      </Form>
    </Stack>
  )
}
