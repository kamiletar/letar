/**
 * Общий контент страницы новостей — используется как в глобальной, так и в городской ленте.
 * Серверный компонент.
 */

import { EmptyState } from '@/app/_components/empty-state'
import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/format-date'
import { getPhotoUrl } from '@/lib/images'
import { Badge, Box, Card, Grid, Heading, Text, VStack } from '@chakra-ui/react'
import Image from 'next/image'
import Link from 'next/link'

interface NewsContentProps {
  /** Слаг города — для формирования ссылок */
  citySlug?: string
  /** ID города — для фильтрации постов */
  cityId?: string
  /** Название города — для заголовка и пустого состояния */
  cityName?: string
}

export async function NewsContent({ citySlug, cityId, cityName }: NewsContentProps) {
  const posts = await prisma.newsPost.findMany({
    where: {
      published: true,
      ...(cityId ? { cityId } : {}),
    },
    orderBy: { publishedAt: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      coverImage: true,
      publishedAt: true,
      // В глобальном режиме нужен город для бейджа и ссылок
      ...(!cityId ? { city: { select: { slug: true, name: true } } } : {}),
      match: {
        select: {
          homeTeam: { select: { team: { select: { name: true } } } },
          awayTeam: { select: { team: { select: { name: true } } } },
        },
      },
    },
  })

  /** Формирование ссылки на пост в зависимости от контекста */
  function getPostHref(post: (typeof posts)[number]) {
    const slug = post.slug
    if (citySlug) {
      return `/${citySlug}/news/${slug}`
    }
    // В глобальном режиме: если пост привязан к городу, ссылка через город
    const city = 'city' in post ? (post as { city: { slug: string } | null }).city : null
    return city ? `/${city.slug}/news/${slug}` : `/news/${slug}`
  }

  /** Бейдж города — только в глобальном режиме */
  function getCityBadge(post: (typeof posts)[number]) {
    if (cityId) return null
    const city = 'city' in post ? (post as { city: { name: string } | null }).city : null
    if (!city) return null
    return (
      <Badge colorPalette="purple" size="sm">
        {city.name}
      </Badge>
    )
  }

  return (
    <VStack gap={8} align="stretch">
      <Heading as="h1" size="2xl">
        {cityName ? `Новости — ${cityName}` : 'Новости'}
      </Heading>

      {posts.length === 0 ? (
        <EmptyState>
          <Text color="fg.muted">{cityName ? `Пока нет новостей для ${cityName}` : 'Пока нет новостей'}</Text>
        </EmptyState>
      ) : (
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={6}>
          {posts.map((post) => (
            <Link key={post.id} href={getPostHref(post)}>
              <Card.Root
                h="100%"
                _hover={{ shadow: 'lg', borderColor: 'brand.fg' }}
                transition="all 0.2s"
                cursor="pointer"
                overflow="hidden"
              >
                {post.coverImage && (
                  <Box position="relative" h="180px" bg="bg.subtle">
                    <Image
                      src={post.coverImage.startsWith('/') ? post.coverImage : getPhotoUrl(post.coverImage)}
                      alt={post.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      style={{ objectFit: 'cover' }}
                    />
                  </Box>
                )}
                <Card.Body>
                  <VStack gap={2} align="start">
                    {getCityBadge(post)}
                    {post.match && (
                      <Badge colorPalette="blue" size="sm">
                        Обзор: {post.match.homeTeam.team.name} — {post.match.awayTeam.team.name}
                      </Badge>
                    )}
                    <Heading size="md" lineClamp={2}>
                      {post.title}
                    </Heading>
                    {post.excerpt && (
                      <Text fontSize="sm" color="fg.muted" lineClamp={3}>
                        {post.excerpt}
                      </Text>
                    )}
                    <Text fontSize="xs" color="fg.subtle">
                      {post.publishedAt ? formatDate(post.publishedAt) : ''}
                    </Text>
                  </VStack>
                </Card.Body>
              </Card.Root>
            </Link>
          ))}
        </Grid>
      )}
    </VStack>
  )
}
