import { BlogPostingJsonLd } from '@/app/_components/json-ld'
import { Link } from '@/i18n/navigation'
import { getSession } from '@/lib/auth'
import { reader } from '@/lib/keystatic'
import { prisma } from '@/lib/prisma'
import {
  Badge,
  Box,
  Button,
  Container,
  Grid,
  GridItem,
  Heading,
  HStack,
  Separator,
  Text,
  VStack,
} from '@chakra-ui/react'
import { ArrowLeft, Calendar } from 'lucide-react'
import type { Metadata } from 'next'
import { getLocale, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { CommentsSection } from './_components/comments-section'
import { extractTableOfContents, MdxContent } from './_components/mdx-content'
import { PublishButton } from './_components/publish-button'
import { TableOfContents } from './_components/table-of-contents'

type Props = {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateStaticParams() {
  const posts = await reader.collections.posts.all()
  const locales = ['ru', 'en']

  return locales.flatMap((locale) =>
    posts.map((post) => ({
      locale,
      slug: post.slug,
    }))
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const post = await reader.collections.posts.read(slug)

  if (!post) {
    return { title: 'Not Found' }
  }

  const title = locale === 'ru' ? post.title : post.titleEn
  const description = locale === 'ru' ? post.description : post.descriptionEn

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/blog/${slug}`,
      languages: {
        ru: `/ru/blog/${slug}`,
        en: `/en/blog/${slug}`,
      },
    },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://kami.letar.best'}/${locale}/blog/${slug}`,
      publishedTime: post.publishedAt || undefined,
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const post = await reader.collections.posts.read(slug)
  const currentLocale = await getLocale()
  const session = await getSession()
  const isAdmin = Boolean(session?.user && Array.isArray(session.user.roles) && session.user.roles.includes('ADMIN'))

  if (!post) {
    notFound()
  }

  // Получаем контент на нужном языке (Keystatic возвращает async функцию)
  const contentReader = currentLocale === 'ru' ? post.content : post.contentEn
  const content = await contentReader()

  // Извлекаем заголовки для навигации
  const tableOfContents = extractTableOfContents(content)

  const title = currentLocale === 'ru' ? post.title : post.titleEn
  const description = currentLocale === 'ru' ? post.description : post.descriptionEn

  return (
    <>
      <BlogPostingJsonLd
        locale={currentLocale}
        title={title}
        description={description}
        slug={slug}
        publishedAt={post.publishedAt || new Date().toISOString()}
        tags={post.tags || undefined}
      />
      <Box py={{ base: 12, md: 20 }}>
        <Container maxW="7xl">
          {/* Навигация назад + кнопка публикации */}
          <HStack justify="space-between" mb={8}>
            <Button asChild variant="ghost" size="sm" w="fit-content">
              <Link href="/blog/">
                <ArrowLeft size={16} />
                <Text ml={2}>{currentLocale === 'ru' ? 'Назад к блогу' : 'Back to blog'}</Text>
              </Link>
            </Button>
            <PublishButton slug={slug} isAdmin={isAdmin} />
          </HStack>

          <Grid templateColumns={{ base: '1fr', xl: '1fr 280px' }} gap={{ base: 8, xl: 12 }}>
            {/* Основной контент */}
            <GridItem>
              <VStack gap={8} align="stretch">
                {/* Заголовок статьи */}
                <VStack gap={4} align="start">
                  <HStack gap={3} flexWrap="wrap">
                    {post.featured && (
                      <Badge colorPalette="fg" variant="solid">
                        Featured
                      </Badge>
                    )}
                    {post.tags?.map((tag) => (
                      <Badge key={tag} variant="subtle" colorPalette="gray">
                        {tag}
                      </Badge>
                    ))}
                  </HStack>

                  <Heading as="h1" fontSize={{ base: '2xl', md: '4xl' }} fontWeight="bold">
                    {currentLocale === 'ru' ? post.title : post.titleEn}
                  </Heading>

                  <Text fontSize="lg" color="fg.muted">
                    {currentLocale === 'ru' ? post.description : post.descriptionEn}
                  </Text>

                  <HStack gap={2} color="fg.muted" fontSize="sm">
                    <Calendar size={14} />
                    <Text>
                      {new Date(post.publishedAt || '').toLocaleDateString(currentLocale === 'ru' ? 'ru-RU' : 'en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </Text>
                  </HStack>
                </VStack>

                {/* Контент статьи */}
                <Box
                  className="prose"
                  bg="bg.panel"
                  color={{ base: 'gray.900', _dark: 'gray.50' }}
                  p={{ base: 6, md: 10 }}
                  borderRadius="xl"
                  border="1px solid"
                  borderColor="border"
                >
                  <MdxContent content={content} />
                </Box>

                {/* Разделитель */}
                <Separator />

                {/* Комментарии */}
                <CommentsSection postSlug={slug} comments={await getComments(slug)} locale={currentLocale} />
              </VStack>
            </GridItem>

            {/* Сайдбар с навигацией — только на xl экранах */}
            <GridItem display={{ base: 'none', xl: 'block' }}>
              <TableOfContents items={tableOfContents} locale={currentLocale} />
            </GridItem>
          </Grid>
        </Container>
      </Box>
    </>
  )
}

/**
 * Получить комментарии к статье
 */
async function getComments(postSlug: string) {
  const comments = await prisma.blogComment.findMany({
    where: {
      postSlug,
      isApproved: true,
      isSpam: false,
      parentId: null,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      replies: {
        where: {
          isApproved: true,
          isSpam: false,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return comments
}
