'use client'

import { PageH1 } from '@/components/page-h1'
import { Code, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'

const sampleData = Array.from({ length: 50 }, (_, i) => ({
  product: `Product ${i + 1}`,
  category: ['Electronics', 'Clothing', 'Food', 'Books'][i % 4],
  price: Math.floor(Math.random() * 1000) + 10,
  stock: Math.floor(Math.random() * 500),
}))

export default function DataGridExamplePage() {
  const [result, setResult] = useState<string | null>(null)

  return (
    <Stack gap={8} maxW="4xl">
      <Stack gap={2}>
        <PageH1 size="xl">Data Grid</PageH1>
        <Text color="fg.muted">
          Editable data grid with sorting, filtering, pagination, and inline editing. Powered by TanStack Table.
        </Text>
      </Stack>

      <Form initialValue={{ products: sampleData }} onSubmit={(data) => setResult(JSON.stringify(data, null, 2))}>
        <Form.Field.DataGrid
          name="products"
          label="Products"
          columns={[
            { name: 'product', label: 'Product', editable: true, filter: 'text' },
            { name: 'category', label: 'Category', editable: true, filter: 'text' },
            { name: 'price', label: 'Price', editable: true, align: 'right' },
            { name: 'stock', label: 'Stock', editable: true, align: 'right' },
          ]}
          pageSize={10}
          rowSelection
        />
        <Form.Button.Submit>Save Changes</Form.Button.Submit>
      </Form>

      {result && (
        <Code p={4} borderRadius="md" display="block" whiteSpace="pre" overflow="auto" fontSize="sm" maxH="300px">
          {result}
        </Code>
      )}
    </Stack>
  )
}
