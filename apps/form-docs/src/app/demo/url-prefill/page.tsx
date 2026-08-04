'use client'

import { Box, ChakraProvider, Code, defaultSystem, Heading, Stack, Text, VStack } from '@chakra-ui/react'
import { Form, useUrlPrefill } from '@letar/forms'
import { z } from 'zod/v4'

const ContactSchema = z.object({
  name: z
    .string()
    .min(1)
    .meta({ ui: { title: 'Name', placeholder: 'Your name' } }),
  email: z
    .string()
    .email()
    .meta({ ui: { title: 'Email', placeholder: 'user@example.com' } }),
  phone: z
    .string()
    .optional()
    .meta({ ui: { title: 'Phone' } }),
})

function PrefillForm() {
  const prefilled = useUrlPrefill({
    fields: ['name', 'email', 'phone'],
    cleanUrl: true,
  })

  return (
    <Form
      schema={ContactSchema}
      initialValue={{ name: '', email: '', phone: '', ...prefilled }}
      onSubmit={async (value) => {
        alert(JSON.stringify(value, null, 2))
      }}
    >
      <Form.Field.String name="name" />
      <Form.Field.String name="email" />
      <Form.Field.Phone name="phone" />
      <Form.Button.Submit>Send</Form.Button.Submit>
    </Form>
  )
}

export default function UrlPrefillDemoPage() {
  return (
    <ChakraProvider value={defaultSystem}>
      <VStack gap={8} align="stretch" maxW="600px" mx="auto" py={8}>
        <Box>
          <Heading size="lg">URL Prefill</Heading>
          <Text color="fg.muted" mt={2}>
            Auto-fill form fields from URL query parameters. Try adding <Code>?name=Ivan&email=ivan@test.com</Code> to
            the URL.
          </Text>
        </Box>

        <PrefillForm />

        <Box>
          <Heading size="sm" mb={3}>
            Try these links
          </Heading>
          <Stack gap={2}>
            <Code p={2} display="block" fontSize="sm">
              ?name=Ivan&email=ivan@test.com
            </Code>
            <Code p={2} display="block" fontSize="sm">
              ?name=John&email=john@example.com&phone=+1234567890
            </Code>
          </Stack>
        </Box>
      </VStack>
    </ChakraProvider>
  )
}
