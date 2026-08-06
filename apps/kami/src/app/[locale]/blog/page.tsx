import { Link } from '@/i18n/navigation'
import { reader } from '@/lib/keystatic'
import { createLocalizer } from '@/lib/localized-text'
import { GLOW } from '@/lib/utils/constants'
import { Badge, Box, Container, Heading, HStack, Icon, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { ArrowRight, Calendar } from 'lucide-react'
import type { Metadata } from 'next'
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'blog' })

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}/blog`,
      languages: { ru: '/ru/blog', en: '/en/blog' },
    },
    openGraph: { url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://kami.letar.best'}/${locale}/blog` },
  }
}

export default async function BlogPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const posts = await reader.collections.posts.all()
  const currentLocale = await getLocale()
  const t = await getTranslations('blog')
  const l = createLocalizer(currentLocale)

  // Сортируем по дате (новые первыми)
  const sortedPosts = posts.sort((a, b) => {
    const dateA = new Date(a.entry.publishedAt || 0)
    const dateB = new Date(b.entry.publishedAt || 0)
    return dateB.getTime() - dateA.getTime()
  })

  return (
    <Box py={{ base: 12, md: 20 }}>
      <Container maxW="6xl">
        <VStack gap={{ base: 12, md: 16 }} align="stretch">
          {/* Заголовок */}
          <VStack gap={4} textAlign="center">
            <Heading as="h1" fontSize={{ base: '3xl', md: '5xl' }} fontWeight="bold">
              {t('title')}
            </Heading>
            <Text fontSize={{ base: 'md', md: 'lg' }} color="fg.subtle" maxW="2xl">
              {l('Мысли, туториалы и заметки о разработке', 'Thoughts, tutorials and notes about development')}
            </Text>
          </VStack>

          {/* Список статей */}
          {sortedPosts.length === 0
            ? (
              <Box textAlign="center" py={12}>
                <Text color="fg.subtle">{l('Статей пока нет', 'No posts yet')}</Text>
              </Box>
            )
            : (
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={6}>
                {sortedPosts.map((post) => (
                  <Link key={post.slug} href={`/blog/${post.slug}/`}>
                    <Box
                      p={6}
                      borderRadius="xl"
                      bg="bg.panel"
                      border="1px solid"
                      borderColor="border.subtle"
                      _hover={{
                        borderColor: 'fg.500',
                        transform: 'translateY(-4px)',
                        boxShadow: GLOW.cardShadowFull,
                        '& .card-arrow': {
                          transform: 'translateX(4px)',
                          opacity: 1,
                        },
                      }}
                      transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                      h="full"
                      position="relative"
                      overflow="hidden"
                    >
                      {/* Стрелка при hover */}
                      <Icon
                        className="card-arrow"
                        position="absolute"
                        right={4}
                        top="50%"
                        transform="translateY(-50%)"
                        opacity={0}
                        transition="all 0.3s"
                        color="fg.500"
                        boxSize={5}
                      >
                        <ArrowRight />
                      </Icon>

                      {/* Featured бейдж */}
                      {post.entry.featured && (
                        <Badge position="absolute" top={4} right={4} colorPalette="fg" variant="solid">
                          Featured
                        </Badge>
                      )}

                      <VStack align="start" gap={3} pr={8}>
                        <Heading as="h2" fontSize="xl" lineClamp={2}>
                          {l(post.entry.title, post.entry.titleEn)}
                        </Heading>

                        <Text fontSize="sm" color="fg.subtle" lineClamp={3}>
                          {l(post.entry.description, post.entry.descriptionEn)}
                        </Text>

                        {/* Теги */}
                        {post.entry.tags && post.entry.tags.length > 0 && (
                          <HStack gap={2} flexWrap="wrap">
                            {post.entry.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="subtle" colorPalette="gray" size="sm">
                                {tag}
                              </Badge>
                            ))}
                          </HStack>
                        )}

                        {/* Дата */}
                        <HStack gap={2} color="fg.subtle" fontSize="sm">
                          <Calendar size={14} />
                          <Text>
                            {new Date(post.entry.publishedAt || '').toLocaleDateString(l('ru-RU', 'en-US'), {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </Text>
                        </HStack>
                      </VStack>
                    </Box>
                  </Link>
                ))}
              </SimpleGrid>
            )}
        </VStack>
      </Container>
    </Box>
  )
}
