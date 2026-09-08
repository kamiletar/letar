'use client'

import { Box, Button, Center, Flex, Text, VStack } from '@chakra-ui/react'
import type { FolderPlayerHost, FolderPlayerStorage, MediaProbeResult } from '@letar/folder-player-react'
import {
  EpisodeSidebar,
  RecentFoldersCard,
  useFolderHistory,
  useFolderPlayer,
  useWatchProgress,
} from '@letar/folder-player-react'
import type { DragEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LuFolderOpen } from 'react-icons/lu'

import type { MediaInfo } from '@letar/folder-scan'

import type { CodecSupportResult } from '@shared/codec-support'
import { checkCodecSupport } from '@shared/codec-support'
import { ExtendedFormatsPanel } from './_components/ExtendedFormatsPanel'
import type { VideoPlayerSubtitle } from './_components/VideoPlayer'
import { VideoPlayer } from './_components/VideoPlayer'
import { isVideoFilePath } from './_lib/dropped-path'
import { toMediaUrl } from './_lib/media-url'

/**
 * Хост папочного плеера, построенный из `window.electronAPI` этого приложения.
 *
 * `probe()` мапит полную `MediaInfo` (MediaInfoWasmProber, main-процесс) в узкую
 * `MediaProbeInfo`, нужную UI — audio/subtitle-селекторы. Главы сейчас всегда `undefined`
 * (см. комментарий в `main/services/media-info-prober.ts` про Menu-трек MediaInfoLib) —
 * кнопка «Пропустить опенинг» появится, когда прочтение глав будет решено отдельной задачей.
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
    probe: async (filePath): Promise<MediaProbeResult> => {
      const result = await window.electronAPI.probe(filePath)
      if (!result.success || !result.data) {
        return { success: false, error: result.error ?? 'Не удалось получить данные о медиафайле' }
      }
      return {
        success: true,
        data: {
          audioTracks: result.data.audioTracks.map((t) => ({
            index: t.index,
            language: t.language,
            title: t.title,
            codec: t.codec ?? '',
            channels: t.channels ?? 0,
            bitrate: t.bitrate,
            isDefault: t.isDefault,
            isForced: t.isForced,
          })),
          subtitleTracks: result.data.subtitleTracks.map((t) => ({
            index: t.index,
            language: t.language,
            title: t.title,
            codec: t.codec,
            isDefault: t.isDefault,
            isForced: t.isForced,
            subtitleType: t.subtitleType,
          })),
          chapters: result.data.chapters?.map((c) => ({ start: c.start, end: c.end, title: c.title })),
        },
      }
    },
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

  const { currentEpisode, currentVideoPath, folderName, folderPath, episodes, totalEpisodes } = player

  // Запоминаем папку в истории после успешного сканирования
  useEffect(() => {
    if (player.isFolderMode && folderPath && folderName && totalEpisodes > 0) {
      history.addFolder(folderPath, folderName, totalEpisodes)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.isFolderMode, folderPath, folderName, totalEpisodes])

  // Внешний субтитр текущего эпизода — берём первый найденный матч
  // (выбор дорожки из нескольких вариантов — отдельная задача плана)
  const externalSubtitle = useMemo<VideoPlayerSubtitle | null>(() => {
    const match = player.externalTracks.subtitles[0]
    if (!match) {
      return null
    }
    return {
      url: toMediaUrl(match.filePath),
      format: match.format,
      fonts: match.matchedFonts.map((f) => toMediaUrl(f.path)),
    }
  }, [player.externalTracks.subtitles])

  const hasExternalSubtitle = player.externalTracks.subtitles.length > 0
  const [embeddedSubtitle, setEmbeddedSubtitle] = useState<VideoPlayerSubtitle | null>(null)
  const embeddedBlobUrlsRef = useRef<string[]>([])

  // Встроенные субтитры (в контейнере MKV) — фоллбэк, только когда внешних субтитров для
  // эпизода не нашлось (Rus Sub/ и т.п. рядом с видео). Извлечение потоковое, без ffmpeg
  // (matroska-subtitles), поэтому запускается только по необходимости, не на каждый эпизод.
  useEffect(() => {
    for (const url of embeddedBlobUrlsRef.current) {
      URL.revokeObjectURL(url)
    }
    embeddedBlobUrlsRef.current = []
    setEmbeddedSubtitle(null)

    if (!currentVideoPath || hasExternalSubtitle) {
      return
    }

    let cancelled = false
    void window.electronAPI.subtitles.extractEmbedded(currentVideoPath).then((result) => {
      if (cancelled || !result.success || !result.data) {
        return
      }
      // Первая дорожка контейнера — выбор конкретной дорожки из нескольких (по языку/
      // дефолтности) не входит в эту задачу, см. риск нумерации в PLAN_ANIMATRONA_PLAYER.md
      const track = result.data.tracks[0]
      if (!track) {
        return
      }

      const fontUrls = result.data.fonts.map((f) =>
        URL.createObjectURL(new Blob([new Uint8Array(f.data)], { type: f.mimetype || 'font/ttf' }))
      )
      embeddedBlobUrlsRef.current.push(...fontUrls)

      if (track.format === 'srt') {
        const subtitleUrl = URL.createObjectURL(new Blob([track.content], { type: 'text/plain' }))
        embeddedBlobUrlsRef.current.push(subtitleUrl)
        setEmbeddedSubtitle({ url: subtitleUrl, format: 'srt', fonts: [] })
      } else {
        setEmbeddedSubtitle({ content: track.content, format: track.format, fonts: fontUrls })
      }
    })

    return () => {
      cancelled = true
    }
  }, [currentVideoPath, hasExternalSubtitle])

  const subtitle = externalSubtitle ?? embeddedSubtitle

  // Детекция кодеков, которые Chromium не декодирует (Hi10P, AC3/DTS/TrueHD) — до старта
  // воспроизведения, а не после чёрного экрана. Пробует напрямую через electronAPI.probe (полный
  // MediaInfo с videoTracks), в обход host.probe() — тот отдаёт узкий MediaProbeInfo без
  // видеодорожек (нужны только audio/subtitle-селекторам, см. @letar/folder-player-react/host.ts)
  const [codecSupport, setCodecSupport] = useState<CodecSupportResult | null>(null)
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null)
  useEffect(() => {
    setCodecSupport(null)
    setMediaInfo(null)
    if (!mounted || !currentVideoPath) {
      return
    }
    let cancelled = false
    void window.electronAPI.probe(currentVideoPath).then((result) => {
      if (cancelled || !result.success || !result.data) {
        return
      }
      setMediaInfo(result.data)
      setCodecSupport(checkCodecSupport(result.data.videoTracks, result.data.audioTracks, currentVideoPath))
    })
    return () => {
      cancelled = true
    }
  }, [mounted, currentVideoPath])

  /**
   * Путь к подготовленной ffmpeg копии текущего файла (Фаза 6). Пока он есть — играем именно
   * его, а субтитры и прогресс просмотра остаются привязанными к ОРИГИНАЛЬНОМУ пути:
   * встроенные дорожки читаются из исходного MKV, история не раздваивается на копию в кэше.
   */
  const [preparedPath, setPreparedPath] = useState<string | null>(null)
  useEffect(() => {
    setPreparedPath(null)
  }, [currentVideoPath])

  const [openInSystemPlayerError, setOpenInSystemPlayerError] = useState<string | null>(null)
  const handleOpenInSystemPlayer = useCallback(() => {
    if (!currentVideoPath) {
      return
    }
    setOpenInSystemPlayerError(null)
    void window.electronAPI.shell.openPath(currentVideoPath).then((result) => {
      if (!result.success) {
        setOpenInSystemPlayerError(result.error ?? 'Не удалось открыть системный плеер')
      }
    })
  }, [currentVideoPath])

  // Двойной клик по ассоциированному файлу или повторный запуск с файлом (main/background.ts,
  // app:openFile) — открываем его напрямую, минуя диалог выбора
  useEffect(() => {
    if (!mounted) {
      return
    }
    return window.electronAPI.onOpenFile((filePath) => {
      void player.openSingleFile(filePath)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, player.openSingleFile])

  // Drag&drop файла или папки в окно — webUtils.getPathForFile, т.к. File.path удалён в Electron ≥32
  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }, [])
  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      const file = event.dataTransfer.files[0]
      if (!file) {
        return
      }
      const filePath = window.electronAPI.getPathForFile(file)
      if (!filePath) {
        return
      }
      if (isVideoFilePath(filePath)) {
        void player.openSingleFile(filePath)
      } else {
        void player.openFolder(filePath)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [player.openSingleFile, player.openFolder],
  )

  const resumeTime = currentVideoPath ? watchProgress.getResumeTime(currentVideoPath) : 0

  // Последний известный прогресс — нужен в handleEnded, у которого своих currentTime/duration нет
  const lastProgressRef = useRef({ currentTime: 0, duration: 0 })

  const handleTimeUpdate = useCallback(
    (currentTime: number, duration: number) => {
      lastProgressRef.current = { currentTime, duration }
      if (!currentVideoPath || !duration) {
        return
      }
      watchProgress.saveProgress(currentVideoPath, currentTime, duration)
    },
    [currentVideoPath, watchProgress],
  )

  const handleEnded = useCallback(() => {
    if (!currentVideoPath) {
      return
    }
    const { currentTime, duration } = lastProgressRef.current
    watchProgress.saveProgressNow(currentVideoPath, currentTime, duration)
    if (player.hasNext) {
      void player.goNext()
    }
  }, [currentVideoPath, watchProgress, player])

  if (!player.isFolderMode && !player.isSingleMode) {
    return (
      <Center minH="100vh" p={8} onDragOver={handleDragOver} onDrop={handleDrop}>
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
    <Flex h="100vh" overflow="hidden" onDragOver={handleDragOver} onDrop={handleDrop}>
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
        {currentVideoPath && codecSupport && !codecSupport.supported && !preparedPath
          ? (
            <Center h="full" p={8}>
              <VStack gap={4} maxW="lg" color="white" textAlign="center">
                <Text fontSize="xl" fontWeight="bold">Плеер не может проиграть этот файл</Text>
                {codecSupport.issues.map((issue) => <Text key={issue.kind} color="fg.muted">{issue.message}</Text>)}
                {mediaInfo && (
                  <ExtendedFormatsPanel
                    filePath={currentVideoPath}
                    mediaInfo={mediaInfo}
                    onReady={setPreparedPath}
                  />
                )}
                <Flex gap={3} wrap="wrap" justify="center">
                  <Button variant="ghost" onClick={handleOpenInSystemPlayer}>
                    Открыть в системном плеере
                  </Button>
                </Flex>
                {openInSystemPlayerError && <Text color="fg.error">{openInSystemPlayerError}</Text>}
              </VStack>
            </Center>
          )
          : currentVideoPath && (
            <VideoPlayer
              key={preparedPath ?? currentVideoPath}
              src={toMediaUrl(preparedPath ?? currentVideoPath)}
              subtitle={subtitle}
              startTime={resumeTime}
              hasPrev={player.hasPrev}
              hasNext={player.hasNext}
              onPrev={() => void player.goPrev()}
              onNext={() => void player.goNext()}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
            />
          )}

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
