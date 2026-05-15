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
import type { CityItem } from '../_actions/cities.action'
import { deleteCityAction } from '../_actions/cities.action'

export function CitiesClient() {
  const queryClient = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<CityItem | null>(null)

  const {
    data: cities = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<CityItem[]>({
    queryKey: ['admin', 'cities'],
    queryFn: () => fetch('/api/admin/cities').then((r) => r.json()),
  })

  const handleDelete = async () => {
    if (!deleteTarget) {
      return
    }
    const result = await deleteCityAction(deleteTarget.id)
    if (result.success) {
      toaster.success({ title: 'Город удалён' })
      await queryClient.invalidateQueries({ queryKey: ['admin', 'cities'] })
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
          <Text color="error.fg">Ошибка загрузки городов</Text>
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
        <Heading size="lg">Города ({cities.length})</Heading>
        <Link href="/admin/cities/new">
          <Button colorPalette="brand" size="sm">
            <Icon as={LuPlus} mr={1} /> Добавить город
          </Button>
        </Link>
      </Flex>

      <AdminResponsiveList
        items={cities}
        emptyState={
          <Box bg="bg.panel" p={8} borderRadius="xl" textAlign="center">
            <Text color="fg.muted">Городов пока нет. Добавьте первый.</Text>
          </Box>
        }
        renderCard={(city) => (
          <AdminCard key={city.id}>
            <Flex justify="space-between" align="start" mb={2}>
              <Box>
                <Text fontWeight="semibold">{city.name}</Text>
                <Badge variant="subtle" size="sm" mt={1}>
                  {city.slug}
                </Badge>
              </Box>
              <AdminActionsMenu
                actions={[
                  { icon: LuPencil, label: 'Редактировать', href: `/admin/cities/${city.id}` },
                  { icon: LuTrash2, label: 'Удалить', colorPalette: 'red', onClick: () => setDeleteTarget(city) },
                ]}
              />
            </Flex>
            <AdminCardRow label="Площадки">{city._count.venues}</AdminCardRow>
            <AdminCardRow label="Команды">{city._count.teams}</AdminCardRow>
            <AdminCardRow label="Сезоны">{city._count.seasons}</AdminCardRow>
          </AdminCard>
        )}
        tableContent={
          <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border.muted" overflow="hidden">
            <Box overflowX="auto">
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Название</Table.ColumnHeader>
                    <Table.ColumnHeader>Slug</Table.ColumnHeader>
                    <Table.ColumnHeader>Площадки</Table.ColumnHeader>
                    <Table.ColumnHeader>Команды</Table.ColumnHeader>
                    <Table.ColumnHeader>Сезоны</Table.ColumnHeader>
                    <Table.ColumnHeader w="100px" />
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {cities.map((city) => (
                    <Table.Row key={city.id}>
                      <Table.Cell fontWeight="medium">{city.name}</Table.Cell>
                      <Table.Cell>
                        <Badge variant="subtle" size="sm">
                          {city.slug}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>{city._count.venues}</Table.Cell>
                      <Table.Cell>{city._count.teams}</Table.Cell>
                      <Table.Cell>{city._count.seasons}</Table.Cell>
                      <Table.Cell>
                        <AdminActionsMenu
                          actions={[
                            { icon: LuPencil, label: 'Редактировать', href: `/admin/cities/${city.id}` },
                            {
                              icon: LuTrash2,
                              label: 'Удалить',
                              colorPalette: 'red',
                              onClick: () => setDeleteTarget(city),
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
        entityName={deleteTarget?.name ?? 'город'}
        onDelete={handleDelete}
      />
    </VStack>
  )
}
