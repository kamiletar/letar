'use client'

import { Box, ChakraProvider, Code, defaultSystem, Heading, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'

const ItemSchema = z.object({
  product: z
    .string()
    .min(1)
    .meta({ ui: { title: 'Product' } }),
  qty: z
    .number()
    .min(1)
    .meta({ ui: { title: 'Qty' } }),
  price: z
    .number()
    .min(0)
    .meta({ ui: { title: 'Price' } }),
})

const OrderSchema = z
  .object({
    customer: z
      .string()
      .min(1)
      .meta({ ui: { title: 'Customer' } }),
    items: z.array(ItemSchema).min(1),
  })
  .strip()

export default function TableEditorDemoPage() {
  const [result, setResult] = useState<Record<string, unknown> | null>(null)

  return (
    <ChakraProvider value={defaultSystem}>
      <Box maxW="900px" mx="auto" py={8} px={4}>
        <Stack gap={6}>
          <Heading size="xl">TableEditor Demo</Heading>
          <Text color="fg.muted">
            Inline-editable table with Excel paste, computed columns, and footer aggregations.
          </Text>

          <Form
            schema={OrderSchema}
            initialValue={{
              customer: '',
              items: [
                { product: 'Laptop', qty: 2, price: 999 },
                { product: 'Mouse', qty: 5, price: 29 },
              ],
            }}
            onSubmit={(data) => setResult(data as Record<string, unknown>)}
          >
            <Form.Field.String name="customer" />
            <Form.Field.TableEditor
              name="items"
              columns={[
                { name: 'product', width: '40%' },
                { name: 'qty', width: '15%', align: 'right' },
                { name: 'price', width: '15%', align: 'right' },
                {
                  name: 'total',
                  computed: (row: Record<string, unknown>) => (Number(row.qty) || 0) * (Number(row.price) || 0),
                  label: 'Total',
                },
              ]}
              footer={[{ column: 'total', aggregate: 'sum', label: 'Total:' }]}
              addLabel="Add item"
              sortable
            />
            <Form.Button.Submit>Place Order</Form.Button.Submit>
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
