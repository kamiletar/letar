'use client'

import { Box, ChakraProvider, Code, defaultSystem, Heading, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'

export default function CalculatedDemoPage() {
  const [result, setResult] = useState<Record<string, unknown> | null>(null)

  return (
    <ChakraProvider value={defaultSystem}>
      <Box maxW="600px" mx="auto" py={8} px={4}>
        <Stack gap={6}>
          <Heading size="xl">Calculated Fields</Heading>
          <Text color="fg.muted">Auto-computed fields that update when dependent values change.</Text>

          <Form
            debug
            initialValue={{ price: 1500, qty: 3, discount: 10, total: 0, finalPrice: 0 }}
            onSubmit={(data) => setResult(data as Record<string, unknown>)}
          >
            <Form.Field.Number name="price" label="Unit Price" />
            <Form.Field.Number name="qty" label="Quantity" />
            <Form.Field.Calculated
              name="total"
              label="Subtotal"
              compute={(v) => (Number(v.price) || 0) * (Number(v.qty) || 0)}
              format={(v) => `${Number(v).toLocaleString('en-US')} $`}
              deps={['price', 'qty']}
            />
            <Form.Field.Number name="discount" label="Discount (%)" />
            <Form.Field.Calculated
              name="finalPrice"
              label="Final Price"
              compute={(v) => {
                const sub = (Number(v.price) || 0) * (Number(v.qty) || 0)
                return sub * (1 - (Number(v.discount) || 0) / 100)
              }}
              format={(v) => `${Number(v).toLocaleString('en-US')} $`}
              deps={['price', 'qty', 'discount']}
            />
            <Form.Button.Submit>Submit Order</Form.Button.Submit>
          </Form>

          {result && (
            <Box p={4} bg="green.subtle" borderRadius="md">
              <Text fontWeight="bold" mb={2}>
                Submitted:
              </Text>
              <Code whiteSpace="pre-wrap">{JSON.stringify(result, null, 2)}</Code>
            </Box>
          )}
        </Stack>
      </Box>
    </ChakraProvider>
  )
}
