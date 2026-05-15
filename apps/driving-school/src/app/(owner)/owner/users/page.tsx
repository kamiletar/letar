'use client'

import { Box, Button, Card, Heading, HStack, Spinner, Text, VStack } from '@chakra-ui/react'
import type { UserRole } from '@letar/driving-school-db/prisma'
import NextLink from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'

import { useCountUser, useFindManyUser } from '@/lib/hooks'

import { ExportUsersButton } from './_components/export-users-button'
import { UsersFilters } from './_components/users-filters'
import { UsersTable } from './_components/users-table'

// ZenStack v3: типы не отражают select, добавляем явный тип
interface UserWithRelations {
  id: string
  name: string | null
  email: string
  roles: UserRole[]
  deletedAt: Date | null
  createdAt: Date
  organizationMembers: Array<{ id: string }>
  lessonsAsStudent: Array<{ id: string }>
  lessonsAsInstructor: Array<{ id: string }>
}

export default function UsersPage() {
  const searchParams = useSearchParams()
  const filter = (searchParams.get('filter') || 'all') as
    | 'all'
    | 'users'
    | 'freelance-instructors'
    | 'moderators'
    | 'owners'
  const search = searchParams.get('search') || ''
  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = 20

  // Формируем фильтр для TanStack Query
  const where = useMemo(() => {
    const roleFilter: { roles?: { has: UserRole } } = {}
    if (filter === 'users') {
      roleFilter.roles = { has: 'USER' }
    } else if (filter === 'freelance-instructors') {
      roleFilter.roles = { has: 'FREELANCE_INSTRUCTOR' }
    } else if (filter === 'moderators') {
      roleFilter.roles = { has: 'MODERATOR' }
    } else if (filter === 'owners') {
      roleFilter.roles = { has: 'OWNER' }
    }

    const searchFilter = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}

    return {
      ...roleFilter,
      ...searchFilter,
    }
  }, [filter, search])

  // Загружаем пользователей с пагинацией
  // ZenStack v3: _count не поддерживается, используем include + вычисление .length
  const {
    data: rawUsers,
    isLoading,
    error,
  } = useFindManyUser({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      roles: true,
      deletedAt: true,
      createdAt: true,
      organizationMembers: { select: { id: true } },
      lessonsAsStudent: { select: { id: true } },
      lessonsAsInstructor: { select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  // ZenStack v3: трансформируем данные в формат с _count для совместимости с UsersTable
  const users = useMemo(() => {
    if (!rawUsers) {
      return []
    }
    return (rawUsers as unknown as UserWithRelations[]).map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles,
      deletedAt: user.deletedAt,
      createdAt: user.createdAt,
      _count: {
        organizationMembers: user.organizationMembers?.length ?? 0,
        lessonsAsStudent: user.lessonsAsStudent?.length ?? 0,
        lessonsAsInstructor: user.lessonsAsInstructor?.length ?? 0,
      },
    }))
  }, [rawUsers])

  // Для подсчёта общего количества — count() вместо загрузки всех ID
  const { data: total = 0 } = useCountUser({ where })
  const totalPages = Math.ceil(total / pageSize)

  // Загрузка
  if (isLoading) {
    return (
      <VStack py={8}>
        <Spinner size="lg" />
        <Text color="fg.muted">Загрузка пользователей...</Text>
      </VStack>
    )
  }

  // Ошибка
  if (error) {
    return (
      <Card.Root>
        <Card.Body>
          <Text color="fg.error">Ошибка загрузки данных</Text>
        </Card.Body>
      </Card.Root>
    )
  }

  return (
    <>
      {/* Заголовок */}
      <HStack justify="space-between" align="flex-start" wrap="wrap" gap={4}>
        <Box>
          <Heading size="xl">Управление пользователями</Heading>
          <Text color="fg.muted" mt={2}>
            Всего пользователей: {total}
          </Text>
        </Box>
        <ExportUsersButton />
      </HStack>

      {/* Фильтры и поиск */}
      <Card.Root>
        <Card.Body>
          <UsersFilters filter={filter} search={search} />
        </Card.Body>
      </Card.Root>

      {/* Таблица пользователей */}
      <Card.Root>
        <Card.Body p={0}>
          <UsersTable users={users || []} />
        </Card.Body>
      </Card.Root>

      {/* Пагинация */}
      {totalPages > 1 && (
        <HStack justify="center" gap={2}>
          {page > 1 ? (
            <Button asChild size="sm" variant="outline">
              <NextLink href={buildPageUrl(filter, search, page - 1)}>← Назад</NextLink>
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled>
              ← Назад
            </Button>
          )}
          <Text fontSize="sm" color="fg.muted">
            Страница {page} из {totalPages}
          </Text>
          {page < totalPages ? (
            <Button asChild size="sm" variant="outline">
              <NextLink href={buildPageUrl(filter, search, page + 1)}>Вперёд →</NextLink>
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled>
              Вперёд →
            </Button>
          )}
        </HStack>
      )}
    </>
  )
}

function buildPageUrl(filter: string, search: string, page: number): string {
  const params = new URLSearchParams()

  if (filter && filter !== 'all') {
    params.set('filter', filter)
  }

  if (search) {
    params.set('search', search)
  }

  params.set('page', page.toString())

  return `/owner/users?${params.toString()}`
}
