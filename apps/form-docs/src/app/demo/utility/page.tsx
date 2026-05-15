'use client'

import { Box, ChakraProvider, Code, defaultSystem, Heading, HStack, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'

const Schema = z
  .object({
    firstName: z
      .string()
      .min(1)
      .meta({ ui: { title: 'First Name' } }),
    lastName: z
      .string()
      .min(1)
      .meta({ ui: { title: 'Last Name' } }),
    email: z
      .string()
      .email()
      .meta({ ui: { title: 'Email' } }),
    phone: z
      .string()
      .optional()
      .meta({ ui: { title: 'Phone' } }),
    type: z.enum(['individual', 'company']).meta({
      ui: {
        title: 'Client Type',
        options: [
          { value: 'individual', label: 'Individual' },
          { value: 'company', label: 'Company' },
        ],
      },
    }),
    companyName: z
      .string()
      .optional()
      .meta({ ui: { title: 'Company Name' } }),
    utm_source: z.string().optional(),
    referralCode: z.string().optional(),
  })
  .strip()

export default function UtilityDemoPage() {
  const [submitted, setSubmitted] = useState<Record<string, unknown> | null>(null)

  return (
    <ChakraProvider value={defaultSystem}>
      <Box maxW="600px" mx="auto" py={8} px={4}>
        <Stack gap={6}>
          <Heading size="xl">Utility Components</Heading>
          <Text color="fg.muted">Form.InfoBlock, Form.Divider, Form.Field.Hidden</Text>

          <Form
            debug
            schema={Schema}
            initialValue={{
              firstName: '',
              lastName: '',
              email: '',
              phone: '',
              type: 'individual' as const,
              companyName: '',
              utm_source: '',
              referralCode: '',
            }}
            onSubmit={(data) => setSubmitted(data as Record<string, unknown>)}
          >
            <Form.InfoBlock variant="info" title="Registration">
              Fill all required fields to continue.
            </Form.InfoBlock>

            <Form.Divider label="Personal Details" />
            <HStack gap={4}>
              <Form.Field.String name="firstName" />
              <Form.Field.String name="lastName" />
            </HStack>

            <Form.Divider label="Contact" />
            <Form.Field.String name="email" />
            <Form.Field.String name="phone" />

            <Form.Divider />

            <Form.Field.Select name="type" />

            <Form.When field="type" is="company">
              <Form.InfoBlock variant="warning">Company registration requires additional documents.</Form.InfoBlock>
              <Form.Field.String name="companyName" />
            </Form.When>

            <Form.InfoBlock variant="tip" title="Tip">
              Use your corporate email for faster verification.
            </Form.InfoBlock>

            <Form.Field.Hidden name="utm_source" value="docs-demo" />
            <Form.Field.Hidden name="referralCode" value="DEMO2026" />

            <Form.Button.Submit>Submit</Form.Button.Submit>
          </Form>

          {submitted && (
            <Box p={4} bg="green.subtle" borderRadius="md">
              <Heading size="sm" mb={2}>
                Submitted (includes hidden fields):
              </Heading>
              <Code whiteSpace="pre" display="block">
                {JSON.stringify(submitted, null, 2)}
              </Code>
            </Box>
          )}
        </Stack>
      </Box>
    </ChakraProvider>
  )
}
