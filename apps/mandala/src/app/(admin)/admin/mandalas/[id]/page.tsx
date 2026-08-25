import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { getImageUrl } from '@/lib/images/create-image'
import { Badge, Box, Button, Card, DataList, Grid, Heading, HStack, Link, Stack, Text } from '@chakra-ui/react'
import NextImage from 'next/image'
import { notFound } from 'next/navigation'

export const metadata = {
  title: 'Просмотр мандалы - Админ',
}

export default async function MandalaDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return notFound()
  }

  const db = getEnhancedPrisma(session.user)
  const mandala = await db.mandala.findUnique({
    where: { id },
    include: {
      image: true,
      centerImage: true,
      watermark: true,
    },
  })

  if (!mandala) {
    return notFound()
  }

  // Трансформируем пути в URL
  const imageUrl = getImageUrl(mandala.image.path)
  const centerImageUrl = mandala.centerImage ? getImageUrl(mandala.centerImage.path) : null

  return (
    <Box>
      {/* Заголовок с действиями */}
      <HStack justify="space-between" align="center" mb={6}>
        <HStack gap={4}>
          <Heading size="lg">{mandala.name}</Heading>
          <Badge colorPalette={mandala.published ? 'green' : 'gray'} size="lg">
            {mandala.published ? 'Опубликовано' : 'Черновик'}
          </Badge>
        </HStack>
        <HStack gap={3}>
          <Button colorPalette="purple" asChild>
            <Link href={`/admin/mandalas/${mandala.id}/edit`}>Редактировать</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/admin/mandalas">← К списку</Link>
          </Button>
        </HStack>
      </HStack>

      <Grid templateColumns={{ base: '1fr', lg: '400px 1fr' }} gap={8}>
        {/* Превью изображения */}
        <Card.Root overflow="hidden">
          <Box position="relative" aspectRatio={1} bg="black">
            <NextImage
              src={imageUrl}
              alt={mandala.name}
              fill
              sizes="(max-width: 1024px) 100vw, 400px"
              style={{ objectFit: 'cover' }}
              preload
              fetchPriority="high"
            />
          </Box>
          {centerImageUrl && (
            <Card.Footer bg="blackAlpha.300" py={2}>
              <Text fontSize="sm" color="fg.muted">
                + центральный слой
              </Text>
            </Card.Footer>
          )}
        </Card.Root>

        {/* Информация */}
        <Stack gap={6}>
          {/* Основная информация */}
          <Card.Root>
            <Card.Header>
              <Heading size="md">Основная информация</Heading>
            </Card.Header>
            <Card.Body>
              <DataList.Root orientation="horizontal" divideY="1px">
                <DataList.Item pt={2} pb={2}>
                  <DataList.ItemLabel minW="140px">Slug</DataList.ItemLabel>
                  <DataList.ItemValue>
                    <Link href={`/mandalas/${mandala.slug}`} color="purple.300" target="_blank">
                      {mandala.slug}
                    </Link>
                  </DataList.ItemValue>
                </DataList.Item>

                <DataList.Item pt={2} pb={2}>
                  <DataList.ItemLabel minW="140px">Описание</DataList.ItemLabel>
                  <DataList.ItemValue color={mandala.description ? 'fg' : 'fg.muted'}>
                    {mandala.description || '—'}
                  </DataList.ItemValue>
                </DataList.Item>

                <DataList.Item pt={2} pb={2}>
                  <DataList.ItemLabel minW="140px">Эффект по умолчанию</DataList.ItemLabel>
                  <DataList.ItemValue>{mandala.defaultEffectIndex}</DataList.ItemValue>
                </DataList.Item>

                <DataList.Item pt={2} pb={2}>
                  <DataList.ItemLabel minW="140px">Порядок сортировки</DataList.ItemLabel>
                  <DataList.ItemValue>{mandala.order}</DataList.ItemValue>
                </DataList.Item>

                <DataList.Item pt={2} pb={2}>
                  <DataList.ItemLabel minW="140px">Квадратная</DataList.ItemLabel>
                  <DataList.ItemValue>
                    <Badge colorPalette={mandala.isSquare ? 'blue' : 'gray'} size="sm">
                      {mandala.isSquare ? 'Да' : 'Нет'}
                    </Badge>
                  </DataList.ItemValue>
                </DataList.Item>
              </DataList.Root>
            </Card.Body>
          </Card.Root>

          {/* SEO */}
          <Card.Root>
            <Card.Header>
              <Heading size="md">SEO</Heading>
            </Card.Header>
            <Card.Body>
              <DataList.Root orientation="horizontal" divideY="1px">
                <DataList.Item pt={2} pb={2}>
                  <DataList.ItemLabel minW="140px">Meta Title</DataList.ItemLabel>
                  <DataList.ItemValue color={mandala.metaTitle ? 'fg' : 'fg.muted'}>
                    {mandala.metaTitle || '—'}
                  </DataList.ItemValue>
                </DataList.Item>

                <DataList.Item pt={2} pb={2}>
                  <DataList.ItemLabel minW="140px">Meta Description</DataList.ItemLabel>
                  <DataList.ItemValue color={mandala.metaDescription ? 'fg' : 'fg.muted'}>
                    {mandala.metaDescription || '—'}
                  </DataList.ItemValue>
                </DataList.Item>

                <DataList.Item pt={2} pb={2}>
                  <DataList.ItemLabel minW="140px">Keywords</DataList.ItemLabel>
                  <DataList.ItemValue color={mandala.metaKeywords ? 'fg' : 'fg.muted'}>
                    {mandala.metaKeywords || '—'}
                  </DataList.ItemValue>
                </DataList.Item>
              </DataList.Root>
            </Card.Body>
          </Card.Root>

          {/* Файлы */}
          <Card.Root>
            <Card.Header>
              <Heading size="md">Файлы</Heading>
            </Card.Header>
            <Card.Body>
              <DataList.Root orientation="horizontal" divideY="1px">
                <DataList.Item pt={2} pb={2}>
                  <DataList.ItemLabel minW="140px">Изображение</DataList.ItemLabel>
                  <DataList.ItemValue>
                    <Text fontSize="sm" color="fg.muted" truncate maxW="300px">
                      {mandala.image.path}
                    </Text>
                  </DataList.ItemValue>
                </DataList.Item>

                {mandala.centerImage && (
                  <DataList.Item pt={2} pb={2}>
                    <DataList.ItemLabel minW="140px">Центр</DataList.ItemLabel>
                    <DataList.ItemValue>
                      <Text fontSize="sm" color="fg.muted" truncate maxW="300px">
                        {mandala.centerImage.path}
                      </Text>
                    </DataList.ItemValue>
                  </DataList.Item>
                )}

                {mandala.watermark && (
                  <DataList.Item pt={2} pb={2}>
                    <DataList.ItemLabel minW="140px">Watermark</DataList.ItemLabel>
                    <DataList.ItemValue>
                      <Text fontSize="sm" color="fg.muted" truncate maxW="300px">
                        {mandala.watermark.path}
                      </Text>
                    </DataList.ItemValue>
                  </DataList.Item>
                )}
              </DataList.Root>
            </Card.Body>
          </Card.Root>

          {/* Даты */}
          <Card.Root>
            <Card.Header>
              <Heading size="md">Системная информация</Heading>
            </Card.Header>
            <Card.Body>
              <DataList.Root orientation="horizontal" divideY="1px">
                <DataList.Item pt={2} pb={2}>
                  <DataList.ItemLabel minW="140px">ID</DataList.ItemLabel>
                  <DataList.ItemValue>
                    <Text fontSize="sm" fontFamily="mono" color="fg.muted">
                      {mandala.id}
                    </Text>
                  </DataList.ItemValue>
                </DataList.Item>

                <DataList.Item pt={2} pb={2}>
                  <DataList.ItemLabel minW="140px">Создано</DataList.ItemLabel>
                  <DataList.ItemValue>{new Date(mandala.createdAt).toLocaleString('ru-RU')}</DataList.ItemValue>
                </DataList.Item>

                <DataList.Item pt={2} pb={2}>
                  <DataList.ItemLabel minW="140px">Обновлено</DataList.ItemLabel>
                  <DataList.ItemValue>{new Date(mandala.updatedAt).toLocaleString('ru-RU')}</DataList.ItemValue>
                </DataList.Item>
              </DataList.Root>
            </Card.Body>
          </Card.Root>
        </Stack>
      </Grid>
    </Box>
  )
}
