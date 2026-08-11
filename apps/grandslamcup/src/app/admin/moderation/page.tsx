'use client'

/**
 * Модерация заявок на состав и трансферы — админка
 */

import { EmptyState } from '@/app/_components/empty-state'
import { toaster } from '@/app/_components/ui/toaster'
import { getPendingClaimsCountAction } from '@/app/admin/_actions/player-link.action'
import { AdminCard, AdminCardRow } from '@/app/admin/_components/admin-card'
import { AdminResponsiveList } from '@/app/admin/_components/admin-responsive-list'
import { formatDateNumeric } from '@/lib/format-date'
import {
  Badge,
  Box,
  Button,
  Dialog,
  Field,
  Flex,
  Heading,
  HStack,
  NativeSelect,
  Portal,
  Spinner,
  Table,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { LuCheck, LuHandshake, LuLink, LuX } from 'react-icons/lu'
import { approveApplicationAction, getApplicationsAction, rejectApplicationAction } from './_actions/moderation.action'

interface Application {
  id: string
  type: 'NEW_PLAYER' | 'TRANSFER'
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  playerName?: string | null
  player?: { id: string; name: string; slug: string } | null
  fromTeamSeason?: { team: { name: string } } | null
  toTeamSeason: { team: { name: string }; season: { name: string } }
  role: string
  coachNote?: string | null
  moderatorNote?: string | null
  submittedBy: { name: string | null }
  reviewedBy?: { name: string | null } | null
  reviewedAt?: string | null
  createdAt: string
}

const statusLabel: Record<string, string> = {
  PENDING: 'Ожидает',
  APPROVED: 'Одобрена',
  REJECTED: 'Отклонена',
}

const statusColor: Record<string, string> = {
  PENDING: 'yellow',
  APPROVED: 'green',
  REJECTED: 'red',
}

const roleLabel: Record<string, string> = {
  PLAYER: 'Игрок',
  COACH: 'Тренер',
  ASSISTANT_COACH: 'Зам. тренера',
}

export default function ModerationPage() {
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('PENDING')

  // Диалог одобрения/отклонения
  const [actionTarget, setActionTarget] = useState<{ app: Application; action: 'approve' | 'reject' } | null>(null)
  const [note, setNote] = useState('')
  const [processing, setProcessing] = useState(false)
  const [claimsCount, setClaimsCount] = useState(0)

  const loadApps = async (status: string) => {
    setLoading(true)
    const result = await getApplicationsAction(status as 'PENDING' | 'ALL')
    if ('data' in result) {
      setApps(result.data as unknown as Application[])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadApps(filter)
    getPendingClaimsCountAction().then((r) => {
      if ('count' in r) { setClaimsCount(r.count) }
    })
  }, [filter])

  const handleAction = async () => {
    if (!actionTarget) { return }
    setProcessing(true)
    try {
      const { app, action } = actionTarget
      const result = action === 'approve'
        ? await approveApplicationAction({ id: app.id, moderatorNote: note || undefined })
        : await rejectApplicationAction({ id: app.id, moderatorNote: note })

      if ('error' in result) {
        toaster.error({ title: String(result.error) })
      } else {
        toaster.success({
          title: action === 'approve' ? 'Заявка одобрена' : 'Заявка отклонена',
        })
        setActionTarget(null)
        setNote('')
        loadApps(filter)
      }
    } finally {
      setProcessing(false)
    }
  }

  return (
    <VStack gap={6} align="stretch">
      <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
        <Heading size="lg">Заявки на модерацию</Heading>
        <Flex gap={2} wrap="wrap">
          <Link href="/admin/moderation/friendly">
            <Button variant="outline" size="sm">
              <LuHandshake size={16} />
              Товарищеские
            </Button>
          </Link>
          <Link href="/admin/moderation/claims">
            <Button variant="outline" size="sm">
              <LuLink size={16} />
              Привязка
              {claimsCount > 0 && (
                <Badge colorPalette="yellow" size="sm" ml={1}>
                  {claimsCount}
                </Badge>
              )}
            </Button>
          </Link>
          <NativeSelect.Root size="sm" w={{ base: '100%', sm: '160px' }}>
            <NativeSelect.Field value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="PENDING">Ожидают</option>
              <option value="APPROVED">Одобренные</option>
              <option value="REJECTED">Отклонённые</option>
              <option value="ALL">Все</option>
            </NativeSelect.Field>
          </NativeSelect.Root>
        </Flex>
      </Flex>

      {loading
        ? (
          <Flex justify="center" py={12}>
            <Spinner size="lg" />
          </Flex>
        )
        : apps.length === 0
        ? (
          <EmptyState>
            <Text color="fg.muted">Нет заявок</Text>
          </EmptyState>
        )
        : (
          <AdminResponsiveList
            items={apps}
            renderCard={(app) => (
              <AdminCard key={app.id}>
                <Flex justify="space-between" align="start" mb={2}>
                  <Box>
                    <Flex gap={2} align="center" mb={1}>
                      <Badge colorPalette={app.type === 'TRANSFER' ? 'blue' : 'gray'} size="sm">
                        {app.type === 'TRANSFER' ? 'Трансфер' : 'Новый'}
                      </Badge>
                      <Badge colorPalette={statusColor[app.status]} size="sm">
                        {statusLabel[app.status]}
                      </Badge>
                    </Flex>
                    <Text fontWeight="semibold" fontSize="sm">
                      {app.type === 'TRANSFER'
                        ? `${app.player?.name ?? '?'} (из ${app.fromTeamSeason?.team.name ?? '?'})`
                        : (app.playerName ?? '—')}
                    </Text>
                  </Box>
                  {app.status === 'PENDING' && (
                    <HStack gap={1}>
                      <Button
                        size="sm"
                        colorPalette="green"
                        onClick={() => {
                          setActionTarget({ app, action: 'approve' })
                          setNote('')
                        }}
                      >
                        <LuCheck size={14} />
                      </Button>
                      <Button
                        size="sm"
                        colorPalette="red"
                        variant="outline"
                        onClick={() => {
                          setActionTarget({ app, action: 'reject' })
                          setNote('')
                        }}
                      >
                        <LuX size={14} />
                      </Button>
                    </HStack>
                  )}
                </Flex>
                <AdminCardRow label="Команда">
                  <Text fontSize="sm">{app.toTeamSeason.team.name}</Text>
                </AdminCardRow>
                <AdminCardRow label="Сезон">
                  <Text fontSize="sm" color="fg.muted">
                    {app.toTeamSeason.season.name}
                  </Text>
                </AdminCardRow>
                <AdminCardRow label="Роль">
                  <Text fontSize="sm">{roleLabel[app.role] ?? app.role}</Text>
                </AdminCardRow>
                <AdminCardRow label="Дата">
                  <Text fontSize="sm" color="fg.muted">
                    {formatDateNumeric(app.createdAt)}
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
                        <Table.ColumnHeader>Тип</Table.ColumnHeader>
                        <Table.ColumnHeader>Игрок</Table.ColumnHeader>
                        <Table.ColumnHeader>Команда</Table.ColumnHeader>
                        <Table.ColumnHeader display={{ base: 'none', lg: 'table-cell' }}>Роль</Table.ColumnHeader>
                        <Table.ColumnHeader display={{ base: 'none', lg: 'table-cell' }}>Подал</Table.ColumnHeader>
                        <Table.ColumnHeader>Статус</Table.ColumnHeader>
                        <Table.ColumnHeader display={{ base: 'none', md: 'table-cell' }}>Дата</Table.ColumnHeader>
                        <Table.ColumnHeader w="140px" />
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {apps.map((app) => (
                        <Table.Row key={app.id}>
                          <Table.Cell>
                            <Badge colorPalette={app.type === 'TRANSFER' ? 'blue' : 'gray'} size="sm">
                              {app.type === 'TRANSFER' ? 'Трансфер' : 'Новый'}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell fontWeight="medium">
                            {app.type === 'TRANSFER'
                              ? `${app.player?.name ?? '?'} (из ${app.fromTeamSeason?.team.name ?? '?'})`
                              : (app.playerName ?? '—')}
                          </Table.Cell>
                          <Table.Cell>
                            <Text fontSize="sm">{app.toTeamSeason.team.name}</Text>
                            <Text fontSize="xs" color="fg.muted">
                              {app.toTeamSeason.season.name}
                            </Text>
                          </Table.Cell>
                          <Table.Cell display={{ base: 'none', lg: 'table-cell' }} fontSize="sm">
                            {roleLabel[app.role] ?? app.role}
                          </Table.Cell>
                          <Table.Cell display={{ base: 'none', lg: 'table-cell' }} fontSize="sm" color="fg.muted">
                            {app.submittedBy.name ?? '—'}
                          </Table.Cell>
                          <Table.Cell>
                            <Badge colorPalette={statusColor[app.status]} size="sm">
                              {statusLabel[app.status]}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell display={{ base: 'none', md: 'table-cell' }} fontSize="sm" color="fg.muted">
                            {formatDateNumeric(app.createdAt)}
                          </Table.Cell>
                          <Table.Cell>
                            {app.status === 'PENDING' && (
                              <HStack gap={1}>
                                <Button
                                  size="sm"
                                  colorPalette="green"
                                  onClick={() => {
                                    setActionTarget({ app, action: 'approve' })
                                    setNote('')
                                  }}
                                >
                                  <LuCheck size={14} />
                                </Button>
                                <Button
                                  size="sm"
                                  colorPalette="red"
                                  variant="outline"
                                  onClick={() => {
                                    setActionTarget({ app, action: 'reject' })
                                    setNote('')
                                  }}
                                >
                                  <LuX size={14} />
                                </Button>
                              </HStack>
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

      {/* Диалог одобрения/отклонения */}
      <Dialog.Root open={!!actionTarget} onOpenChange={(e) => !e.open && setActionTarget(null)}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>
                  {actionTarget?.action === 'approve' ? 'Одобрить заявку' : 'Отклонить заявку'}
                </Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <VStack gap={3} align="stretch">
                  {actionTarget && (
                    <Box bg="bg.subtle" borderRadius="md" p={3}>
                      <Text fontSize="sm">
                        <strong>{actionTarget.app.type === 'TRANSFER' ? 'Трансфер' : 'Новый игрок'}:</strong>{' '}
                        {actionTarget.app.type === 'TRANSFER'
                          ? actionTarget.app.player?.name
                          : actionTarget.app.playerName}
                      </Text>
                      <Text fontSize="sm">
                        <strong>В команду:</strong> {actionTarget.app.toTeamSeason.team.name}
                      </Text>
                      {actionTarget.app.coachNote && (
                        <Text fontSize="sm" mt={1}>
                          <strong>Комментарий тренера:</strong> {actionTarget.app.coachNote}
                        </Text>
                      )}
                    </Box>
                  )}
                  <Field.Root required={actionTarget?.action === 'reject'}>
                    <Field.Label>
                      Комментарий {actionTarget?.action === 'reject' ? '(обязательно)' : '(необязательно)'}
                    </Field.Label>
                    <Textarea
                      placeholder={actionTarget?.action === 'reject' ? 'Причина отклонения...' : 'Комментарий...'}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                    />
                  </Field.Root>
                </VStack>
              </Dialog.Body>
              <Dialog.Footer>
                <Flex gap={3}>
                  <Button variant="outline" onClick={() => setActionTarget(null)} disabled={processing}>
                    Отмена
                  </Button>
                  <Button
                    colorPalette={actionTarget?.action === 'approve' ? 'green' : 'red'}
                    onClick={handleAction}
                    loading={processing}
                    disabled={actionTarget?.action === 'reject' && !note.trim()}
                  >
                    {actionTarget?.action === 'approve' ? 'Одобрить' : 'Отклонить'}
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
