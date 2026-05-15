'use client'

/**
 * Модерация заявок на товарищеские матчи — админка
 *
 * Показывает заявки со статусом ACCEPTED (соперник принял вызов).
 * Кнопка "Одобрить" → создаёт Match (FRIENDLY).
 * Кнопка "Отклонить" → обновляет статус.
 */

import { EmptyState } from '@/app/_components/empty-state'
import { toaster } from '@/app/_components/ui/toaster'
import { AdminCard, AdminCardRow } from '@/app/admin/_components/admin-card'
import { AdminResponsiveList } from '@/app/admin/_components/admin-responsive-list'
import { formatDateNumeric } from '@/lib/format-date'
import {
  Badge,
  Box,
  Button,
  Dialog,
  Flex,
  Heading,
  HStack,
  NativeSelect,
  Portal,
  Spinner,
  Table,
  Text,
  VStack,
} from '@chakra-ui/react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { LuArrowLeft, LuCheck, LuX } from 'react-icons/lu'
import {
  approveFriendlyRequestAction,
  getFriendlyRequestsAction,
  rejectFriendlyRequestAction,
} from '../_actions/friendly.action'

interface FriendlyRequest {
  id: string
  fromTeamSeason: { team: { name: string }; season: { id: string; name: string } }
  toTeamSeason: { team: { name: string } }
  venue: { name: string } | null
  preferredDate: string | null
  note: string | null
  status: string
  submittedBy: { name: string | null }
  respondedBy: { name: string | null } | null
  match: { id: string; status: string } | null
  createdAt: string
}

const statusLabel: Record<string, string> = {
  CHALLENGE_SENT: 'Ждёт соперника',
  ACCEPTED: 'Принят соперником',
  DECLINED: 'Отклонён соперником',
  APPROVED: 'Одобрен',
  REJECTED: 'Отклонён',
}

const statusColor: Record<string, string> = {
  CHALLENGE_SENT: 'yellow',
  ACCEPTED: 'blue',
  DECLINED: 'orange',
  APPROVED: 'green',
  REJECTED: 'red',
}

