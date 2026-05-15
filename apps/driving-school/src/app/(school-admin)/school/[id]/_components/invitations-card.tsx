'use client'

import { toaster } from '@/app/_components/ui/toaster'
import type { OrganizationRole } from '@/lib/organization-helpers'
import { Badge, Box, Button, Card, Heading, HStack, IconButton, Input, Table, Text, VStack } from '@chakra-ui/react'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { LuCopy, LuLink, LuPlus, LuTrash2, LuUserPlus } from 'react-icons/lu'
import {
  cancelOrgInvitationAction,
  createOrgInvitationAction,
  type OrganizationInvitation,
} from '../_actions/organization-management.action'

interface InvitationsCardProps {
  organizationId: string
  invitations: OrganizationInvitation[]
  canManage: boolean
  isOwner: boolean // true если owner
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

/** Роли с их параметрами для кнопок выбора */
const ROLE_BUTTONS: { value: OrganizationRole; label: string; color: string }[] = [
  { value: 'super_manager', label: 'Старший менеджер', color: 'pink' },
  { value: 'manager', label: 'Менеджер', color: 'orange' },
  { value: 'instructor', label: 'Инструктор', color: 'blue' },
  { value: 'theory_instructor', label: 'Преподаватель', color: 'purple' },
  { value: 'member', label: 'Ученик', color: 'green' },
]

export function InvitationsCard({
  organizationId,
  invitations,
  canManage,
  isOwner: _isOwner,
  invitableRoles,
}: InvitationsCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newInviteEmail, setNewInviteEmail] = useState('')
  const [newInviteRole, setNewInviteRole] = useState<OrganizationRole>('member')

  /** Генерация ссылки приглашения по ID */
  const getInviteLink = (invitationId: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/join-school/${invitationId}`
    }
    return `/join-school/${invitationId}`
  }

  const handleCreateInvitation = () => {
    startTransition(async () => {
      const result = await createOrgInvitationAction(organizationId, {
        email: newInviteEmail || '',
        role: newInviteRole,
      })

      if (!result.success) {
        if (result.error === 'CANNOT_INVITE_HIGHER_ROLE') {
          toaster.error({ title: 'Ошибка', description: 'Нельзя приглашать на роль выше своей' })
        } else {
          toaster.error({ title: 'Ошибка', description: 'Не удалось создать приглашение' })
        }
        return
      }

      toaster.success({
        title: 'Приглашение создано',
        description: 'Ссылка скопирована в буфер обмена',
      })

      const link = getInviteLink(result.invitationId)
      navigator.clipboard.writeText(link)

      setNewInviteEmail('')
      setShowCreateForm(false)
      router.refresh()
    })
  }

  const handleCancelInvitation = (invitationId: string) => {
    if (!confirm('Вы уверены, что хотите отменить это приглашение?')) {
      return
    }

    startTransition(async () => {
      const result = await cancelOrgInvitationAction(organizationId, invitationId)

      if (!result.success) {
        toaster.error({ title: 'Ошибка', description: 'Не удалось отменить приглашение' })
        return
      }

      toaster.success({ title: 'Приглашение отменено' })
      router.refresh()
    })
  }

  const handleCopyLink = (invitationId: string) => {
    const link = getInviteLink(invitationId)
    navigator.clipboard.writeText(link)
    toaster.success({ title: 'Ссылка скопирована' })
  }

  if (!canManage) {
    return null
  }

  /** Фильтруем кнопки ролей по доступным для текущего пользователя */
  const availableRoleButtons = ROLE_BUTTONS.filter((btn) => invitableRoles.includes(btn.value))

  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between">
          <HStack gap={2}>
            <LuUserPlus size={20} />
            <Heading size="md">Приглашения ({invitations.length})</Heading>
          </HStack>
          <Button size="sm" colorPalette="brand" onClick={() => setShowCreateForm(!showCreateForm)}>
            <LuPlus />
            Пригласить
          </Button>
        </HStack>
      </Card.Header>
      <Card.Body>
        <VStack align="stretch" gap={4}>
          {showCreateForm && (
            <Box p={4} borderWidth="1px" borderRadius="lg" bg="bg.muted">
              <VStack align="stretch" gap={3}>
                <Text fontWeight="medium">Новое приглашение</Text>
                <Input
                  placeholder="Email (необязательно)"
                  value={newInviteEmail}
                  onChange={(e) => setNewInviteEmail(e.target.value)}
                />
                <HStack flexWrap="wrap" gap={2}>
                  {availableRoleButtons.map((btn) => (
                    <Button
                      key={btn.value}
                      size="sm"
                      variant={newInviteRole === btn.value ? 'solid' : 'outline'}
                      colorPalette={btn.color}
                      onClick={() => setNewInviteRole(btn.value)}
                    >
                      {btn.label}
                    </Button>
                  ))}
                </HStack>
                <HStack>
                  <Button size="sm" colorPalette="brand" onClick={handleCreateInvitation} disabled={isPending}>
                    <LuLink />
                    Создать ссылку
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowCreateForm(false)}>
                    Отмена
                  </Button>
                </HStack>
              </VStack>
            </Box>
          )}

          {invitations.length === 0 ? (
            <Text color="fg.muted" textAlign="center" py={4}>
              Нет активных приглашений
            </Text>
          ) : (
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Email / Ссылка</Table.ColumnHeader>
                  <Table.ColumnHeader>Роль</Table.ColumnHeader>
                  <Table.ColumnHeader>Истекает</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Действия</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {invitations.map((invitation) => (
                  <Table.Row key={invitation.id}>
                    <Table.Cell>
                      {invitation.email ? (
                        <Text fontSize="sm">{invitation.email}</Text>
                      ) : (
                        <HStack gap={1}>
                          <LuLink size={14} />
                          <Text fontSize="sm" color="fg.muted">
                            По ссылке
                          </Text>
                        </HStack>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge colorPalette={ROLE_COLORS[invitation.role]}>
                        {invitation.roleLabel || ROLE_LABELS[invitation.role]}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontSize="sm" color="fg.muted">
                        {formatDistanceToNow(invitation.expiresAt, { locale: ru, addSuffix: true })}
                      </Text>
                    </Table.Cell>
                    <Table.Cell textAlign="right">
                      <HStack gap={1} justify="flex-end">
                        <IconButton
                          size="xs"
                          variant="ghost"
                          onClick={() => handleCopyLink(invitation.id)}
                          title="Копировать ссылку"
                          aria-label="Копировать ссылку"
                        >
                          <LuCopy size={16} />
                        </IconButton>
                        <IconButton
                          size="xs"
                          variant="ghost"
                          colorPalette="red"
                          onClick={() => handleCancelInvitation(invitation.id)}
                          disabled={isPending}
                          title="Отменить приглашение"
                          aria-label="Отменить приглашение"
                        >
                          <LuTrash2 size={16} />
                        </IconButton>
                      </HStack>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
