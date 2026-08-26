'use client'

import { AdminActionsMenu } from '@/app/admin/_components/admin-actions-menu'
import { AdminCard, AdminCardRow } from '@/app/admin/_components/admin-card'
import { AdminResponsiveList } from '@/app/admin/_components/admin-responsive-list'
import { formatDateNumeric } from '@/lib/format-date'
import {
  Badge,
  Box,
  Button,
  Center,
  Circle,
  Flex,
  Heading,
  Input,
  Spinner,
  Table,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { LuPencil, LuSearch } from 'react-icons/lu'
import type { UserItem } from '../_actions/users.action'

/** Форматирование даты */
function formatDate(dateStr: string) {
  return formatDateNumeric(dateStr)
}

/** Первая буква имени для аватара */
function getInitial(name: string) {
  return name?.charAt(0)?.toUpperCase() || '?'
}

export function UsersClient() {
  const [search, setSearch] = useState('')

  const {
    data: users = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<UserItem[]>({
    queryKey: ['admin', 'users'],
    queryFn: () => fetch('/api/admin/users').then((r) => r.json()),
  })

  // Клиентский поиск по имени и email
  const filtered = useMemo(() => {
    if (!search.trim()) {
      return users
    }
    const q = search.toLowerCase()
    return users.filter((u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
  }, [users, search])

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
          <Text color="error.fg">Ошибка загрузки пользователей</Text>
          <Button size="sm" onClick={() => refetch()}>
            Повторить
          </Button>
        </VStack>
      </Center>
    )
  }

  return (
    <VStack gap={6} align="stretch">
      <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
        <Heading size="lg">Пользователи ({users.length})</Heading>
        <Box position="relative" maxW="300px" w="100%">
          <Input
            placeholder="Поиск по имени или email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            pl={10}
            size="sm"
          />
          <LuSearch
            size={16}
            color="var(--chakra-colors-fg-muted)"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
          />
        </Box>
      </Flex>

      <AdminResponsiveList
        items={filtered}
        emptyState={
          <Box bg="bg.panel" p={8} borderRadius="xl" textAlign="center">
            <Text color="fg.muted">{search ? 'Ничего не найдено' : 'Зарегистрированных пользователей пока нет'}</Text>
          </Box>
        }
        renderCard={(user) => (
          <AdminCard key={user.id}>
            <Flex justify="space-between" align="start" mb={2}>
              <Flex align="center" gap={2}>
                <Circle size="36px" bg="brand.subtle" color="brand.fg" fontSize="sm" fontWeight="bold">
                  {getInitial(user.name)}
                </Circle>
                <Box>
                  <Text fontWeight="semibold" fontSize="sm">
                    {user.name || '—'}
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    {user.email}
                  </Text>
                </Box>
              </Flex>
              <AdminActionsMenu actions={[{ icon: LuPencil, label: 'Подробнее', href: `/admin/users/${user.id}` }]} />
            </Flex>
            <AdminCardRow label="Роли">
              <Flex gap={1} wrap="wrap" justify="flex-end">
                {user.roles.includes('ADMIN') && (
                  <Badge colorPalette="red" variant="subtle" size="sm">
                    Админ
                  </Badge>
                )}
                {user.player && (
                  <Badge colorPalette="purple" variant="subtle" size="sm">
                    Поэт
                  </Badge>
                )}
                {!user.roles.includes('ADMIN') && !user.player && (
                  <Text fontSize="sm" color="fg.muted">
                    Пользователь
                  </Text>
                )}
              </Flex>
            </AdminCardRow>
            {user.organizedCities.length > 0 && (
              <AdminCardRow label="Организатор">
                <Flex gap={1} wrap="wrap" justify="flex-end">
                  {user.organizedCities.map((oc) => (
                    <Badge key={oc.id} colorPalette="blue" variant="subtle" size="sm">
                      {oc.city.name}
                    </Badge>
                  ))}
                </Flex>
              </AdminCardRow>
            )}
            <AdminCardRow label="Регистрация">
              <Text fontSize="sm" color="fg.muted">
                {formatDate(user.createdAt)}
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
                    <Table.ColumnHeader>Пользователь</Table.ColumnHeader>
                    <Table.ColumnHeader>Email</Table.ColumnHeader>
                    <Table.ColumnHeader>Роли</Table.ColumnHeader>
                    <Table.ColumnHeader>Организатор</Table.ColumnHeader>
                    <Table.ColumnHeader>Регистрация</Table.ColumnHeader>
                    <Table.ColumnHeader w="60px" />
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filtered.map((user) => (
                    <Table.Row key={user.id}>
                      <Table.Cell>
                        <Flex align="center" gap={2}>
                          <Circle size="32px" bg="brand.subtle" color="brand.fg" fontSize="sm" fontWeight="bold">
                            {getInitial(user.name)}
                          </Circle>
                          <Text fontWeight="medium">{user.name || '—'}</Text>
                        </Flex>
                      </Table.Cell>
                      <Table.Cell fontSize="sm" color="fg.muted">
                        {user.email}
                      </Table.Cell>
                      <Table.Cell>
                        <Flex gap={1} wrap="wrap">
                          {user.roles.includes('ADMIN') && (
                            <Badge colorPalette="red" variant="subtle" size="sm">
                              Админ
                            </Badge>
                          )}
                          {user.player && (
                            <Badge colorPalette="purple" variant="subtle" size="sm">
                              Поэт
                            </Badge>
                          )}
                        </Flex>
                      </Table.Cell>
                      <Table.Cell>
                        <Flex gap={1} wrap="wrap">
                          {user.organizedCities.map((oc) => (
                            <Badge key={oc.id} colorPalette="blue" variant="subtle" size="sm">
                              {oc.city.name}
                            </Badge>
                          ))}
                          {user.organizedCities.length === 0 && (
                            <Text fontSize="sm" color="fg.muted">
                              —
                            </Text>
                          )}
                        </Flex>
                      </Table.Cell>
                      <Table.Cell fontSize="sm" color="fg.muted">
                        {formatDate(user.createdAt)}
                      </Table.Cell>
                      <Table.Cell>
                        <Link href={`/admin/users/${user.id}`}>
                          <Button variant="ghost" size="sm" minW="44px" minH="44px" aria-label="Подробнее">
                            <LuPencil size={16} />
                          </Button>
                        </Link>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
          </Box>
        }
      />
    </VStack>
  )
}
