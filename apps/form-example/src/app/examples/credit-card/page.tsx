'use client'

import { Code, Heading, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'

export default function CreditCardExamplePage() {
  const [result, setResult] = useState<string | null>(null)

  return (
    <Stack gap={8} maxW="lg">
      <Stack gap={2}>
        <Heading size="xl">Credit Card</Heading>
        <Text color="fg.muted">
          Card number with brand detection (Visa, MasterCard, Mir, etc.), expiry date, and CVC input.
        </Text>
      </Stack>

      <Form
        initialValue={{ card: { number: '', expiry: '', cvc: '' } }}
        onSubmit={(data) => setResult(JSON.stringify(data, null, 2))}
      >
        <Form.Field.CreditCard name="card" label="Payment Card" layout="inline" />
        <Form.Button.Submit>Pay</Form.Button.Submit>
      </Form>

      {result && (
        <Code p={4} borderRadius="md" display="block" whiteSpace="pre" overflow="auto" fontSize="sm">
          {result}
        </Code>
      )}
    </Stack>
  )
}