export default function FriendlyModerationPage() {
  const [requests, setRequests] = useState<FriendlyRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('ACCEPTED')
  const [processing, setProcessing] = useState<string | null>(null)

  // Диалог подтверждения отклонения
  const [rejectTarget, setRejectTarget] = useState<FriendlyRequest | null>(null)

  const loadRequests = async (status: string) => {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- статус из select'а
    const result = await getFriendlyRequestsAction(status as any)
    if ('data' in result) {
      setRequests(result.data as unknown as FriendlyRequest[])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadRequests(filter)
  }, [filter])

  const handleApprove = async (req: FriendlyRequest) => {
    setProcessing(req.id)
    try {
      const result = await approveFriendlyRequestAction({ id: req.id })
      if ('error' in result) {
        toaster.error({ title: String(result.error) })
      } else {
        toaster.success({ title: 'Матч создан' })
        loadRequests(filter)
      }
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async () => {
    if (!rejectTarget) return
    setProcessing(rejectTarget.id)
    try {
      const result = await rejectFriendlyRequestAction({ id: rejectTarget.id })
      if ('error' in result) {
        toaster.error({ title: String(result.error) })
      } else {
        toaster.success({ title: 'Заявка отклонена' })
        setRejectTarget(null)
        loadRequests(filter)
      }
    } finally {
      setProcessing(null)
    }
  }

  return (
    <VStack gap={6} align="stretch">
      <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
        <HStack gap={3}>
          <Link href="/admin/moderation">
            <Button variant="ghost" size="sm">
              <LuArrowLeft size={16} />
            </Button>
          </Link>
          <Heading size="lg">Товарищеские матчи</Heading>
        </HStack>
        <HStack gap={2}>
          <Text fontSize="sm" color="fg.muted">
            Фильтр:
          </Text>
          <NativeSelect.Root size="sm" w={{ base: '100%', sm: '200px' }}>
            <NativeSelect.Field value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="ACCEPTED">Ждут одобрения</option>
              <option value="CHALLENGE_SENT">Ждут соперника</option>
              <option value="DECLINED">Отклонены соперником</option>
              <option value="APPROVED">Одобренные</option>
              <option value="REJECTED">Отклонённые</option>
              <option value="ALL">Все</option>
            </NativeSelect.Field>
          </NativeSelect.Root>
        </HStack>
      </Flex>

      {loading ? (
        <Flex justify="center" py={12}>
          <Spinner size="lg" />
        </Flex>
      ) : requests.length === 0 ? (
        <EmptyState>
          <Text color="fg.muted">Нет заявок</Text>
        </EmptyState>
      ) : (
        <AdminResponsiveList
          items={requests}
          renderCard={(req) => (
            <AdminCard key={req.id}>
              <Flex justify="space-between" align="start" mb={2}>
                <Box>
                  <Text fontWeight="semibold" fontSize="sm">
                    {req.fromTeamSeason.team.name} vs {req.toTeamSeason.team.name}
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    {req.fromTeamSeason.season.name}
                  </Text>
                </Box>
                <Badge colorPalette={statusColor[req.status] ?? 'gray'} size="sm">
                  {statusLabel[req.status] ?? req.status}
                </Badge>
              </Flex>
              {req.venue && (
                <AdminCardRow label="Площадка">
                  <Text fontSize="sm">{req.venue.name}</Text>
                </AdminCardRow>
              )}
              {req.preferredDate && (
                <AdminCardRow label="Дата">
                  <Text fontSize="sm">{formatDateNumeric(req.preferredDate)}</Text>
                </AdminCardRow>
              )}
              {req.status === 'ACCEPTED' && (
                <Flex gap={2} pt={3} mt={2} borderTopWidth="1px" borderColor="border.muted" justify="flex-end">
                  <Button
                    size="sm"
                    colorPalette="green"
                    loading={processing === req.id}
                    onClick={() => handleApprove(req)}
                  >
                    <LuCheck size={14} /> Одобрить
                  </Button>
                  <Button size="sm" colorPalette="red" variant="outline" onClick={() => setRejectTarget(req)}>
                    <LuX size={14} /> Отклонить
                  </Button>
                </Flex>
              )}
              {req.status === 'APPROVED' && req.match && (
                <Flex pt={2} justify="flex-end">
                  <Link href="/admin/matches">
                    <Badge colorPalette="blue" size="sm" cursor="pointer">
                      Матч
                    </Badge>
                  </Link>
                </Flex>
              )}
            </AdminCard>
          )}
          tableContent={
            <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border.muted" overflow="hidden">
              <Box overflowX="auto">
                <Table.Root>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>Инициатор</Table.ColumnHeader>
                      <Table.ColumnHeader>Соперник</Table.ColumnHeader>
                      <Table.ColumnHeader display={{ base: 'none', md: 'table-cell' }}>Площадка</Table.ColumnHeader>
                      <Table.ColumnHeader display={{ base: 'none', md: 'table-cell' }}>Дата</Table.ColumnHeader>
                      <Table.ColumnHeader display={{ base: 'none', lg: 'table-cell' }}>
                        Подал / Принял
                      </Table.ColumnHeader>
                      <Table.ColumnHeader>Статус</Table.ColumnHeader>
                      <Table.ColumnHeader w="140px" />
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {requests.map((req) => (
                      <Table.Row key={req.id}>
                        <Table.Cell fontWeight="medium">
                          {req.fromTeamSeason.team.name}
                          <Text fontSize="xs" color="fg.muted">
                            {req.fromTeamSeason.season.name}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>{req.toTeamSeason.team.name}</Table.Cell>
                        <Table.Cell display={{ base: 'none', md: 'table-cell' }} fontSize="sm">
                          {req.venue?.name ?? '—'}
                        </Table.Cell>
                        <Table.Cell display={{ base: 'none', md: 'table-cell' }} fontSize="sm">
                          {req.preferredDate ? formatDateNumeric(req.preferredDate) : '—'}
                        </Table.Cell>
                        <Table.Cell display={{ base: 'none', lg: 'table-cell' }} fontSize="sm" color="fg.muted">
                          {req.submittedBy.name ?? '—'}
                          {req.respondedBy?.name && (
                            <Text fontSize="xs" color="fg.muted">
                              Принял: {req.respondedBy.name}
                            </Text>
                          )}
                        </Table.Cell>
                        <Table.Cell>
                          <Badge colorPalette={statusColor[req.status] ?? 'gray'} size="sm">
                            {statusLabel[req.status] ?? req.status}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>
                          {req.status === 'ACCEPTED' && (
                            <HStack gap={1}>
                              <Button
                                size="sm"
                                colorPalette="green"
                                loading={processing === req.id}
                                onClick={() => handleApprove(req)}
                              >
                                <LuCheck size={14} />
                              </Button>
                              <Button
                                size="sm"
                                colorPalette="red"
                                variant="outline"
                                onClick={() => setRejectTarget(req)}
                              >
                                <LuX size={14} />
                              </Button>
                            </HStack>
                          )}
                          {req.status === 'APPROVED' && req.match && (
                            <Link href="/admin/matches">
                              <Badge colorPalette="blue" size="sm" cursor="pointer">
                                Матч
                              </Badge>
                            </Link>
                          )}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>
            </Box>
          }
        />
      )}

      {/* Диалог подтверждения отклонения */}
      <Dialog.Root open={!!rejectTarget} onOpenChange={(e) => !e.open && setRejectTarget(null)}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Отклонить заявку?</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                {rejectTarget && (
                  <Box bg="bg.subtle" borderRadius="md" p={3}>
                    <Text fontSize="sm">
                      <strong>{rejectTarget.fromTeamSeason.team.name}</strong> vs{' '}
                      <strong>{rejectTarget.toTeamSeason.team.name}</strong>
                    </Text>
                    {rejectTarget.note && (
                      <Text fontSize="sm" mt={1} color="fg.muted">
                        Комментарий: {rejectTarget.note}
                      </Text>
                    )}
                  </Box>
                )}
              </Dialog.Body>
              <Dialog.Footer>
                <Flex gap={3}>
                  <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={!!processing}>
                    Отмена
                  </Button>
                  <Button colorPalette="red" onClick={handleReject} loading={!!processing}>
                    Отклонить
                  </Button>
                </Flex>
              </Dialog.Footer>
              <Dialog.CloseTrigger />
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </VStack>
  )
}
