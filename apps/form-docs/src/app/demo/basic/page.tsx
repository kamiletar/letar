'use client'

import { ChakraProvider, defaultSystem, Stack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { SubmittedDataPreview } from '../_components'

const Schema = z.object({
  name: z.string().meta({
    ui: { title: 'Name', placeholder: 'Enter your name' },
  }),
  email: z
    .string()
    .email()
    .meta({
      ui: { title: 'Email', placeholder: 'user@example.com' },
    }),
  role: z.enum(['user', 'admin', 'moderator']).meta({
    ui: { title: 'Role' },
  }),
  newsletter: z.boolean().meta({
    ui: { title: 'Subscribe to newsletter' },
  }),
})

const roleOptions = [
  { value: 'user', label: 'User' },
  { value: 'admin', label: 'Admin' },
  { value: 'moderator', label: 'Moderator' },
]

export default function BasicDemoPage() {
  const [submitted, setSubmitted] = useState<unknown>(null)

  return (
    <ChakraProvider value={defaultSystem}>
      <Form
        schema={Schema}
        initialValue={{ name: '', email: '', role: 'user', newsletter: false }}
        onSubmit={(data) => setSubmitted(data)}
      >
        <Stack gap={4}>
          <Form.Field.String name="name" />
          <Form.Field.String name="email" />
          <Form.Field.Select name="role" options={roleOptions} />
          <Form.Field.Checkbox name="newsletter" />
          <Form.DebugValues showInProduction />
          <Form.Button.Submit>Submit</Form.Button.Submit>
          <SubmittedDataPreview data={submitted} />
        </Stack>
      </Form>
    </ChakraProvider>
  )
}
