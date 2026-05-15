export const dynamic = 'force-dynamic'

import { deleteProduct } from '@/app/_actions/product.action'
import { db } from '@/lib/db'
import { Badge, Button, Card, Heading, HStack, Stack, Text } from '@chakra-ui/react'
import NextLink from 'next/link'
import { DeleteButton } from './_components/delete-button'

export default async function ProductsPage() {
  const products = await db.product.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return (
    <Stack gap={6}>
      <HStack justify="space-between">
        <div>
          <Heading size="lg">Products</Heading>
          <Text color="fg.muted">Full CRUD with PostgreSQL database</Text>
        </div>
        <Button asChild colorPalette="brand">
          <NextLink href="/products/new">+ New Product</NextLink>
        </Button>
      </HStack>

      {products.length === 0 ? (
        <Card.Root>
          <Card.Body>
            <Text color="fg.muted" textAlign="center" py={8}>
              No products yet. Create your first one!
            </Text>
          </Card.Body>
        </Card.Root>
      ) : (
        <Stack gap={3}>
          {products.map(
            (product: {
              id: string
              name: string
              status: string
              description: string | null
              price: number
              tags: string[]
              createdAt: Date
            }) => (
              <Card.Root key={product.id} variant="outline">
                <Card.Body>
                  <HStack justify="space-between" align="start">
                    <Stack gap={1}>
                      <HStack>
                        <Heading size="sm">{product.name}</Heading>
                        <Badge
                          colorPalette={
                            product.status === 'ACTIVE' ? 'green' : product.status === 'DRAFT' ? 'gray' : 'red'
                          }
                        >
                          {product.status}
                        </Badge>
                      </HStack>
                      {product.description && (
                        <Text fontSize="sm" color="fg.muted">
                          {product.description}
                        </Text>
                      )}
                      <HStack gap={4} fontSize="sm">
                        <Text fontWeight="medium">${product.price.toFixed(2)}</Text>
                        {product.tags.length > 0 && <Text color="fg.muted">{product.tags.join(', ')}</Text>}
                      </HStack>
                    </Stack>
                    <HStack>
                      <Button asChild size="sm" variant="outline">
                        <NextLink href={`/products/${product.id}/edit`}>Edit</NextLink>
                      </Button>
                      <DeleteButton id={product.id} deleteAction={deleteProduct} />
                    </HStack>
                  </HStack>
                </Card.Body>
              </Card.Root>
            )
          )}
        </Stack>
      )}
    </Stack>
  )
}
