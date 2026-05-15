import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Badge, Box, Heading, Link, Stack, Text } from '@chakra-ui/react'
import { notFound } from 'next/navigation'

export const metadata = {
  title: 'Просмотр страницы - Админ',
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function ContentPageViewPage({ params }: Props) {
  const { id } = await params
  const session = await getSession()

  if (!session?.user || session.user.role !== 'ADMIN') {
    return notFound()
  }

  const db = getEnhancedPrisma(session.user)
  const page = await db.contentPage.findUnique({
    where: { id },
  })

  if (!page) {
    return notFound()
  }

  return (
    <Box>
      <Stack direction="row" justify="space-between" align="center" mb={6}>
        <Heading size="lg">{page.title}</Heading>
        <Stack direction="row" gap={4}>
          <Link href={`/admin/content-pages/${page.id}/edit`} color="fg" _hover={{ color: 'fg.brand' }}>
            Редактировать
          </Link>
          <Link href="/admin/content-pages" color="fg.muted" _hover={{ color: 'fg.brand' }}>
            ← К списку
          </Link>
        </Stack>
      </Stack>

      <Stack gap={6}>
        {/* Статус */}
        <Badge colorPalette={page.published ? 'green' : 'gray'} w="fit-content">
          {page.published ? 'Опубликован' : 'Скрыт'}
        </Badge>

        {/* Основная информация */}
        <Box>
          <Text fontWeight="bold" color="fg.muted">
            Slug
          </Text>
          <Link href={`/${page.slug}`} target="_blank" color="fg" _hover={{ color: 'fg.brand' }}>
            /{page.slug} ↗
          </Link>
        </Box>

        {/* Контент (превью) */}
        <Box>
          <Text fontWeight="bold" color="fg.muted" mb={2}>
            Контент (превью)
          </Text>
          <Box
            p={4}
            bg={{ _light: 'blackAlpha.50', _dark: 'whiteAlpha.50' }}
            borderRadius="md"
            maxH="400px"
            overflow="auto"
            fontFamily="mono"
            fontSize="sm"
            whiteSpace="pre-wrap"
          >
            {page.content.slice(0, 2000)}
            {page.content.length > 2000 && '...'}
          </Box>
          <Text fontSize="sm" color="fg.muted" mt={1}>
            {page.content.length} символов
          </Text>
        </Box>

        {/* SEO */}
        {(page.metaTitle || page.metaDescription) && (
          <Box>
            <Text fontWeight="bold" color="fg.muted" mb={2}>
              SEO
            </Text>
            {page.metaTitle && (
              <Text fontSize="sm">
                <strong>Title:</strong> {page.metaTitle}
              </Text>
            )}
            {page.metaDescription && (
              <Text fontSize="sm">
                <strong>Description:</strong> {page.metaDescription}
              </Text>
            )}
          </Box>
        )}

        {/* Мета */}
        <Box>
          <Text fontSize="sm" color="fg.muted">
            Создана: {new Date(page.createdAt).toLocaleString('ru-RU')}
          </Text>
          <Text fontSize="sm" color="fg.muted">
            Обновлена: {new Date(page.updatedAt).toLocaleString('ru-RU')}
          </Text>
        </Box>
      </Stack>
    </Box>
  )
}
