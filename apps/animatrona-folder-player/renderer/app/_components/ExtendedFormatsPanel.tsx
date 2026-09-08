'use client'

/**
 * «Расширенная поддержка форматов» — установка ffmpeg по требованию и подготовка файла,
 * который Chromium не проигрывает сам (PLAN.md §10, Фаза 6).
 *
 * Показывается на экране «Плеер не может проиграть этот файл» вместо прежней заглушки.
 * Два независимых шага: сначала (один раз на машину) докачка ffmpeg, потом подготовка
 * конкретного файла — она же при повторном открытии мгновенно отдаёт результат из кэша.
 */

import type { FfmpegInstallProgress, FfmpegStatus, TranscodeProgress } from '@/types/electron'
import { Box, Button, Flex, Progress, Text, VStack } from '@chakra-ui/react'
import type { MediaInfo } from '@letar/folder-scan'
import { buildTranscodePlan } from '@shared/transcode-plan'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type { UseTranscodeStreamResult } from '../_hooks/use-transcode-stream'

interface ExtendedFormatsPanelProps {
  filePath: string
  mediaInfo: MediaInfo
  /** Файл готов целиком — путь к обработанной копии, её и надо отдавать в плеер */
  onReady: (outputPath: string) => void
  /**
   * Потоковая подготовка (Hi10P → VP9) — владеет ей родитель (`page.tsx`), не сама панель:
   * слушатели IPC-чанков должны жить, даже когда эта панель уже размонтирована (воспроизведение
   * началось до конца кодирования, см. `use-transcode-stream.ts`)
   */
  stream: UseTranscodeStreamResult
}

type Phase = 'idle' | 'installing' | 'preparing'

function formatMb(bytes: number): string {
  return `${Math.round(bytes / 1024 / 1024)} МБ`
}

const COST_HINTS: Record<string, string> = {
  cheap: 'Быстро — потоки копируются без пережатия.',
  moderate: 'Обычно занимает меньше минуты на серию — пережимается только звук.',
  expensive: 'Видео пережимается целиком в фоне — воспроизведение начнётся через несколько секунд, '
    + 'не дожидаясь конца. Результат сохранится, повторный просмотр запустится сразу.',
  // Показывается, только если потоковый режим недоступен (см. stream.supported в компоненте)
  'expensive-no-stream': 'Может занять несколько минут — видео пережимается целиком. Результат сохранится, '
    + 'повторный просмотр запустится сразу.',
}

