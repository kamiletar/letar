'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { linkPlayerToUserByIdAction, searchUnlinkedPlayersAction } from '@/app/admin/_actions/player-link.action'
import { DeleteDialog } from '@/app/admin/_components/delete-dialog'
import { adminUnlinkPlayerAction } from '@/app/admin/teams/_actions/roster-admin.action'
import type { CityOrganizerItem } from '@/app/admin/users/_actions/users.action'
import {
  addCityOrganizerAction,
  removeCityOrganizerAction,
  toggleAdminRoleAction,
} from '@/app/admin/users/_actions/users.action'
import { formatDateNumeric } from '@/lib/format-date'
import {
  Badge,
  Box,
  Button,
  Circle,
  Flex,
  Heading,
  HStack,
  Icon,
  Input,
  NativeSelect,
  Table,
  Text,
  VStack,
} from '@chakra-ui/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useRef, useState } from 'react'
import { LuArrowLeft, LuLink, LuPlus, LuShield, LuShieldOff, LuTrash2, LuUnlink, LuUserRound } from 'react-icons/lu'

interface UserData {
  id: string
  name: string | null
  email: string
  image: string | null
  roles: string[]
  createdAt: string
  organizedCities: CityOrganizerItem[]
  player: { id: string; name: string } | null
}

interface CityOption {
  id: string
  name: string
}

interface UserDetailClientProps {
  user: UserData
  allCities: CityOption[]
}

/** Форматирование даты */
function formatDate(dateStr: string) {
  return formatDateNumeric(dateStr)
}

