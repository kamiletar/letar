'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { AdminActionsMenu } from '@/app/admin/_components/admin-actions-menu'
import { AdminCard, AdminCardRow } from '@/app/admin/_components/admin-card'
import { AdminResponsiveList } from '@/app/admin/_components/admin-responsive-list'
import { DeleteDialog } from '@/app/admin/_components/delete-dialog'
import { Badge, Box, Button, Center, Flex, Heading, Spinner, Table, Text, VStack } from '@chakra-ui/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'
import { LuPencil, LuPlus, LuTrash2 } from 'react-icons/lu'
import type { VenueItem } from '../_actions/venues.action'
import { deleteVenueAction } from '../_actions/venues.action'

export function VenuesClient() {
  const queryClient = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<VenueItem | null>(null)

  const {
    data: venues = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<VenueItem[]>({
    queryKey: ['admin', 'venues'],
    queryFn: () => fetch('/api/admin/venues').then((r) => r.json()),
  })

  const handleDelete = async () => {
    if (!deleteTarget) {
      return
    }
    const result = await deleteVenueAction(deleteTarget.id)
    if (result.success) {
      toaster.success({ title: 'Площадка удалена' })
      await queryClient.invalidateQueries({ queryKey: ['admin', 'venues'] })
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
        <Heading size="lg">Площадки ({venues.length})</Heading>
        <Link href="/admin/venues/new">
          <Button colorPalette="brand" size="sm">
            <LuPlus size={16} style={{ marginRight: 4 }} /> Добавить площадку
          </Button>
        </Link>
      </Flex>

      <AdminResponsiveList
        items={venues}
        emptyState={
          <Box bg="bg.panel" p={8} borderRadius="xl" textAlign="center">
            <Text color="fg.muted">Площадок пока нет.</Text>
          </Box>
        }
        renderCard={(venue) => (
          <AdminCard key={venue.id}>
            <Flex justify="space-between" align="start" mb={2}>
              <Box>
                <Text fontWeight="semibold">{venue.name}</Text>
                <Badge variant="subtle" size="sm" mt={1}>
                  {venue.city.name}
                </Badge>
              </Box>
              <AdminActionsMenu
                actions={[
                  { icon: LuPencil, label: 'Редактировать', href: `/admin/venues/${venue.id}` },
                  { icon: LuTrash2, label: 'Удалить', colorPalette: 'red', onClick: () => setDeleteTarget(venue) },
                ]}
              />
            </Flex>
            {venue.address && (
              <AdminCardRow label="Адрес">
                <Text fontSize="sm" color="fg.muted">
                  {venue.address}
                </Text>
              </AdminCardRow>
            )}
            <AdminCardRow label="Команды">{venue._count.teams}</AdminCardRow>
            <AdminCardRow label="Матчи">{venue._count.matches}</AdminCardRow>
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
                    <Table.ColumnHeader>Адрес</Table.ColumnHeader>
                    <Table.ColumnHeader>Команды</Table.ColumnHeader>
                    <Table.ColumnHeader>Матчи</Table.ColumnHeader>
                    <Table.ColumnHeader w="100px" />
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {venues.map((venue) => (
                    <Table.Row key={venue.id}>
                      <Table.Cell fontWeight="medium">{venue.name}</Table.Cell>
                      <Table.Cell>
                        <Badge variant="subtle" size="sm">
                          {venue.city.name}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell color="fg.muted" fontSize="sm">
                        {venue.address || '—'}
                      </Table.Cell>
                      <Table.Cell>{venue._count.teams}</Table.Cell>
                      <Table.Cell>{venue._count.matches}</Table.Cell>
                      <Table.Cell>
                        <AdminActionsMenu
                          actions={[
                            { icon: LuPencil, label: 'Редактировать', href: `/admin/venues/${venue.id}` },
                            {
                              icon: LuTrash2,
                              label: 'Удалить',
                              colorPalette: 'red',
                              onClick: () => setDeleteTarget(venue),
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
        entityName={deleteTarget?.name ?? 'площадку'}
        onDelete={handleDelete}
      />
    </VStack>
  )
}
