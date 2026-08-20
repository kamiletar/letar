'use client'

import { PageH1 } from '@/components/page-h1'
import { Code, Stack, Text } from '@chakra-ui/react'
import { Form, templates } from '@letar/forms'
import { useState } from 'react'

export default function TemplatesExamplePage() {
  const [result, setResult] = useState<string | null>(null)

  return (
    <Stack gap={8} maxW="lg">
      <Stack gap={2}>
        <PageH1 size="xl">Form Templates</PageH1>
        <Text color="fg.muted">Ready-made form templates. This example uses the Contact Form template.</Text>
      </Stack>

      <Form.FromTemplate
        template={templates.contactForm}
        onSubmit={(data) => setResult(JSON.stringify(data, null, 2))}
        submitLabel="Send Message"
      />

      {result && (
        <Code p={4} borderRadius="md" display="block" whiteSpace="pre" overflow="auto" fontSize="sm">
          {result}
        </Code>
      )}
    </Stack>
  )
}
