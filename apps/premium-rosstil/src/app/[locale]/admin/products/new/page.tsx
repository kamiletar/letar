import { requireAdmin } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Container, Heading, Link } from '@chakra-ui/react'
import NextLink from 'next/link'
import { ProductForm } from '../_components/product-form'
import { createProduct } from './_actions/create-product'

export default async function NewProductPage() {
  const user = await requireAdmin()
  const db = getEnhancedPrisma(user)

  // Получаем все категории для выбора
  const categories = await db.category.findMany({
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true },
  })

  return (
    <Container maxW="2xl" py={8}>
      <Box mb={8}>
        <Link asChild color="fg.muted" fontSize="sm" mb={2}>
          <NextLink href="/admin/products">← Вернуться к списку продуктов</NextLink>
        </Link>
        <Heading size="2xl" textTransform="none">
          Создать новый продукт
        </Heading>
      </Box>

      <ProductForm action={createProduct} submitLabel="Создать продукт" categories={categories} />
    </Container>
  )
}
