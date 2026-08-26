'use client'

/**
 * Список команд в админке — поиск по названию, фильтр по городу.
 */

import { toaster } from '@/app/_components/ui/toaster'
import { AdminActionsMenu } from '@/app/admin/_components/admin-actions-menu'
import { AdminCard, AdminCardRow } from '@/app/admin/_components/admin-card'
import { AdminResponsiveList } from '@/app/admin/_components/admin-responsive-list'
import { DeleteDialog } from '@/app/admin/_components/delete-dialog'
import { Badge, Box, Button, Flex, Heading, Input, NativeSelect, Table, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { LuExternalLink, LuPencil, LuPlus, LuSearch, LuTrash2, LuUsers } from 'react-icons/lu'
import type { TeamItem } from '../_actions/teams.action'
import { deleteTeamAction } from '../_actions/teams.action'

interface Props {
  teams: TeamItem[]
  cities: { id: string; name: string }[]
  searchQuery: string
  cityFilter: string
  /** Предвыбранный город организатора (если единственный) */
  defaultCityId?: string
}

export function TeamsClient({ teams, cities, searchQuery, cityFilter, defaultCityId }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchQuery)
  const [deleteTarget, setDeleteTarget] = useState<TeamItem | null>(null)

  /** Обновить URL с параметрами поиска */
  function navigate(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      // Не ставить параметр city если совпадает с предвыбором
      if (key === 'city' && value === defaultCityId) {
        params.delete(key)
        continue
      }
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    }
    router.push(`/admin/teams?${params.toString()}`)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    navigate({ q: query })
  }

  const handleDelete = async () => {
    if (!deleteTarget) {
      return
    }
    const result = await deleteTeamAction(deleteTarget.id)
    if (result.success) {
      toaster.success({ title: 'Команда удалена' })
      router.refresh()
    } else {
      toaster.error({ title: result.error })
    }
  }

  return (
    <VStack gap={6} align="stretch">
      <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
        <Heading size="lg">Команды ({teams.length})</Heading>
        <Link href="/admin/teams/new">
          <Button colorPalette="brand" size="sm">
            <LuPlus size={16} style={{ marginRight: 4 }} /> Добавить команду
          </Button>
        </Link>
      </Flex>

      {/* Фильтры */}
      <Flex gap={3} wrap="wrap">
        <Box flex={1} minW="0" asChild>
          <form onSubmit={handleSearch}>
            <Flex gap={2}>
              <Input
                placeholder="Поиск по названию..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                size="sm"
              />
              <Button type="submit" size="sm" variant="outline">
                <LuSearch size={16} />
              </Button>
            </Flex>
          </form>
        </Box>
        <NativeSelect.Root size="sm" w={{ base: '100%', sm: '200px' }}>
          <NativeSelect.Field value={cityFilter} onChange={(e) => navigate({ city: e.target.value })}>
            <option value="">Все города</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect.Field>
        </NativeSelect.Root>
      </Flex>

      <AdminResponsiveList
        items={teams}
        emptyState={
          <Box bg="bg.panel" p={8} borderRadius="xl" textAlign="center">
            <Text color="fg.muted">{searchQuery || cityFilter ? 'Ничего не найдено' : 'Команд пока нет.'}</Text>
          </Box>
        }
        renderCard={(team) => (
          <AdminCard key={team.id}>
            <Flex justify="space-between" align="start" mb={2}>
              <Box>
                <Text fontWeight="semibold">{team.name}</Text>
                <Badge variant="subtle" size="sm" mt={1}>
                  {team.city.name}
                </Badge>
              </Box>
              <AdminActionsMenu
                actions={[
                  { icon: LuUsers, label: 'Состав', href: `/admin/teams/${team.id}/roster` },
                  { icon: LuPencil, label: 'Редактировать', href: `/admin/teams/${team.id}` },
                  { icon: LuExternalLink, label: 'Публичная страница', href: `/${team.city.slug}/teams/${team.slug}` },
                  { icon: LuTrash2, label: 'Удалить', colorPalette: 'red', onClick: () => setDeleteTarget(team) },
                ]}
              />
            </Flex>
            {team.homeVenue && (
              <AdminCardRow label="Стадион">
                <Text fontSize="sm">{team.homeVenue.name}</Text>
              </AdminCardRow>
            )}
            <AdminCardRow label="Сезоны">{team._count.teamSeasons}</AdminCardRow>
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
                    <Table.ColumnHeader>Стадион</Table.ColumnHeader>
                    <Table.ColumnHeader>Сезоны</Table.ColumnHeader>
                    <Table.ColumnHeader w="100px" />
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {teams.map((team) => (
                    <Table.Row key={team.id}>
                      <Table.Cell fontWeight="medium">{team.name}</Table.Cell>
                      <Table.Cell>
                        <Badge variant="subtle" size="sm">
                          {team.city.name}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell color="fg.muted" fontSize="sm">
                        {team.homeVenue?.name || '—'}
                      </Table.Cell>
                      <Table.Cell>{team._count.teamSeasons}</Table.Cell>
                      <Table.Cell>
                        <AdminActionsMenu
                          actions={[
                            { icon: LuUsers, label: 'Состав', href: `/admin/teams/${team.id}/roster` },
                            { icon: LuPencil, label: 'Редактировать', href: `/admin/teams/${team.id}` },
                            {
                              icon: LuExternalLink,
                              label: 'Публичная страница',
                              href: `/${team.city.slug}/teams/${team.slug}`,
                            },
                            {
                              icon: LuTrash2,
                              label: 'Удалить',
                              colorPalette: 'red',
                              onClick: () => setDeleteTarget(team),
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
        entityName={deleteTarget?.name ?? 'команду'}
        onDelete={handleDelete}
      />
    </VStack>
  )
}
