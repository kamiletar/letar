'use client'

/**
 * Объединение дублей профилей игроков — админка
 *
 * Два поиска: "Исходный профиль" (будет удалён) и "Целевой профиль" (останется).
 * Preview: сколько записей будет перенесено.
 * Кнопка "Объединить" с подтверждением.
 */

import { toaster } from '@/app/_components/ui/toaster'
import {
  Badge,
  Box,
  Button,
  Dialog,
  Flex,
  Heading,
  HStack,
  Input,
  Portal,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { LuArrowLeft, LuArrowRight, LuMerge, LuTriangleAlert } from 'react-icons/lu'
import { getMergePreviewAction, mergePlayersAction } from '../_actions/merge.action'

interface PlayerOption {
  id: string
  name: string
  slug: string
  city?: { name: string } | null
  _count: { playerTeamSeasons: number; performances: number }
}

interface MergePreview {
  source: { id: string; name: string; hasUser: boolean }
  target: { id: string; name: string; hasUser: boolean }
  counts: {
    performances: number
    lineups: number
    teamSeasons: number
    ratings: number
    poems: number
    suspensions: number
  }
  willTransferUser: boolean
  userConflict: boolean
}

export default function MergePlayersPage() {
  // Списки всех игроков (загружаются один раз)
  const [allPlayers, setAllPlayers] = useState<PlayerOption[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState(true)

  // Поиск
  const [sourceSearch, setSourceSearch] = useState('')
  const [targetSearch, setTargetSearch] = useState('')

  // Выбранные
  const [sourceId, setSourceId] = useState<string | null>(null)
  const [targetId, setTargetId] = useState<string | null>(null)

  // Preview
  const [preview, setPreview] = useState<MergePreview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  // Подтверждение
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [merging, setMerging] = useState(false)

  // Загрузка всех игроков
  useEffect(() => {
    fetch('/api/admin/players-list')
      .then((res) => res.json())
      .then((data) => {
        setAllPlayers(data.players ?? [])
        setLoadingPlayers(false)
      })
      .catch(() => setLoadingPlayers(false))
  }, [])

  // Фильтрация
  const filterPlayers = useCallback(
    (search: string, excludeId: string | null) => {
      if (!search.trim()) {
        return []
      }
      const q = search.toLowerCase()
      return allPlayers.filter((p) => p.id !== excludeId && p.name.toLowerCase().includes(q)).slice(0, 10)
    },
    [allPlayers]
  )

  const sourceResults = filterPlayers(sourceSearch, targetId)
  const targetResults = filterPlayers(targetSearch, sourceId)

  const selectedSource = allPlayers.find((p) => p.id === sourceId)
  const selectedTarget = allPlayers.find((p) => p.id === targetId)

  // Загрузка preview при выборе обоих игроков
  useEffect(() => {
    if (!sourceId || !targetId) {
      setPreview(null)
      return
    }
    setLoadingPreview(true)
    getMergePreviewAction({ sourceId, targetId })
      .then((result) => {
        if ('data' in result && result.data) {
          setPreview(result.data)
        } else if ('error' in result) {
          toaster.error({ title: String(result.error) })
          setPreview(null)
        }
      })
      .finally(() => setLoadingPreview(false))
  }, [sourceId, targetId])

  const handleMerge = async () => {
    if (!sourceId || !targetId) {
      return
    }
    setMerging(true)
    try {
      const result = await mergePlayersAction({ sourceId, targetId })
      if ('error' in result) {
        toaster.error({ title: String(result.error) })
      } else {
        toaster.success({ title: 'Профили объединены' })
        setConfirmOpen(false)
        setSourceId(null)
        setTargetId(null)
        setSourceSearch('')
        setTargetSearch('')
        setPreview(null)
        // Перезагружаем список игроков
        const res = await fetch('/api/admin/players-list')
        const data = await res.json()
        setAllPlayers(data.players ?? [])
      }
    } finally {
      setMerging(false)
    }
  }

  return (
    <VStack gap={6} align="stretch">
      <HStack gap={3}>
        <Link href="/admin/players">
          <Button variant="ghost" size="sm">
            <LuArrowLeft size={16} />
          </Button>
        </Link>
        <Heading size="lg">Объединение дублей</Heading>
      </HStack>

      {loadingPlayers ? (
        <Flex justify="center" py={12}>
          <Spinner size="lg" />
        </Flex>
      ) : (
        <>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={6}>
            {/* Исходный профиль (будет удалён) */}
            <Box bg="bg.panel" borderRadius="xl" p={5} borderWidth="1px" borderColor="border.muted">
              <Heading size="sm" mb={3} color="red.fg">
                Исходный профиль (будет удалён)
              </Heading>
              <Input
                placeholder="Поиск по имени..."
                value={sourceSearch}
                onChange={(e) => {
                  setSourceSearch(e.target.value)
                  if (sourceId) {
                    setSourceId(null)
                  }
                }}
                mb={2}
              />
              {selectedSource ? (
                <Box bg="red.subtle" borderRadius="md" p={3}>
                  <Flex justify="space-between" align="center">
                    <Box>
                      <Text fontWeight="semibold">{selectedSource.name}</Text>
                      <Text fontSize="xs" color="fg.muted">
                        {selectedSource.city?.name ?? 'Без города'} | {selectedSource._count.performances} выступлений |{' '}
                        {selectedSource._count.playerTeamSeasons} команд
                      </Text>
                    </Box>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => {
                        setSourceId(null)
                        setSourceSearch('')
                      }}
                    >
                      Сменить
                    </Button>
                  </Flex>
                </Box>
              ) : (
                sourceSearch.trim() && (
                  <VStack gap={1} align="stretch" maxH="200px" overflowY="auto">
                    {sourceResults.length === 0 ? (
                      <Text fontSize="sm" color="fg.muted">
                        Ничего не найдено
                      </Text>
                    ) : (
                      sourceResults.map((p) => (
                        <Box
                          key={p.id}
                          px={3}
                          py={2}
                          borderRadius="md"
                          cursor="pointer"
                          _hover={{ bg: 'bg.subtle' }}
                          onClick={() => {
                            setSourceId(p.id)
                            setSourceSearch(p.name)
                          }}
                        >
                          <Text fontSize="sm" fontWeight="medium">
                            {p.name}
                          </Text>
                          <Text fontSize="xs" color="fg.muted">
                            {p.city?.name ?? 'Без города'} | {p._count.performances} выступлений
                          </Text>
                        </Box>
                      ))
                    )}
                  </VStack>
                )
              )}
            </Box>

            {/* Целевой профиль (останется) */}
            <Box bg="bg.panel" borderRadius="xl" p={5} borderWidth="1px" borderColor="border.muted">
              <Heading size="sm" mb={3} color="green.fg">
                Целевой профиль (останется)
              </Heading>
              <Input
                placeholder="Поиск по имени..."
                value={targetSearch}
                onChange={(e) => {
                  setTargetSearch(e.target.value)
                  if (targetId) {
                    setTargetId(null)
                  }
                }}
                mb={2}
              />
              {selectedTarget ? (
                <Box bg="green.subtle" borderRadius="md" p={3}>
                  <Flex justify="space-between" align="center">
                    <Box>
                      <Text fontWeight="semibold">{selectedTarget.name}</Text>
                      <Text fontSize="xs" color="fg.muted">
                        {selectedTarget.city?.name ?? 'Без города'} | {selectedTarget._count.performances} выступлений |{' '}
                        {selectedTarget._count.playerTeamSeasons} команд
                      </Text>
                    </Box>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => {
                        setTargetId(null)
                        setTargetSearch('')
                      }}
                    >
                      Сменить
                    </Button>
                  </Flex>
                </Box>
              ) : (
                targetSearch.trim() && (
                  <VStack gap={1} align="stretch" maxH="200px" overflowY="auto">
                    {targetResults.length === 0 ? (
                      <Text fontSize="sm" color="fg.muted">
                        Ничего не найдено
                      </Text>
                    ) : (
                      targetResults.map((p) => (
                        <Box
                          key={p.id}
                          px={3}
                          py={2}
                          borderRadius="md"
                          cursor="pointer"
                          _hover={{ bg: 'bg.subtle' }}
                          onClick={() => {
                            setTargetId(p.id)
                            setTargetSearch(p.name)
                          }}
                        >
                          <Text fontSize="sm" fontWeight="medium">
                            {p.name}
                          </Text>
                          <Text fontSize="xs" color="fg.muted">
                            {p.city?.name ?? 'Без города'} | {p._count.performances} выступлений
                          </Text>
                        </Box>
                      ))
                    )}
                  </VStack>
                )
              )}
            </Box>
          </SimpleGrid>

          {/* Preview */}
          {loadingPreview && (
            <Flex justify="center" py={6}>
              <Spinner />
            </Flex>
          )}

          {preview && (
            <Box bg="bg.panel" borderRadius="xl" p={5} borderWidth="1px" borderColor="border.muted">
              <Heading size="sm" mb={3}>
                Что будет перенесено
              </Heading>
              <Flex align="center" gap={3} mb={4} flexWrap="wrap">
                <Badge colorPalette="red" size="lg">
                  {preview.source.name}
                </Badge>
                <LuArrowRight size={20} />
                <Badge colorPalette="green" size="lg">
                  {preview.target.name}
                </Badge>
              </Flex>
              <SimpleGrid columns={{ base: 2, md: 3 }} gap={3}>
                <StatBox label="Выступления" value={preview.counts.performances} />
                <StatBox label="Заявки на матчи" value={preview.counts.lineups} />
                <StatBox label="Команды" value={preview.counts.teamSeasons} />
                <StatBox label="Рейтинги" value={preview.counts.ratings} />
                <StatBox label="Стихи" value={preview.counts.poems} />
                <StatBox label="Дисквалификации" value={preview.counts.suspensions} />
              </SimpleGrid>

              {preview.willTransferUser && (
                <Box mt={3} p={3} bg="blue.subtle" borderRadius="md">
                  <Text fontSize="sm" color="blue.fg">
                    Привязка аккаунта будет перенесена на целевой профиль.
                  </Text>
                </Box>
              )}

              {preview.userConflict && (
                <Box mt={3} p={3} bg="yellow.subtle" borderRadius="md">
                  <Flex gap={2} align="center">
                    <LuTriangleAlert size={16} />
                    <Text fontSize="sm" color="yellow.fg">
                      Оба профиля привязаны к аккаунтам. Привязка исходного будет потеряна.
                    </Text>
                  </Flex>
                </Box>
              )}

              <Flex justify="flex-end" mt={4}>
                <Button colorPalette="red" onClick={() => setConfirmOpen(true)}>
                  <LuMerge size={16} />
                  Объединить
                </Button>
              </Flex>
            </Box>
          )}
        </>
      )}

      {/* Диалог подтверждения */}
      <Dialog.Root open={confirmOpen} onOpenChange={(e) => !e.open && setConfirmOpen(false)}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Подтвердите объединение</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <VStack gap={3} align="stretch">
                  <Box bg="red.subtle" borderRadius="md" p={3}>
                    <Text fontSize="sm" fontWeight="semibold" color="red.fg">
                      Это действие необратимо!
                    </Text>
                    <Text fontSize="sm" mt={1}>
                      Профиль <strong>{preview?.source.name}</strong> будет удалён. Все его данные будут перенесены в
                      профиль <strong>{preview?.target.name}</strong>.
                    </Text>
                  </Box>
                </VStack>
              </Dialog.Body>
              <Dialog.Footer>
                <Flex gap={3}>
                  <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={merging}>
                    Отмена
                  </Button>
                  <Button colorPalette="red" onClick={handleMerge} loading={merging}>
                    Да, объединить
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

/** Мини-карточка статистики */
function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <Box bg="bg.subtle" borderRadius="md" p={3} textAlign="center">
      <Text fontSize="2xl" fontWeight="bold">
        {value}
      </Text>
      <Text fontSize="xs" color="fg.muted">
        {label}
      </Text>
    </Box>
  )
}
