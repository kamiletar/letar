export const dynamic = 'force-dynamic'

import { createItemListSchema, JsonLd, SITE_URL } from '@/app/_components/json-ld'
import { MandalaGrid } from '@/app/_components/mandala-grid'
import { getEnhancedPrisma } from '@/lib/db'
import { getImageUrl } from '@/lib/images/create-image'
import { Box, Container, Heading } from '@chakra-ui/react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Галерея мандал',
  description: 'Коллекция мандал и точечной росписи художницы Эльфафеи',
  alternates: {
    canonical: '/mandalas',
  },
}

export default async function MandalasPage() {
  const db = getEnhancedPrisma()
  // Оптимизация: загружаем только нужные поля для галереи
  const mandalas = await db.mandala.findMany({
    where: { published: true },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      slug: true,
      name: true,
      image: { select: { path: true } },
    },
  })

  // Трансформируем данные для клиентского компонента (Next.js Image генерирует миниатюры автоматически)
  const mandalasWithUrls = mandalas.map((m) => ({
    id: m.id,
    slug: m.slug,
    name: m.name,
    imageUrl: getImageUrl(m.image.path),
  }))

  // JSON-LD ItemList для улучшения индексации коллекции
  const itemListSchema = createItemListSchema(
    'Галерея мандал Elfafeya Art',
    mandalas.map((m) => ({
      url: `${SITE_URL}/mandalas/${m.slug}`,
      name: m.name,
    }))
  )

  return (
    <>
      <JsonLd data={itemListSchema} />
      <Container maxW="container.xl" py={8}>
        <Box textAlign="center" mb={8}>
          <Heading as="h1" size="2xl" color="fg" mb={2}>
            Галерея мандал
          </Heading>
        </Box>

        <MandalaGrid mandalas={mandalasWithUrls} />
      </Container>
    </>
  )
}
