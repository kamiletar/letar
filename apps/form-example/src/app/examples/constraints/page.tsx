'use client'

import { Code, Heading, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { z } from 'zod/v4'

const Schema = z.object({
  // Email с кастомным сообщением
  email: z
    .string()
    .email('Please enter a valid email')
    .meta({
      ui: { title: 'Email', placeholder: 'user@example.com' },
    }),

  // Пароль с несколькими constraints
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .max(64, 'Maximum 64 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .meta({ ui: { title: 'Password' } }),

  // URL с optional
  website: z
    .string()
    .url('Must be a valid URL')
    .optional()
    .or(z.literal(''))
    .meta({
      ui: { title: 'Website (optional)', placeholder: 'https://example.com' },
    }),

  // Числовые constraints
  age: z
    .number()
    .min(18, 'Must be 18 or older')
    .max(120, 'Invalid age')
    .int('Must be a whole number')
    .meta({ ui: { title: 'Age' } }),

  // Percentage
  discount: z
    .number()
    .min(0, 'Cannot be negative')
    .max(100, 'Cannot exceed 100%')
    .meta({ ui: { title: 'Discount (%)' } }),

  // String с regex
  username: z
    .string()
    .min(3, 'At least 3 characters')
    .max(20, 'Maximum 20 characters')
    .regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers, underscores')
    .meta({ ui: { title: 'Username', placeholder: 'john_doe' } }),

  // Date constraint
  startDate: z.string().meta({ ui: { title: 'Start Date' } }),
})

export default function ConstraintsPage() {
  return (
    <Stack gap={6}>
      <div>
        <Heading size="lg">Advanced Validation</Heading>
        <Text color="fg.muted">
          Complex Zod constraints: regex, min/max, custom messages, <Code>Form.Errors</Code> summary.
        </Text>
      </div>

      <Form
        schema={Schema}
        initialValue={{
          email: '',
          password: '',
          website: '',
          age: 0,
          discount: 0,
          username: '',
          startDate: '',
        }}
        onSubmit={async (data) => alert(`Valid! ${JSON.stringify(data, null, 2)}`)}
      >
        <Stack gap={4}>
          <Form.Field.String name="email" />
          <Form.Field.Password name="password" />
          <Form.Field.String name="website" />
          <Form.Field.Number name="age" />
          <Form.Field.Slider name="discount" />
          <Form.Field.String name="username" />
          <Form.Field.Date name="startDate" />
          <Form.Errors title="Validation errors:" />
          <Form.DebugValues showInProduction />
          <Form.Button.Submit>Submit</Form.Button.Submit>
        </Stack>
      </Form>
    </Stack>
  )
}
