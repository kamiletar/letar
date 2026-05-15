'use client'

import { ChakraProvider, defaultSystem, Heading, Stack } from '@chakra-ui/react'
import { Form } from '@letar/forms'

import { z } from 'zod/v4'

const Schema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .meta({
      ui: { title: 'Email', placeholder: 'user@example.com' },
    }),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .meta({
      ui: { title: 'Password' },
    }),
  confirmPassword: z.string().meta({
    ui: { title: 'Confirm Password' },
  }),
  age: z
    .number()
    .min(18, 'Must be 18 or older')
    .max(120)
    .meta({
      ui: { title: 'Age' },
    }),
})

export default function ValidationDemoPage() {
  return (
    <ChakraProvider value={defaultSystem}>
      <Form
        schema={Schema}
        initialValue={{ email: '', password: '', confirmPassword: '', age: 0 }}
        onSubmit={async () => {}}
      >
        <Stack gap={4}>
          <Heading size="sm">Validation Demo</Heading>
          <Form.Field.String name="email" />
          <Form.Field.Password name="password" />
          <Form.Field.Password name="confirmPassword" />
          <Form.Field.Number name="age" />
          <Form.Errors title="Please fix:" />
          <Form.DebugValues showInProduction />
          <Form.Button.Submit>Submit</Form.Button.Submit>
        </Stack>
      </Form>
    </ChakraProvider>
  )
}
