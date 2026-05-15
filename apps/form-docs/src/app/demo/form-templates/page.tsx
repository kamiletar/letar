'use client'

import { Box, ChakraProvider, defaultSystem, Heading, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { z } from 'zod/v4'

const ContactSchema = z.object({
  name: z
    .string()
    .min(2)
    .meta({ ui: { title: 'Name', placeholder: 'Your name' } }),
  email: z
    .string()
    .email()
    .meta({ ui: { title: 'Email', placeholder: 'email@example.com' } }),
  phone: z
    .string()
    .optional()
    .meta({ ui: { title: 'Phone', placeholder: '+7 (999) 000-00-00' } }),
  message: z
    .string()
    .min(10)
    .meta({ ui: { title: 'Message', placeholder: 'Your message...' } }),
})

export default function FormTemplatesDemoPage() {
  return (
    <ChakraProvider value={defaultSystem}>
      <VStack gap={8} align="stretch" maxW="600px" mx="auto" py={8}>
        <Box>
          <Heading size="lg">Form Templates</Heading>
          <Text color="fg.muted" mt={2}>
            Auto-generated forms from schema using FromSchema and FromTemplate.
          </Text>
        </Box>

        <Box>
          <Heading size="sm" mb={3}>
            FromSchema — auto-generated form
          </Heading>
          <Form.FromSchema
            schema={ContactSchema}
            initialValue={{ name: '', email: '', phone: '', message: '' }}
            onSubmit={async () => {
              /* noop */
            }}
            submitLabel="Send"
          />
        </Box>
      </VStack>
    </ChakraProvider>
  )
}
