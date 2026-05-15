import { requireSeller } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Heading, Text, VStack } from '@chakra-ui/react'
import { notFound } from 'next/navigation'
import { ProductForm } from '../../../../admin/products/_components/product-form'
import { updateSellerProduct } from './_actions/update-seller-product'

/**
 * Страница редактирования товара продавца.
 * ZenStack policies проверят что товар принадлежит текущему продавцу.
 */
export default async function SellerEditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSeller()
  const db = getEnhancedPrisma(user)
  const { id } = await params

  const [product, categories] = await Promise.all([
    db.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        gender: true,
        categoryId: true,
      },
    }),
    db.category.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  if (!product) {
    notFound()
  }

  // Биндим id к action
  const action = updateSellerProduct.bind(null, product.id)

  return (
    <VStack gap={6} align="stretch">
      <Box>
        <Heading size="xl">Редактирование товара</Heading>
        <Text color="fg.muted">{product.name}</Text>
      </Box>
      <ProductForm
        action={action}
        defaultValue={{
          name: product.name,
          description: product.description ?? '',
          gender: product.gender,
          categoryId: product.categoryId ?? '',
        }}
        categories={categories}
        submitLabel="Сохранить"
      />
    </VStack>
  )
}
