import { requireAdmin } from '@/lib/auth'
import { Box, Container, Heading, Link, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { createCategory } from '../_actions/create-category'
import { CategoryForm } from '../_components/category-form'

export default async function NewCategoryPage() {
  await requireAdmin()

  return (
    <Container maxW="4xl" py={8}>
      <VStack gap={8} align="stretch">
        <Box>
          <Link asChild color="fg.muted" fontSize="sm" mb={2}>
            <NextLink href="/admin/categories">← Вернуться к категориям</NextLink>
          </Link>
          <Heading size="2xl" textTransform="none">
            Новая категория
          </Heading>
        </Box>

        <CategoryForm action={createCategory} defaultValue={{ name: '', slug: '', sortOrder: 0 }} />
      </VStack>
    </Container>
  )
}
