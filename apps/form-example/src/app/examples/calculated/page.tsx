'use client'

import { PageH1 } from '@/components/page-h1'
import { Box, Code, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'

export default function CalculatedExamplePage() {
  const [result, setResult] = useState<Record<string, unknown> | null>(null)

  return (
    <Stack gap={8}>
      <Box>
        <PageH1 size="xl" mb={2}>
          Calculated Fields
        </PageH1>
        <Text color="fg.muted">
          Declarative computed fields that auto-update when dependencies change. Replaces manual Form.Watch +
          setFieldValue for simple formulas.
        </Text>
      </Box>

      <Form
        debug
        initialValue={{ price: 250, qty: 4, discount: 15, subtotal: 0, finalPrice: 0 }}
        onSubmit={(data) => setResult(data as Record<string, unknown>)}
      >
        <Form.Field.Number name="price" label="Unit Price ($)" />
        <Form.Field.Number name="qty" label="Quantity" />
        <Form.Field.Calculated
          name="subtotal"
          label="Subtotal"
          compute={(v) => (Number(v.price) || 0) * (Number(v.qty) || 0)}
          format={(v) => `$${Number(v).toLocaleString('en-US')}`}
          deps={['price', 'qty']}
        />

        <Form.Divider label="Discount" />

        <Form.Field.Number name="discount" label="Discount (%)" />
        <Form.Field.Calculated
          name="finalPrice"
          label="Final Price"
          compute={(v) => {
            const sub = (Number(v.price) || 0) * (Number(v.qty) || 0)
            return Math.round(sub * (1 - (Number(v.discount) || 0) / 100) * 100) / 100
          }}
          format={(v) => `$${Number(v).toLocaleString('en-US')}`}
          deps={['price', 'qty', 'discount']}
        />

        <Form.Button.Submit>Place Order</Form.Button.Submit>
      </Form>

      {result && (
        <Box p={4} bg="green.subtle" borderRadius="md">
          <Text fontWeight="bold" mb={2}>
            Submitted data:
          </Text>
          <Code whiteSpace="pre-wrap">{JSON.stringify(result, null, 2)}</Code>
        </Box>
      )}
    </Stack>
  )
}
