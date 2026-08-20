'use client'

import { PageH1 } from '@/components/page-h1'
import { Code, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'

const FeedbackSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .meta({ ui: { title: 'Your Name' } }),
    email: z
      .string()
      .email()
      .meta({ ui: { title: 'Email' } }),
    feedback: z
      .string()
      .min(10)
      .meta({ ui: { title: 'Feedback' } }),
  })
  .strip()

export default function SecurityExamplePage() {
  const [submitted, setSubmitted] = useState(false)

  return (
    <Stack gap={8} maxW="2xl">
      <Stack gap={2}>
        <PageH1 size="xl">Security Patterns</PageH1>
        <Text color="fg.muted">
          Form with honeypot bot protection, rate limiting (3 submits/min), and secure file upload with MIME
          verification.
        </Text>
      </Stack>

      <Form
        initialValue={{ name: '', email: '', feedback: '' }}
        schema={FeedbackSchema}
        honeypot={true}
        rateLimit={{ maxSubmits: 3, windowMs: 60000 }}
        onSubmit={() => setSubmitted(true)}
      >
        <Form.Field.String name="name" />
        <Form.Field.String name="email" />
        <Form.Field.Textarea name="feedback" />
        <Form.Field.FileUpload
          name="attachment"
          label="Attachment (optional)"
          security={{
            maxSize: '5MB',
            allowedTypes: ['image/*', 'application/pdf'],
            stripMetadata: true,
            renameFile: true,
          }}
        />
        <Form.Button.Submit>Submit Feedback</Form.Button.Submit>
      </Form>

      {submitted && (
        <Code colorPalette="green" p={3}>
          Submitted successfully!
        </Code>
      )}
    </Stack>
  )
}
