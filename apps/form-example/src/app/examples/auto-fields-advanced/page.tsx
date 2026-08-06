'use client'

import { Code, Heading, Separator, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { z } from 'zod/v4'

// Полная схема с разнообразными типами
const FullSchema = z.object({
  name: z
    .string()
    .min(2)
    .meta({ ui: { title: 'Name', placeholder: 'John Doe' } }),
  email: z
    .string()
    .email()
    .meta({ ui: { title: 'Email' } }),
  age: z
    .number()
    .min(0)
    .max(120)
    .meta({ ui: { title: 'Age' } }),
  role: z.enum(['user', 'admin', 'moderator']).meta({
    ui: {
      title: 'Role',
      options: [
        { value: 'user', label: 'User' },
        { value: 'admin', label: 'Admin' },
        { value: 'moderator', label: 'Moderator' },
      ],
    },
  }),
  bio: z
    .string()
    .optional()
    .meta({ ui: { title: 'Bio', fieldType: 'textarea' } }),
  active: z.boolean().meta({ ui: { title: 'Active' } }),
  rating: z
    .number()
    .min(1)
    .max(5)
    .optional()
    .meta({ ui: { title: 'Rating', fieldType: 'rating' } }),
})

export default function AutoFieldsAdvancedPage() {
  return (
    <Stack gap={6}>
      <div>
        <Heading size="lg">Advanced Auto Fields</Heading>
        <Text color="fg.muted">
          <Code>Form.FromSchema</Code> generates the entire form. Use <Code>Form.AutoFields</Code>{' '}
          for more control with include/exclude.
        </Text>
      </div>

      <Heading size="sm">1. Form.FromSchema — Full Auto</Heading>
      <Text fontSize="sm" color="fg.muted">
        One component, zero field definitions:
      </Text>
      <Form.FromSchema
        schema={FullSchema}
        initialValue={{ name: '', email: '', age: 25, role: 'user', bio: '', active: true, rating: 3 }}
        onSubmit={async (data) => alert(JSON.stringify(data, null, 2))}
        submitLabel="Create"
        debug
      />

      <Separator />

      <Heading size="sm">2. Form.AutoFields — With Filtering</Heading>
      <Text fontSize="sm" color="fg.muted">
        Include only specific fields, or exclude some:
      </Text>
      <Form
        schema={FullSchema}
        initialValue={{ name: '', email: '', age: 25, role: 'user', bio: '', active: true, rating: 3 }}
        onSubmit={async (data) => alert(JSON.stringify(data, null, 2))}
      >
        <Stack gap={4}>
          <Text fontSize="xs" color="fg.muted">
            Only name, email, role (include filter):
          </Text>
          <Form.AutoFields include={['name', 'email', 'role']} />
          <Form.DebugValues showInProduction />
          <Form.Button.Submit>Save</Form.Button.Submit>
        </Stack>
      </Form>

      <Separator />

      <Heading size="sm">3. Mixed — AutoFields + Custom</Heading>
      <Text fontSize="sm" color="fg.muted">
        Auto-generate most fields, manually add custom ones:
      </Text>
      <Form
        schema={FullSchema}
        initialValue={{ name: '', email: '', age: 25, role: 'user', bio: '', active: true, rating: 3 }}
        onSubmit={async (data) => alert(JSON.stringify(data, null, 2))}
      >
        <Stack gap={4}>
          <Form.AutoFields exclude={['bio', 'rating']} />
          <Heading size="xs">Custom fields below:</Heading>
          <Form.Field.Textarea name="bio" />
          <Form.Field.Rating name="rating" />
          <Form.DebugValues showInProduction />
          <Form.Button.Submit>Save</Form.Button.Submit>
        </Stack>
      </Form>
    </Stack>
  )
}
