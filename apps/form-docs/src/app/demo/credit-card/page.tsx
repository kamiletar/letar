'use client'

import { Box, ChakraProvider, Code, defaultSystem, Heading, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'

const Schema = z
  .object({
    cardholderName: z.string().min(1).meta({ ui: { title: 'Cardholder Name' } }),
    card: z.object({
      number: z.string(),
      expiry: z.string(),
      cvc: z.string(),
      brand: z.string().optional(),
    }),
  })
  .strip()

export default function CreditCardDemoPage() {
  const [result, setResult] = useState<Record<string, unknown> | null>(null)

  return (
    <ChakraProvider value={defaultSystem}>
      <Box maxW="500px" mx="auto" py={8} px={4}>
        <Stack gap={6}>
          <Heading size="xl">Credit Card Demo</Heading>
          <Text color="fg.muted">Card input with brand detection, expiry validation, and CVC.</Text>

          <Form
            schema={Schema}
            initialValue={{ cardholderName: '', card: { number: '', expiry: '', cvc: '', brand: '' } }}
            onSubmit={(data) => setResult(data as Record<string, unknown>)}
          >
            <Form.Field.String name="cardholderName" />
            <Form.Field.CreditCard name="card" label="Card Details" />
            <Form.Button.Submit>Pay</Form.Button.Submit>
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
