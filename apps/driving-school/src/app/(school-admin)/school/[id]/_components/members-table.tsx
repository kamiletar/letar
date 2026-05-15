'use client'

import { toaster } from '@/app/_components/ui/toaster'
import type { OrganizationRole } from '@/lib/organization-helpers'
import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Dialog as ChakraDialog,
  Heading,
  HStack,
  Menu,
  Portal,
  Table,
  Text,
  VStack,
} from '@chakra-ui/react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { LuChevronDown, LuTrash2, LuUsers } from 'react-icons/lu'
import {
  type OrganizationMember,
  removeOrgMemberAction,
  updateOrgMemberRoleAction,
} from '../_actions/organization-management.action'

interface MembersTableProps {
  organizationId: string
  members: OrganizationMember[]
  canManage: boolean
  isOwner: boolean // true если owner, false если manager
  currentUserId: string
  /** Роли, которые текущий пользователь может назначать */
  invitableRoles: OrganizationRole[]
}

/** Маппинг ролей на русские названия */
const ROLE_LABELS: Record<string, string> = {
  owner: 'Владелец',
  super_manager: 'Старший менеджер',
  manager: 'Менеджер',
  instructor: 'Инструктор',
  theory_instructor: 'Преподаватель теории',
  member: 'Ученик',
}

/** Цвета для Badge ролей */
const ROLE_COLORS: Record<string, string> = {
  owner: 'red',
  super_manager: 'pink',
  manager: 'orange',
  instructor: 'blue',
  theory_instructor: 'purple',
  member: 'green',
}

/** Все роли для выбора */
const ALL_ROLES: { value: OrganizationRole; label: string }[] = [
  { value: 'owner', label: 'Владелец' },
  { value: 'super_manager', label: 'Старший менеджер' },
  { value: 'manager', label: 'Менеджер' },
  { value: 'instructor', label: 'Инструктор' },
  { value: 'theory_instructor', label: 'Преподаватель теории' },
  { value: 'member', label: 'Ученик' },
]

/** Иерархия ролей для проверки "можно ли управлять" */
const ROLE_HIERARCHY: OrganizationRole[] = [
  'owner',
  'super_manager',
  'manager',
  'instructor',
  'theory_instructor',
  'member',
]

/** Состояние для диалога подтверждения смены роли */
interface RoleChangeData {
  memberId: string
  memberName: string
  currentRole: OrganizationRole
  newRole: OrganizationRole
}