export function ExtendedFormatsPanel({ filePath, mediaInfo, onReady, stream }: ExtendedFormatsPanelProps) {
  const [status, setStatus] = useState<FfmpegStatus | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [installProgress, setInstallProgress] = useState<FfmpegInstallProgress | null>(null)
  const [transcodeProgress, setTranscodeProgress] = useState<TranscodeProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  const plan = useMemo(
    () =>
      buildTranscodePlan({
        videoTracks: mediaInfo.videoTracks,
        audioTracks: mediaInfo.audioTracks,
        filePath,
      }),
    [mediaInfo, filePath],
  )

  useEffect(() => {
    void window.electronAPI.ffmpeg.getStatus().then(setStatus)
  }, [])

  useEffect(() => window.electronAPI.ffmpeg.onInstallProgress(setInstallProgress), [])
  useEffect(() => window.electronAPI.transcode.onProgress(setTranscodeProgress), [])

  // Потоковый путь уже был запущен раньше (например при возврате на этот экран) и успел
  // обнаружить готовый файл в кэше — доигрываем как обычный `onReady`, без повторной подготовки
  useEffect(() => {
    if (stream.phase === 'done' && stream.outputPath && !stream.src) {
      onReady(stream.outputPath)
    }
  }, [stream.phase, stream.outputPath, stream.src, onReady])

  const handleInstall = useCallback(async () => {
    setError(null)
    setPhase('installing')
    setInstallProgress({ stage: 'downloading', percent: 0 })

    const result = await window.electronAPI.ffmpeg.install()
    setPhase('idle')
    setInstallProgress(null)

    if (result.success && result.status) {
      setStatus(result.status)
    } else {
      setError(result.error ?? 'Не удалось установить ffmpeg')
    }
  }, [])

  const handlePrepare = useCallback(async () => {
    // Hi10P (video-and-audio) с известной codec-строкой — стрим, воспроизведение начинается
    // через секунды, не дожидаясь конца кодирования всей серии (см. use-transcode-stream.ts)
    if (stream.supported) {
      stream.start()
      return
    }

    setError(null)
    setPhase('preparing')
    setTranscodeProgress(null)

    const result = await window.electronAPI.transcode.prepare({
      filePath,
      plan,
      durationMs: mediaInfo.duration * 1000,
    })
    setPhase('idle')
    setTranscodeProgress(null)

    if (result.success && result.outputPath) {
      onReady(result.outputPath)
    } else {
      setError(result.error ?? 'Не удалось подготовить файл')
    }
  }, [stream, filePath, plan, mediaInfo.duration, onReady])

  const handleCancel = useCallback(() => {
    if (stream.phase === 'connecting' || stream.phase === 'streaming') {
      stream.cancel()
      return
    }
    if (phase === 'installing') {
      void window.electronAPI.ffmpeg.cancelInstall()
    } else if (phase === 'preparing') {
      void window.electronAPI.transcode.cancel()
    }
  }, [phase, stream])

  if (phase === 'installing') {
    const percent = installProgress?.percent ?? 0
    const stageLabel = installProgress?.stage === 'downloading'
      ? `Скачивание ffmpeg — ${percent}%`
      : installProgress?.stage === 'extracting'
      ? 'Распаковка…'
      : 'Проверка сборки…'

    return (
      <VStack gap={3} w="full">
        <Text fontSize="sm">{stageLabel}</Text>
        <Progress.Root value={percent} w="full" size="sm" colorPalette="brand">
          <Progress.Track>
            <Progress.Range />
          </Progress.Track>
        </Progress.Root>
        {installProgress?.totalBytes
          ? (
            <Text fontSize="xs" color="fg.muted">
              {formatMb(installProgress.receivedBytes ?? 0)} из {formatMb(installProgress.totalBytes)}
            </Text>
          )
          : null}
        <Button size="sm" variant="ghost" onClick={handleCancel}>Отменить</Button>
      </VStack>
    )
  }

  if (stream.phase === 'connecting') {
    return (
      <VStack gap={3} w="full">
        <Text fontSize="sm">Буферизуем — воспроизведение начнётся через несколько секунд…</Text>
        <Progress.Root value={null} w="full" size="sm" colorPalette="brand">
          <Progress.Track>
            <Progress.Range />
          </Progress.Track>
        </Progress.Root>
        <Button size="sm" variant="ghost" onClick={handleCancel}>Отменить</Button>
      </VStack>
    )
  }

  if (stream.phase === 'error' && stream.error) {
    // Ошибка потокового пути — молча падать некуда, показываем и даём попробовать целиковый режим
    return (
      <VStack gap={2} w="full">
        <Text fontSize="sm" color="fg.error">{stream.error}</Text>
        <Button colorPalette="brand" onClick={() => void handlePrepare()}>Попробовать снова</Button>
      </VStack>
    )
  }

  if (phase === 'preparing') {
    const percent = transcodeProgress?.percent ?? 0
    return (
      <VStack gap={3} w="full">
        <Text fontSize="sm">Подготовка файла — {percent}%</Text>
        <Progress.Root value={percent} w="full" size="sm" colorPalette="brand">
          <Progress.Track>
            <Progress.Range />
          </Progress.Track>
        </Progress.Root>
        {transcodeProgress?.speed
          ? <Text fontSize="xs" color="fg.muted">скорость ×{transcodeProgress.speed.toFixed(1)}</Text>
          : null}
        <Button size="sm" variant="ghost" onClick={handleCancel}>Отменить</Button>
      </VStack>
    )
  }

  if (!status) {
    return <Text fontSize="sm" color="fg.muted">Проверяем поддержку форматов…</Text>
  }

  if (!status.available) {
    return (
      <VStack gap={2}>
        <Button
          colorPalette="brand"
          variant="outline"
          onClick={handleInstall}
          disabled={!status.installSupported}
        >
          Включить расширенную поддержку форматов
        </Button>
        <Text fontSize="xs" color="fg.muted" maxW="sm" textAlign="center">
          {status.installSupported
            ? 'Один раз скачает ffmpeg (~163 МБ) в папку приложения. После этого плеер сможет проигрывать такие файлы сам.'
            : `Готовых сборок ffmpeg для этой платформы нет — установите его вручную, плеер подхватит системный.`}
        </Text>
        {error && <Text fontSize="xs" color="fg.error">{error}</Text>}
      </VStack>
    )
  }

  // Урезанные сборки (та же gyan.dev `essentials`) молча не содержат части декодеров — на
  // проверявшей машине в системном ffmpeg 8.0 не было DTS. Раз бинарь есть, но нужного
  // декодера в нём нет, честнее предложить докачать полную сборку, чем упасть на подготовке.
  const incompleteBuild = status.missingDecoders.length > 0 && status.installSupported
    && status.source !== 'downloaded'

  return (
    <VStack gap={2} w="full">
      <Button colorPalette="brand" onClick={() => void handlePrepare()}>
        {stream.supported ? 'Смотреть' : 'Подготовить и проиграть'}
      </Button>
      <Box maxW="sm">
        {plan.reasons.map((reason) => (
          <Text key={reason} fontSize="xs" color="fg.muted" textAlign="center">{reason}</Text>
        ))}
        <Text fontSize="xs" color="fg.muted" textAlign="center" mt={1}>
          {(plan.cost === 'expensive' && !stream.supported
            ? COST_HINTS['expensive-no-stream']
            : COST_HINTS[plan.cost]) ?? ''}
        </Text>
      </Box>
      <Flex gap={2} align="center" wrap="wrap" justify="center">
        <Text fontSize="xs" color="fg.subtle">
          ffmpeg: {status.source === 'system' ? 'системный' : 'скачанный'}
        </Text>
        {status.missingDecoders.length > 0 && (
          <Text fontSize="xs" color="fg.warning">
            без декодеров: {status.missingDecoders.join(', ')}
          </Text>
        )}
      </Flex>
      {incompleteBuild && (
        <VStack gap={1}>
          <Button size="sm" variant="outline" onClick={handleInstall}>Скачать полную сборку</Button>
          <Text fontSize="xs" color="fg.muted" maxW="sm" textAlign="center">
            Найденный в системе ffmpeg собран без части кодеков — такие файлы он не откроет. Полная сборка (~163 МБ)
            умеет всё.
          </Text>
        </VStack>
      )}
      {error && <Text fontSize="xs" color="fg.error">{error}</Text>}
    </VStack>
  )
}
