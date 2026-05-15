'use client'

import { Heading, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { z } from 'zod/v4'

const Schema = z.object({
  name: z
    .string()
    .min(2)
    .meta({ ui: { title: 'Name', placeholder: 'John Doe' } }),
  email: z
    .string()
    .email()
    .meta({ ui: { title: 'Email', placeholder: 'john@example.com' } }),
  role: z.enum(['user', 'admin', 'moderator']).meta({ ui: { title: 'Role' } }),
  newsletter: z.boolean().meta({ ui: { title: 'Subscribe to newsletter' } }),
})

const roleOptions = [
  { value: 'user', label: 'User' },
  { value: 'admin', label: 'Admin' },
  { value: 'moderator', label: 'Moderator' },
]

export default function BasicPage() {
  return (
    <Stack gap={6}>
      <div>
        <Heading size="lg">Basic Form</Heading>
        <Text color="fg.muted">The simplest example — String, Select, Checkbox fields.</Text>
      </div>

      <Form
        schema={Schema}
        initialValue={{ name: '', email: '', role: 'user', newsletter: false }}
        onSubmit={async (data) => {
          await new Promise((r) => setTimeout(r, 1500))
          alert(`Submitted: ${JSON.stringify(data, null, 2)}`)
        }}
      >
        <Stack gap={4}>
          <Form.Field.String name="name" />
          <Form.Field.String name="email" />
          <Form.Field.Select name="role" options={roleOptions} />
          <Form.Field.Checkbox name="newsletter" />
          <Form.DebugValues showInProduction />
          <Form.Button.Submit>Submit</Form.Button.Submit>
        </Stack>
      </Form>
    </Stack>
  )
}
