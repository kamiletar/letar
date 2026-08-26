'use client'

/**
 * Клиент страницы пользователей
 *
 * Показывает список пользователей с ролями, датой регистрации
 * и статистикой (загруженные аниме, API ключи, библиотека).
 */

import {
  Avatar,
  Badge,
  Box,
  Button,
  Center,
  Container,
  Flex,
  Heading,
  HStack,
  Input,
  Spinner,
  Table,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import NextLink from 'next/link'
import { useState } from 'react'
import { LuArrowLeft, LuChevronLeft, LuChevronRight, LuSearch, LuUsers } from 'react-icons/lu'

/** Пользователь (ответ API) */
interface UserItem {
  id: string
  name: string | null
  email: string | null
  image: string | null
  role: 'USER' | 'MODERATOR' | 'ADMIN'
  createdAt: string
  _count: {
    anime: number
    apiKeys: number
    libraryItems: number
  }
}

interface UsersResponse {
  data: UserItem[]
  total: number
  page: number
  totalPages: number
}

/** Цвет бейджа по роли */
const ROLE_COLOR: Record<string, string> = {
  ADMIN: 'red',
  MODERATOR: 'orange',
  USER: 'gray',
}

/** Название роли */
const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Админ',
  MODERATOR: 'Модератор',
  USER: 'Пользователь',
}

/** Загрузить список пользователей */
async function fetchUsers(page: number, q?: string): Promise<UsersResponse> {
  const params = new URLSearchParams({ page: String(page), limit: '50' })
  if (q) {
    params.set('q', q)
  }
  const res = await fetch(`/api/admin/users?${params}`)
  if (!res.ok) {
    throw new Error('Ошибка загрузки')
  }
  return res.json()
}

export function UsersListClient() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'users', page, search],
    queryFn: () => fetchUsers(page, search || undefined),
  })

  const users = data?.data ?? []

  /** Поиск по Enter */
  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
  }

  return (
    <Box minH="100vh" bg="bg">
      {/* Шапка */}
      <Box bg="bg.panel" borderBottomWidth="1px" py={4}>
        <Container maxW="container.xl">
          <Flex justify="space-between" align="center">
            <HStack gap={4}>
              <Button asChild variant="ghost" size="sm">
                <NextLink href="/admin">
                  <LuArrowLeft style={{ marginRight: '8px' }} />
                  Админ-панель
                </NextLink>
              </Button>
              <Heading size="lg">
                <LuUsers style={{ marginRight: '8px' }} />
                Пользователи ({data?.total ?? 0})
              </Heading>
            </HStack>
          </Flex>
        </Container>
      </Box>

      <Container maxW="container.xl" py={8}>
        <VStack align="stretch" gap={6}>
          {/* Поиск */}
          <HStack maxW="400px">
            <Input
              placeholder="Поиск по имени или email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button variant="outline" onClick={handleSearch}>
              <LuSearch />
            </Button>
          </HStack>

          {/* Загрузка */}
          {isLoading
            ? (
              <Center py={12}>
                <Spinner size="lg" />
              </Center>
            )
            : isError
            ? (
              <Center py={12}>
                <VStack gap={2}>
                  <Text color="red.500">Ошибка загрузки</Text>
                  <Button size="sm" onClick={() => refetch()}>
                    Повторить
                  </Button>
                </VStack>
              </Center>
            )
            : users.length === 0
            ? (
              <Center py={12}>
                <VStack gap={2}>
                  <LuUsers size={48} color="var(--chakra-colors-fg-muted)" />
                  <Text color="fg.muted" fontSize="lg">
                    {search ? 'Ничего не найдено' : 'Нет пользователей'}
                  </Text>
                </VStack>
              </Center>
            )
            : (
              <>
                {/* Таблица */}
                <Box borderWidth="1px" borderRadius="xl" overflow="hidden">
                  <Table.Root size="sm">
                    <Table.Header>
                      <Table.Row bg="bg.subtle">
                        <Table.ColumnHeader>Пользователь</Table.ColumnHeader>
                        <Table.ColumnHeader>Роль</Table.ColumnHeader>
                        <Table.ColumnHeader>Загружено</Table.ColumnHeader>
                        <Table.ColumnHeader>Библиотека</Table.ColumnHeader>
                        <Table.ColumnHeader>API ключи</Table.ColumnHeader>
                        <Table.ColumnHeader>Регистрация</Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {users.map((user) => (
                        <Table.Row key={user.id} _hover={{ bg: 'bg.subtle' }}>
                          <Table.Cell>
                            <HStack gap={3}>
                              <Avatar.Root size="sm">
                                {user.image && <Avatar.Image src={user.image} />}
                                <Avatar.Fallback>{(user.name || user.email || '?')[0]?.toUpperCase()}</Avatar.Fallback>
                              </Avatar.Root>
                              <VStack align="start" gap={0}>
                                <Text fontWeight="medium" lineClamp={1}>
                                  {user.name || '—'}
                                </Text>
                                <Text fontSize="xs" color="fg.muted" lineClamp={1}>
                                  {user.email || '—'}
                                </Text>
                              </VStack>
                            </HStack>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge colorPalette={ROLE_COLOR[user.role]} size="sm">
                              {ROLE_LABEL[user.role] || user.role}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell>
                            <Text fontSize="sm">{user._count.anime}</Text>
                          </Table.Cell>
                          <Table.Cell>
                            <Text fontSize="sm">{user._count.libraryItems}</Text>
                          </Table.Cell>
                          <Table.Cell>
                            <Text fontSize="sm">{user._count.apiKeys}</Text>
                          </Table.Cell>
                          <Table.Cell>
                            <Text fontSize="sm" color="fg.muted">
                              {new Date(user.createdAt).toLocaleDateString('ru')}
                            </Text>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </Box>

                {/* Пагинация */}
                {data && data.totalPages > 1 && (
                  <HStack justify="center" gap={2}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      <LuChevronLeft />
                    </Button>
                    <Text fontSize="sm" color="fg.muted">
                      {page} / {data.totalPages}
                    </Text>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                      disabled={page >= data.totalPages}
                    >
                      <LuChevronRight />
                    </Button>
                  </HStack>
                )}
              </>
            )}
        </VStack>
      </Container>
    </Box>
  )
}