export function MembersTable({
  organizationId,
  members,
  canManage,
  isOwner,
  currentUserId,
  invitableRoles,
}: MembersTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [roleChangeData, setRoleChangeData] = useState<RoleChangeData | null>(null)

  /**
   * Проверить, может ли текущий пользователь управлять членом с данной ролью
   */
  const canManageMember = (memberRole: OrganizationRole) => {
    if (!canManage) {
      return false
    }
    if (isOwner) {
      return true
    }
    // Проверяем по иерархии — можно управлять только теми, кто ниже
    const currentIndex = ROLE_HIERARCHY.indexOf(isOwner ? 'owner' : 'manager')
    const targetIndex = ROLE_HIERARCHY.indexOf(memberRole)
    return targetIndex > currentIndex
  }

  /**
   * Доступные роли для выбора — фильтруем по invitableRoles
   */
  const getAvailableRoles = () => {
    return ALL_ROLES.filter((r) => invitableRoles.includes(r.value))
  }

  const handleRemoveMember = (memberId: string, userName: string) => {
    if (!confirm(`Вы уверены, что хотите удалить ${userName} из организации?`)) {
      return
    }

    startTransition(async () => {
      const result = await removeOrgMemberAction(organizationId, memberId)

      if (!result.success) {
        switch (result.error) {
          case 'CANNOT_REMOVE_SELF':
            toaster.error({ title: 'Ошибка', description: 'Нельзя удалить себя из организации' })
            break
          case 'LAST_OWNER':
            toaster.error({ title: 'Ошибка', description: 'Нельзя удалить последнего владельца' })
            break
          case 'CANNOT_REMOVE_HIGHER_ROLE':
            toaster.error({
              title: 'Ошибка',
              description: 'Нельзя удалить участника с более высокой ролью',
            })
            break
          default:
            toaster.error({ title: 'Ошибка', description: 'Не удалось удалить участника' })
        }
        return
      }

      queueMicrotask(() => {
        toaster.success({ title: 'Участник удалён' })
      })
      router.refresh()
    })
  }

  /** Открыть диалог подтверждения смены роли */
  const openRoleChangeDialog = (
    memberId: string,
    memberName: string,
    currentRole: OrganizationRole,
    newRole: OrganizationRole
  ) => {
    setRoleChangeData({ memberId, memberName, currentRole, newRole })
  }

  /** Закрыть диалог */
  const closeRoleChangeDialog = () => {
    setRoleChangeData(null)
  }

  /** Выполнить смену роли после подтверждения */
  const confirmRoleChange = () => {
    if (!roleChangeData) {
      return
    }

    const { memberId, memberName, newRole } = roleChangeData

    startTransition(async () => {
      const result = await updateOrgMemberRoleAction(organizationId, memberId, newRole)

      if (!result.success) {
        queueMicrotask(() => {
          if (result.error === 'LAST_OWNER') {
            toaster.error({ title: 'Ошибка', description: 'Нельзя снять права последнего владельца' })
          } else if (result.error === 'CANNOT_CHANGE_HIGHER_ROLE') {
            toaster.error({
              title: 'Ошибка',
              description: 'Нельзя менять роль участнику с более высокой ролью',
            })
          } else {
            toaster.error({ title: 'Ошибка', description: 'Не удалось изменить роль' })
          }
        })
        closeRoleChangeDialog()
        return
      }

      queueMicrotask(() => {
        toaster.success({ title: 'Роль изменена', description: `${memberName} теперь ${ROLE_LABELS[newRole]}` })
      })
      closeRoleChangeDialog()
      router.refresh()
    })
  }

  return (
    <>
      <Card.Root>
        <Card.Header>
          <HStack justify="space-between">
            <HStack gap={2} pb={4}>
              <LuUsers size={20} />
              <Heading size="md">Участники ({members.length})</Heading>
            </HStack>
          </HStack>
        </Card.Header>
        <Card.Body p={0}>
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Участник</Table.ColumnHeader>
                <Table.ColumnHeader>Роль</Table.ColumnHeader>
                <Table.ColumnHeader>Дата вступления</Table.ColumnHeader>
                {canManage && <Table.ColumnHeader textAlign="right">Действия</Table.ColumnHeader>}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {members.map((member) => (
                <Table.Row key={member.id}>
                  <Table.Cell>
                    <HStack gap={3}>
                      <Avatar.Root size="sm">
                        {member.user.image && <Avatar.Image src={member.user.image} />}
                        <Avatar.Fallback>{member.user.name?.charAt(0) || '?'}</Avatar.Fallback>
                      </Avatar.Root>
                      <VStack align="start" gap={0}>
                        <Text fontWeight="medium">{member.user.name}</Text>
                        <Text fontSize="xs" color="fg.muted">
                          {member.user.email}
                        </Text>
                      </VStack>
                    </HStack>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge colorPalette={ROLE_COLORS[member.role]}>{ROLE_LABELS[member.role]}</Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm" color="fg.muted">
                      {format(member.createdAt, 'd MMM yyyy', { locale: ru })}
                    </Text>
                  </Table.Cell>
                  {canManage && (
                    <Table.Cell textAlign="right">
                      {member.userId !== currentUserId ? (
                        canManageMember(member.role) ? (
                          <HStack gap={1} justify="flex-end">
                            {/* Меню смены роли */}
                            <Menu.Root>
                              <Menu.Trigger asChild>
                                <Button size="xs" variant="outline" disabled={isPending}>
                                  Роль <LuChevronDown size={14} />
                                </Button>
                              </Menu.Trigger>
                              <Portal>
                                <Menu.Positioner>
                                  <Menu.Content minW="180px">
                                    {getAvailableRoles().map((role) => (
                                      <Menu.Item
                                        key={role.value}
                                        value={role.value}
                                        disabled={role.value === member.role}
                                        onClick={() =>
                                          openRoleChangeDialog(
                                            member.id,
                                            member.user.name || 'Без имени',
                                            member.role,
                                            role.value
                                          )
                                        }
                                      >
                                        <Badge colorPalette={ROLE_COLORS[role.value]} size="sm">
                                          {role.label}
                                        </Badge>
                                        {role.value === member.role && (
                                          <Text fontSize="xs" color="fg.muted" ml="auto">
                                            текущая
                                          </Text>
                                        )}
                                      </Menu.Item>
                                    ))}
                                  </Menu.Content>
                                </Menu.Positioner>
                              </Portal>
                            </Menu.Root>
                            <Button
                              size="xs"
                              variant="ghost"
                              colorPalette="red"
                              onClick={() => handleRemoveMember(member.id, member.user.name || 'Без имени')}
                              disabled={isPending}
                              title="Удалить из школы"
                            >
                              <LuTrash2 size={16} />
                            </Button>
                          </HStack>
                        ) : (
                          <Text fontSize="xs" color="fg.muted">
                            —
                          </Text>
                        )
                      ) : (
                        <Box>
                          <Text fontSize="xs" color="fg.muted">
                            Это вы
                          </Text>
                        </Box>
                      )}
                    </Table.Cell>
                  )}
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Card.Body>
      </Card.Root>

      {/* Диалог подтверждения смены роли */}
      <ChakraDialog.Root
        open={roleChangeData !== null}
        onOpenChange={(e) => !e.open && closeRoleChangeDialog()}
        size={{ base: 'full', md: 'md' }}
      >
        <Portal>
          <ChakraDialog.Backdrop />
          <ChakraDialog.Positioner>
            <ChakraDialog.Content>
              <ChakraDialog.Header>
                <ChakraDialog.Title>Изменить роль?</ChakraDialog.Title>
              </ChakraDialog.Header>
              <ChakraDialog.Body>
                {roleChangeData && (
                  <VStack gap={4} align="stretch">
                    <Text>
                      Вы уверены, что хотите изменить роль участника <strong>{roleChangeData.memberName}</strong>?
                    </Text>
                    <HStack gap={2} justify="center">
                      <Badge colorPalette={ROLE_COLORS[roleChangeData.currentRole]} size="md">
                        {ROLE_LABELS[roleChangeData.currentRole]}
                      </Badge>
                      <Text color="fg.muted">→</Text>
                      <Badge colorPalette={ROLE_COLORS[roleChangeData.newRole]} size="md">
                        {ROLE_LABELS[roleChangeData.newRole]}
                      </Badge>
                    </HStack>
                    <Text fontSize="sm" color="fg.muted">
                      Это изменит права доступа пользователя в школе.
                    </Text>
                  </VStack>
                )}
              </ChakraDialog.Body>
              <ChakraDialog.Footer>
                <HStack gap={3}>
                  <Button variant="outline" onClick={closeRoleChangeDialog} disabled={isPending}>
                    Отмена
                  </Button>
                  <Button
                    colorPalette="brand"
                    onClick={confirmRoleChange}
                    loading={isPending}
                    loadingText="Изменение..."
                  >
                    Изменить роль
                  </Button>
                </HStack>
              </ChakraDialog.Footer>
              <ChakraDialog.CloseTrigger />
            </ChakraDialog.Content>
          </ChakraDialog.Positioner>
        </Portal>
      </ChakraDialog.Root>
    </>
  )
}
