'use client'

/**
 * Страница плеера для воспроизведения локальных видеофайлов
 * Поддерживает режим одиночного файла и папочный режим (сериалы)
 */

import { Box, Button, Card, HStack, Icon, Spinner, Text, VStack } from '@chakra-ui/react'
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LuArrowLeft, LuFile, LuFolderOpen, LuPlay } from 'react-icons/lu'

import { useRouter } from 'next/navigation'

import { useGlobalVideoStore } from '@/components/global-video'
import { ImportWizardDialog } from '@/components/import/ImportWizardDialog'
import { Header } from '@/components/layout'
import type { VideoPlayerRef } from '@/components/player'

import { EpisodeSidebar } from './_components/EpisodeSidebar'
import { RecentFoldersCard } from './_components/RecentFoldersCard'
import { useFolderHistory } from './_hooks/useFolderHistory'
import { useFolderModeUI } from './_hooks/useFolderModeUI'
import { useFolderPlayer } from './_hooks/useFolderPlayer'
import { useWatchProgress } from './_hooks/useWatchProgress'

// Dynamic import для VideoPlayer — загружается только когда нужен (~500KB)
const VideoPlayer = dynamic(() => import('@/components/player/VideoPlayer').then((mod) => mod.VideoPlayer), {
  ssr: false,
  loading: () => (
    <Box display="flex" alignItems="center" justifyContent="center" h="full" bg="black">
      <Spinner size="xl" color="purple.500" />
    </Box>
  ),
})

/**
 * Страница плеера
 */
