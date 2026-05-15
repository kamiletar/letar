import { requireAdmin } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Container, Heading, Link, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { notFound } from 'next/navigation'
import { updateCategory } from '../../_actions/update-category'
import { CategoryForm } from '../../_components/category-form'

interface EditCategoryPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditCategoryPage({ params }: EditCategoryPageProps) {
  const { id } = await params
  const user = await requireAdmin()
  const db = getEnhancedPrisma(user)

  const category = await db.category.findUnique({
    where: { id },
  })

  if (!category) {
    notFound()
  }

  // Создаём bound action с categoryId
  const updateCategoryWithId = updateCategory.bind(null, id)

  return (
    <Container maxW="4xl" py={8}>
      <VStack gap={8} align="stretch">
        <Box>
          <Link asChild color="fg.muted" fontSize="sm" mb={2}>
            <NextLink href="/admin/categories">← Вернуться к категориям</NextLink>
          </Link>
          <Heading size="2xl" textTransform="none">
            Редактирование категории
          </Heading>
        </Box>

        <CategoryForm
          action={updateCategoryWithId}
          defaultValue={{
            name: category.name,
            slug: category.slug,
            sortOrder: category.sortOrder,
          }}
          submitLabel="Сохранить"
        />
      </VStack>
    </Container>
  )
}
