import { prismaAuth } from '@/lib/prisma'
import { Box, Heading, HStack, Stack, Tabs, Text } from '@chakra-ui/react'
import { notFound } from 'next/navigation'
import { ProductForm } from '../_components/product-form'
import { ProductActions } from './_components/product-actions'
import { ProductImageManager } from './_components/product-image-manager'

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const product = await prismaAuth.product.findUnique({
    where: { id },
    include: {
      images: {
        orderBy: { sortOrder: 'asc' },
        include: { image: true },
      },
    },
  })

  if (!product) notFound()

  return (
    <Stack gap={6}>
      <HStack justify="space-between" wrap="wrap" gap={4}>
        <Box>
          <Heading as="h1" size="2xl">
            {product.name}
          </Heading>
          <Text color="fg.muted" fontFamily="mono" fontSize="sm">
            /{product.slug}
          </Text>
        </Box>
        <ProductActions
          productId={product.id}
          published={product.published}
          deleted={!!product.deletedAt}
        />
      </HStack>

      <Tabs.Root defaultValue="info" variant="line">
        <Tabs.List>
          <Tabs.Trigger value="info">Описание</Tabs.Trigger>
          <Tabs.Trigger value="images">
            Галерея ({product.images.length})
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="info" pt={6}>
          <Box maxW="3xl">
            <ProductForm
              mode="edit"
              productId={product.id}
              defaults={{
                name: product.name,
                slug: product.slug,
                description: product.description ?? undefined,
                pricePerMeter: product.pricePerMeter,
                minLengthMeters: Number(product.minLengthMeters),
                affirmations: product.affirmations,
                published: product.published,
              }}
            />
          </Box>
        </Tabs.Content>

        <Tabs.Content value="images" pt={6}>
          <ProductImageManager
            productId={product.id}
            images={product.images.map((pi) => ({
              productImageId: pi.id,
              imageId: pi.image.id,
              path: pi.image.path,
              alt: pi.image.alt ?? product.name,
              sortOrder: pi.sortOrder,
            }))}
          />
        </Tabs.Content>
      </Tabs.Root>
    </Stack>
  )
}
