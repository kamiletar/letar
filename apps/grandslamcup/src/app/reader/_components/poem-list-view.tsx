'use client'

/**
 * Список стихов режима чтеца и карточка состояния: что сохранено, что ждёт отправки,
 * заработает ли страница без интернета.
 */

import { coverSource, type DisplayPoem, type ReaderPoem, type ReaderSnapshot } from '@/lib/offline/poems-store'
import { Badge, Box, Button, Container, Flex, Heading, HStack, IconButton, Text, VStack } from '@chakra-ui/react'
import { LuCheck, LuMaximize, LuMinimize, LuPlus, LuRefreshCw, LuWifiOff } from 'react-icons/lu'

import { CoverThumb } from './cover-thumb'

export type SyncState = 'syncing' | 'ok' | 'unauthorized' | 'offline' | 'error'

interface PoemListViewProps {
  snapshot: ReaderSnapshot | null
  poems: DisplayPoem[]
  /** Помечены на удаление, ещё не отправлены — их можно вернуть */
  pendingDeletes: ReaderPoem[]
  pendingCount: number
  conflictCount: number
  syncState: SyncState
  offlineConsentGiven: boolean
  shellCached: boolean
  fullscreenSupported: boolean
  isFullscreen: boolean
  onOpen: (id: string) => void
  onCreate: () => void
  onRestore: (id: string) => void
  onRefresh: () => void
  onAcceptOffline: () => void
  onToggleFullscreen: () => void
}

function formatSyncedAt(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}

/** «1 стихотворение», «2 стихотворения», «5 стихотворений» */
function pluralizePoems(count: number): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) {
    return 'стихотворение'
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return 'стихотворения'
  }
  return 'стихотворений'
}

