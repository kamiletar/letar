'use client'

import { AdminCard } from '@/app/admin/_components/admin-card'
import { AdminResponsiveList } from '@/app/admin/_components/admin-responsive-list'
import {
  Badge,
  Box,
  Button,
  Dialog,
  Flex,
  Heading,
  HStack,
  IconButton,
  Menu,
  NativeSelect,
  Portal,
  Table,
  Text,
  VStack,
} from '@chakra-ui/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LuCamera, LuExternalLink, LuLink, LuPlus, LuSearch, LuTrash2 } from 'react-icons/lu'

import { LoadMoreButton } from '@/app/_components/load-more-button'
import { formatDateTime } from '@/lib/format-date'
import { getDisplayStatus, matchStatusColors, matchStatusLabels } from '@/lib/match-status'
import { deleteMatchAction } from '../_actions/match-admin.action'
import { StaffPicker } from './staff-picker'

interface MatchItem {
  id: string
  matchType: string
  status: string
  homeScore: number
  awayScore: number
  scheduledAt: Date | null
  scorerToken: string
  presenterToken: string
  homeCoachToken: string
  awayCoachToken: string
  scorerUserId: string | null
  presenterUserId: string | null
  scorerUser: { id: string; name: string | null } | null
  presenterUser: { id: string; name: string | null } | null
  homeTeam: { team: { name: string; slug: string } }
  awayTeam: { team: { name: string; slug: string } }
  venue: { name: string } | null
  tour: { number: number; round: { name: string; season: { name: string } } } | null
  citySlug: string
}

interface CityOption {
  id: string
  name: string
}

