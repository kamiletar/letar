'use client'

import { updateProduct } from '@/app/_actions/product.action'
import { ProductCreateFormSchema } from '@/generated/form-schemas'
import { Heading, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'

type Product = {
  id: string
  name: string
  description: string | null
  price: number
  status: string
  tags: string[]
  rating: number
}

export function EditProductForm({ product }: { product: Product }) {
  return (
    <Stack gap={6}>
      <div>
        <Heading size="lg">Edit Product</Heading>
        <Text color="fg.muted">Update product data — changes are saved to PostgreSQL.</Text>
      </div>

      <Form.FromSchema
        schema={ProductCreateFormSchema}
        initialValue={{
          name: product.name,
          description: product.description ?? '',
          price: product.price,
          status: product.status as 'ACTIVE' | 'ARCHIVED' | 'DRAFT',
          tags: product.tags,
          rating: product.rating,
        }}
        onSubmit={async (data) => {
          await updateProduct(product.id, data as Parameters<typeof updateProduct>[1])
        }}
        submitLabel="Save Changes"
        debug
      />
    </Stack>
  )
}
