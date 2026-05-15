'use client'

import {
  type BulkAction,
  BulkActionBar,
  RowCheckbox,
  SelectAllCheckbox,
  useBulkSelection,
} from '@/app/_components/bulk-actions'
import { toaster } from '@/app/_components/ui/toaster'
import { Badge, Box, HStack, Table, Text, VStack } from '@chakra-ui/react'
import type { UserRole } from '@letar/driving-school-db/prisma'
import { formatDateLong } from '@letar/format-utils'
import { LuDownload, LuLock, LuLockOpen, LuUserX } from 'react-icons/lu'

import { bulkBlockUsersAction } from '../_actions/user.action'
import { ToggleUserBlockButton } from './ToggleUserBlockButton'
import { UpdateUserRolesButton } from './UpdateUserRolesButton'

interface UserData {
  id: string
  name: string | null
  email: string
  roles: UserRole[]
  deletedAt: Date | null
  createdAt: Date
  _count: {
    organizationMembers: number
    lessonsAsStudent: number
    lessonsAsInstructor: number
  }
}

interface UsersTableProps {
  users: UserData[]
}

export function UsersTable({ users }: UsersTableProps) {
  const selection = useBulkSelection({
    items: users,
    getItemId: (user) => user.id,
  })

  // Массовые действия
  const bulkActions: BulkAction<UserData>[] = [
    {
      id: 'block',
      label: 'Заблокировать',
      icon: LuLock,
      destructive: true,
      isDisabled: (items) => items.every((u) => u.deletedAt !== null),
      onExecute: async (ids) => {
        const result = await bulkBlockUsersAction({ userIds: ids, block: true })
        if (result.success) {
          toaster.success({ title: `Заблокировано: ${ids.length}` })
          selection.deselectAll()
        } else {
          toaster.error({ title: result.error ?? 'Ошибка' })
        }
      },
    },
    {
      id: 'unblock',
      label: 'Разблокировать',
      icon: LuLockOpen,
      colorPalette: 'green',
      isDisabled: (items) => items.every((u) => u.deletedAt === null),
      onExecute: async (ids) => {
        const result = await bulkBlockUsersAction({ userIds: ids, block: false })
        if (result.success) {
          toaster.success({ title: `Разблокировано: ${ids.length}` })
          selection.deselectAll()
        } else {
          toaster.error({ title: result.error ?? 'Ошибка' })
        }
      },
    },
    {
      id: 'export',
      label: 'Экспорт',
      icon: LuDownload,
      colorPalette: 'blue',
      onExecute: async (_ids, items) => {
        // CSV экспорт выбранных
        const headers = ['ID', 'Имя', 'Email', 'Роли', 'Статус', 'Дата регистрации']
        const rows = items.map((u) => [
          u.id,
          u.name ?? '',
          u.email,
          u.roles.join(', '),
          u.deletedAt ? 'Заблокирован' : 'Активен',
          formatDateLong(u.createdAt),
        ])

        const csv = [headers, ...rows].map((row) => row.join(';')).join('\n')
        const bom = '\uFEFF'
        const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `users-export-${Date.now()}.csv`
        a.click()
        URL.revokeObjectURL(url)

        toaster.success({ title: `Экспортировано: ${items.length}` })
        selection.deselectAll()
      },
    },
  ]

  if (users.length === 0) {
    return (
      <Box p={8} textAlign="center" color="fg.muted">
        <Text>Пользователи не найдены</Text>
      </Box>
    )
  }

  return (
    <>
      <Table.Root variant="line" size="sm">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader w={10}>
              <SelectAllCheckbox
                isAllSelected={selection.isAllSelected}
                isIndeterminate={selection.isIndeterminate}
                onSelectAll={selection.selectAll}
                onDeselectAll={selection.deselectAll}
                totalCount={users.length}
                selectedCount={selection.selectedCount}
              />
            </Table.ColumnHeader>
            <Table.ColumnHeader>Пользователь</Table.ColumnHeader>
            <Table.ColumnHeader>Роли</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="center">Активность</Table.ColumnHeader>
            <Table.ColumnHeader>Дата регистрации</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">Действия</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {users.map((user) => (
            <Table.Row
              key={user.id}
              opacity={user.deletedAt ? 0.5 : 1}
              bg={selection.isSelected(user.id) ? 'brand.subtle' : undefined}
            >
              <Table.Cell>
                <RowCheckbox
                  id={user.id}
                  isSelected={selection.isSelected(user.id)}
                  onToggle={selection.toggleItem}
                  label={`Выбрать ${user.name ?? user.email}`}
                />
              </Table.Cell>
              <Table.Cell>
                <VStack align="start" gap={0.5}>
                  <HStack gap={2}>
                    <Text fontWeight="medium">{user.name}</Text>
                    {user.deletedAt && (
                      <Badge colorPalette="red" size="sm">
                        <LuUserX /> Заблокирован
                      </Badge>
                    )}
                  </HStack>
                  <Text fontSize="sm" color="fg.muted">
                    {user.email}
                  </Text>
                </VStack>
              </Table.Cell>
              <Table.Cell>
                <HStack gap={1} wrap="wrap">
                  {user.roles.map((role) => (
                    <Badge key={role} size="sm" colorPalette={getRoleColor(role)}>
                      {getRoleLabel(role)}
                    </Badge>
                  ))}
                </HStack>
              </Table.Cell>
              <Table.Cell>
                <VStack gap={0} align="center" fontSize="xs">
                  <Text color="fg.muted">Членств: {user._count.organizationMembers}</Text>
                  <Text color="fg.muted">
                    Занятий: {user._count.lessonsAsStudent + user._count.lessonsAsInstructor}
                  </Text>
                </VStack>
              </Table.Cell>
              <Table.Cell>
                <Text fontSize="sm">{formatDateLong(user.createdAt)}</Text>
              </Table.Cell>
              <Table.Cell textAlign="right">
                <HStack gap={1} justify="flex-end">
                  <UpdateUserRolesButton
                    userId={user.id}
                    currentRoles={user.roles}
                    userName={user.name ?? 'Без имени'}
                  />
                  <ToggleUserBlockButton
                    userId={user.id}
                    userName={user.name ?? 'Без имени'}
                    isBlocked={!!user.deletedAt}
                  />
                </HStack>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>

      {/* Плавающая панель массовых действий */}
      <BulkActionBar
        selectedCount={selection.selectedCount}
        selectedIds={Array.from(selection.selectedIds)}
        selectedItems={selection.selectedItems}
        actions={bulkActions}
        onCancel={selection.deselectAll}
      />
    </>
  )
}

function getRoleColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    USER: 'blue',
    FREELANCE_INSTRUCTOR: 'green',
    MODERATOR: 'purple',
    OWNER: 'orange',
  }
  return colors[role]
}

function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    USER: 'Пользователь',
    FREELANCE_INSTRUCTOR: 'Инструктор',
    MODERATOR: 'Модератор',
    OWNER: 'Владелец',
  }
  return labels[role]
}