export function MatchesClient({
  matches,
  totalCount,
  cities,
  currentCity,
  currentStatus,
}: {
  matches: MatchItem[]
  totalCount: number
  cities: CityOption[]
  currentCity: string
  currentStatus: string
}) {
  const router = useRouter()
  const [deleteTarget, setDeleteTarget] = useState<MatchItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    setDeleteError(null)
    const res = await deleteMatchAction(deleteTarget.id)
    setDeleteLoading(false)
    if (!res.success) {
      setDeleteError(res.error ?? 'Не удалось удалить')
      return
    }
    setDeleteTarget(null)
    router.refresh()
  }

  /** Обновить фильтр через URL searchParams */
  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(window.location.search)
    if (value === 'ALL') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.push(`/admin/matches?${params.toString()}`)
  }

  return (
    <VStack gap={6} align="stretch">
      <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
        <Heading size="lg">Матчи ({totalCount})</Heading>
        <Button colorPalette="blue" size="sm" asChild>
          <Link href="/admin/matches/create">
            <LuPlus />
            Создать матч
          </Link>
        </Button>
      </Flex>

      {/* Фильтры */}
      <Flex gap={3} wrap="wrap">
        <NativeSelect.Root size="sm" maxW="200px">
          <NativeSelect.Field value={currentCity} onChange={(e) => updateFilter('city', e.target.value)}>
            <option value="ALL">Все города</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect.Field>
        </NativeSelect.Root>

        <NativeSelect.Root size="sm" maxW="200px">
          <NativeSelect.Field value={currentStatus} onChange={(e) => updateFilter('status', e.target.value)}>
            <option value="ALL">Все статусы</option>
            <option value="SCHEDULED">Запланирован</option>
            <option value="LIVE">Идёт</option>
            <option value="FINISHED">Завершён</option>
            <option value="POSTPONED">Отложен</option>
          </NativeSelect.Field>
        </NativeSelect.Root>
      </Flex>

      <AdminResponsiveList
        items={matches}
        emptyState={
          <Box bg="bg.panel" p={8} borderRadius="xl" textAlign="center">
            <Text color="fg.muted">Матчей пока нет. Создайте расписание в разделе Сезоны.</Text>
          </Box>
        }
        renderCard={(match) => {
          const score =
            match.status === 'FINISHED' || match.status === 'LIVE' ? `${match.homeScore} : ${match.awayScore}` : '— : —'
          return (
            <AdminCard key={match.id}>
              {/* Сезон / Тур */}
              <Text fontSize="xs" color="fg.muted" mb={1}>
                {match.tour
                  ? `${match.tour.round.season.name}, ${match.tour.round.name}, тур ${match.tour.number}`
                  : 'Товарищеский'}
              </Text>
              {/* Команды и счёт */}
              <Flex align="center" justify="center" gap={2} py={2}>
                <Text fontWeight="semibold" fontSize="sm" textAlign="end" flex={1}>
                  {match.homeTeam.team.name}
                </Text>
                <Text fontWeight="bold" fontSize="md" px={2}>
                  {score}
                </Text>
                <Text fontWeight="semibold" fontSize="sm" textAlign="start" flex={1}>
                  {match.awayTeam.team.name}
                </Text>
              </Flex>
              {/* Мета-информация */}
              <Flex justify="space-between" align="center" mt={1}>
                <Flex gap={2} align="center" wrap="wrap">
                  <Badge colorPalette={matchStatusColors[getDisplayStatus(match)]} size="sm">
                    {matchStatusLabels[getDisplayStatus(match)]}
                  </Badge>
                  {match.venue && (
                    <Text fontSize="xs" color="fg.muted">
                      {match.venue.name}
                    </Text>
                  )}
                </Flex>
                {/* Действия */}
                <HStack gap={1}>
                  <IconButton size="xs" variant="ghost" title="Детали" asChild>
                    <Link href={`/admin/matches/${match.id}`}>
                      <LuSearch />
                    </Link>
                  </IconButton>
                  <IconButton size="xs" variant="ghost" title="Фото" asChild>
                    <Link href={`/admin/matches/${match.id}/photos`}>
                      <LuCamera />
                    </Link>
                  </IconButton>
                  {(match.status === 'SCHEDULED' || match.status === 'LIVE') && <MatchLinksMenu match={match} />}
                </HStack>
              </Flex>
            </AdminCard>
          )
        }}
        tableContent={
          <>
            <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border.muted" overflow="hidden">
              <Box overflowX="auto">
                <Table.Root>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>Сезон / Тур</Table.ColumnHeader>
                      <Table.ColumnHeader display={{ base: 'none', md: 'table-cell' }}>Дата</Table.ColumnHeader>
                      <Table.ColumnHeader>Хозяева</Table.ColumnHeader>
                      <Table.ColumnHeader>Счёт</Table.ColumnHeader>
                      <Table.ColumnHeader>Гости</Table.ColumnHeader>
                      <Table.ColumnHeader display={{ base: 'none', lg: 'table-cell' }}>Площадка</Table.ColumnHeader>
                      <Table.ColumnHeader display={{ base: 'none', xl: 'table-cell' }}>Ведущий</Table.ColumnHeader>
                      <Table.ColumnHeader display={{ base: 'none', xl: 'table-cell' }}>Счетовод</Table.ColumnHeader>
                      <Table.ColumnHeader>Статус</Table.ColumnHeader>
                      <Table.ColumnHeader></Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {matches.map((match) => {
                      const citySlug = match.citySlug
                      return (
                        <Table.Row key={match.id}>
                          <Table.Cell fontSize="sm" color="fg.muted">
                            {match.tour
                              ? `${match.tour.round.season.name}, ${match.tour.round.name}, тур ${match.tour.number}`
                              : 'Товарищеский'}
                          </Table.Cell>
                          <Table.Cell
                            display={{ base: 'none', md: 'table-cell' }}
                            fontSize="sm"
                            color="fg.muted"
                            whiteSpace="nowrap"
                          >
                            {match.scheduledAt ? formatDateTime(match.scheduledAt) : '—'}
                          </Table.Cell>
                          <Table.Cell fontWeight="medium">
                            {citySlug ? (
                              <Link href={`/${citySlug}/teams/${match.homeTeam.team.slug}`}>
                                <Text _hover={{ textDecoration: 'underline' }}>{match.homeTeam.team.name}</Text>
                              </Link>
                            ) : (
                              match.homeTeam.team.name
                            )}
                          </Table.Cell>
                          <Table.Cell fontWeight="bold" textAlign="center">
                            {match.status === 'FINISHED' || match.status === 'LIVE'
                              ? `${match.homeScore} : ${match.awayScore}`
                              : '— : —'}
                          </Table.Cell>
                          <Table.Cell fontWeight="medium">
                            {citySlug ? (
                              <Link href={`/${citySlug}/teams/${match.awayTeam.team.slug}`}>
                                <Text _hover={{ textDecoration: 'underline' }}>{match.awayTeam.team.name}</Text>
                              </Link>
                            ) : (
                              match.awayTeam.team.name
                            )}
                          </Table.Cell>
                          <Table.Cell display={{ base: 'none', lg: 'table-cell' }} color="fg.muted" fontSize="sm">
                            {match.venue?.name || '—'}
                          </Table.Cell>
                          <Table.Cell display={{ base: 'none', xl: 'table-cell' }}>
                            <StaffPicker matchId={match.id} field="presenterUserId" currentUser={match.presenterUser} />
                          </Table.Cell>
                          <Table.Cell display={{ base: 'none', xl: 'table-cell' }}>
                            <StaffPicker matchId={match.id} field="scorerUserId" currentUser={match.scorerUser} />
                          </Table.Cell>
                          <Table.Cell>
                            <Badge colorPalette={matchStatusColors[getDisplayStatus(match)]} size="sm">
                              {matchStatusLabels[getDisplayStatus(match)]}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell>
                            <HStack gap={1}>
                              <IconButton size="xs" variant="ghost" title="Детали" asChild>
                                <Link href={`/admin/matches/${match.id}`}>
                                  <LuSearch />
                                </Link>
                              </IconButton>
                              <IconButton size="xs" variant="ghost" title="Фото" asChild>
                                <Link href={`/admin/matches/${match.id}/photos`}>
                                  <LuCamera />
                                </Link>
                              </IconButton>
                              {citySlug && (
                                <IconButton size="xs" variant="ghost" title="На сайте" asChild>
                                  <Link href={`/${citySlug}/matches/${match.id}`} target="_blank">
                                    <LuExternalLink />
                                  </Link>
                                </IconButton>
                              )}
                              {(match.status === 'SCHEDULED' || match.status === 'LIVE') && (
                                <MatchLinksMenu match={match} />
                              )}
                              {match.status === 'SCHEDULED' && (
                                <IconButton
                                  size="xs"
                                  variant="ghost"
                                  colorPalette="red"
                                  title="Удалить матч"
                                  onClick={() => setDeleteTarget(match)}
                                >
                                  <LuTrash2 />
                                </IconButton>
                              )}
                            </HStack>
                          </Table.Cell>
                        </Table.Row>
                      )
                    })}
                  </Table.Body>
                </Table.Root>
              </Box>
            </Box>
            <LoadMoreButton currentCount={matches.length} totalCount={totalCount} />
          </>
        }
      />

      {/* Диалог подтверждения удаления */}
      <Dialog.Root
        open={!!deleteTarget}
        onOpenChange={(d) => {
          if (!d.open) {
            setDeleteTarget(null)
            setDeleteError(null)
          }
        }}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Удалить матч?</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                {deleteTarget && (
                  <Text>
                    {deleteTarget.homeTeam.team.name} — {deleteTarget.awayTeam.team.name}
                    {deleteTarget.scheduledAt && `, ${formatDateTime(deleteTarget.scheduledAt)}`}
                  </Text>
                )}
                {deleteError && (
                  <Text color="red.fg" fontSize="sm" mt={2}>
                    {deleteError}
                  </Text>
                )}
              </Dialog.Body>
              <Dialog.Footer>
                <HStack gap={3}>
                  <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                    Отмена
                  </Button>
                  <Button colorPalette="red" onClick={handleDelete} loading={deleteLoading}>
                    Удалить
                  </Button>
                </HStack>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </VStack>
  )
}

/** Выпадающее меню с live-ссылками матча (скорер, ведущий, тренеры, проектор) */
function MatchLinksMenu({ match }: { match: MatchItem }) {
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <IconButton size="xs" variant="ghost">
          <LuLink />
        </IconButton>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content minW="200px">
            <Menu.Item value="scorer" asChild>
              <a href={`/match/${match.id}/score?token=${match.scorerToken}`}>Скорер</a>
            </Menu.Item>
            <Menu.Item value="presenter" asChild>
              <a href={`/match/${match.id}/presenter?token=${match.presenterToken}`}>Ведущий</a>
            </Menu.Item>
            <Menu.Item value="coach-home" asChild>
              <a href={`/match/${match.id}/coach?token=${match.homeCoachToken}`}>Тренер (Д)</a>
            </Menu.Item>
            <Menu.Item value="coach-away" asChild>
              <a href={`/match/${match.id}/coach?token=${match.awayCoachToken}`}>Тренер (Г)</a>
            </Menu.Item>
            <Menu.Item value="live" asChild>
              <a href={`/match/${match.id}/live`}>Проектор</a>
            </Menu.Item>
            <Menu.Item value="protocol" asChild>
              <a href={`/match/${match.id}/protocol`}>Протокол</a>
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}
