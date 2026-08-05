'use client'

import { Box, ChakraProvider, Code, defaultSystem, Heading, Stack, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import type { FormAnalyticsEvent } from '@letar/forms/analytics'
import { AnalyticsPanel, useFormAnalytics } from '@letar/forms/analytics'
import { useState } from 'react'
import { z } from 'zod/v4'
import { SubmittedDataPreview } from '../_components'

const Schema = z.object({
  name: z.string().meta({ ui: { title: 'Name', placeholder: 'Enter your name' } }),
  email: z
    .string()
    .email()
    .meta({ ui: { title: 'Email', placeholder: 'user@example.com' } }),
  message: z.string().meta({ ui: { title: 'Message', placeholder: 'Your message...' } }),
})

/** Короткая строка события для лога — без timestamp, чтобы читалось в одну строку */
function formatEvent(event: FormAnalyticsEvent): string {
  return 'field' in event ? `${event.type} → ${event.field}` : event.type
}

export default function AnalyticsDemoPage() {
  const [events, setEvents] = useState<string[]>([])
  const [submitted, setSubmitted] = useState<unknown>(null)

  const analytics = useFormAnalytics({
    formId: 'demo-analytics',
    // Демо открывается в iframe документации, где консоль браузера читателю не видна,
    // поэтому адаптер пишет события прямо на страницу.
    adapters: [
      {
        name: 'inline',
        track: (event) => setEvents((prev) => [...prev.slice(-9), formatEvent(event)]),
      },
    ],
  })

  return (
    <ChakraProvider value={defaultSystem}>
      <VStack gap={8} align="stretch" maxW="600px" mx="auto" py={8}>
        <Box>
          <Heading size="lg">Form Analytics</Heading>
          <Text color="fg.muted" mt={2}>
            Field-level analytics tracking with dev panel. Events appear in the log below.
          </Text>
        </Box>

        <Form
          schema={Schema}
          initialValue={{ name: '', email: '', message: '' }}
          onSubmit={(data) => setSubmitted(data)}
        >
          <Stack gap={4}>
            <Form.Field.String name="name" />
            <Form.Field.String name="email" />
            <Form.Field.Textarea name="message" />
            <Form.Button.Submit>Submit</Form.Button.Submit>
          </Stack>
        </Form>

        <SubmittedDataPreview data={submitted} />

        {events.length > 0 && (
          <VStack gap={1} align="stretch">
            <Text fontSize="xs" fontWeight="bold" color="fg.muted">
              Event log
            </Text>
            {events.map((event, i) => (
              <Code key={i} fontSize="xs">
                {event}
              </Code>
            ))}
          </VStack>
        )}

        <AnalyticsPanel analytics={analytics} />
      </VStack>
    </ChakraProvider>
  )
}
