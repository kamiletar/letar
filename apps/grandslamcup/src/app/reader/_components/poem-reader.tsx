'use client'

/**
 * Режим чтеца: список стихов поэта и крупное чтение с листанием.
 *
 * Стихи берутся из локальной копии (localStorage) и обновляются с сервера, когда есть сеть.
 * Открытое стихотворение и размер шрифта запоминаются: страница перезагружается сама, когда
 * возвращается интернет (`reloadOnOnline` у Serwist), и выступление не должно сбиваться.
 */

import {
  clampFontSize,
  loadPrefs,
  loadSnapshot,
  type ReaderPoem,
  type ReaderSnapshot,
  savePrefs,
  type SyncResult,
  syncSnapshot,
} from '@/lib/offline/poems-store'
import { Badge, Box, Button, Container, Flex, Heading, HStack, IconButton, Text, VStack } from '@chakra-ui/react'
import { useIsHydrated, useOfflineConsent } from '@letar/hooks'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LuCheck,
  LuChevronLeft,
  LuChevronRight,
  LuMaximize,
  LuMinimize,
  LuMinus,
  LuPlus,
  LuRefreshCw,
  LuWifiOff,
  LuX,
} from 'react-icons/lu'

import { useFullscreen } from '../_hooks/use-fullscreen'
import { useWakeLock } from '../_hooks/use-wake-lock'

/** Тот же ключ, что в root layout: одно согласие на офлайн для всего приложения */
const OFFLINE_CONSENT_KEY = 'grandslamcup-offline-consent'

/** Минимальный сдвиг пальца по горизонтали, который считается листанием, px */
const SWIPE_THRESHOLD = 70

type SyncState = 'syncing' | 'ok' | 'unauthorized' | 'offline' | 'error'

function formatSyncedAt(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}

/** Проверяет, лежит ли сама страница чтеца в кэше service worker'а */
async function isShellCached(): Promise<boolean> {
  if (typeof caches === 'undefined') {
    return false
  }
  // precache Serwist хранит записи с суффиксом ?__WB_REVISION__=…, поэтому ignoreSearch
  const hit = await caches.match('/reader', { ignoreSearch: true })
  return hit !== undefined
}

export function PoemReader() {
  // localStorage есть только в браузере: читаем его после гидрации, а не в эффекте
  const hydrated = useIsHydrated()
  return hydrated ? <PoemReaderContent /> : null
}

