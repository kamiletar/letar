'use client'

import { Code, Heading, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { z } from 'zod/v4'

const UserSchema = z.object({
  name: z
    .string()
    .min(2)
    .meta({ ui: { title: 'Full Name', placeholder: 'John Doe' } }),
  email: z
    .string()
    .email()
    .meta({ ui: { title: 'Email', placeholder: 'john@example.com' } }),
  age: z
    .number()
    .min(0)
    .max(120)
    .meta({ ui: { title: 'Age' } }),
  role: z.enum(['user', 'admin']).meta({
    ui: {
      title: 'Role',
      options: [
        { value: 'user', label: 'User' },
        { value: 'admin', label: 'Administrator' },
      ],
    },
  }),
  active: z.boolean().meta({ ui: { title: 'Active account' } }),
})

export default function AutoFieldsPage() {
  return (
    <Stack gap={6}>
      <div>
        <Heading size="lg">Auto Fields</Heading>
        <Text color="fg.muted">
          <Code>Form.FromSchema</Code>{' '}
          generates the entire form from a Zod schema — one line of code, zero manual field definitions.
        </Text>
      </div>

      <Form.FromSchema
        schema={UserSchema}
        initialValue={{ name: '', email: '', age: 25, role: 'user', active: true }}
        onSubmit={async (data) => alert(JSON.stringify(data, null, 2))}
        submitLabel="Create User"
        debug
      />
    </Stack>
  )
}
