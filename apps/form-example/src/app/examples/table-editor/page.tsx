'use client'

import { PageH1 } from '@/components/page-h1'
import { Code, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'

export default function TableEditorExamplePage() {
  const [result, setResult] = useState<string | null>(null)

  return (
    <Stack gap={8} maxW="4xl">
      <Stack gap={2}>
        <PageH1 size="xl">Table Editor</PageH1>
        <Text color="fg.muted">
          Inline editable table for array fields. Click cells to edit, Tab/Enter to navigate. Supports computed columns,
          footer aggregates, and paste from Excel.
        </Text>
      </Stack>

      <Form
        initialValue={{
          items: [
            { product: 'Laptop', qty: 1, price: 1200 },
            { product: 'Mouse', qty: 2, price: 25 },
            { product: 'Keyboard', qty: 1, price: 75 },
          ],
        }}
        onSubmit={(data) => setResult(JSON.stringify(data, null, 2))}
      >
        <Form.Field.TableEditor
          name="items"
          label="Order Items"
          columns={[
            { name: 'product', label: 'Product', width: '40%' },
            { name: 'qty', label: 'Qty', width: '15%', align: 'right' },
            { name: 'price', label: 'Price', width: '15%', align: 'right' },
            {
              name: 'total',
              label: 'Total',
              width: '15%',
              align: 'right',
              computed: (row) => (Number(row.qty) || 0) * (Number(row.price) || 0),
              format: (v) => `$${Number(v).toFixed(2)}`,
            },
          ]}
          addLabel="Add item"
          selectable
          footer={[{ column: 'total', aggregate: 'sum', label: 'Grand Total:', format: (v) => `$${v.toFixed(2)}` }]}
          helperText="Tip: paste tab-separated data from Excel (Ctrl+V)"
        />
        <Form.Button.Submit>Place Order</Form.Button.Submit>
      </Form>

      {result && (
        <Code p={4} borderRadius="md" display="block" whiteSpace="pre" overflow="auto" fontSize="sm">
          {result}
        </Code>
      )}
    </Stack>
  )
}
