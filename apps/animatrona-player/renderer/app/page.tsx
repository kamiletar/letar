'use client'

import { Box, Button, Center, Flex, HStack, Text, VStack } from '@chakra-ui/react'
import type { FolderPlayerHost, FolderPlayerStorage, MediaProbeResult } from '@letar/folder-player-react'
import {
  EpisodeSidebar,
  RecentFoldersCard,
  useFolderHistory,
  useFolderPlayer,
  useWatchProgress,
} from '@letar/folder-player-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LuFolderOpen } from 'react-icons/lu'

import { toMediaUrl } from './_lib/media-url'

/**
 * Хост папочного плеера, построенный из `window.electronAPI` этого приложения.
 *
 * `probe()` пока заглушка — MediaInfoWasmProber (mediainfo.js) не подключён, это отдельная
 * задача плана. Без пробы недоступны только встроенные (в контейнере) аудио/субтитр-дорожки
 * и главы — внешние субтитры/аудио (Rus Sub/, Rus Sound/ и т.п.) сканируются штатно.
 */
function createFolderPlayerHost(): FolderPlayerHost {
  return {
    selectFolder: () => window.electronAPI.dialog.selectFolder(),
    selectFile: (filters) => window.electronAPI.dialog.selectFile(filters),
    scanFolder: (folderPath, recursive, mediaTypes) =>
      window.electronAPI.fs.scanFolder(folderPath, recursive, mediaTypes),
    scanExternalAudio: (folderPath, videoFiles) => window.electronAPI.fs.scanExternalAudio(folderPath, videoFiles),
    scanExternalSubtitles: (folderPath, videoFiles) =>
      window.electronAPI.fs.scanExternalSubtitles(folderPath, videoFiles),
    probe: (): Promise<MediaProbeResult> =>
      Promise.resolve({ success: false, error: 'Проба медиафайла (MediaInfoWasmProber) ещё не подключена' }),
    toMediaUrl,
  }
}

/**
 * Заглушка хоста/хранилища для рендера до монтирования (`next export` пререндерит страницу
 * на сборке — там нет ни `window.electronAPI`, ни `window.localStorage`). Реальные реализации
 * подставляются после монтирования, когда страница уже выполняется в Electron-рендерере.
 */
const noopHost: FolderPlayerHost = {
  selectFolder: () => Promise.resolve(null),
  selectFile: () => Promise.resolve(null),
  scanFolder: () => Promise.resolve({ success: false, files: [] }),
  scanExternalAudio: () => Promise.resolve({ audioDirs: [], audioTracks: [], unmatchedFiles: [] }),
  scanExternalSubtitles: () => Promise.resolve({ subsDirs: [], fontsDirs: [], subtitles: [], unmatchedFiles: [] }),
  probe: () => Promise.resolve({ success: false, error: 'not mounted' }),
  toMediaUrl: () => '',
}

const noopStorage: FolderPlayerStorage = {
  getItem: () => null,
  setItem: () => {},
}

export default function HomePage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const host = useMemo(() => (mounted ? createFolderPlayerHost() : noopHost), [mounted])
  const storage = mounted ? window.localStorage : noopStorage
  const player = useFolderPlayer(host)
  const history = useFolderHistory(storage)
  const watchProgress = useWatchProgress(storage)
  const videoRef = useRef<HTMLVideoElement>(null)

  const { currentEpisode, currentVideoPath, folderName, folderPath, episodes, totalEpisodes } = player

  // Запоминаем папку в истории после успешного сканирования
  useEffect(() => {
    if (player.isFolderMode && folderPath && folderName && totalEpisodes > 0) {
      history.addFolder(folderPath, folderName, totalEpisodes)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.isFolderMode, folderPath, folderName, totalEpisodes])

  // Восстанавливаем позицию просмотра при смене эпизода
  useEffect(() => {
    const el = videoRef.current
    if (!el || !currentVideoPath) {
      return
    }
    const resumeTime = watchProgress.getResumeTime(currentVideoPath)
    if (resumeTime > 0) {
      el.currentTime = resumeTime
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVideoPath])

  const handleTimeUpdate = useCallback(() => {
    const el = videoRef.current
    if (!el || !currentVideoPath || !el.duration) {
      return
    }
    watchProgress.saveProgress(currentVideoPath, el.currentTime, el.duration)
  }, [currentVideoPath, watchProgress])

  const handleEnded = useCallback(() => {
    const el = videoRef.current
    if (!el || !currentVideoPath) {
      return
    }
    watchProgress.saveProgressNow(currentVideoPath, el.currentTime, el.duration || 0)
    if (player.hasNext) {
      void player.goNext()
    }
  }, [currentVideoPath, watchProgress, player])

  if (!player.isFolderMode && !player.isSingleMode) {
    return (
      <Center minH="100vh" p={8}>
        <VStack gap={6} maxW="md" w="full">
          <Text fontSize="2xl" fontWeight="bold">Animatrona Player</Text>
          <Text color="fg.muted" textAlign="center">
            Выбери папку с сериалом — плеер сам найдёт эпизоды, внешние субтитры и аудиодорожки
          </Text>
          <Button size="lg" colorPalette="brand" onClick={() => void player.selectFolder()} loading={player.isScanning}>
            <LuFolderOpen size={18} style={{ marginRight: 8 }} />
            Выбрать папку
          </Button>
          <RecentFoldersCard
            history={history.history}
            onSelectFolder={(path) => void player.openFolder(path)}
            onRemoveFolder={history.removeFolder}
          />
          {player.error && <Text color="fg.error">{player.error}</Text>}
        </VStack>
      </Center>
    )
  }

  return (
    <Flex h="100vh" overflow="hidden">
      {player.isFolderMode && (
        <EpisodeSidebar
          folderName={folderName}
          episodes={episodes}
          bonusVideos={player.bonusVideos}
          currentIndex={player.currentIndex}
          isCurrentBonus={player.isCurrentBonus}
          currentBonusIndex={player.currentBonusIndex}
          getProgressPercent={watchProgress.getProgressPercent}
          onSelectEpisode={(index) => void player.goToEpisode(index)}
          onSelectBonus={(index) => void player.goToBonus(index)}
          onClose={player.reset}
          isCollapsed={false}
          onToggleCollapse={() => {}}
        />
      )}

      <Box flex={1} bg="black" position="relative">
        {currentVideoPath && (
          <video
            key={currentVideoPath}
            ref={videoRef}
            src={toMediaUrl(currentVideoPath)}
            controls
            autoPlay
            style={{ width: '100%', height: '100%' }}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
          />
        )}

        <HStack position="absolute" bottom={4} left={4} gap={2}>
          <Button size="sm" variant="subtle" disabled={!player.hasPrev} onClick={() => void player.goPrev()}>
            Пред. эпизод
          </Button>
          <Button size="sm" variant="subtle" disabled={!player.hasNext} onClick={() => void player.goNext()}>
            След. эпизод
          </Button>
        </HStack>

        {currentEpisode && (
          <Text
            position="absolute"
            top={4}
            left={4}
            color="white"
            fontSize="sm"
            bg="blackAlpha.600"
            px={3}
            py={1}
            borderRadius="md"
          >
            {currentEpisode.name}
          </Text>
        )}
      </Box>
    </Flex>
  )
}