export default function PlayerPage() {
  const router = useRouter()

  // === State ===
  const [singleVideoPath, setSingleVideoPath] = useState<string | null>(null)
  const [singleVideoName, setSingleVideoName] = useState<string>('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showImportWizard, setShowImportWizard] = useState(false)

  // === Refs ===
  const playerRef = useRef<VideoPlayerRef | null>(null)
  const lastSavedTimeRef = useRef<number>(0)

  // === Hooks ===
  const folderPlayer = useFolderPlayer()
  const watchProgress = useWatchProgress()
  const folderHistory = useFolderHistory()

  // === Computed ===
  const isFolderMode = folderPlayer.isFolderMode
  const currentVideoPath = isFolderMode ? folderPlayer.currentVideoPath : singleVideoPath
  const currentVideoName = isFolderMode ? (folderPlayer.currentEpisode?.name ?? 'Видео') : singleVideoName

  // === Folder Mode UI ===
  const folderModeUI = useFolderModeUI({
    folderPlayer,
    watchProgress,
    playerRef,
    currentVideoPath,
  })

  // Время возобновления — вычисляется ТОЛЬКО при смене видео
  // Важно: НЕ пересчитывать при обновлении storage, иначе видео будет скакать назад
  const [initialResumeTime, setInitialResumeTime] = useState(0)
  const prevVideoPathRef = useRef<string | null>(null)

  useEffect(() => {
    if (currentVideoPath !== prevVideoPathRef.current) {
      prevVideoPathRef.current = currentVideoPath
      const time = currentVideoPath ? watchProgress.getResumeTime(currentVideoPath) : 0
      setInitialResumeTime(time)

      // Папочный/single-file режим не проходит через useGlobalVideo (нет episodeId/animeId
      // для DB-ориентированного initVideo) — грузим persistent video element напрямую.
      // Без этого GlobalVideoProvider никогда не узнаёт src, и видео вечно висит в состоянии
      // загрузки (isLoading в VideoPlayer снимается только по loadeddata от video element).
      useGlobalVideoStore.getState().loadRawSrc(currentVideoPath, time)
    }
  }, [currentVideoPath, watchProgress])

  // Останавливаем и освобождаем persistent video при уходе со страницы плеера —
  // иначе локальный файл продолжит "играть" в отсоединённом video-элементе без UI.
  useEffect(() => {
    return () => {
      useGlobalVideoStore.getState().loadRawSrc(null)
    }
  }, [])

  // Добавляем папку в историю при успешном открытии
  useEffect(() => {
    if (
      folderPlayer.isFolderMode
      && folderPlayer.folderPath
      && folderPlayer.folderName
      && folderPlayer.totalEpisodes > 0
    ) {
      folderHistory.addFolder(folderPlayer.folderPath, folderPlayer.folderName, folderPlayer.totalEpisodes)
    }
  }, [
    folderPlayer.isFolderMode,
    folderPlayer.folderPath,
    folderPlayer.folderName,
    folderPlayer.totalEpisodes,
    folderHistory,
  ])

  /** Данные для быстрого импорта из папочного режима */
  const importInitialData = useMemo(() => {
    if (!folderPlayer.folderPath) {
      return undefined
    }
    return {
      folderPath: folderPlayer.folderPath,
      videoFiles: [...folderPlayer.episodes.map((e) => e.path), ...folderPlayer.bonusVideos.map((e) => e.path)],
      skipFolderSelect: true,
    }
  }, [folderPlayer.folderPath, folderPlayer.episodes, folderPlayer.bonusVideos])

  // === Handlers ===

  /** Открыть диалог выбора файла (single mode) */
  const handleSelectFile = useCallback(async () => {
    if (!window.electronAPI) {
      console.warn('[PlayerPage] electronAPI not available')
      return
    }

    const filePath = await window.electronAPI.dialog.selectFile([
      {
        name: 'Видео',
        extensions: ['mkv', 'mp4', 'webm', 'avi', 'mov', 'm4v'],
      },
    ])

    if (filePath) {
      // Сбрасываем папочный режим если был
      folderPlayer.reset()
      setSingleVideoPath(filePath)
      // Извлекаем имя файла из пути
      const name = filePath.split(/[/\\]/).pop() || 'Видео'
      setSingleVideoName(name)
    }
  }, [folderPlayer])

  /** Открыть диалог выбора папки (folder mode) */
  const handleSelectFolder = useCallback(async () => {
    // Сбрасываем single mode
    setSingleVideoPath(null)
    setSingleVideoName('')
    // Запускаем сканирование папки
    await folderPlayer.selectFolder()
  }, [folderPlayer])

  /** Обработчик обновления времени (для сохранения прогресса) */
  const handleTimeUpdate = useCallback(
    (currentTime: number, duration: number) => {
      if (!currentVideoPath || duration === 0) {
        return
      }

      // Сохраняем каждые 5 секунд изменения позиции
      if (Math.abs(currentTime - lastSavedTimeRef.current) >= 5) {
        watchProgress.saveProgress(currentVideoPath, currentTime, duration)
        lastSavedTimeRef.current = currentTime
      }
    },
    [currentVideoPath, watchProgress],
  )

  /** Обработчик окончания видео */
  const handleVideoEnded = useCallback(() => {
    // Очищаем прогресс — видео досмотрено
    if (currentVideoPath) {
      watchProgress.clearProgress(currentVideoPath)
    }

    // В папочном режиме — переход на следующий эпизод
    if (isFolderMode && folderPlayer.hasNext) {
      // Сохраняем текущий прогресс принудительно
      if (currentVideoPath) {
        const video = playerRef.current
        if (video) {
          // @ts-expect-error duration может быть undefined
          watchProgress.saveProgressNow(currentVideoPath, video.currentTime ?? 0, video.duration ?? 0)
        }
      }
      folderPlayer.goNext()
    }
  }, [currentVideoPath, isFolderMode, folderPlayer, watchProgress])

  /** Обработчик ошибки воспроизведения */
  const handleVideoError = useCallback((error: Error) => {
    console.error('[PlayerPage] Video error:', error)
  }, [])

  /** Закрытие сайдбара */
  const handleCloseSidebar = useCallback(() => {
    setSidebarCollapsed(true)
  }, [])

  /** Переключение сворачивания сайдбара */
  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev)
  }, [])

  /** Открыть визард импорта в библиотеку */
  const handleImportToLibrary = useCallback(() => {
    setShowImportWizard(true)
  }, [])

  /** Открыть папку из истории */
  const handleOpenFolderFromHistory = useCallback(
    async (folderPath: string) => {
      // Сбрасываем single mode
      setSingleVideoPath(null)
      setSingleVideoName('')

      // Открываем папку
      const success = await folderPlayer.openFolder(folderPath)

      if (!success) {
        // Удаляем из истории если папка больше не существует
        folderHistory.removeFolder(folderPath)
        console.warn('[PlayerPage] Папка не найдена или пуста:', folderPath)
      }
    },
    [folderPlayer, folderHistory],
  )

  // === Render ===

  const hasVideo = currentVideoPath !== null
  const isLoading = folderPlayer.isScanning

  // Заголовок для Header
  const headerTitle = isFolderMode
    ? `${folderPlayer.currentNumber}/${folderPlayer.totalInCategory} — ${currentVideoName}`
    : hasVideo
    ? currentVideoName
    : 'Плеер'

  return (
    <Box h="full" bg="bg" color="fg" display="flex" flexDirection="column" overflow="hidden">
      <Header title={headerTitle} />

      {/* Навигация */}
      <HStack px={6} py={2} gap={2} flexShrink={0}>
        <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
          <Icon as={LuArrowLeft} mr={2} />
          На главную
        </Button>

        {/* Кнопка показа сайдбара (если свёрнут) */}
        {isFolderMode && sidebarCollapsed && (
          <Button variant="ghost" size="sm" onClick={handleToggleSidebar}>
            <Icon as={LuFolderOpen} mr={2} />
            Эпизоды ({folderPlayer.totalEpisodes})
          </Button>
        )}
      </HStack>

      {/* Основной контент */}
      <Box flex={1} display="flex" p={4} gap={4} minH={0}>
        {/* Сайдбар с эпизодами (только в folder mode) */}
        {isFolderMode && !sidebarCollapsed && (
          <EpisodeSidebar
            folderName={folderPlayer.folderName}
            episodes={folderPlayer.episodes}
            bonusVideos={folderPlayer.bonusVideos}
            currentIndex={folderPlayer.currentIndex}
            isCurrentBonus={folderPlayer.isCurrentBonus}
            currentBonusIndex={folderPlayer.currentBonusIndex}
            getProgressPercent={watchProgress.getProgressPercent}
            onSelectEpisode={folderModeUI.handleSelectEpisode}
            onSelectBonus={folderModeUI.handleSelectBonus}
            onClose={handleCloseSidebar}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={handleToggleSidebar}
            onImportToLibrary={handleImportToLibrary}
          />
        )}

        {/* Область плеера */}
        <Box flex={1} display="flex" flexDirection="column" minH={0}>
          {isLoading
            ? (
              /* Состояние загрузки */
              <VStack flex={1} justify="center" gap={4}>
                <Spinner size="xl" color="purple.500" />
                <Text color="fg.muted">Сканирование папки...</Text>
              </VStack>
            )
            : hasVideo
            ? (
              /* Режим воспроизведения */
              <Box flex={1} borderRadius="lg" overflow="hidden" bg="black" minH={0}>
                <VideoPlayer
                  ref={playerRef}
                  src={currentVideoPath}
                  autoPlay
                  startTime={initialResumeTime}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handleVideoEnded}
                  onError={handleVideoError}
                  // Навигация между эпизодами (только в folder mode)
                  hasPrevEpisode={isFolderMode && folderPlayer.hasPrev}
                  hasNextEpisode={isFolderMode && folderPlayer.hasNext}
                  onPrevEpisode={folderModeUI.handlePrevEpisode}
                  onNextEpisode={folderModeUI.handleNextEpisode}
                  prevEpisodeTooltip={folderPlayer.prevEpisode?.name}
                  nextEpisodeTooltip={folderPlayer.nextEpisode?.name}
                  // Внешние субтитры (выбранные через TrackSelector)
                  subtitlePath={folderModeUI.currentSubtitlePath}
                  subtitleFonts={folderModeUI.currentSubtitleFonts}
                  // TrackSelector в header плеера
                  headerRight={folderModeUI.trackSelectorElement}
                  // Внешнее аудио управляется через useFolderModeUI
                  externalAudioManaged={folderModeUI.usesExternalAudio}
                />
              </Box>
            )
            : (
              /* Режим выбора файла */
              <VStack flex={1} justify="center" gap={6}>
                <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle" maxW="md" w="full">
                  <Card.Body p={8}>
                    <VStack gap={6}>
                      <Icon as={LuPlay} boxSize={16} color="purple.400" />

                      <VStack gap={2} textAlign="center">
                        <Text fontSize="xl" fontWeight="bold">
                          Видеоплеер
                        </Text>
                        <Text color="fg.muted">Выберите файл или папку с сериалом</Text>
                      </VStack>

                      {/* Кнопки выбора */}
                      <HStack gap={3} w="full">
                        <Button colorPalette="purple" size="lg" flex={1} onClick={handleSelectFolder}>
                          <Icon as={LuFolderOpen} mr={2} />
                          Выбрать папку
                        </Button>
                        <Button variant="outline" colorPalette="gray" size="lg" flex={1} onClick={handleSelectFile}>
                          <Icon as={LuFile} mr={2} />
                          Выбрать файл
                        </Button>
                      </HStack>

                      <Text fontSize="sm" color="fg.subtle">
                        Поддерживаемые форматы: MKV, MP4, WebM, AVI, MOV
                      </Text>
                    </VStack>
                  </Card.Body>
                </Card.Root>

                {/* Недавние папки */}
                <RecentFoldersCard
                  history={folderHistory.history}
                  onSelectFolder={handleOpenFolderFromHistory}
                  onRemoveFolder={folderHistory.removeFolder}
                />

                {/* Горячие клавиши */}
                <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle" maxW="md" w="full">
                  <Card.Body>
                    <Text fontWeight="medium" mb={3}>
                      Горячие клавиши плеера
                    </Text>
                    <VStack align="stretch" gap={1} fontSize="sm" color="fg.muted">
                      <HStack justify="space-between">
                        <Text>Воспроизведение / Пауза</Text>
                        <Text>Space, K</Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text>Назад / Вперёд 10 сек</Text>
                        <Text>←, →</Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text>Громкость</Text>
                        <Text>↑, ↓</Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text>Выключить звук</Text>
                        <Text>M</Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text>Полноэкранный режим</Text>
                        <Text>F</Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text>Предыдущий / Следующий эпизод</Text>
                        <Text>Shift + ←, →</Text>
                      </HStack>
                    </VStack>
                  </Card.Body>
                </Card.Root>
              </VStack>
            )}
        </Box>
      </Box>

      {/* Визард импорта в библиотеку — условный рендер */}
      {showImportWizard && (
        <ImportWizardDialog
          open={showImportWizard}
          onOpenChange={setShowImportWizard}
          initialFolderPath={importInitialData?.folderPath}
          initialData={importInitialData}
        />
      )}
    </Box>
  )
}
