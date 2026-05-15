'use client'

import { Box, Flex } from '@chakra-ui/react'
import { usePathname, useRouter } from 'next/navigation'
import { type ReactNode, useEffect, useMemo, useState } from 'react'

import { useDeepLink } from '@/hooks/useDeepLink'
import { setGatewayBaseUrl } from '@/lib/media-url'
import { useGlobalShortcuts } from '@/lib/shortcuts'

import { WelcomeDialog } from '../onboarding'
import { QuickSearch } from '../quick-search'
import { ShortcutsCheatsheet } from '../shortcuts'
import { PageTransition } from './PageTransition'
import { Sidebar } from './Sidebar'
import { TitleBar } from './TitleBar'

interface AppShellProps {
  children: ReactNode
}

/**
 * Основной layout приложения с боковой навигацией
 *
 * Структура:
 * - Sidebar (220px) — навигация слева
 * - Content — основной контент справа
 *
 * Глобальные хоткеи:
 * - Ctrl+K или / — Quick Search (поиск аниме)
 * - Ctrl+/ — показать список горячих клавиш
 * - 1-4 — навигация по секциям
 * - Escape — закрыть простые модальные окна
 */
/** Роуты, на которых sidebar скрыт и контент занимает весь экран */
const FULLSCREEN_ROUTES = ['/watch/', '/discover/watch', '/party/']

export function AppShell({ children }: AppShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false)
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false)

  // Полноэкранный режим — скрыть sidebar для плеера
  const isFullscreen = useMemo(() => FULLSCREEN_ROUTES.some((route) => pathname.startsWith(route)), [pathname])

  // Deep link обработка
  const { lastAction, clearAction } = useDeepLink()

  // Обработка deep link: animatrona://import/<manifestCid>
  useEffect(() => {
    if (lastAction?.type === 'import' && lastAction.data.manifestCid) {
      router.push(`/import-cid?cid=${encodeURIComponent(lastAction.data.manifestCid)}`)
      clearAction()
    }
  }, [lastAction, router, clearAction])

  // Получаем URL Kubo gateway напрямую (без кастомного gateway-сервера)
  useEffect(() => {
    const api = window.electronAPI
    if (!api) {
      return
    }

    // Получить текущий URL Kubo gateway
    const syncGatewayUrl = async () => {
      const result = await api.ipfs.kuboGetGatewayUrl()
      if (result.success && result.data) {
        setGatewayBaseUrl(result.data)
      }
    }

    void syncGatewayUrl()

    // При смене статуса IPFS (запуск/остановка) — обновляем URL
    const unsub = api.ipfs.onStatusChanged((status) => {
      if (status.isRunning) {
        void syncGatewayUrl()
      } else {
        setGatewayBaseUrl(null)
      }
    })

    return () => unsub()
  }, [])

  // Закрытие простых модальных окон (не влияет на визарды и сложные диалоги)
  const closeSimpleModals = () => {
    setIsShortcutsOpen(false)
    setIsQuickSearchOpen(false)
  }

  // Обработчик открытия импорта из WelcomeDialog
  const handleOpenImport = () => {
    router.push('/library?openImport=true')
  }

  // Глобальные горячие клавиши
  useGlobalShortcuts({
    onShowShortcuts: () => setIsShortcutsOpen(true),
    onCommandPalette: () => setIsQuickSearchOpen(true), // Ctrl+K открывает Quick Search
    onImport: handleOpenImport, // Ctrl+I открывает визард импорта
    onEscape: closeSimpleModals,
  })

  return (
    <>
      {/* Кастомный title bar (frameless window) */}
      <TitleBar />

      <Flex h="100vh" pt="32px" bg="bg.canvas" overflow="hidden">
        {!isFullscreen && <Sidebar />}
        <Box flex={1} overflow={isFullscreen ? 'hidden' : 'auto'}>
          <PageTransition>{children}</PageTransition>
        </Box>

        {/* Quick Search + Command Palette (Ctrl+K или /) */}
        <QuickSearch
          open={isQuickSearchOpen}
          onOpenChange={setIsQuickSearchOpen}
          onShowShortcuts={() => setIsShortcutsOpen(true)}
          onImport={handleOpenImport}
        />

        {/* Модальное окно с горячими клавишами (Ctrl+/) */}
        <ShortcutsCheatsheet open={isShortcutsOpen} onOpenChange={setIsShortcutsOpen} />

        {/* Welcome Dialog при первом запуске */}
        <WelcomeDialog onOpenImport={handleOpenImport} onShowShortcuts={() => setIsShortcutsOpen(true)} />
      </Flex>
    </>
  )
}
