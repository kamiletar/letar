'use client'

import { Avatar, Badge, Box, Button, Card, EmptyState, HStack, IconButton, Table, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { LuRefreshCw, LuUserMinus, LuUserPlus, LuUsers } from 'react-icons/lu'

import { toaster } from '@/app/_components/ui/toaster'

import { removeMemberFromGroupAction, restoreMemberAction } from '../_actions/study-group-member.action'
import type { GroupMemberDetails } from '../_actions/study-group-member.types'

interface GroupMembersListProps {
  members: GroupMemberDetails[]
  groupId: string
  maxStudents: number
  onRefresh: () => void
  onAddMember: () => void
}

export function GroupMembersList({
  members,
  groupId: _groupId,
  maxStudents,
  onRefresh,
  onAddMember,
}: GroupMembersListProps) {
  const [loadingMemberId, setLoadingMemberId] = useState<string | null>(null)

  const activeMembers = members.filter((m) => !m.leftAt)
  const leftMembers = members.filter((m) => m.leftAt)

  const handleRemove = async (memberId: string) => {
    setLoadingMemberId(memberId)
    try {
      const result = await removeMemberFromGroupAction(memberId)
      if (result.success) {
        toaster.success({ title: 'Участник удалён из группы' })
        onRefresh()
      } else {
        toaster.error({ title: 'Ошибка', description: 'Не удалось удалить участника' })
      }
    } finally {
      setLoadingMemberId(null)
    }
  }

  const handleRestore = async (memberId: string) => {
    setLoadingMemberId(memberId)
    try {
      const result = await restoreMemberAction(memberId)
      if (result.success) {
        toaster.success({ title: 'Участник восстановлен' })
        onRefresh()
      } else {
        toaster.error({
          title: 'Ошибка',
          description: result.message || 'Не удалось восстановить участника',
        })
      }
    } finally {
      setLoadingMemberId(null)
    }
  }

  return (
    <VStack gap={6} align="stretch">
      {/* Заголовок с кнопкой добавления */}
      <HStack justify="space-between">
        <HStack gap={2}>
          <LuUsers />
          <Text fontWeight="semibold">
            Участники группы ({activeMembers.length} / {maxStudents})
          </Text>
        </HStack>
        <Button size="sm" colorPalette="brand" onClick={onAddMember} disabled={activeMembers.length >= maxStudents}>
          <LuUserPlus />
          Добавить участника
        </Button>
      </HStack>

      {/* Активные участники */}
      {activeMembers.length === 0 ? (
        <EmptyState.Root>
          <EmptyState.Content>
            <EmptyState.Indicator>
              <LuUsers />
            </EmptyState.Indicator>
            <EmptyState.Title>Нет участников</EmptyState.Title>
            <EmptyState.Description>Добавьте учеников в эту учебную группу</EmptyState.Description>
          </EmptyState.Content>
        </EmptyState.Root>
      ) : (
        <Card.Root>
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Ученик</Table.ColumnHeader>
                <Table.ColumnHeader>Дата вступления</Table.ColumnHeader>
                <Table.ColumnHeader>Посещаемость</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="right">Действия</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {activeMembers.map((member) => (
                <Table.Row key={member.id}>
                  <Table.Cell>
                    <HStack gap={3}>
                      <Avatar.Root size="sm">
                        <Avatar.Fallback>{member.userName?.charAt(0) ?? '?'}</Avatar.Fallback>
                        {member.userImage && <Avatar.Image src={member.userImage} />}
                      </Avatar.Root>
                      <Box>
                        <Text fontWeight="medium">{member.userName ?? 'Без имени'}</Text>
                        {member.userEmail && (
                          <Text fontSize="xs" color="fg.muted">
                            {member.userEmail}
                          </Text>
                        )}
                      </Box>
                    </HStack>
                  </Table.Cell>
                  <Table.Cell>{new Date(member.enrolledAt).toLocaleDateString('ru-RU')}</Table.Cell>
                  <Table.Cell>
                    {member.attendanceStats.rate !== null ? (
                      <Badge
                        colorPalette={
                          member.attendanceStats.rate >= 80
                            ? 'green'
                            : member.attendanceStats.rate >= 50
                              ? 'yellow'
                              : 'red'
                        }
                      >
                        {member.attendanceStats.rate}%
                      </Badge>
                    ) : (
                      <Text color="fg.muted" fontSize="sm">
                        —
                      </Text>
                    )}
                    {member.attendanceStats.total > 0 && (
                      <Text fontSize="xs" color="fg.muted" ml={2}>
                        ({member.attendanceStats.attended}/{member.attendanceStats.total})
                      </Text>
                    )}
                  </Table.Cell>
                  <Table.Cell textAlign="right">
                    <IconButton
                      aria-label="Удалить участника"
                      variant="ghost"
                      size="sm"
                      colorPalette="red"
                      onClick={() => handleRemove(member.id)}
                      loading={loadingMemberId === member.id}
                      title="Удалить из группы"
                    >
                      <LuUserMinus />
                    </IconButton>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Card.Root>
      )}

      {/* Бывшие участники */}
      {leftMembers.length > 0 && (
        <Box>
          <Text fontSize="sm" fontWeight="medium" color="fg.muted" mb={3}>
            Бывшие участники ({leftMembers.length})
          </Text>
          <Card.Root opacity={0.7}>
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Ученик</Table.ColumnHeader>
                  <Table.ColumnHeader>Период</Table.ColumnHeader>
                  <Table.ColumnHeader>Посещаемость</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Действия</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {leftMembers.map((member) => (
                  <Table.Row key={member.id}>
                    <Table.Cell>
                      <HStack gap={3}>
                        <Avatar.Root size="sm">
                          <Avatar.Fallback>{member.userName?.charAt(0) ?? '?'}</Avatar.Fallback>
                          {member.userImage && <Avatar.Image src={member.userImage} />}
                        </Avatar.Root>
                        <Text>{member.userName ?? 'Без имени'}</Text>
                      </HStack>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontSize="sm">
                        {new Date(member.enrolledAt).toLocaleDateString('ru-RU')} —{' '}
                        {member.leftAt ? new Date(member.leftAt).toLocaleDateString('ru-RU') : ''}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      {member.attendanceStats.rate !== null ? (
                        <Text fontSize="sm">{member.attendanceStats.rate}%</Text>
                      ) : (
                        '—'
                      )}
                    </Table.Cell>
                    <Table.Cell textAlign="right">
                      <IconButton
                        aria-label="Восстановить участника"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRestore(member.id)}
                        loading={loadingMemberId === member.id}
                        disabled={activeMembers.length >= maxStudents}
                        title="Восстановить"
                      >
                        <LuRefreshCw />
                      </IconButton>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Card.Root>
        </Box>
      )}
    </VStack>
  )
}