export function UserDetailClient({ user, allCities }: UserDetailClientProps) {
  const router = useRouter()
  const [selectedCityId, setSelectedCityId] = useState('')
  const [addingCity, setAddingCity] = useState(false)
  const [togglingAdmin, setTogglingAdmin] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<CityOrganizerItem | null>(null)

  const isAdmin = user.roles.includes('ADMIN')

  // Города, которые ещё не назначены пользователю
  const availableCities = useMemo(() => {
    const assignedCityIds = new Set(user.organizedCities.map((oc) => oc.cityId))
    return allCities.filter((c) => !assignedCityIds.has(c.id))
  }, [allCities, user.organizedCities])

  /** Добавить город организатора */
  const handleAddCity = async () => {
    if (!selectedCityId) {
      return
    }
    setAddingCity(true)
    try {
      const result = await addCityOrganizerAction({ userId: user.id, cityId: selectedCityId })
      if (result.success) {
        toaster.success({ title: 'Город назначен' })
        setSelectedCityId('')
        router.refresh()
      } else {
        toaster.error({ title: result.error })
      }
    } finally {
      setAddingCity(false)
    }
  }

  /** Снять организатора */
  const handleRemoveCity = async () => {
    if (!removeTarget) {
      return
    }
    const result = await removeCityOrganizerAction({ id: removeTarget.id })
    if (result.success) {
      toaster.success({ title: 'Организатор снят' })
      router.refresh()
    } else {
      toaster.error({ title: result.error })
    }
  }

  /** Переключить роль ADMIN */
  const handleToggleAdmin = async () => {
    setTogglingAdmin(true)
    try {
      const result = await toggleAdminRoleAction({ userId: user.id, makeAdmin: !isAdmin })
      if (result.success) {
        toaster.success({ title: isAdmin ? 'Роль админа снята' : 'Роль админа назначена' })
        router.refresh()
      } else {
        toaster.error({ title: result.error })
      }
    } finally {
      setTogglingAdmin(false)
    }
  }

  return (
    <VStack gap={8} align="stretch">
      {/* Шапка с кнопкой назад */}
      <Flex align="center" gap={3}>
        <Link href="/admin/users">
          <Button variant="ghost" size="sm" minW="44px" minH="44px">
            <Icon as={LuArrowLeft} />
          </Button>
        </Link>
        <Heading size="lg">Пользователь</Heading>
      </Flex>

      {/* Секция: Информация */}
      <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border.muted" p={6}>
        <Heading size="md" mb={4}>
          Информация
        </Heading>
        <Flex gap={4} align="start" wrap="wrap">
          <Circle size="64px" bg="brand.subtle" color="brand.fg" fontSize="2xl" fontWeight="bold">
            {user.name?.charAt(0)?.toUpperCase() || '?'}
          </Circle>
          <VStack align="start" gap={1}>
            <Text fontWeight="bold" fontSize="lg">
              {user.name || '—'}
            </Text>
            <Text color="fg.muted">{user.email}</Text>
            <Text color="fg.muted" fontSize="sm">
              Зарегистрирован: {formatDate(user.createdAt)}
            </Text>
            {user.player && (
              <Link href={`/admin/players/${user.player.id}`}>
                <Flex align="center" gap={1} color="brand.fg" fontSize="sm">
                  <Icon as={LuUserRound} boxSize={4} />
                  <Text>Поэт: {user.player.name}</Text>
                </Flex>
              </Link>
            )}
          </VStack>
        </Flex>
      </Box>

      {/* Секция: Роли */}
      <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border.muted" p={6}>
        <Heading size="md" mb={4}>
          Роли
        </Heading>
        <Flex align="center" gap={3} wrap="wrap">
          <Flex gap={2}>
            <Badge variant="subtle" size="sm">
              USER
            </Badge>
            {isAdmin && (
              <Badge colorPalette="red" variant="subtle" size="sm">
                ADMIN
              </Badge>
            )}
          </Flex>
          <Button
            size="sm"
            variant="outline"
            colorPalette={isAdmin ? 'red' : 'green'}
            onClick={handleToggleAdmin}
            loading={togglingAdmin}
          >
            <Icon as={isAdmin ? LuShieldOff : LuShield} mr={1} />
            {isAdmin ? 'Снять админа' : 'Сделать админом'}
          </Button>
        </Flex>
      </Box>

      {/* Секция: Организатор городов */}
      <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border.muted" p={6}>
        <Heading size="md" mb={4}>
          Организатор городов
        </Heading>

        {user.organizedCities.length > 0
          ? (
            <Box borderWidth="1px" borderColor="border.muted" borderRadius="lg" overflow="hidden" mb={4}>
              <Box overflowX="auto">
                <Table.Root size="sm">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>Город</Table.ColumnHeader>
                      <Table.ColumnHeader>Назначен</Table.ColumnHeader>
                      <Table.ColumnHeader w="60px" />
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {user.organizedCities.map((oc) => (
                      <Table.Row key={oc.id}>
                        <Table.Cell fontWeight="medium">{oc.city.name}</Table.Cell>
                        <Table.Cell fontSize="sm" color="fg.muted">
                          {formatDate(oc.createdAt)}
                        </Table.Cell>
                        <Table.Cell>
                          <Button
                            variant="ghost"
                            size="sm"
                            minW="44px"
                            minH="44px"
                            colorPalette="red"
                            aria-label="Снять организатора"
                            onClick={() => setRemoveTarget(oc)}
                          >
                            <Icon as={LuTrash2} />
                          </Button>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>
            </Box>
          )
          : (
            <Text color="fg.muted" mb={4}>
              Не назначен организатором ни одного города
            </Text>
          )}

        {/* Добавление города */}
        {availableCities.length > 0 && (
          <Flex gap={2} align="center">
            <NativeSelect.Root size="sm" maxW="250px">
              <NativeSelect.Field value={selectedCityId} onChange={(e) => setSelectedCityId(e.target.value)}>
                <option value="">Выберите город...</option>
                {availableCities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </NativeSelect.Field>
            </NativeSelect.Root>
            <Button
              size="sm"
              colorPalette="brand"
              onClick={handleAddCity}
              loading={addingCity}
              disabled={!selectedCityId}
            >
              <Icon as={LuPlus} mr={1} />
              Добавить
            </Button>
          </Flex>
        )}

        {availableCities.length === 0 && user.organizedCities.length > 0 && (
          <Text color="fg.muted" fontSize="sm">
            Все города уже назначены
          </Text>
        )}
      </Box>

      {/* Секция: Привязка поэта */}
      <PlayerLinkBlock userId={user.id} player={user.player} />

      {/* Диалог подтверждения удаления организатора */}
      <DeleteDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        entityName={`организатора ${removeTarget?.city.name ?? ''}`}
        onDelete={handleRemoveCity}
      />
    </VStack>
  )
}

// === Блок привязки поэта к пользователю ===

interface SearchResult {
  id: string
  name: string
  slug: string
  city: { name: string } | null
}

function PlayerLinkBlock({ userId, player }: { userId: string; player: { id: string; name: string } | null }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [linking, setLinking] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  /** Поиск поэтов по имени (debounce) */
  const handleSearch = (value: string) => {
    setQuery(value)
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (value.trim().length < 2) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const result = await searchUnlinkedPlayersAction({ query: value.trim() })
        if ('data' in result && result.data) {
          setResults(result.data as SearchResult[])
        }
      } finally {
        setSearching(false)
      }
    }, 300)
  }

  /** Привязать выбранного поэта */
  const handleLink = async (playerId: string) => {
    setLinking(true)
    try {
      const result = await linkPlayerToUserByIdAction({ playerId, userId })
      if ('error' in result) {
        toaster.error({ title: String(result.error) })
      } else {
        toaster.success({ title: 'Поэт привязан к аккаунту' })
        setQuery('')
        setResults([])
        router.refresh()
      }
    } finally {
      setLinking(false)
    }
  }

  /** Отвязать поэта */
  const handleUnlink = async () => {
    if (!player) {
      return
    }
    setUnlinking(true)
    try {
      const result = await adminUnlinkPlayerAction({ playerId: player.id })
      if ('error' in result) {
        toaster.error({ title: String(result.error) })
      } else {
        toaster.success({ title: 'Привязка снята' })
        router.refresh()
      }
    } finally {
      setUnlinking(false)
    }
  }

  return (
    <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border.muted" p={6}>
      <Heading size="md" mb={4}>
        Привязка поэта
      </Heading>

      {player
        ? (
          <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
            <HStack gap={2}>
              <Badge colorPalette="green">Привязан</Badge>
              <Link href={`/admin/players/${player.id}`}>
                <Text fontSize="sm" color="brand.fg" _hover={{ textDecoration: 'underline' }}>
                  {player.name}
                </Text>
              </Link>
            </HStack>
            <Button size="sm" variant="outline" colorPalette="red" onClick={handleUnlink} loading={unlinking}>
              <Icon as={LuUnlink} />
              Отвязать
            </Button>
          </Flex>
        )
        : (
          <VStack align="stretch" gap={3}>
            <Text fontSize="sm" color="fg.muted">
              Нет привязанного поэта. Найдите по имени:
            </Text>
            <HStack gap={2}>
              <Box position="relative" maxW="350px" flex={1}>
                <Input
                  size="sm"
                  placeholder="Поиск поэта по имени..."
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </Box>
              {searching && (
                <Text fontSize="xs" color="fg.muted">
                  Поиск...
                </Text>
              )}
            </HStack>

            {results.length > 0 && (
              <Box borderWidth="1px" borderColor="border.muted" borderRadius="lg" overflow="hidden">
                <Table.Root size="sm">
                  <Table.Body>
                    {results.map((p) => (
                      <Table.Row key={p.id}>
                        <Table.Cell>
                          <Text fontWeight="medium" fontSize="sm">
                            {p.name}
                          </Text>
                          {p.city && (
                            <Text fontSize="xs" color="fg.muted">
                              {p.city.name}
                            </Text>
                          )}
                        </Table.Cell>
                        <Table.Cell textAlign="right">
                          <Button
                            size="sm"
                            colorPalette="brand"
                            onClick={() => handleLink(p.id)}
                            loading={linking}
                          >
                            <Icon as={LuLink} />
                            Привязать
                          </Button>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>
            )}

            {query.trim().length >= 2 && !searching && results.length === 0 && (
              <Text fontSize="sm" color="fg.muted">
                Поэты без привязки не найдены
              </Text>
            )}
          </VStack>
        )}
    </Box>
  )
}
