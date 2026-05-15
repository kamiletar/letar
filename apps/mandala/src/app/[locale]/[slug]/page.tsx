import { Navigation } from '@/app/_components/navigation'
import { getEnhancedPrisma } from '@/lib/db'
import { getImageUrl } from '@/lib/images/create-image'
import { Box, Container, Heading } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

// Страница использует headers() через auth - принудительно динамическая
export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const db = getEnhancedPrisma()
  const page = await db.contentPage.findUnique({
    where: { slug },
    include: { ogImageRel: true },
  })

  if (!page) {
    return {
      title: 'Страница не найдена',
    }
  }

  // OG-image: если есть кастомный — используем его
  const ogImageUrl = page.ogImageRel ? getImageUrl(page.ogImageRel.path) : null

  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || page.content?.slice(0, 160),
    alternates: {
      canonical: `/${slug}`,
    },
    openGraph: {
      title: page.metaTitle || page.title,
      description: page.metaDescription || page.content?.slice(0, 160),
      images: ogImageUrl ? [{ url: ogImageUrl, width: 1200, height: 630 }] : [],
    },
  }
}

// Страницы с собственными статическими роутами (не нужно генерировать через [slug])
const STATIC_PAGES = ['about-mandalas', 'about-elfafeya', 'contacts']

export async function generateStaticParams() {
  try {
    const db = getEnhancedPrisma()
    const pages = await db.contentPage.findMany({
      where: {
        published: true,
        slug: { notIn: STATIC_PAGES },
      },
      select: { slug: true },
    })

    return pages.map((page) => ({
      slug: page.slug,
    }))
  } catch {
    // БД недоступна при билде — страницы будут генерироваться динамически
    return []
  }
}

export default async function ContentPage({ params }: Props) {
  const { slug } = await params
  const db = getEnhancedPrisma()

  // Сначала проверяем, не является ли это коротким URL
  let shortUrl = await db.shortUrl.findUnique({
    where: { code: slug },
  })

  // Если не найдено и slug начинается с 's', попробовать без 's'
  if (!shortUrl && slug.startsWith('s')) {
    const codeWithoutS = slug.slice(1)
    shortUrl = await db.shortUrl.findUnique({
      where: { code: codeWithoutS },
    })
  }

  // Если найден короткий URL - редирект
  if (shortUrl) {
    redirect(shortUrl.fullUrl)
  }

  // Иначе ищем контентную страницу
  const page = await db.contentPage.findUnique({
    where: { slug },
  })

  if (!page || !page.published) {
    notFound()
  }

  return (
    <>
      <Navigation />

      <Container maxW="85ch" py={8}>
        <Heading as="h1" size="2xl" color="fg" mb={8}>
          {page.title}
        </Heading>

        <Box
          fontSize="lg"
          color="gray.300"
          lineHeight="1.8"
          css={{
            '& p': {
              marginBottom: 'var(--chakra-spacing-4)',
            },
            '& h2': {
              fontSize: 'var(--chakra-font-sizes-2xl)',
              fontWeight: 'bold',
              color: 'white',
              marginTop: 'var(--chakra-spacing-8)',
              marginBottom: 'var(--chakra-spacing-4)',
            },
            '& h3': {
              fontSize: 'var(--chakra-font-sizes-xl)',
              fontWeight: 'bold',
              color: 'white',
              marginTop: 'var(--chakra-spacing-6)',
              marginBottom: 'var(--chakra-spacing-3)',
            },
            '& ul, & ol': {
              paddingLeft: 'var(--chakra-spacing-6)',
              marginBottom: 'var(--chakra-spacing-4)',
            },
            '& li': {
              marginBottom: 'var(--chakra-spacing-2)',
            },
            '& a': {
              color: 'var(--chakra-colors-fg)',
              textDecoration: 'underline',
              '&:hover': {
                color: 'white',
              },
            },
          }}
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      </Container>
    </>
  )
}
