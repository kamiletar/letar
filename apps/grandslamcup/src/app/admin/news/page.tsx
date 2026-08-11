'use client'

/**
 * Управление новостями — админка
 */

import { toaster } from '@/app/_components/ui/toaster'
import { AdminActionsMenu } from '@/app/admin/_components/admin-actions-menu'
import { AdminCard, AdminCardRow } from '@/app/admin/_components/admin-card'
import { AdminResponsiveList } from '@/app/admin/_components/admin-responsive-list'
import { formatDateNumeric } from '@/lib/format-date'
import { Badge, Box, Button, Flex, Heading, Spinner, Table, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { LuPen, LuPlus, LuTrash2 } from 'react-icons/lu'
import { DeleteDialog } from '../_components/delete-dialog'
import { deleteNewsAction, getNewsAction } from './_actions/news.action'

interface NewsItem {
  id: string
  title: string
  slug: string
  published: boolean
  publishedAt: string | null
  createdAt: string
  author: { name: string | null }
  match?: { id: string; homeTeam: { team: { name: string } }; awayTeam: { team: { name: string } } } | null
}

export default function AdminNewsPage() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<NewsItem | null>(null)

  const loadNews = async () => {
    const result = await getNewsAction()
    if ('data' in result) { setNews(result.data as unknown as NewsItem[]) }
    setLoading(false)
  }

  useEffect(() => {
    loadNews()
  }, [])

  const handleDelete = async () => {
    if (!deleteTarget) { return }
    const result = await deleteNewsAction(deleteTarget.id)
    if ('error' in result) { toaster.error({ title: result.error }) }
    else {
      toaster.success({ title: 'Новость удалена' })
      loadNews()
    }
  }

  if (loading) {
    return (
      <Flex justify="center" py={12}>
        <Spinner size="lg" />
      </Flex>
    )
  }

  return (
    <VStack gap={6} align="stretch">
      <Flex justify="space-between" align="center">
        <Heading size="lg">Новости ({news.length})</Heading>
        <Link href="/admin/news/new">
          <Button colorPalette="brand" size="sm">
            <LuPlus size={16} /> Создать
          </Button>
        </Link>
      </Flex>

      <AdminResponsiveList
        items={news}
        emptyState={
          <Box bg="bg.panel" p={8} borderRadius="xl" textAlign="center">
            <Text color="fg.muted">Новостей пока нет. Создайте первую.</Text>
          </Box>
        }
        renderCard={(post) => (
          <AdminCard key={post.id}>
            <Flex justify="space-between" align="start" mb={2}>
              <Box flex={1} mr={2}>
                <Text fontWeight="semibold" fontSize="sm">
                  {post.title}
                </Text>
                <Badge colorPalette={post.published ? 'green' : 'gray'} size="sm" mt={1}>
                  {post.published ? 'Опубликован' : 'Черновик'}
                </Badge>
              </Box>
              <AdminActionsMenu
                actions={[
                  { icon: LuPen, label: 'Редактировать', href: `/admin/news/${post.id}` },
                  { icon: LuTrash2, label: 'Удалить', colorPalette: 'red', onClick: () => setDeleteTarget(post) },
                ]}
              />
            </Flex>
            {post.match && (
              <AdminCardRow label="Матч">
                <Text fontSize="sm" color="fg.muted">
                  {post.match.homeTeam.team.name} — {post.match.awayTeam.team.name}
                </Text>
              </AdminCardRow>
            )}
            <AdminCardRow label="Дата">
              <Text fontSize="sm" color="fg.muted">
                {formatDateNumeric(post.createdAt)}
              </Text>
            </AdminCardRow>
          </AdminCard>
        )}
        tableContent={
          <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border.muted" overflow="hidden">
            <Box overflowX="auto">
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Заголовок</Table.ColumnHeader>
                    <Table.ColumnHeader>Статус</Table.ColumnHeader>
                    <Table.ColumnHeader>Матч</Table.ColumnHeader>
                    <Table.ColumnHeader>Дата</Table.ColumnHeader>
                    <Table.ColumnHeader w="100px" />
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {news.map((post) => (
                    <Table.Row key={post.id}>
                      <Table.Cell fontWeight="medium">{post.title}</Table.Cell>
                      <Table.Cell>
                        <Badge colorPalette={post.published ? 'green' : 'gray'} size="sm">
                          {post.published ? 'Опубликован' : 'Черновик'}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell fontSize="sm" color="fg.muted">
                        {post.match ? `${post.match.homeTeam.team.name} — ${post.match.awayTeam.team.name}` : '—'}
                      </Table.Cell>
                      <Table.Cell fontSize="sm" color="fg.muted">
                        {formatDateNumeric(post.createdAt)}
                      </Table.Cell>
                      <Table.Cell>
                        <AdminActionsMenu
                          actions={[
                            { icon: LuPen, label: 'Редактировать', href: `/admin/news/${post.id}` },
                            {
                              icon: LuTrash2,
                              label: 'Удалить',
                              colorPalette: 'red',
                              onClick: () => setDeleteTarget(post),
                            },
                          ]}
                        />
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
          </Box>
        }
      />

      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        entityName={deleteTarget?.title ?? ''}
        onDelete={handleDelete}
      />
    </VStack>
  )
}
