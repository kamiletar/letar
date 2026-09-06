import { prisma } from '@/lib/db'
import { ADMIN_PAGE_SIZE } from '@/lib/utils/constants'
import { Badge, Box, Card, Heading, HStack, Image, Input, Text, VStack, Wrap } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Link from 'next/link'

interface LinksPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ category?: string; tag?: string; q?: string; page?: string }>
}

// Публичная страница показывает данные, редактируемые через /admin/links — без force-dynamic
// новые/изменённые ссылки не появились бы здесь без полного ребилда (см. nextjs-apps.md)
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: LinksPageProps): Promise<Metadata> {
  const { locale } = await params
  return {
    title: locale === 'ru' ? 'Ссылки' : 'Links',
    description: locale === 'ru'
      ? 'Закладки Ками — статьи, инструменты и материалы, которыми стоит поделиться'
      : "Kami's bookmarks — articles, tools and materials worth sharing",
    alternates: {
      canonical: `/${locale}/links`,
      languages: { ru: '/ru/links', en: '/en/links' },
    },
    openGraph: { url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://kami.letar.best'}/${locale}/links` },
  }
}

/** Извлекает домен из URL для компактного отображения источника */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** Favicon домена через сервис Google — всегда возвращает иконку (дефолтную для неизвестных доменов) */
function faviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`
}

/** Собирает href с текущими фильтрами + переопределением одного параметра (undefined — снять фильтр) */
function buildFilterHref(
  locale: string,
  current: { category?: string; tag?: string; q?: string },
  override: { category?: string | null; tag?: string | null },
): string {
  const params = new URLSearchParams()
  const category = override.category !== undefined ? override.category : current.category
  const tag = override.tag !== undefined ? override.tag : current.tag
  if (category) {
    params.set('category', category)
  }
  if (tag) {
    params.set('tag', tag)
  }
  if (current.q) {
    params.set('q', current.q)
  }
  const query = params.toString()
  return `/${locale}/links${query ? `?${query}` : ''}`
}

export default async function LinksPage({ params, searchParams }: LinksPageProps) {
  const { locale } = await params
  const { category, tag, q, page: pageParam } = await searchParams
  const page = Number(pageParam) || 1

  // Списки для фильтров — по всем ссылкам, не только по текущей выборке
  const allForFilters = await prisma.link.findMany({
    select: { category: true, tags: true },
  })
  const categories = [...new Set(allForFilters.map((l) => l.category).filter((c): c is string => Boolean(c)))].sort()
  const tags = [...new Set(allForFilters.flatMap((l) => l.tags))].sort()

  const where: Record<string, unknown> = {}
  if (category) {
    where.category = category
  }
  if (tag) {
    where.tags = { has: tag }
  }
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { url: { contains: q, mode: 'insensitive' } },
    ]
  }

  const [links, total] = await Promise.all([
    prisma.link.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: ADMIN_PAGE_SIZE,
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      select: {
        id: true,
        url: true,
        title: true,
        description: true,
        category: true,
        tags: true,
        createdAt: true,
      },
    }),
    prisma.link.count({ where }),
  ])

  const currentFilters = { category, tag, q }
  const totalPages = Math.ceil(total / ADMIN_PAGE_SIZE)

  return (
    <Box maxW="720px" mx="auto" py={12} px={4}>
      <VStack gap={6} align="stretch">
        <Heading as="h1" size="2xl" textAlign="center">
          Ссылки
        </Heading>

        {/* Поиск — обычная GET-форма, работает без JS */}
        <form method="get" action={`/${locale}/links`}>
          {category && <input type="hidden" name="category" value={category} />}
          {tag && <input type="hidden" name="tag" value={tag} />}
          <Input name="q" defaultValue={q} placeholder="Поиск по заголовку, описанию или URL…" />
        </form>

        {categories.length > 0 && (
          <Wrap gap={2}>
            <Badge
              asChild
              variant={!category ? 'solid' : 'outline'}
              colorPalette="purple"
              cursor="pointer"
            >
              <Link href={buildFilterHref(locale, currentFilters, { category: null })}>Все категории</Link>
            </Badge>
            {categories.map((c) => (
              <Badge
                key={c}
                asChild
                variant={category === c ? 'solid' : 'outline'}
                colorPalette="purple"
                cursor="pointer"
              >
                <Link href={buildFilterHref(locale, currentFilters, { category: c })}>{c}</Link>
              </Badge>
            ))}
          </Wrap>
        )}

        {tags.length > 0 && (
          <Wrap gap={2}>
            <Badge asChild variant={!tag ? 'solid' : 'outline'} colorPalette="teal" cursor="pointer">
              <Link href={buildFilterHref(locale, currentFilters, { tag: null })}>Все метки</Link>
            </Badge>
            {tags.map((t) => (
              <Badge key={t} asChild variant={tag === t ? 'solid' : 'outline'} colorPalette="teal" cursor="pointer">
                <Link href={buildFilterHref(locale, currentFilters, { tag: t })}>#{t}</Link>
              </Badge>
            ))}
          </Wrap>
        )}

        {links.length === 0
          ? (
            <Text color="fg.muted" textAlign="center">
              Ничего не найдено по текущим фильтрам.
            </Text>
          )
          : (
            <VStack gap={3} align="stretch">
              {links.map((link) => (
                <Card.Root key={link.id} asChild _hover={{ shadow: 'md', borderColor: 'purple.200' }}>
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    <Card.Body py={3} px={4}>
                      <VStack gap={1} align="stretch">
                        <HStack justify="space-between" align="start">
                          <Text fontWeight="medium">{link.title}</Text>
                          <Text fontSize="xs" color="fg.muted" flexShrink={0}>
                            {new Date(link.createdAt).toLocaleDateString('ru-RU')}
                          </Text>
                        </HStack>
                        {link.description && (
                          <Text fontSize="sm" color="fg.muted" lineClamp={2}>
                            {link.description}
                          </Text>
                        )}
                        <HStack gap={2} flexWrap="wrap" fontSize="xs" color="fg.muted">
                          <Image src={faviconUrl(extractDomain(link.url))} alt="" boxSize="14px" borderRadius="sm" />
                          <Text>{extractDomain(link.url)}</Text>
                          {link.category && <Badge size="sm" colorPalette="purple">{link.category}</Badge>}
                          {link.tags.map((t) => <Text key={t} color="teal.fg">#{t}</Text>)}
                        </HStack>
                      </VStack>
                    </Card.Body>
                  </a>
                </Card.Root>
              ))}
            </VStack>
          )}

        {totalPages > 1 && (
          <HStack justify="center" gap={2}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
              const params = new URLSearchParams()
              if (category) {
                params.set('category', category)
              }
              if (tag) {
                params.set('tag', tag)
              }
              if (q) {
                params.set('q', q)
              }
              if (p > 1) {
                params.set('page', String(p))
              }
              const query = params.toString()
              return (
                <Badge
                  key={p}
                  asChild
                  variant={p === page ? 'solid' : 'outline'}
                  colorPalette="gray"
                  cursor="pointer"
                >
                  <Link href={`/${locale}/links${query ? `?${query}` : ''}`}>{p}</Link>
                </Badge>
              )
            })}
          </HStack>
        )}
      </VStack>
    </Box>
  )
}
