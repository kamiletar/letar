'use client'

/**
 * Страница товарищеских матчей — кабинет тренера
 *
 * Тренер может:
 * - Посмотреть входящие вызовы и принять/отклонить их
 * - Запросить товарищеский матч (выбор соперника, площадки, даты)
 * - Посмотреть список своих заявок с их статусами
 */

import { EmptyState } from '@/app/_components/empty-state'
import { toaster } from '@/app/_components/ui/toaster'
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
  NativeSelect,
  Portal,
  Spinner,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { LuCheck, LuPlus, LuX } from 'react-icons/lu'
import {
  getIncomingChallengesAction,
  getMyFriendlyRequestsAction,
  requestFriendlyMatchAction,
  respondToFriendlyChallengeAction,
} from '../_actions/friendly.action'

// === Типы ===

interface FriendlyRequest {
  id: string
  fromTeamSeason: { team: { name: string } }
  toTeamSeason: { team: { name: string } }
  venue: { name: string } | null
  preferredDate: string | null
  note: string | null
  status: string
  match: { id: string; status: string; scheduledAt: string | null } | null
  createdAt: string
}

interface IncomingChallenge {
  id: string
  fromTeamSeason: { team: { name: string } }
  venue: { name: string } | null
  preferredDate: string | null
  note: string | null
  submittedBy: { name: string | null }
  createdAt: string
}

interface TeamOption {
  id: string
  teamName: string
}

interface VenueOption {
  id: string
  name: string
}

// === Маппинг статусов ===

const statusLabel: Record<string, string> = {
  CHALLENGE_SENT: 'Ожидает ответа',
  ACCEPTED: 'Принят, ждёт админа',
  DECLINED: 'Отклонён',
  APPROVED: 'Одобрен',
  REJECTED: 'Отклонён админом',
}

const statusColor: Record<string, string> = {
  CHALLENGE_SENT: 'yellow',
  ACCEPTED: 'blue',
  DECLINED: 'red',
  APPROVED: 'green',
  REJECTED: 'red',
}

