import { requireSeller } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Heading, VStack } from '@chakra-ui/react'
import { ProductForm } from '../../../admin/products/_components/product-form'
import { createSellerProduct } from './_actions/create-seller-product'

/**
 * Страница создания нового товара для продавца.
 */
export default async function SellerNewProductPage() {
  const user = await requireSeller()
  const db = getEnhancedPrisma(user)

  const categories = await db.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <VStack gap={6} align="stretch">
      <Heading size="xl">Новый товар</Heading>
      <ProductForm action={createSellerProduct} categories={categories} submitLabel="Создать товар" />
    </VStack>
  )
}
