'use client'

import { Box, ChakraProvider, Code, defaultSystem, Heading, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'

const Schema = z
  .object({
    firstName: z.string().min(1).meta({ ui: { title: 'First Name' } }),
    lastName: z.string().min(1).meta({ ui: { title: 'Last Name' } }),
    email: z.string().email().meta({ ui: { title: 'Email' } }),
    phone: z.string().min(1).meta({ ui: { title: 'Phone' } }),
    streetAddress: z.string().min(1).meta({ ui: { title: 'Street Address' } }),
    city: z.string().min(1).meta({ ui: { title: 'City' } }),
    postalCode: z.string().min(1).meta({ ui: { title: 'Postal Code' } }),
    country: z.string().min(1).meta({ ui: { title: 'Country' } }),
  })
  .strip()

export default function SmartAutofillDemoPage() {
  const [result, setResult] = useState<Record<string, unknown> | null>(null)

  return (
    <ChakraProvider value={defaultSystem}>
      <Box maxW="600px" mx="auto" py={8} px={4}>
        <Stack gap={6}>
          <Heading size="xl">Smart Autofill Demo</Heading>
          <Text color="fg.muted">
            Fields automatically get correct <Code>autocomplete</Code>{' '}
            attributes based on their names. Try browser autofill (Ctrl+Shift+A).
          </Text>

          <Form
            schema={Schema}
            initialValue={{
              firstName: '',
              lastName: '',
              email: '',
              phone: '',
              streetAddress: '',
              city: '',
              postalCode: '',
              country: '',
            }}
            onSubmit={(data) => setResult(data as Record<string, unknown>)}
          >
            <Form.Field.String name="firstName" />
            <Form.Field.String name="lastName" />
            <Form.Field.String name="email" />
            <Form.Field.Phone name="phone" />
            <Form.Field.String name="streetAddress" />
            <Form.Field.String name="city" />
            <Form.Field.String name="postalCode" />
            <Form.Field.String name="country" />
            <Form.Button.Submit>Submit</Form.Button.Submit>
          </Form>

          {result && (
            <Box p={4} bg="green.subtle" borderRadius="md">
              <Text fontWeight="bold" mb={2}>Submitted:</Text>
              <Code whiteSpace="pre-wrap">{JSON.stringify(result, null, 2)}</Code>
            </Box>
          )}
        </Stack>
      </Box>
    </ChakraProvider>
  )
}