export function PoemListView({
  snapshot,
  poems,
  pendingDeletes,
  pendingCount,
  conflictCount,
  syncState,
  offlineConsentGiven,
  shellCached,
  fullscreenSupported,
  isFullscreen,
  onOpen,
  onCreate,
  onRestore,
  onRefresh,
  onAcceptOffline,
  onToggleFullscreen,
}: PoemListViewProps) {
  return (
    <Container maxW="720px" py={6}>
      <VStack gap={5} align="stretch">
        <Flex justify="space-between" align="center" gap={3}>
          <Heading asChild size="xl">
            <h1>Режим чтеца</h1>
          </Heading>
          <HStack gap={2}>
            {fullscreenSupported && (
              <IconButton
                aria-label={isFullscreen ? 'Выйти из полного экрана' : 'На весь экран'}
                variant="outline"
                onClick={onToggleFullscreen}
              >
                {isFullscreen ? <LuMinimize /> : <LuMaximize />}
              </IconButton>
            )}
            <IconButton
              aria-label="Обновить стихи"
              variant="outline"
              onClick={onRefresh}
              loading={syncState === 'syncing'}
            >
              <LuRefreshCw />
            </IconButton>
          </HStack>
        </Flex>

        {/* Состояние: что сохранено и будет ли работать без сети */}
        <VStack gap={2} align="stretch" bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border" p={4}>
          {snapshot
            ? (
              <HStack gap={2} align="start">
                <Box color="green.fg" mt={1}>
                  <LuCheck />
                </Box>
                <Text fontSize="sm">
                  Сохранено на этом телефоне: {snapshot.poems.length} {pluralizePoems(snapshot.poems.length)}.{' '}
                  <Text asChild color="fg.muted">
                    <span>Обновлено {formatSyncedAt(snapshot.syncedAt)}.</span>
                  </Text>
                </Text>
              </HStack>
            )
            : <Text fontSize="sm" color="fg.muted">Стихи ещё не сохранены на телефон.</Text>}

          {pendingCount > 0 && (
            <HStack gap={2} justify="space-between" align="center">
              <Text fontSize="sm" color="orange.fg">
                Не отправлено на сайт: {pendingCount}. Правки хранятся на телефоне.
              </Text>
              <Button size="xs" variant="outline" onClick={onRefresh}>Отправить</Button>
            </HStack>
          )}
          {conflictCount > 0 && (
            <Text fontSize="sm" color="red.fg">
              Конфликтов с сайтом: {conflictCount}. Откройте стих с меткой «Конфликт» и выберите версию.
            </Text>
          )}

          {syncState === 'unauthorized' && (
            <Text fontSize="sm" color="orange.fg">
              Вы не вошли. Войдите, пока есть интернет, и стихи сохранятся.{' '}
              <a href="/sign-in?returnTo=/reader" style={{ textDecoration: 'underline' }}>Войти</a>
            </Text>
          )}
          {syncState === 'offline' && (
            <HStack gap={2} color="fg.muted">
              <LuWifiOff />
              <Text fontSize="sm">Нет сети. Показаны сохранённые стихи, правки можно делать.</Text>
            </HStack>
          )}
          {syncState === 'error' && (
            <Text fontSize="sm" color="red.fg">Не удалось связаться с сайтом. Показаны сохранённые стихи.</Text>
          )}

          {offlineConsentGiven
            ? shellCached
              ? (
                <HStack gap={2} align="start">
                  <Box color="green.fg" mt={1}>
                    <LuCheck />
                  </Box>
                  <Text fontSize="sm">Эта страница откроется без интернета.</Text>
                </HStack>
              )
              : <Text fontSize="sm" color="fg.muted">Готовим страницу для работы без интернета…</Text>
            : (
              <Button size="sm" colorPalette="brand" alignSelf="start" onClick={onAcceptOffline}>
                Включить работу без интернета
              </Button>
            )}
          {!fullscreenSupported && (
            <Text fontSize="xs" color="fg.muted">
              Полный экран: в меню браузера выберите «Добавить на экран „Домой“» и открывайте с иконки.
            </Text>
          )}
        </VStack>

        <Button colorPalette="teal" size="lg" onClick={onCreate}>
          <LuPlus />
          Новое стихотворение
        </Button>

        {poems.length === 0
          ? (
            <Text color="fg.muted">
              Стихов нет. Добавьте новое или откройте эту страницу с интернетом, чтобы загрузить стихи с сайта.
            </Text>
          )
          : (
            <VStack gap={2} align="stretch">
              {poems.map((poem) => (
                <Box
                  key={poem.id}
                  asChild
                  textAlign="left"
                  bg="bg.panel"
                  borderRadius="xl"
                  borderWidth="1px"
                  borderColor={poem.conflict ? 'red.emphasized' : 'border'}
                  p={4}
                  cursor="pointer"
                  _hover={{ borderColor: 'border.emphasized' }}
                  _active={{ bg: 'bg.muted' }}
                >
                  <button type="button" onClick={() => onOpen(poem.id)}>
                    <HStack gap={3} align="start" w="100%">
                      <CoverThumb {...coverSource(poem)} size={56} />
                      <VStack gap={1} align="start" minW={0} flex={1}>
                        <Flex wrap="wrap" align="center" gap={2}>
                          <Text fontWeight="semibold" lineClamp={2} wordBreak="break-word">{poem.title}</Text>
                          {poem.conflict && <Badge colorPalette="red" size="sm">Конфликт</Badge>}
                          {poem.pending && !poem.conflict && (
                            <Badge colorPalette="orange" size="sm">Не отправлено</Badge>
                          )}
                          {!poem.published && <Badge variant="subtle" size="sm">Черновик</Badge>}
                        </Flex>
                        <Text fontSize="sm" color="fg.muted" lineClamp={2} whiteSpace="pre-line" wordBreak="break-word">
                          {poem.text.slice(0, 120)}
                        </Text>
                      </VStack>
                    </HStack>
                  </button>
                </Box>
              ))}
            </VStack>
          )}

        {/* Удалённые, но ещё не отправленные — окно, чтобы передумать */}
        {pendingDeletes.length > 0 && (
          <VStack gap={2} align="stretch">
            <Text fontSize="sm" color="fg.muted">Удалено, на сайте ещё есть:</Text>
            {pendingDeletes.map((poem) => (
              <Flex
                key={poem.id}
                justify="space-between"
                align="center"
                gap={3}
                borderWidth="1px"
                borderColor="border.muted"
                borderRadius="lg"
                px={3}
                py={2}
              >
                <Text fontSize="sm" lineClamp={1} minW={0}>{poem.title}</Text>
                <Button size="xs" variant="outline" flexShrink={0} onClick={() => onRestore(poem.id)}>Вернуть</Button>
              </Flex>
            ))}
          </VStack>
        )}
      </VStack>
    </Container>
  )
}
