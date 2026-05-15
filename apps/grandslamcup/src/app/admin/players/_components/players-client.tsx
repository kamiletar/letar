'use client'

/**
 * Список поэтов в админке — поиск, фильтр по городу, пагинация, редактирование.
 */

import { EditPlayerButton } from '@/app/_components/edit-player-button'
import { parseSocialLinks } from '@/app/_components/social-links'
import { AdminCard, AdminCardRow } from '@/app/admin/_components/admin-card'
import { AdminResponsiveList } from '@/app/admin/_components/admin-responsive-list'
import { Badge, Box, Button, Flex, Heading, HStack, Input, NativeSelect, Table, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { LuArrowLeft, LuArrowRight, LuMerge, LuSearch } from 'react-icons/lu'

interface PlayerItem {
  id: string
  name: string
  disambiguation?: string | null
  slug: string
  photo?: string | null
  bio?: string | null
  userId?: string | null
  socialLinks?: unknown
  city: { id: string; name: string; slug?: string } | null
  _count: { playerTeamSeasons: number; performances: number }
  playerTeamSeasons?: { teamSeason: { team: { slug: string } } }[]
}

interface Props {
  players: PlayerItem[]
  cities: { id: string; name: string }[]
  totalCount: number
  currentPage: number
  totalPages: number
  searchQuery: string
  cityFilter: string
}

export function PlayersClient({
  players,
  cities,
  totalCount,
  currentPage,
  totalPages,
  searchQuery,
  cityFilter,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchQuery)

  /** Обновить URL с параметрами поиска */
  function navigate(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    // Сброс на первую страницу при смене фильтров
    if ('q' in updates || 'city' in updates) params.delete('page')
    router.push(`/admin/players?${params.toString()}`)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    navigate({ q: query })
  }

  return (
    <VStack gap={6} align="stretch">
      <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
        <Heading size="lg">Поэты ({totalCount})</Heading>
        <Link href="/admin/players/merge">
          <Button variant="outline" size="sm">
            <LuMerge size={16} />
            Объединить дубли
          </Button>
        </Link>
      </Flex>

      {/* Фильтры */}
      <Flex gap={3} wrap="wrap">
        <Box flex={1} minW="0" asChild>
          <form onSubmit={handleSearch}>
            <Flex gap={2}>
              <Input
                placeholder="Поиск по имени..."
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
        items={players}
        emptyState={
          <Box bg="bg.panel" p={8} borderRadius="xl" textAlign="center">
            <Text color="fg.muted">Поэтов не найдено.</Text>
          </Box>
        }
        renderCard={(player) => (
          <AdminCard key={player.id}>
            <Flex justify="space-between" align="start" mb={1}>
              <Link href={`/admin/players/${player.id}`}>
                <Text fontWeight="semibold" _hover={{ color: 'brand.fg' }}>
                  {player.name}
                </Text>
              </Link>
              <EditPlayerButton
                playerId={player.id}
                playerName={player.name}
                playerUserId={player.userId ?? null}
                playerPhoto={player.photo ?? null}
                bio={player.bio ?? null}
                socialLinks={parseSocialLinks(player.socialLinks)}
                currentTeamId={player.playerTeamSeasons?.[0]?.teamSeason.team.slug ?? null}
                canEdit
              />
            </Flex>
            {player.city && (
              <Badge variant="subtle" size="sm" mb={2}>
                {player.city.name}
              </Badge>
            )}
            <AdminCardRow label="Команд">{player._count.playerTeamSeasons}</AdminCardRow>
            <AdminCardRow label="Выступлений">{player._count.performances}</AdminCardRow>
          </AdminCard>
        )}
        tableContent={
          <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border.muted" overflow="hidden">
            <Box overflowX="auto">
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Имя</Table.ColumnHeader>
                    <Table.ColumnHeader display={{ base: 'none', md: 'table-cell' }}>Город</Table.ColumnHeader>
                    <Table.ColumnHeader>Команд</Table.ColumnHeader>
                    <Table.ColumnHeader>Выст.</Table.ColumnHeader>
                    <Table.ColumnHeader w="50px" />
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {players.map((player) => (
                    <Table.Row key={player.id}>
                      <Table.Cell fontWeight="medium">
                        <Link href={`/admin/players/${player.id}`}>
                          <Text _hover={{ color: 'brand.fg' }}>{player.name}</Text>
                        </Link>
                      </Table.Cell>
                      <Table.Cell display={{ base: 'none', md: 'table-cell' }}>
                        {player.city ? (
                          <Badge variant="subtle" size="sm">
                            {player.city.name}
                          </Badge>
                        ) : (
                          <Text color="fg.muted" fontSize="sm">
                            —
                          </Text>
                        )}
                      </Table.Cell>
                      <Table.Cell>{player._count.playerTeamSeasons}</Table.Cell>
                      <Table.Cell>{player._count.performances}</Table.Cell>
                      <Table.Cell>
                        <EditPlayerButton
                          playerId={player.id}
                          playerName={player.name}
                          playerUserId={player.userId ?? null}
                          playerPhoto={player.photo ?? null}
                          bio={player.bio ?? null}
                          socialLinks={parseSocialLinks(player.socialLinks)}
                          currentTeamId={player.playerTeamSeasons?.[0]?.teamSeason.team.slug ?? null}
                          canEdit
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

      {/* Пагинация */}
      {totalPages > 1 && (
        <Flex justify="center" gap={3} align="center">
          <Button
            size="sm"
            variant="outline"
            disabled={currentPage <= 1}
            onClick={() => navigate({ page: String(currentPage - 1) })}
          >
            <LuArrowLeft size={14} />
          </Button>
          <HStack gap={1}>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 7) {
                pageNum = i + 1
              } else if (currentPage <= 4) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 3) {
                pageNum = totalPages - 6 + i
              } else {
                pageNum = currentPage - 3 + i
              }
              return (
                <Button
                  key={pageNum}
                  size="sm"
                  variant={pageNum === currentPage ? 'solid' : 'outline'}
                  colorPalette={pageNum === currentPage ? 'brand' : undefined}
                  onClick={() => navigate({ page: String(pageNum) })}
                >
                  {pageNum}
                </Button>
              )
            })}
          </HStack>
          <Button
            size="sm"
            variant="outline"
            disabled={currentPage >= totalPages}
            onClick={() => navigate({ page: String(currentPage + 1) })}
          >
            <LuArrowRight size={14} />
          </Button>
        </Flex>
      )}
    </VStack>
  )
}
