import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { getImageUrl } from '@/lib/images/create-image'
import { Badge, Box, Heading, Link, Stack, Text } from '@chakra-ui/react'
import Image from 'next/image'
import { notFound } from 'next/navigation'

export const metadata = {
  title: 'Просмотр товара - Админ',
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProductViewPage({ params }: Props) {
  const { id } = await params
  const session = await getSession()

  if (!session?.user || session.user.role !== 'ADMIN') {
    return notFound()
  }

  const db = getEnhancedPrisma(session.user)
  const product = await db.product.findUnique({
    where: { id },
    include: {
      images: {
        include: { image: true },
        orderBy: { order: 'asc' },
      },
      ogImageRel: true,
    },
  })

  if (!product) {
    return notFound()
  }

  // Трансформируем изображения с URL
  const imagesWithUrls = product.images.map((img) => ({
    id: img.id,
    url: getImageUrl(img.image.path),
    alt: img.alt,
  }))

  return (
    <Box>
      <Stack direction="row" justify="space-between" align="center" mb={6}>
        <Heading size="lg">{product.name}</Heading>
        <Stack direction="row" gap={4}>
          <Link href={`/admin/products/${product.id}/edit`} color="fg" _hover={{ color: 'fg.brand' }}>
            Редактировать
          </Link>
          <Link href="/admin/products" color="fg.muted" _hover={{ color: 'fg.brand' }}>
            ← К списку
          </Link>
        </Stack>
      </Stack>

      <Stack gap={6}>
        {/* Статус */}
        <Stack direction="row" gap={2}>
          <Badge colorPalette={product.published ? 'green' : 'gray'}>
            {product.published ? 'Опубликован' : 'Скрыт'}
          </Badge>
          <Badge colorPalette={product.inStock ? 'blue' : 'red'}>{product.inStock ? 'В наличии' : 'Нет'}</Badge>
        </Stack>

        {/* Основная информация */}
        <Box>
          <Text fontWeight="bold" color="fg.muted">
            Slug
          </Text>
          <Text>{product.slug}</Text>
        </Box>

        <Box>
          <Text fontWeight="bold" color="fg.muted">
            Цена
          </Text>
          <Text fontSize="xl" fontWeight="bold" color="fg">
            {product.price} {product.currency}
          </Text>
        </Box>

        <Box>
          <Text fontWeight="bold" color="fg.muted">
            Описание
          </Text>
          <Text whiteSpace="pre-wrap">{product.description}</Text>
        </Box>

        {/* Изображения */}
        {imagesWithUrls.length > 0 && (
          <Box>
            <Text fontWeight="bold" color="fg.muted" mb={2}>
              Изображения ({imagesWithUrls.length})
            </Text>
            <Stack direction="row" gap={4} flexWrap="wrap">
              {imagesWithUrls.map((img) => (
                <Box
                  key={img.id}
                  position="relative"
                  width="150px"
                  height="150px"
                  borderRadius="md"
                  overflow="hidden"
                  borderWidth="1px"
                  borderColor="border.subtle"
                >
                  <Image src={img.url} alt={img.alt || product.name} fill style={{ objectFit: 'cover' }} />
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        {/* SEO */}
        {(product.metaTitle || product.metaDescription) && (
          <Box>
            <Text fontWeight="bold" color="fg.muted" mb={2}>
              SEO
            </Text>
            {product.metaTitle && (
              <Text fontSize="sm">
                <strong>Title:</strong> {product.metaTitle}
              </Text>
            )}
            {product.metaDescription && (
              <Text fontSize="sm">
                <strong>Description:</strong> {product.metaDescription}
              </Text>
            )}
          </Box>
        )}

        {/* Мета */}
        <Box>
          <Text fontSize="sm" color="fg.muted">
            Создан: {new Date(product.createdAt).toLocaleString('ru-RU')}
          </Text>
          <Text fontSize="sm" color="fg.muted">
            Обновлён: {new Date(product.updatedAt).toLocaleString('ru-RU')}
          </Text>
        </Box>
      </Stack>
    </Box>
  )
}
