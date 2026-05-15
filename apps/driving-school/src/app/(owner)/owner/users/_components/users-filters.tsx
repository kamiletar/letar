'use client'

import { Box, Button, HStack, Input, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { LuFilter, LuSearch } from 'react-icons/lu'

interface UsersFiltersProps {
  filter: string
  search: string
}

export function UsersFilters({ filter, search }: UsersFiltersProps) {
  return (
    <VStack gap={4} align="stretch">
      {/* Фильтры по ролям */}
      <HStack wrap="wrap" gap={2}>
        <HStack gap={2} color="fg.muted">
          <LuFilter />
          <Text fontSize="sm" fontWeight="medium">
            Роль:
          </Text>
        </HStack>
        <FilterButton href="/owner/users" isActive={filter === 'all'}>
          Все
        </FilterButton>
        <FilterButton href="/owner/users?filter=students" isActive={filter === 'students'}>
          Ученики
        </FilterButton>
        <FilterButton href="/owner/users?filter=instructors" isActive={filter === 'instructors'}>
          Инструкторы
        </FilterButton>
        <FilterButton href="/owner/users?filter=school-admins" isActive={filter === 'school-admins'}>
          Админы школ
        </FilterButton>
        <FilterButton href="/owner/users?filter=owners" isActive={filter === 'owners'}>
          Владельцы
        </FilterButton>
      </HStack>

      {/* Поиск */}
      <form action="/owner/users" method="get">
        {filter !== 'all' && <input type="hidden" name="filter" value={filter} />}
        <HStack>
          <Box flex={1}>
            <Input name="search" placeholder="Поиск по имени или email..." defaultValue={search} size="md" />
          </Box>
          <Button type="submit" colorPalette="brand" size="md">
            <LuSearch />
            Найти
          </Button>
        </HStack>
      </form>
    </VStack>
  )
}

function FilterButton({ href, isActive, children }: { href: string; isActive: boolean; children: React.ReactNode }) {
  return (
    <Button asChild size="sm" variant={isActive ? 'solid' : 'outline'} colorPalette={isActive ? 'fg' : 'gray'}>
      <NextLink href={href}>{children}</NextLink>
    </Button>
  )
}
