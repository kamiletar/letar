'use client'

import { createContact } from '@/app/_actions/contact.action'
import { ContactCreateFormSchema } from '@/generated/form-schemas'
import { Heading, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'

export default function NewContactPage() {
  return (
    <Stack gap={6}>
      <div>
        <Heading size="lg">Contact Form</Heading>
        <Text color="fg.muted">
          Schema generated from schema.zmodel → Form.FromSchema → Server Action → PostgreSQL.
        </Text>
      </div>

      <Form.FromSchema
        schema={ContactCreateFormSchema}
        initialValue={{ name: '', email: '', subject: 'SUPPORT' as const, message: '' }}
        onSubmit={async (data) => {
          await createContact(data as Parameters<typeof createContact>[0])
        }}
        submitLabel="Send Message"
        debug
      />
    </Stack>
  )
}
