'use client'

/**
 * Диалог создания нового отстранения.
 * Поиск поэта, выбор сезона, причины и длительности.
 */

import { toaster } from '@/app/_components/ui/toaster'
import { Badge, Box, Button, Flex, HStack, Input, Text, VStack } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { LuPlus, LuSearch, LuShieldAlert, LuX } from 'react-icons/lu'
import {
  createSuspensionAction,
  getActiveSeasonsAction,
  searchPlayersForSuspensionAction,
} from '../_actions/suspension.action'

/** Причины отстранения с метками */
const REASON_OPTIONS = [
  { value: 'PLAGIARISM', label: 'Чтение чужих стихов', season: true },
  { value: 'RED_CARD', label: 'Красная карточка', season: false },
  { value: 'YELLOW_ACCUMULATION', label: 'Накопление жёлтых', season: false },
  { value: 'DOUBLE_YELLOW', label: 'Две жёлтые', season: false },
] as const

interface Player {
  id: string
  name: string
  disambiguation: string | null
}

interface Season {
  id: string
  name: string
}

interface CreateSuspensionDialogProps {
  onCreated: () => void
}

export function CreateSuspensionDialog({ onCreated }: CreateSuspensionDialogProps) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Поиск поэта
  const [query, setQuery] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [searching, setSearching] = useState(false)

  // Сезоны
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeasonId, setSelectedSeasonId] = useState('')

  // Причина
  const [reason, setReason] = useState<string>('PLAGIARISM')
  const [matchesLeft, setMatchesLeft] = useState(1)

  const selectedReason = REASON_OPTIONS.find((r) => r.value === reason)
  const isSeason = selectedReason?.season || false

  // Загрузить сезоны при открытии
  useEffect(() => {
    if (open && seasons.length === 0) {
      getActiveSeasonsAction().then((result) => {
        if ('data' in result) {
          setSeasons(result.data)
          if (result.data.length > 0) {
            setSelectedSeasonId(result.data[0].id)
          }
        }
      })
    }
  }, [open, seasons.length])

  // Поиск поэтов с debounce
  const searchPlayers = useCallback(async (q: string) => {
    if (q.length < 2) {
      setPlayers([])
      return
    }
    setSearching(true)
    const result = await searchPlayersForSuspensionAction(q)
    if ('data' in result) {
      setPlayers(result.data)
    }
    setSearching(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => searchPlayers(query), 300)
    return () => clearTimeout(timer)
  }, [query, searchPlayers])

  const handleSubmit = async () => {
    if (!selectedPlayer || !selectedSeasonId || !reason) {
      return
    }

    setSubmitting(true)
    try {
      const result = await createSuspensionAction({
        playerId: selectedPlayer.id,
        seasonId: selectedSeasonId,
        reason,
        matchesLeft: isSeason ? 0 : matchesLeft,
        untilEndOfSeason: isSeason,
      })

      if ('error' in result) {
        toaster.error({ title: String(result.error) })
      } else {
        toaster.success({ title: `Отстранение создано: ${selectedPlayer.name}` })
        resetForm()
        setOpen(false)
        onCreated()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setQuery('')
    setPlayers([])
    setSelectedPlayer(null)
    setReason('PLAGIARISM')
    setMatchesLeft(1)
  }

  if (!open) {
    return (
      <Button colorPalette="red" size="sm" onClick={() => setOpen(true)}>
        <LuPlus size={14} />
        Новое отстранение
      </Button>
    )
  }

  return (
    <Box bg="bg.panel" borderWidth="1px" borderColor="border.muted" borderRadius="xl" p={5}>
      <Flex justify="space-between" align="center" mb={4}>
        <HStack gap={2}>
          <LuShieldAlert size={18} />
          <Text fontWeight="bold">Новое отстранение</Text>
        </HStack>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen(false)
            resetForm()
          }}
        >
          <LuX size={16} />
        </Button>
      </Flex>

      <VStack gap={4} align="stretch">
        {/* Поиск поэта */}
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={1}>
            Поэт
          </Text>
          {selectedPlayer
            ? (
              <Flex align="center" gap={2} bg="brand.subtle" px={3} py={2} borderRadius="md">
                <Text fontWeight="medium">{selectedPlayer.name}</Text>
                {selectedPlayer.disambiguation && (
                  <Text fontSize="xs" color="fg.muted">
                    ({selectedPlayer.disambiguation})
                  </Text>
                )}
                <Button
                  variant="ghost"
                  size="xs"
                  ml="auto"
                  onClick={() => {
                    setSelectedPlayer(null)
                    setQuery('')
                  }}
                >
                  <LuX size={14} />
                </Button>
              </Flex>
            )
            : (
              <Box position="relative">
                <HStack gap={2}>
                  <LuSearch size={14} />
                  <Input
                    placeholder="Поиск по имени..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    size="sm"
                  />
                </HStack>
                {players.length > 0 && (
                  <Box
                    position="absolute"
                    top="100%"
                    left={0}
                    right={0}
                    zIndex={10}
                    bg="bg.panel"
                    borderWidth="1px"
                    borderColor="border.muted"
                    borderRadius="md"
                    shadow="lg"
                    mt={1}
                    maxH="200px"
                    overflowY="auto"
                  >
                    {players.map((p) => (
                      <Box
                        key={p.id}
                        px={3}
                        py={2}
                        cursor="pointer"
                        _hover={{ bg: 'bg.subtle' }}
                        onClick={() => {
                          setSelectedPlayer(p)
                          setPlayers([])
                          setQuery('')
                        }}
                      >
                        <Text fontSize="sm">{p.name}</Text>
                        {p.disambiguation && (
                          <Text fontSize="xs" color="fg.muted">
                            {p.disambiguation}
                          </Text>
                        )}
                      </Box>
                    ))}
                  </Box>
                )}
                {searching && (
                  <Text fontSize="xs" color="fg.muted" mt={1}>
                    Поиск...
                  </Text>
                )}
              </Box>
            )}
        </Box>

        {/* Сезон */}
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={1}>
            Сезон
          </Text>
          <Flex gap={2} wrap="wrap">
            {seasons.map((s) => (
              <Badge
                key={s.id}
                cursor="pointer"
                colorPalette={selectedSeasonId === s.id ? 'brand' : 'gray'}
                variant={selectedSeasonId === s.id ? 'solid' : 'outline'}
                px={3}
                py={1}
                onClick={() => setSelectedSeasonId(s.id)}
              >
                {s.name}
              </Badge>
            ))}
          </Flex>
        </Box>

        {/* Причина */}
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={1}>
            Причина
          </Text>
          <Flex gap={2} wrap="wrap">
            {REASON_OPTIONS.map((r) => (
              <Badge
                key={r.value}
                cursor="pointer"
                colorPalette={reason === r.value ? 'red' : 'gray'}
                variant={reason === r.value ? 'solid' : 'outline'}
                px={3}
                py={1}
                onClick={() => setReason(r.value)}
              >
                {r.label}
              </Badge>
            ))}
          </Flex>
        </Box>

        {/* Матчей пропуска (только для не-сезонных) */}
        {!isSeason && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1}>
              Матчей пропуска
            </Text>
            <Input
              type="number"
              value={matchesLeft}
              onChange={(e) => setMatchesLeft(Number(e.target.value))}
              min={1}
              max={99}
              size="sm"
              maxW="100px"
            />
          </Box>
        )}

        {isSeason && (
          <Badge colorPalette="red" variant="surface" py={2} px={3}>
            Дисквалификация до конца сезона
          </Badge>
        )}

        {/* Кнопки */}
        <Flex gap={2} justify="flex-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setOpen(false)
              resetForm()
            }}
          >
            Отмена
          </Button>
          <Button
            colorPalette="red"
            size="sm"
            onClick={handleSubmit}
            loading={submitting}
            disabled={!selectedPlayer || !selectedSeasonId || !reason}
          >
            Создать отстранение
          </Button>
        </Flex>
      </VStack>
    </Box>
  )
}
