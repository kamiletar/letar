import { prisma } from '@/lib/db'
import { ADMIN_PAGE_SIZE } from '@/lib/utils/constants'
import { Badge, Box, Link as ChakraLink, HStack, Table, Text } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { AdminPageLayout } from '../../_components'

export const metadata: Metadata = {
  title: 'Логи публикаций | Admin',
}

interface LogsPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ status?: string; page?: string }>
}

/** Цвета статусов */
const STATUS_COLORS: Record<string, string> = {
  PENDING: 'yellow',
  PUBLISHED: 'green',
  FAILED: 'red',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает',
  PUBLISHED: 'Опубликовано',
  FAILED: 'Ошибка',
}

/**
 * Логи кросс-постинга в соцсети
 */
export default async function SocialLogsPage({ params, searchParams }: LogsPageProps) {
  const { locale } = await params
  const { status, page: pageParam } = await searchParams
  const page = Number(pageParam) || 1

  const whereClause = status ? { status: status as 'PENDING' | 'PUBLISHED' | 'FAILED' } : undefined

  const [crossPosts, total] = await Promise.all([
    prisma.crossPost.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: ADMIN_PAGE_SIZE,
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      select: {
        id: true,
        postSlug: true,
        status: true,
        externalUrl: true,
        error: true,
        publishedAt: true,
        createdAt: true,
        platform: { select: { name: true, type: true } },
      },
    }),
    prisma.crossPost.count({ where: whereClause }),
  ])

  return (
    <AdminPageLayout
      title="Логи публикаций"
      total={total}
      pageSize={ADMIN_PAGE_SIZE}
      basePath={`/${locale}/admin/social/logs`}
    >
      {/* Фильтр по статусу */}
      <HStack gap={2} mb={4} flexWrap="wrap">
        <Link href={`/${locale}/admin/social/logs`}>
          <Badge variant={!status ? 'solid' : 'subtle'} colorPalette="gray" px={3} py={1} cursor="pointer">
            Все
          </Badge>
        </Link>
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <Link key={key} href={`/${locale}/admin/social/logs?status=${key}`}>
            <Badge
              variant={status === key ? 'solid' : 'subtle'}
              colorPalette={STATUS_COLORS[key]}
              px={3}
              py={1}
              cursor="pointer"
            >
              {label}
            </Badge>
          </Link>
        ))}
      </HStack>

      <Box overflowX="auto">
        <Table.Root size="sm">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Пост</Table.ColumnHeader>
              <Table.ColumnHeader>Платформа</Table.ColumnHeader>
              <Table.ColumnHeader>Статус</Table.ColumnHeader>
              <Table.ColumnHeader>Дата</Table.ColumnHeader>
              <Table.ColumnHeader>Ссылка</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {crossPosts.map((cp) => (
              <Table.Row key={cp.id}>
                <Table.Cell>
                  <Link href={`/${locale}/blog/${cp.postSlug}/`}>
                    <Text
                      fontSize="sm"
                      color={{ base: 'blue.500', _dark: 'blue.300' }}
                      _hover={{ textDecoration: 'underline' }}
                    >
                      {cp.postSlug}
                    </Text>
                  </Link>
                </Table.Cell>
                <Table.Cell>
                  <Text fontSize="sm">{cp.platform.name}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Badge variant="subtle" colorPalette={STATUS_COLORS[cp.status]}>
                    {STATUS_LABELS[cp.status] || cp.status}
                  </Badge>
                  {cp.error && (
                    <Text fontSize="xs" color={{ base: 'red.500', _dark: 'red.400' }} mt={1}>
                      {cp.error}
                    </Text>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <Text fontSize="sm" color="fg.muted">
                    {cp.publishedAt
                      ? new Date(cp.publishedAt).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : new Date(cp.createdAt).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  {cp.externalUrl ? (
                    <ChakraLink
                      href={cp.externalUrl}
                      target="_blank"
                      fontSize="sm"
                      color={{ base: 'blue.500', _dark: 'blue.300' }}
                    >
                      Открыть ↗
                    </ChakraLink>
                  ) : (
                    <Text fontSize="sm" color="fg.muted">
                      —
                    </Text>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
    </AdminPageLayout>
  )
}
