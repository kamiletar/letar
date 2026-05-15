'use client'

import { Box, ChakraProvider, defaultSystem, Heading, Stack, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { AnalyticsPanel, useFormAnalytics } from '@letar/forms/analytics'
import { z } from 'zod/v4'

const Schema = z.object({
  name: z.string().meta({ ui: { title: 'Name', placeholder: 'Enter your name' } }),
  email: z
    .string()
    .email()
    .meta({ ui: { title: 'Email', placeholder: 'user@example.com' } }),
  message: z.string().meta({ ui: { title: 'Message', placeholder: 'Your message...' } }),
})

export default function AnalyticsDemoPage() {
  const analytics = useFormAnalytics({
    formId: 'demo-analytics',
    adapters: [{ name: 'console', track: (event) => console.log('[Analytics]', event) }],
  })

  return (
    <ChakraProvider value={defaultSystem}>
      <VStack gap={8} align="stretch" maxW="600px" mx="auto" py={8}>
        <Box>
          <Heading size="lg">Form Analytics</Heading>
          <Text color="fg.muted" mt={2}>
            Field-level analytics tracking with dev panel. Open DevTools to see events.
          </Text>
        </Box>

        <Form schema={Schema} initialValue={{ name: '', email: '', message: '' }} onSubmit={async () => {}}>
          <Stack gap={4}>
            <Form.Field.String name="name" />
            <Form.Field.String name="email" />
            <Form.Field.Textarea name="message" />
            <Form.Button.Submit>Submit</Form.Button.Submit>
          </Stack>
        </Form>

        <AnalyticsPanel analytics={analytics} />
      </VStack>
    </ChakraProvider>
  )
}
