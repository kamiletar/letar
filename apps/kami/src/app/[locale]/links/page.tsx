import { prisma } from '@/lib/db'
import { ADMIN_PAGE_SIZE } from '@/lib/utils/constants'
import { Badge, Box, Card, Heading, HStack, Icon, Image, Input, Text, VStack, Wrap } from '@chakra-ui/react'
import { FileText } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

interface LinksPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ category?: string; tag?: string; q?: string; type?: string; page?: string }>
}

// Публичная страница показывает данные, редактируемые через /admin/links и /admin/files —
// без force-dynamic новые/изменённые записи не появились бы здесь без полного ребилда
// (см. nextjs-apps.md)
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

type CurrentFilters = { category?: string; tag?: string; q?: string; type?: string }

/** Собирает href с текущими фильтрами + переопределением одного параметра (undefined — снять фильтр) */
function buildFilterHref(
  locale: string,
  current: CurrentFilters,
  override: { category?: string | null; tag?: string | null; type?: string | null },
): string {
  const params = new URLSearchParams()
  const category = override.category !== undefined ? override.category : current.category
  const tag = override.tag !== undefined ? override.tag : current.tag
  const type = override.type !== undefined ? override.type : current.type
  if (category) {
    params.set('category', category)
  }
  if (tag) {
    params.set('tag', tag)
  }
  if (type) {
    params.set('type', type)
  }
  if (current.q) {
    params.set('q', current.q)
  }
  const query = params.toString()
  return `/${locale}/links${query ? `?${query}` : ''}`
}

/** Объединённая карточка витрины — либо сохранённая ссылка, либо загруженный файл */
type FeedItem = {
  id: string
  kind: 'link' | 'file'
  title: string
  description: string | null
  category: string | null
  tags: string[]
  createdAt: Date
  href: string
  sourceLabel: string
  faviconSrc: string | null
}

export default async function LinksPage({ params, searchParams }: LinksPageProps) {
  const { locale } = await params
  const { category, tag, q, type, page: pageParam } = await searchParams
  const page = Number(pageParam) || 1

  // Списки для фильтров — по всем записям (обоих типов), не только по текущей выборке
  const [allLinksForFilters, allFilesForFilters] = await Promise.all([
    prisma.link.findMany({ select: { category: true, tags: true } }),
    prisma.uploadedFile.findMany({ select: { category: true, tags: true } }),
  ])
  const allForFilters = [...allLinksForFilters, ...allFilesForFilters]
  const categories = [...new Set(allForFilters.map((l) => l.category).filter((c): c is string => Boolean(c)))].sort()
  const tags = [...new Set(allForFilters.flatMap((l) => l.tags))].sort()

  const where: Record<string, unknown> = {}
  if (category) {
    where.category = category
  }
  if (tag) {
    where.tags = { has: tag }
  }

  // Личная коллекция закладок — объёмы малы (десятки/сотни записей), поэтому пагинация делается
  // в памяти после объединения двух источников, а не на уровне БД у каждого запроса по отдельности
  const [links, files] = await Promise.all([
    type === 'file' ? Promise.resolve([]) : prisma.link.findMany({
      where: {
        ...where,
        ...(q
          ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
              { url: { contains: q, mode: 'insensitive' } },
            ],
          }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, url: true, title: true, description: true, category: true, tags: true, createdAt: true },
    }),
    type === 'link' ? Promise.resolve([]) : prisma.uploadedFile.findMany({
      where: {
        ...where,
        ...(q
          ? {
            OR: [
              { filename: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
            ],
          }
          : {}),
      },
      orderBy: { uploadedAt: 'desc' },
      select: {
        id: true,
        filename: true,
        path: true,
        mimeType: true,
        description: true,
        category: true,
        tags: true,
        uploadedAt: true,
      },
    }),
  ])

  const items: FeedItem[] = [
    ...links.map((link): FeedItem => ({
      id: link.id,
      kind: 'link',
      title: link.title,
      description: link.description,
      category: link.category,
      tags: link.tags,
      createdAt: link.createdAt,
      href: link.url,
      sourceLabel: extractDomain(link.url),
      faviconSrc: faviconUrl(extractDomain(link.url)),
    })),
    ...files.map((file): FeedItem => ({
      id: file.id,
      kind: 'file',
      title: file.filename,
      description: file.description,
      category: file.category,
      tags: file.tags,
      createdAt: file.uploadedAt,
      href: `/api/files/${file.path}`,
      sourceLabel: file.mimeType,
      faviconSrc: null,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  const total = items.length
  const totalPages = Math.ceil(total / ADMIN_PAGE_SIZE)
  const pageItems = items.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE)

  const currentFilters: CurrentFilters = { category, tag, q, type }

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
          {type && <input type="hidden" name="type" value={type} />}
          <Input name="q" defaultValue={q} placeholder="Поиск по заголовку, описанию или URL…" />
        </form>

        <Wrap gap={2}>
          <Badge asChild variant={!type ? 'solid' : 'outline'} colorPalette="gray" cursor="pointer">
            <Link href={buildFilterHref(locale, currentFilters, { type: null })}>Всё</Link>
          </Badge>
          <Badge asChild variant={type === 'link' ? 'solid' : 'outline'} colorPalette="gray" cursor="pointer">
            <Link href={buildFilterHref(locale, currentFilters, { type: 'link' })}>Ссылки</Link>
          </Badge>
          <Badge asChild variant={type === 'file' ? 'solid' : 'outline'} colorPalette="gray" cursor="pointer">
            <Link href={buildFilterHref(locale, currentFilters, { type: 'file' })}>Файлы</Link>
          </Badge>
        </Wrap>

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

        {pageItems.length === 0
          ? (
            <Text color="fg.muted" textAlign="center">
              Ничего не найдено по текущим фильтрам.
            </Text>
          )
          : (
            <VStack gap={3} align="stretch">
              {pageItems.map((item) => (
                <Card.Root key={`${item.kind}-${item.id}`} asChild _hover={{ shadow: 'md', borderColor: 'purple.200' }}>
                  <a href={item.href} target="_blank" rel="noopener noreferrer">
                    <Card.Body py={3} px={4}>
                      <VStack gap={1} align="stretch">
                        <HStack justify="space-between" align="start">
                          <Text fontWeight="medium">{item.title}</Text>
                          <Text fontSize="xs" color="fg.muted" flexShrink={0}>
                            {new Date(item.createdAt).toLocaleDateString('ru-RU')}
                          </Text>
                        </HStack>
                        {item.description && (
                          <Text fontSize="sm" color="fg.muted" lineClamp={2}>
                            {item.description}
                          </Text>
                        )}
                        <HStack gap={2} flexWrap="wrap" fontSize="xs" color="fg.muted">
                          {item.faviconSrc
                            ? <Image src={item.faviconSrc} alt="" boxSize="14px" borderRadius="sm" />
                            : (
                              <Icon boxSize="14px">
                                <FileText />
                              </Icon>
                            )}
                          <Text>{item.sourceLabel}</Text>
                          {item.category && <Badge size="sm" colorPalette="purple">{item.category}</Badge>}
                          {item.tags.map((t) => <Text key={t} color="teal.fg">#{t}</Text>)}
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
              if (type) {
                params.set('type', type)
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
