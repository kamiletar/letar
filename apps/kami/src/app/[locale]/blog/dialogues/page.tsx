import { Link } from '@/i18n/navigation'
import { reader } from '@/lib/keystatic'
import { createLocalizer } from '@/lib/localized-text'
import { Box, Container, Grid, GridItem, Heading, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server'
import { BlogSidebar } from '../_components/blog-sidebar'
import { PostCard } from '../_components/post-card'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ tag?: string }>
}

export async function generateMetadata({ params }: { params: Props['params'] }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'blog' })

  return {
    title: t('dialoguesTitle'),
    description: t('dialoguesDescription'),
    alternates: {
      canonical: `/${locale}/blog/dialogues`,
      languages: { ru: '/ru/blog/dialogues', en: '/en/blog/dialogues' },
    },
  }
}

export default async function DialoguesPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { tag } = await searchParams
  setRequestLocale(locale)

  const allPosts = await reader.collections.posts.all()
  const currentLocale = await getLocale()
  const t = await getTranslations('blog')
  const l = createLocalizer(currentLocale)

  const dialoguePosts = allPosts.filter((post) => post.entry.category === 'dialogue')

  const tags = [...new Set(dialoguePosts.flatMap((post) => post.entry.tags ?? []))].sort()
  const filteredPosts = tag ? dialoguePosts.filter((post) => post.entry.tags?.includes(tag)) : dialoguePosts

  const sortedPosts = filteredPosts.sort((a, b) => {
    const dateA = new Date(a.entry.publishedAt || 0)
    const dateB = new Date(b.entry.publishedAt || 0)
    return dateB.getTime() - dateA.getTime()
  })

  return (
    <Box py={{ base: 12, md: 20 }}>
      <Container maxW="1100px">
        <VStack gap={4} textAlign="center" mb={{ base: 10, md: 12 }}>
          <Link href="/blog/">
            <HStack gap={2} color="fg.subtle" fontSize="sm" justify="center" _hover={{ color: 'fg' }}>
              <Icon boxSize={4}>
                <ArrowLeft />
              </Icon>
              <Text>{t('backToBlog')}</Text>
            </HStack>
          </Link>

          <Heading as="h1" fontSize={{ base: '3xl', md: '5xl' }} fontWeight="bold">
            {t('dialoguesTitle')}
          </Heading>
          <Text fontSize={{ base: 'md', md: 'lg' }} color="fg.subtle" maxW="2xl">
            {t('dialoguesDescription')}
          </Text>
        </VStack>

        <Grid templateColumns={{ base: '1fr', lg: '1fr 280px' }} gap={{ base: 8, lg: 10 }}>
          <GridItem minW={0}>
            {sortedPosts.length === 0
              ? (
                <Box textAlign="center" py={12}>
                  <Text color="fg.subtle">{t('noPosts')}</Text>
                </Box>
              )
              : (
                <VStack gap={4} align="stretch">
                  {sortedPosts.map((post) => (
                    <PostCard
                      key={post.slug}
                      slug={post.slug}
                      entry={{ ...post.entry, tags: post.entry.tags ?? [] }}
                      href={`/blog/${post.slug}/`}
                      l={l}
                      dialogueBadgeLabel={t('dialoguesBadge')}
                    />
                  ))}
                </VStack>
              )}
          </GridItem>

          <GridItem>
            <BlogSidebar
              tags={tags}
              currentTag={tag}
              basePath="/blog/dialogues"
              allLabel={t('allTags')}
              tagsLabel={t('tagsLabel')}
            />
          </GridItem>
        </Grid>
      </Container>
    </Box>
  )
}