function PoemReaderContent() {
  const [snapshot, setSnapshot] = useState<ReaderSnapshot | null>(loadSnapshot)
  const [prefs] = useState(loadPrefs)
  const [syncState, setSyncState] = useState<SyncState>('syncing')
  const [openId, setOpenId] = useState<string | null>(prefs.poemId)
  const [fontSize, setFontSize] = useState(prefs.fontSize)
  const [shellCached, setShellCached] = useState(false)
  const { isAccepted, accept } = useOfflineConsent(OFFLINE_CONSENT_KEY)
  const { supported: fullscreenSupported, isFullscreen, toggle: toggleFullscreen } = useFullscreen()
  const touchStartX = useRef<number | null>(null)

  const poems = snapshot?.poems ?? []
  // Если открытого стихотворения больше нет (удалили на сайте) — openIndex = -1, виден список
  const openIndex = poems.findIndex((poem) => poem.id === openId)
  const openPoem: ReaderPoem | null = openIndex >= 0 ? poems[openIndex]! : null

  useWakeLock(openPoem !== null)

  const applySync = useCallback((result: SyncResult) => {
    if (result.status === 'ok') {
      setSnapshot(result.snapshot)
    }
    setSyncState(result.status)
  }, [])

  const refresh = useCallback(() => {
    setSyncState('syncing')
    void syncSnapshot().then(applySync)
  }, [applySync])

  // Свежие данные с сервера: при открытии и каждый раз, когда возвращается сеть
  useEffect(() => {
    void syncSnapshot().then(applySync)

    // Просим браузер не вычищать копию стихов при нехватке места
    void navigator.storage?.persist?.()

    window.addEventListener('online', refresh)
    return () => window.removeEventListener('online', refresh)
  }, [applySync, refresh])

  // Запоминаем, что открыто и каким шрифтом
  useEffect(() => {
    savePrefs({ poemId: openId, fontSize })
  }, [openId, fontSize])

  // После согласия service worker ставится и кладёт страницу в кэш не сразу — проверяем несколько раз
  useEffect(() => {
    if (!isAccepted || !('serviceWorker' in navigator)) {
      return
    }

    let cancelled = false
    let attempts = 0
    let timer: ReturnType<typeof setTimeout>
    const check = async () => {
      const cached = await isShellCached()
      if (cancelled) {
        return
      }
      setShellCached(cached)
      attempts += 1
      if (!cached && attempts < 20) {
        timer = setTimeout(check, 1500)
      }
    }
    timer = setTimeout(check, 0)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [isAccepted])

  const goTo = useCallback((index: number) => {
    const target = poems[index]
    if (target) {
      setOpenId(target.id)
    }
  }, [poems])

  const changeFont = useCallback((delta: number) => {
    setFontSize((current) => clampFontSize(current + delta))
  }, [])

  // Листание стрелками клавиатуры и Escape — удобно на планшете и компьютере
  useEffect(() => {
    if (openPoem === null) {
      return
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        goTo(openIndex + 1)
      } else if (event.key === 'ArrowLeft') {
        goTo(openIndex - 1)
      } else if (event.key === 'Escape' && !document.fullscreenElement) {
        setOpenId(null)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [goTo, openIndex, openPoem])

  // ───────────────────────── Чтение ─────────────────────────
  if (openPoem) {
    return (
      <Flex
        direction="column"
        position="fixed"
        inset={0}
        zIndex={10000}
        bg="#0b0b0b"
        color="#f3f3f3"
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0]?.clientX ?? null
        }}
        onTouchEnd={(event) => {
          const start = touchStartX.current
          touchStartX.current = null
          const end = event.changedTouches[0]?.clientX
          if (start === null || end === undefined) {
            return
          }
          const delta = end - start
          if (delta <= -SWIPE_THRESHOLD) {
            goTo(openIndex + 1)
          } else if (delta >= SWIPE_THRESHOLD) {
            goTo(openIndex - 1)
          }
        }}
      >
        {/* Верхняя панель */}
        <HStack
          gap={1}
          px={2}
          py={2}
          borderBottomWidth="1px"
          borderColor="whiteAlpha.200"
          flexShrink={0}
          pt="max(8px, env(safe-area-inset-top))"
        >
          <IconButton aria-label="К списку стихов" variant="ghost" color="inherit" onClick={() => setOpenId(null)}>
            <LuX />
          </IconButton>
          <Text flex={1} minW={0} fontSize="sm" color="whiteAlpha.700" lineClamp={1} textAlign="center">
            {openIndex + 1} из {poems.length}
          </Text>
          <IconButton
            aria-label="Меньше шрифт"
            variant="ghost"
            color="inherit"
            onClick={() => changeFont(-2)}
          >
            <LuMinus />
          </IconButton>
          <IconButton
            aria-label="Больше шрифт"
            variant="ghost"
            color="inherit"
            onClick={() => changeFont(2)}
          >
            <LuPlus />
          </IconButton>
          {fullscreenSupported && (
            <IconButton
              aria-label={isFullscreen ? 'Выйти из полного экрана' : 'На весь экран'}
              variant="ghost"
              color="inherit"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <LuMinimize /> : <LuMaximize />}
            </IconButton>
          )}
        </HStack>

        {/* Текст стихотворения */}
        <Box flex={1} overflowY="auto" px={{ base: 5, md: 10 }} py={6}>
          <Box maxW="820px" mx="auto">
            <Heading asChild fontSize={`${Math.round(fontSize * 1.15)}px`} lineHeight="short" mb={6} color="#ffffff">
              <h1>{openPoem.title}</h1>
            </Heading>
            <Text fontSize={`${fontSize}px`} lineHeight="1.55" whiteSpace="pre-wrap" wordBreak="break-word">
              {openPoem.text}
            </Text>
          </Box>
        </Box>

        {/* Нижняя панель: предыдущее и следующее */}
        <HStack
          gap={2}
          px={3}
          py={2}
          borderTopWidth="1px"
          borderColor="whiteAlpha.200"
          flexShrink={0}
          pb="max(8px, env(safe-area-inset-bottom))"
        >
          <Button
            flex={1}
            variant="outline"
            color="inherit"
            borderColor="whiteAlpha.300"
            size="lg"
            disabled={openIndex <= 0}
            onClick={() => goTo(openIndex - 1)}
          >
            <LuChevronLeft />
            Назад
          </Button>
          <Button
            flex={1}
            variant="outline"
            color="inherit"
            borderColor="whiteAlpha.300"
            size="lg"
            disabled={openIndex >= poems.length - 1}
            onClick={() => goTo(openIndex + 1)}
          >
            Дальше
            <LuChevronRight />
          </Button>
        </HStack>
      </Flex>
    )
  }

  // ───────────────────────── Список ─────────────────────────
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
                onClick={toggleFullscreen}
              >
                {isFullscreen ? <LuMinimize /> : <LuMaximize />}
              </IconButton>
            )}
            <IconButton
              aria-label="Обновить стихи"
              variant="outline"
              onClick={refresh}
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
                  Сохранено на этом телефоне: {poems.length} {pluralizePoems(poems.length)}.{' '}
                  <Text asChild color="fg.muted">
                    <span>Обновлено {formatSyncedAt(snapshot.syncedAt)}.</span>
                  </Text>
                </Text>
              </HStack>
            )
            : <Text fontSize="sm" color="fg.muted">Стихи ещё не сохранены на телефон.</Text>}

          {syncState === 'unauthorized' && (
            <Text fontSize="sm" color="orange.fg">
              Вы не вошли. Войдите, пока есть интернет, и стихи сохранятся.{' '}
              <a href="/sign-in?returnTo=/reader" style={{ textDecoration: 'underline' }}>Войти</a>
            </Text>
          )}
          {syncState === 'offline' && (
            <HStack gap={2} color="fg.muted">
              <LuWifiOff />
              <Text fontSize="sm">Нет сети. Показаны сохранённые стихи.</Text>
            </HStack>
          )}
          {syncState === 'error' && (
            <Text fontSize="sm" color="red.fg">Не удалось обновить стихи. Показаны сохранённые.</Text>
          )}

          {isAccepted
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
              <Button size="sm" colorPalette="brand" alignSelf="start" onClick={accept}>
                Включить работу без интернета
              </Button>
            )}
          {!fullscreenSupported && (
            <Text fontSize="xs" color="fg.muted">
              Полный экран: в меню браузера выберите «Добавить на экран „Домой“» и открывайте с иконки.
            </Text>
          )}
        </VStack>

        {poems.length === 0
          ? (
            <Text color="fg.muted">
              Стихов нет. Напишите их в кабинете поэта, затем откройте эту страницу с интернетом.
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
                  borderColor="border"
                  p={4}
                  cursor="pointer"
                  _hover={{ borderColor: 'border.emphasized' }}
                  _active={{ bg: 'bg.muted' }}
                >
                  <button type="button" onClick={() => setOpenId(poem.id)}>
                    <HStack justify="space-between" gap={3} align="start">
                      <VStack gap={1} align="start" minW={0}>
                        <Text fontWeight="semibold" lineClamp={1}>{poem.title}</Text>
                        <Text fontSize="sm" color="fg.muted" lineClamp={2} whiteSpace="pre-line">
                          {poem.text.slice(0, 120)}
                        </Text>
                      </VStack>
                      {!poem.published && <Badge variant="subtle" size="sm" flexShrink={0}>Черновик</Badge>}
                    </HStack>
                  </button>
                </Box>
              ))}
            </VStack>
          )}
      </VStack>
    </Container>
  )
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
