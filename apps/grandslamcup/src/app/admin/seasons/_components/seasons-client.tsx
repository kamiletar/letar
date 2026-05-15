'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { AdminActionsMenu } from '@/app/admin/_components/admin-actions-menu'
import { AdminCard, AdminCardRow } from '@/app/admin/_components/admin-card'
import { AdminResponsiveList } from '@/app/admin/_components/admin-responsive-list'
import { DeleteDialog } from '@/app/admin/_components/delete-dialog'
import { Badge, Box, Button, Center, Flex, Heading, Icon, Spinner, Table, Text, VStack } from '@chakra-ui/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'
import { LuPencil, LuPlus, LuTrash2 } from 'react-icons/lu'
import type { SeasonItem } from '../_actions/seasons.action'
import { deleteSeasonAction } from '../_actions/seasons.action'

const STATUS_LABEL: Record<string, string> = {
  UPCOMING: 'Предстоящий',
  ACTIVE: 'Активный',
  FINISHED: 'Завершён',
}
const STATUS_COLOR: Record<string, string> = {
  UPCOMING: 'blue',
  ACTIVE: 'green',
  FINISHED: 'gray',
}

export function SeasonsClient() {
  const queryClient = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<SeasonItem | null>(null)

  const {
    data: seasons = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<SeasonItem[]>({
    queryKey: ['admin', 'seasons'],
    queryFn: () => fetch('/api/admin/seasons').then((r) => r.json()),
  })

  const handleDelete = async () => {
    if (!deleteTarget) {
      return
    }
    const result = await deleteSeasonAction(deleteTarget.id)
    if (result.success) {
      toaster.success({ title: 'Сезон удалён' })
      await queryClient.invalidateQueries({ queryKey: ['admin', 'seasons'] })
    } else {
      toaster.error({ title: result.error })
    }
  }

  if (isLoading) {
    return (
      <Center py={12}>
        <Spinner size="lg" />
      </Center>
    )
  }
  if (isError) {
    return (
      <Center py={12}>
        <VStack gap={2}>
          <Text color="error.fg">Ошибка загрузки</Text>
          <Button size="sm" onClick={() => refetch()}>
            Повторить
          </Button>
        </VStack>
      </Center>
    )
  }

  return (
    <VStack gap={6} align="stretch">
      <Flex justify="space-between" align="center">
        <Heading size="lg">Сезоны ({seasons.length})</Heading>
        <Link href="/admin/seasons/new">
          <Button colorPalette="brand" size="sm">
            <Icon as={LuPlus} mr={1} /> Добавить сезон
          </Button>
        </Link>
      </Flex>

      <AdminResponsiveList
        items={seasons}
        emptyState={
          <Box bg="bg.panel" p={8} borderRadius="xl" textAlign="center">
            <Text color="fg.muted">Сезонов пока нет.</Text>
          </Box>
        }
        renderCard={(season) => (
          <AdminCard key={season.id}>
            <Flex justify="space-between" align="start" mb={2}>
              <Box>
                <Text fontWeight="semibold">{season.name}</Text>
                <Flex gap={2} mt={1}>
                  <Badge variant="subtle" size="sm">
                    {season.city.name}
                  </Badge>
                  <Badge colorPalette={STATUS_COLOR[season.status]} size="sm">
                    {STATUS_LABEL[season.status] ?? season.status}
                  </Badge>
                </Flex>
              </Box>
              <AdminActionsMenu
                actions={[
                  { icon: LuPencil, label: 'Редактировать', href: `/admin/seasons/${season.id}` },
                  { icon: LuTrash2, label: 'Удалить', colorPalette: 'red', onClick: () => setDeleteTarget(season) },
                ]}
              />
            </Flex>
            <AdminCardRow label="Лиги">{season._count.leagues}</AdminCardRow>
            <AdminCardRow label="Команды">{season._count.teamSeasons}</AdminCardRow>
          </AdminCard>
        )}
        tableContent={
          <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border.muted" overflow="hidden">
            <Box overflowX="auto">
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Название</Table.ColumnHeader>
                    <Table.ColumnHeader>Город</Table.ColumnHeader>
                    <Table.ColumnHeader>Статус</Table.ColumnHeader>
                    <Table.ColumnHeader>Лиги</Table.ColumnHeader>
                    <Table.ColumnHeader>Команды</Table.ColumnHeader>
                    <Table.ColumnHeader w="100px" />
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {seasons.map((season) => (
                    <Table.Row key={season.id}>
                      <Table.Cell fontWeight="medium">{season.name}</Table.Cell>
                      <Table.Cell>
                        <Badge variant="subtle" size="sm">
                          {season.city.name}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge colorPalette={STATUS_COLOR[season.status]} size="sm">
                          {STATUS_LABEL[season.status] ?? season.status}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>{season._count.leagues}</Table.Cell>
                      <Table.Cell>{season._count.teamSeasons}</Table.Cell>
                      <Table.Cell>
                        <AdminActionsMenu
                          actions={[
                            { icon: LuPencil, label: 'Редактировать', href: `/admin/seasons/${season.id}` },
                            {
                              icon: LuTrash2,
                              label: 'Удалить',
                              colorPalette: 'red',
                              onClick: () => setDeleteTarget(season),
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
        entityName={deleteTarget?.name ?? 'сезон'}
        onDelete={handleDelete}
      />
    </VStack>
  )
}
