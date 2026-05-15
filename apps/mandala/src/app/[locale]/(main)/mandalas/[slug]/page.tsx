import { createBreadcrumbSchema, createImageObjectSchema, JsonLd, SITE_URL } from '@/app/_components/json-ld'
import { getEnhancedPrisma } from '@/lib/db'
import { getImageUrl } from '@/lib/images/create-image'
import { Center, Container, Spinner } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { MandalaViewer } from './_components/mandala-viewer'

// Страница использует headers() через auth - принудительно динамическая
export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string; locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params
  const t = await getTranslations({ locale, namespace: 'notFound' })

  const db = getEnhancedPrisma()
  const mandala = await db.mandala.findUnique({
    where: { slug },
    include: {
      image: true,
      ogImage: true,
    },
  })

  if (!mandala) {
    return {
      title: t('title'),
    }
  }

  // Логика выбора OG-image:
  // 1. Если есть кастомный ogImage — используем его
  // 2. Иначе — генерируем из основного изображения через /api/og-image
  const ogImageUrl = mandala.ogImage
    ? getImageUrl(mandala.ogImage.path)
    : `/api/og-image?url=${encodeURIComponent(getImageUrl(mandala.image.path))}&w=1200&h=630`

  return {
    title: mandala.metaTitle || mandala.name,
    description: mandala.metaDescription || mandala.description || `Мандала ${mandala.name}`,
    alternates: {
      canonical: `/mandalas/${slug}`,
    },
    openGraph: {
      title: mandala.metaTitle || mandala.name,
      description: mandala.metaDescription || mandala.description || `Мандала ${mandala.name}`,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: mandala.name,
        },
      ],
    },
  }
}

export async function generateStaticParams() {
  try {
    const db = getEnhancedPrisma()
    const mandalas = await db.mandala.findMany({
      where: { published: true },
      select: { slug: true },
    })

    return mandalas.map((mandala) => ({
      slug: mandala.slug,
    }))
  } catch {
    // БД недоступна при билде — страницы будут генерироваться динамически
    return []
  }
}

export default async function MandalaPage({ params }: Props) {
  const { slug } = await params
  const t = await getTranslations('gallery.breadcrumbs')
  const db = getEnhancedPrisma()

  // Получаем текущую мандалу и все опубликованные для навигации
  const [mandala, allMandalas] = await Promise.all([
    db.mandala.findUnique({
      where: { slug },
      include: {
        image: true,
        centerImage: true,
        watermark: true,
      },
    }),
    db.mandala.findMany({
      where: { published: true },
      orderBy: { order: 'asc' },
      include: {
        image: true,
        centerImage: true,
      },
    }),
  ])

  if (!mandala || !mandala.published) {
    notFound()
  }

  // Преобразуем данные для MandalaViewer (Next.js Image генерирует миниатюры автоматически)
  const mandalaWithUrls = {
    ...mandala,
    imageUrl: getImageUrl(mandala.image.path),
    centerImageUrl: mandala.centerImage ? getImageUrl(mandala.centerImage.path) : null,
    watermarkUrl: mandala.watermark ? getImageUrl(mandala.watermark.path) : null,
  }

  const allMandalasWithUrls = allMandalas.map((m) => ({
    slug: m.slug,
    name: m.name,
    isSquare: m.isSquare,
    imageUrl: getImageUrl(m.image.path),
    centerImageUrl: m.centerImage ? getImageUrl(m.centerImage.path) : null,
  }))

  // Находим индекс текущей мандалы
  const initialIndex = allMandalasWithUrls.findIndex((m) => m.slug === slug)

  // JSON-LD Schema.org для улучшения SEO
  const imageObjectSchema = createImageObjectSchema({
    contentUrl: `${SITE_URL}${mandalaWithUrls.imageUrl}`,
    name: mandala.name,
    description: mandala.description || `${mandala.name} - Elfafeya Art`,
    datePublished: mandala.createdAt,
    dateModified: mandala.updatedAt,
  })

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: t('home'), url: SITE_URL },
    { name: t('gallery'), url: `${SITE_URL}/mandalas` },
    { name: mandala.name, url: `${SITE_URL}/mandalas/${slug}` },
  ])

  return (
    <>
      <JsonLd data={imageObjectSchema} />
      <JsonLd data={breadcrumbSchema} />
      <Container maxW="container.xl" py={8}>
        <Suspense
          fallback={
            <Center minH="60vh">
              <Spinner size="xl" color="brand.500" />
            </Center>
          }
        >
          <MandalaViewer mandala={mandalaWithUrls} allMandalas={allMandalasWithUrls} initialIndex={initialIndex} />
        </Suspense>
      </Container>
    </>
  )
}
