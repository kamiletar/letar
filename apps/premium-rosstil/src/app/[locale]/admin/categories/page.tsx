import { requireAdmin } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Button, Container, Heading, Link, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { SortableCategoriesTable } from './_components/sortable-categories-table'

// Тип категории с подсчётом товаров
type CategoryWithCount = {
  id: string
  name: string
  slug: string
  sortOrder: number
  _count: {
    products: number
  }
}

export default async function AdminCategoriesPage() {
  const user = await requireAdmin()
  const db = getEnhancedPrisma(user)

  // Получаем все категории с подсчётом товаров
  const categories = (await db.category.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: {
        select: {
          products: true,
        },
      },
    },
  })) as unknown as CategoryWithCount[]

  return (
    <Container maxW="6xl" py={8}>
      <VStack gap={8} align="stretch">
        <Box>
          <Link asChild color="fg.muted" fontSize="sm" mb={2}>
            <NextLink href="/admin">← Вернуться к панели администратора</NextLink>
          </Link>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Heading size="2xl" textTransform="none">
              Категории
            </Heading>
            <Button asChild colorPalette="fg">
              <NextLink href="/admin/categories/new">Создать</NextLink>
            </Button>
          </Box>
          <Text color="fg.muted">
            Управление категориями товаров. Перетаскивайте строки для изменения порядка отображения.
          </Text>
        </Box>

        {categories.length > 0 ? (
          <SortableCategoriesTable categories={categories} />
        ) : (
          <Box textAlign="center" py={8}>
            <Text color="fg.muted" mb={4}>
              Нет категорий для отображения
            </Text>
            <Button asChild colorPalette="fg">
              <NextLink href="/admin/categories/new">Создать первую категорию</NextLink>
            </Button>
          </Box>
        )}
      </VStack>
    </Container>
  )
}