export default function FriendlyMatchPage() {
  // Мои заявки
  const [requests, setRequests] = useState<FriendlyRequest[]>([])
  const [loading, setLoading] = useState(true)

  // Входящие вызовы
  const [challenges, setChallenges] = useState<IncomingChallenge[]>([])
  const [loadingChallenges, setLoadingChallenges] = useState(true)
  const [responding, setResponding] = useState<string | null>(null)

  // Диалог создания вызова
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [venues, setVenues] = useState<VenueOption[]>([])
  const [loadingOptions, setLoadingOptions] = useState(false)

  // Поля формы
  const [toTeamSeasonId, setToTeamSeasonId] = useState('')
  const [venueId, setVenueId] = useState('')
  const [preferredDate, setPreferredDate] = useState('')
  const [note, setNote] = useState('')

  // Диалог отклонения вызова
  const [declineTarget, setDeclineTarget] = useState<IncomingChallenge | null>(null)
  const [declineReason, setDeclineReason] = useState('')

  const loadRequests = async () => {
    setLoading(true)
    const result = await getMyFriendlyRequestsAction()
    if ('data' in result) {
      setRequests(result.data as unknown as FriendlyRequest[])
    }
    setLoading(false)
  }

  const loadChallenges = async () => {
    setLoadingChallenges(true)
    const result = await getIncomingChallengesAction()
    if ('data' in result) {
      setChallenges(result.data as unknown as IncomingChallenge[])
    }
    setLoadingChallenges(false)
  }

  useEffect(() => {
    loadRequests()
    loadChallenges()
  }, [])

  // === Ответ на вызов ===

  const handleAcceptChallenge = async (id: string) => {
    setResponding(id)
    try {
      const result = await respondToFriendlyChallengeAction({ id, accept: true })
      if ('error' in result) {
        toaster.error({ title: String(result.error) })
      } else {
        toaster.success({ title: 'Вызов принят! Заявка отправлена админу.' })
        loadChallenges()
        loadRequests()
      }
    } finally {
      setResponding(null)
    }
  }

  const handleDeclineChallenge = async () => {
    if (!declineTarget) {
      return
    }
    setResponding(declineTarget.id)
    try {
      const result = await respondToFriendlyChallengeAction({
        id: declineTarget.id,
        accept: false,
        declineReason: declineReason || undefined,
      })
      if ('error' in result) {
        toaster.error({ title: String(result.error) })
      } else {
        toaster.success({ title: 'Вызов отклонён' })
        setDeclineTarget(null)
        setDeclineReason('')
        loadChallenges()
        loadRequests()
      }
    } finally {
      setResponding(null)
    }
  }

  // === Создание вызова ===

  const loadFormOptions = async () => {
    setLoadingOptions(true)
    try {
      const res = await fetch('/api/coach/friendly-options')
      if (res.ok) {
        const data = await res.json()
        setTeams(data.teams ?? [])
        setVenues(data.venues ?? [])
      }
    } catch {
      // Если API не готов — оставляем пустые списки
    }
    setLoadingOptions(false)
  }

  const handleOpenDialog = () => {
    setToTeamSeasonId('')
    setVenueId('')
    setPreferredDate('')
    setNote('')
    setDialogOpen(true)
    loadFormOptions()
  }

  const handleSubmit = async () => {
    if (!toTeamSeasonId) {
      toaster.error({ title: 'Выберите соперника' })
      return
    }
    setSubmitting(true)
    try {
      const result = await requestFriendlyMatchAction({
        toTeamSeasonId,
        venueId: venueId || undefined,
        preferredDate: preferredDate || undefined,
        note: note || undefined,
      })

      if ('error' in result) {
        toaster.error({ title: String(result.error) })
      } else {
        toaster.success({ title: 'Вызов отправлен!' })
        setDialogOpen(false)
        loadRequests()
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <VStack gap={6} align="stretch">
      <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
        <Heading size="lg">Товарищеские матчи</Heading>
        <Button colorPalette="teal" size="sm" onClick={handleOpenDialog}>
          <LuPlus size={16} />
          Вызвать на матч
        </Button>
      </Flex>

      {/* === Входящие вызовы === */}
      {loadingChallenges
        ? (
          <Flex justify="center" py={6}>
            <Spinner />
          </Flex>
        )
        : challenges.length > 0
        ? (
          <Box>
            <Heading size="md" mb={3}>
              Входящие вызовы
            </Heading>
            <VStack gap={3} align="stretch">
              {challenges.map((ch) => (
                <Box key={ch.id} bg="bg.panel" borderRadius="xl" p={4} borderWidth="2px" borderColor="orange.muted">
                  <Flex justify="space-between" align="start" flexWrap="wrap" gap={3}>
                    <Box flex={1}>
                      <HStack gap={2} mb={1}>
                        <Badge colorPalette="orange" size="sm">
                          Вызов
                        </Badge>
                        <Text fontWeight="semibold">{ch.fromTeamSeason.team.name}</Text>
                      </HStack>
                      <VStack gap={0.5} align="stretch">
                        {ch.submittedBy.name && (
                          <Text fontSize="sm" color="fg.muted">
                            Тренер: {ch.submittedBy.name}
                          </Text>
                        )}
                        {ch.venue && (
                          <Text fontSize="sm" color="fg.muted">
                            Площадка: {ch.venue.name}
                          </Text>
                        )}
                        {ch.preferredDate && (
                          <Text fontSize="sm" color="fg.muted">
                            Дата: {formatDateNumeric(ch.preferredDate)}
                          </Text>
                        )}
                        {ch.note && (
                          <Text fontSize="sm" color="fg.muted">
                            Комментарий: {ch.note}
                          </Text>
                        )}
                        <Text fontSize="xs" color="fg.muted">
                          Получен: {formatDateNumeric(ch.createdAt)}
                        </Text>
                      </VStack>
                    </Box>
                    <HStack gap={2}>
                      <Button
                        size="sm"
                        colorPalette="green"
                        loading={responding === ch.id}
                        onClick={() =>
                          handleAcceptChallenge(ch.id)}
                      >
                        <LuCheck size={14} />
                        Принять
                      </Button>
                      <Button
                        size="sm"
                        colorPalette="red"
                        variant="outline"
                        onClick={() =>
                          setDeclineTarget(ch)}
                      >
                        <LuX size={14} />
                        Отклонить
                      </Button>
                    </HStack>
                  </Flex>
                </Box>
              ))}
            </VStack>
          </Box>
        )
        : null}

      {/* === Мои заявки === */}
      <Box>
        <Heading size="md" mb={3}>
          Мои заявки
        </Heading>
        {loading
          ? (
            <Flex justify="center" py={12}>
              <Spinner size="lg" />
            </Flex>
          )
          : requests.length === 0
          ? (
            <EmptyState>
              <Text color="fg.muted">Нет заявок на товарищеские матчи</Text>
              <Text fontSize="sm" color="fg.muted" mt={1}>
                Вызовите любую команду вашего сезона на товарищеский матч
              </Text>
            </EmptyState>
          )
          : (
            <VStack gap={3} align="stretch">
              {requests.map((req) => (
                <Box key={req.id} bg="bg.panel" borderRadius="xl" p={4} borderWidth="1px" borderColor="border.muted">
                  <Flex justify="space-between" align="start" flexWrap="wrap" gap={2}>
                    <Box flex={1}>
                      <HStack gap={2} mb={1}>
                        <Text fontWeight="semibold">
                          {req.fromTeamSeason.team.name} vs {req.toTeamSeason.team.name}
                        </Text>
                        <Badge colorPalette={statusColor[req.status] ?? 'gray'} size="sm">
                          {statusLabel[req.status] ?? req.status}
                        </Badge>
                      </HStack>
                      <VStack gap={0.5} align="stretch">
                        {req.venue && (
                          <Text fontSize="sm" color="fg.muted">
                            Площадка: {req.venue.name}
                          </Text>
                        )}
                        {req.preferredDate && (
                          <Text fontSize="sm" color="fg.muted">
                            Дата: {formatDateNumeric(req.preferredDate)}
                          </Text>
                        )}
                        {req.note && (
                          <Text fontSize="sm" color="fg.muted">
                            Комментарий: {req.note}
                          </Text>
                        )}
                        <Text fontSize="xs" color="fg.muted">
                          Подана: {formatDateNumeric(req.createdAt)}
                        </Text>
                      </VStack>
                    </Box>
                    {req.status === 'APPROVED' && req.match && (
                      <Badge colorPalette="blue" size="sm">
                        Матч создан
                      </Badge>
                    )}
                  </Flex>
                </Box>
              ))}
            </VStack>
          )}
      </Box>

      {/* === Диалог создания вызова === */}
      <Dialog.Root open={dialogOpen} onOpenChange={(e) => !e.open && setDialogOpen(false)}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Вызвать на товарищеский матч</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                {loadingOptions
                  ? (
                    <Flex justify="center" py={6}>
                      <Spinner />
                    </Flex>
                  )
                  : (
                    <VStack gap={4} align="stretch">
                      <Field.Root required>
                        <Field.Label>Соперник</Field.Label>
                        <NativeSelect.Root>
                          <NativeSelect.Field
                            value={toTeamSeasonId}
                            onChange={(e) => setToTeamSeasonId(e.target.value)}
                          >
                            <option value="">Выберите команду...</option>
                            {teams.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.teamName}
                              </option>
                            ))}
                          </NativeSelect.Field>
                        </NativeSelect.Root>
                      </Field.Root>

                      <Field.Root>
                        <Field.Label>Площадка (необязательно)</Field.Label>
                        <NativeSelect.Root>
                          <NativeSelect.Field value={venueId} onChange={(e) => setVenueId(e.target.value)}>
                            <option value="">Любая / на усмотрение админа</option>
                            {venues.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.name}
                              </option>
                            ))}
                          </NativeSelect.Field>
                        </NativeSelect.Root>
                      </Field.Root>

                      <Field.Root>
                        <Field.Label>Желаемая дата (необязательно)</Field.Label>
                        <Input
                          type="datetime-local"
                          value={preferredDate}
                          onChange={(e) => setPreferredDate(e.target.value)}
                        />
                      </Field.Root>

                      <Field.Root>
                        <Field.Label>Комментарий (необязательно)</Field.Label>
                        <Textarea
                          placeholder="Причина, пожелания..."
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          rows={2}
                        />
                      </Field.Root>
                    </VStack>
                  )}
              </Dialog.Body>
              <Dialog.Footer>
                <Flex gap={3}>
                  <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                    Отмена
                  </Button>
                  <Button
                    colorPalette="teal"
                    onClick={handleSubmit}
                    loading={submitting}
                    disabled={!toTeamSeasonId || loadingOptions}
                  >
                    Отправить вызов
                  </Button>
                </Flex>
              </Dialog.Footer>
              <Dialog.CloseTrigger />
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      {/* === Диалог отклонения вызова === */}
      <Dialog.Root open={!!declineTarget} onOpenChange={(e) => !e.open && setDeclineTarget(null)}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Отклонить вызов?</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                {declineTarget && (
                  <VStack gap={3} align="stretch">
                    <Box bg="bg.subtle" borderRadius="md" p={3}>
                      <Text fontSize="sm">
                        Вызов от <strong>{declineTarget.fromTeamSeason.team.name}</strong>
                      </Text>
                      {declineTarget.note && (
                        <Text fontSize="sm" mt={1} color="fg.muted">
                          Комментарий: {declineTarget.note}
                        </Text>
                      )}
                    </Box>
                    <Field.Root>
                      <Field.Label>Причина отказа (необязательно)</Field.Label>
                      <Textarea
                        placeholder="Не можем в эту дату..."
                        value={declineReason}
                        onChange={(e) => setDeclineReason(e.target.value)}
                        rows={2}
                      />
                    </Field.Root>
                  </VStack>
                )}
              </Dialog.Body>
              <Dialog.Footer>
                <Flex gap={3}>
                  <Button variant="outline" onClick={() => setDeclineTarget(null)} disabled={!!responding}>
                    Отмена
                  </Button>
                  <Button colorPalette="red" onClick={handleDeclineChallenge} loading={!!responding}>
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
