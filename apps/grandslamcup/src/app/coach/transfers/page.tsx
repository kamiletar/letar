'use client'

/**
 * Трансферы — кабинет тренера.
 * Просмотр поданных заявок + поиск игроков из других команд.
 */

import { toaster } from '@/app/_components/ui/toaster'
import { requestTransferAction } from '@/app/coach/_actions/roster.action'
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
  Input,
  Portal,
  Spinner,
  Table,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { LuArrowLeftRight, LuSearch } from 'react-icons/lu'

interface Application {
  id: string
  type: 'NEW_PLAYER' | 'TRANSFER'
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  playerName?: string | null
  player?: { id: string; name: string } | null
  fromTeamSeason?: { team: { name: string } } | null
  role: string
  coachNote?: string | null
  moderatorNote?: string | null
  createdAt: string
}

interface AvailablePlayer {
  playerId: string
  playerName: string
  playerSlug: string
  teamSeasonId: string
  teamName: string
  role: string
}

const statusLabel: Record<string, string> = {
  PENDING: 'На модерации',
  APPROVED: 'Одобрена',
  REJECTED: 'Отклонена',
}

const statusColor: Record<string, string> = {
  PENDING: 'yellow',
  APPROVED: 'green',
  REJECTED: 'red',
}

export default function TransfersPage() {
  const router = useRouter()
  const [applications, setApplications] = useState<Application[]>([])
  const [loadingApps, setLoadingApps] = useState(true)

  // Поиск доступных игроков
  const [search, setSearch] = useState('')
  const [players, setPlayers] = useState<AvailablePlayer[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState(false)
  const [windowClosed, setWindowClosed] = useState(false)

  // Диалог трансфера
  const [transferTarget, setTransferTarget] = useState<AvailablePlayer | null>(null)
  const [transferNote, setTransferNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Загрузка заявок
  useEffect(() => {
    fetch('/api/coach/applications')
      .then((r) => r.json())
      .then((data) => setApplications(Array.isArray(data) ? data : []))
      .finally(() => setLoadingApps(false))
  }, [])

  // Поиск игроков
  const searchPlayers = useCallback(async (query: string) => {
    setLoadingPlayers(true)
    try {
      const res = await fetch(`/api/coach/available-players?search=${encodeURIComponent(query)}`)
      const data = await res.json()
      if (data.error === 'Трансферное окно закрыто') {
        setWindowClosed(true)
        setPlayers([])
      } else {
        setWindowClosed(false)
        setPlayers(Array.isArray(data) ? data : [])
      }
    } finally {
      setLoadingPlayers(false)
    }
  }, [])

  // Первоначальная проверка окна
  useEffect(() => {
    searchPlayers('')
  }, [searchPlayers])

  const handleSearch = () => {
    searchPlayers(search)
  }

  const handleTransfer = async () => {
    if (!transferTarget) {
      return
    }
    setSubmitting(true)
    try {
      const result = await requestTransferAction({
        playerId: transferTarget.playerId,
        fromTeamSeasonId: transferTarget.teamSeasonId,
        coachNote: transferNote || undefined,
      })
      if ('error' in result) {
        toaster.error({ title: String(result.error) })
      } else {
        toaster.success({ title: 'Заявка на трансфер подана' })
        setTransferTarget(null)
        setTransferNote('')
        router.refresh()
        // Обновляем список заявок
        const res = await fetch('/api/coach/applications')
        const data = await res.json()
        setApplications(Array.isArray(data) ? data : [])
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <VStack gap={8} align="stretch">
      <Heading size="lg">Трансферы</Heading>

      {/* Статус трансферного окна */}
      <Box bg={windowClosed ? 'red.subtle' : 'green.subtle'} borderRadius="lg" p={4}>
        <HStack gap={2}>
          <LuArrowLeftRight size={18} />
          <Text fontWeight="medium">Трансферное окно: {windowClosed ? 'закрыто' : 'открыто'}</Text>
        </HStack>
        {windowClosed && (
          <Text fontSize="sm" color="fg.muted" mt={1}>
            Трансферы доступны только в период между кругами сезона
          </Text>
        )}
      </Box>

      {/* Поиск игроков (только при открытом окне) */}
      {!windowClosed && (
        <Box>
          <Heading size="md" mb={3}>
            Найти игрока
          </Heading>
          <Flex gap={2} mb={4}>
            <Input
              placeholder="Имя поэта..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              flex={1}
            />
            <Button onClick={handleSearch} loading={loadingPlayers}>
              <LuSearch size={16} />
              Найти
            </Button>
          </Flex>

          {players.length > 0 && (
            <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border.muted" overflow="hidden">
              <Box overflowX="auto">
                <Table.Root size="sm">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>Поэт</Table.ColumnHeader>
                      <Table.ColumnHeader>Команда</Table.ColumnHeader>
                      <Table.ColumnHeader w="120px" />
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {players.map((p) => (
                      <Table.Row key={p.playerId}>
                        <Table.Cell fontWeight="medium">{p.playerName}</Table.Cell>
                        <Table.Cell color="fg.muted">{p.teamName}</Table.Cell>
                        <Table.Cell>
                          <Button
                            size="xs"
                            colorPalette="teal"
                            variant="outline"
                            onClick={() => setTransferTarget(p)}
                          >
                            Трансфер
                          </Button>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* Список поданных заявок */}
      <Box>
        <Heading size="md" mb={3}>
          Мои заявки
        </Heading>
        {loadingApps
          ? (
            <Flex justify="center" py={8}>
              <Spinner />
            </Flex>
          )
          : applications.length === 0
          ? <Text color="fg.muted">Нет поданных заявок</Text>
          : (
            <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border.muted" overflow="hidden">
              <Box overflowX="auto">
                <Table.Root size="sm">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>Тип</Table.ColumnHeader>
                      <Table.ColumnHeader>Игрок</Table.ColumnHeader>
                      <Table.ColumnHeader>Статус</Table.ColumnHeader>
                      <Table.ColumnHeader>Дата</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {applications.map((app) => (
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
                          <Badge colorPalette={statusColor[app.status]} size="sm">
                            {statusLabel[app.status]}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell fontSize="sm" color="fg.muted">
                          {formatDateNumeric(app.createdAt)}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>
            </Box>
          )}
      </Box>

      {/* Диалог подтверждения трансфера */}
      <Dialog.Root open={!!transferTarget} onOpenChange={(e) => !e.open && setTransferTarget(null)}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Запросить трансфер</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <VStack gap={3} align="stretch">
                  <Text>
                    Запросить трансфер <strong>{transferTarget?.playerName}</strong> из команды{' '}
                    <strong>{transferTarget?.teamName}</strong>?
                  </Text>
                  <Field.Root>
                    <Field.Label>Комментарий (необязательно)</Field.Label>
                    <Textarea
                      placeholder="Причина трансфера..."
                      value={transferNote}
                      onChange={(e) => setTransferNote(e.target.value)}
                      rows={2}
                    />
                  </Field.Root>
                </VStack>
              </Dialog.Body>
              <Dialog.Footer>
                <Flex gap={3}>
                  <Button variant="outline" onClick={() => setTransferTarget(null)} disabled={submitting}>
                    Отмена
                  </Button>
                  <Button colorPalette="teal" onClick={handleTransfer} loading={submitting}>
                    Подать заявку
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
