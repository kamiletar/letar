'use client'

import { PageH1 } from '@/components/page-h1'
import { Box, Code, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { editIntentValueSchema, emptyEditIntentValue } from '@letar/forms-core/edit-intent'
import { useState } from 'react'
import { z } from 'zod/v4'

const ApiKeySchema = z
  .object({
    apiKey: editIntentValueSchema(z.string().min(20)),
  })
  .strip()

export default function EditIntentExamplePage() {
  const [submitted, setSubmitted] = useState<unknown>(null)

  return (
    <Stack gap={8} maxW="2xl">
      <Stack gap={2}>
        <PageH1 size="xl">EditIntent — Replace a Secret Without Round-Tripping It</PageH1>
        <Text color="fg.muted">
          The server never sends the real API key back — only a safe display mask. «Replace» opens an empty input for a
          brand-new value; «Keep current» cancels and returns to view mode without touching the stored secret.
        </Text>
      </Stack>

      <Form
        initialValue={{ apiKey: emptyEditIntentValue<string>() }}
        schema={ApiKeySchema}
        onSubmit={(data) => setSubmitted(data)}
      >
        <Form.Field.EditIntent
          name="apiKey"
          displayValue="************P9x4"
          editLabel="Replace key"
          cancelLabel="Keep current"
          emptyValue=""
        >
          <Form.Field.Password name="apiKey.value" autoComplete="new-password" label="New API key" />
        </Form.Field.EditIntent>
        <Box mt={4}>
          <Form.Button.Submit>Save</Form.Button.Submit>
        </Box>
      </Form>

      {submitted != null && (
        <Code whiteSpace="pre" p={3}>
          {JSON.stringify(submitted, null, 2)}
        </Code>
      )}
    </Stack>
  )
}
