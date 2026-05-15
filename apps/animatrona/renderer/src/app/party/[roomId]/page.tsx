/**
 * Страница Watch Party комнаты
 *
 * Отображает видеоплеер с синхронизацией, список участников и чат.
 */

'use client'

import { Badge, Box, Button, Grid, GridItem, Heading, HStack, Spinner, Text, VStack } from '@chakra-ui/react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LuDoorOpen, LuPause, LuPlay, LuUsers, LuX } from 'react-icons/lu'

import { Header } from '@/components/layout'
import { toaster } from '@/components/ui/toaster'

import { ChatPanel, ParticipantsPanel, SyncIndicator } from '../../../components/social/watchparty'
import { usePartyChat } from '../../../hooks/usePartyChat'
import { useWatchParty } from '../../../hooks/useWatchParty'

// Отключаем статическую генерацию
export const dynamic = 'force-dynamic'

/**
 * Страница Watch Party комнаты
 */
export default function WatchPartyPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string

  const { currentRoomId, participants, playbackState, isLoading, error, joinRoom, leaveRoom, closeRoom, play, pause } =
    useWatchParty()

  const { messages, sendMessage, sendReaction, messagesEndRef } = usePartyChat()

  const [localPosition, setLocalPosition] = useState(0)
  const [currentPeerId, setCurrentPeerId] = useState<string | null>(null)

  // Получаем свой PeerId
  useEffect(() => {
    const loadPeerId = async () => {
      if (!window.electronAPI?.profile) {
        return
      }

      const result = await window.electronAPI.profile.getPeerId()
      if (result.success && result.data) {
        setCurrentPeerId(result.data)
      }
    }

    loadPeerId()
  }, [])

  // Присоединяемся к комнате при загрузке страницы
  useEffect(() => {
    if (!roomId || currentRoomId === roomId) {
      return
    }

    const join = async () => {
      const success = await joinRoom(roomId)
      if (!success) {
        toaster.error({
          title: 'Не удалось присоединиться',
          description: 'Комната не найдена или недоступна',
        })
        router.push('/friends')
      }
    }

    join()
  }, [roomId, currentRoomId, joinRoom, router])

  // Обработка покидания комнаты
  const handleLeave = async () => {
    await leaveRoom()
    toaster.success({ title: 'Вы покинули комнату' })
    router.push('/friends')
  }

  // Обработка закрытия комнаты (для хоста)
  const handleClose = async () => {
    await closeRoom()
    toaster.success({ title: 'Комната закрыта' })
    router.push('/friends')
  }

  // Определяем, является ли текущий пользователь хостом
  const isHost = participants.some((p) => p.peerId === currentPeerId && p.role === 'host')

  // Позиция хоста
  const hostPosition = playbackState?.position ?? 0

  // Симуляция обновления локальной позиции (в реальности придёт от видеоплеера)
  useEffect(() => {
    if (!playbackState?.isPlaying) {
      return
    }

    const interval = setInterval(() => {
      setLocalPosition((prev) => prev + 0.1)
    }, 100)

    return () => clearInterval(interval)
  }, [playbackState?.isPlaying])

  // Синхронизация локальной позиции с хостом
  useEffect(() => {
    if (playbackState) {
      setLocalPosition(playbackState.position)
    }
  }, [playbackState?.position])

  // Загрузка
  if (isLoading) {
    return (
      <Box minH="100vh" bg="bg" color="fg">
        <Header title="Watch Party" />
        <VStack py={20}>
          <Spinner size="xl" />
          <Text color="fg.muted">Присоединение к комнате...</Text>
        </VStack>
      </Box>
    )
  }

  // Ошибка
  if (error) {
    return (
      <Box minH="100vh" bg="bg" color="fg">
        <Header title="Watch Party" />
        <VStack py={20}>
          <Text color="red.500">{error}</Text>
          <Button onClick={() => router.push('/friends')}>Вернуться к друзьям</Button>
        </VStack>
      </Box>
    )
  }

  return (
    <Box minH="100vh" bg="bg" color="fg">
      <Header title="Watch Party" />

      <Grid
        templateColumns={{ base: '1fr', lg: '1fr 350px' }}
        templateRows={{ base: 'auto 1fr auto', lg: '1fr' }}
        gap={0}
        h="calc(100vh - 60px)"
      >
        {/* Основная область - видеоплеер */}
        <GridItem borderRightWidth={{ base: 0, lg: 1 }} borderColor="border.subtle" p={4}>
          <VStack align="stretch" gap={4} h="full">
            {/* Информация о комнате */}
            <HStack justify="space-between">
              <VStack align="start" gap={1}>
                <Heading size="md">Комната: {roomId.slice(0, 8)}...</Heading>
                <HStack gap={2}>
                  <Badge colorPalette="blue">
                    <LuUsers style={{ marginRight: 4 }} />
                    {participants.length} участник(ов)
                  </Badge>
                  <SyncIndicator localPosition={localPosition} hostPosition={hostPosition} />
                </HStack>
              </VStack>

              <HStack>
                {/* Кнопки управления */}
                {playbackState?.isPlaying ? (
                  <Button variant="outline" size="sm" onClick={pause}>
                    <LuPause />
                    Пауза
                  </Button>
                ) : (
                  <Button colorPalette="green" size="sm" onClick={play}>
                    <LuPlay />
                    Играть
                  </Button>
                )}

                {/* Покинуть / Закрыть */}
                {isHost ? (
                  <Button colorPalette="red" variant="outline" size="sm" onClick={handleClose}>
                    <LuX />
                    Закрыть комнату
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={handleLeave}>
                    <LuDoorOpen />
                    Покинуть
                  </Button>
                )}
              </HStack>
            </HStack>

            {/* Плейсхолдер для видеоплеера */}
            <Box flex={1} bg="black" borderRadius="lg" display="flex" alignItems="center" justifyContent="center">
              <VStack color="white">
                <Text fontSize="lg">Видеоплеер</Text>
                <Text color="whiteAlpha.700" fontSize="sm">
                  Позиция: {localPosition.toFixed(1)}s
                </Text>
                <Text color="whiteAlpha.500" fontSize="xs">
                  {playbackState?.isPlaying ? 'Воспроизведение' : 'Пауза'}
                </Text>
              </VStack>
            </Box>
          </VStack>
        </GridItem>

        {/* Боковая панель - участники и чат */}
        <GridItem display="flex" flexDirection="column" h="full" overflow="hidden">
          {/* Участники */}
          <Box borderBottomWidth={1} borderColor="border.subtle">
            <ParticipantsPanel participants={participants} hostPosition={hostPosition} />
          </Box>

          {/* Чат */}
          <Box flex={1} overflow="hidden">
            <ChatPanel
              messages={messages}
              onSendMessage={sendMessage}
              onSendReaction={sendReaction}
              messagesEndRef={messagesEndRef}
              currentPeerId={currentPeerId ?? undefined}
            />
          </Box>
        </GridItem>
      </Grid>
    </Box>
  )
}
