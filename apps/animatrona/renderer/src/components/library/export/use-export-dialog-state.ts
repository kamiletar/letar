'use client'

/**
 * Хук состояния для диалога экспорта сериала
 */

import type { DragEndEvent } from '@dnd-kit/core'
import { KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { getRecommendedPattern } from '@/animatrona-form'
import { toaster } from '@/components/ui/toaster'
import type { QueueEpisodeExportData, QueueExportConfig } from '@/hooks/useExportQueue'
import { getFranchiseSeasonNumber } from '@/lib/franchise'
import type { NamingPattern } from '@/types/electron'
import type { ExportResult, SeriesExportProgress } from '../../../../../shared/types/export'

import type { DialogStep, ExportType, PublishResult, WebResourceMode } from './export-types'
import { collectAudioTracks, collectSubtitleTracks, type ExportSeriesDialogProps, getTrackKey } from './index'

/**
 * Props для хука состояния
 */
export interface UseExportDialogStateProps {
  anime: ExportSeriesDialogProps['anime']
  defaultExportPath: string | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Хук управления состоянием диалога экспорта
 */
export function useExportDialogState({ anime, defaultExportPath, open, onOpenChange }: UseExportDialogStateProps) {
  // Шаги и состояние
  const [step, setStep] = useState<DialogStep>('config')
  const [progress] = useState<SeriesExportProgress | null>(null)
  const [result] = useState<ExportResult | null>(null)
  const [isExporting] = useState(false)
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null)

  // Форма — состояние чекбоксов и настроек
  const [selectedAudioKeys, setSelectedAudioKeys] = useState<string[]>([])
  const [selectedSubtitleKeys, setSelectedSubtitleKeys] = useState<string[]>([])
  const [selectedEpisodeNumbers, setSelectedEpisodeNumbers] = useState<Set<number>>(new Set())
  const [outputDir, setOutputDir] = useState('')

  // Определяем default паттерн на основе типа сезона
  const defaultPattern = useMemo(() => {
    if (anime.seasonType) {
      return getRecommendedPattern(anime.seasonType)
    }
    return '{Year} - {Anime} - S{ss}E{nn}'
  }, [anime.seasonType])

  const [namingPattern, setNamingPattern] = useState<NamingPattern>(defaultPattern)

  // Default tracks — ключи дорожек по умолчанию
  const [defaultAudioKey, setDefaultAudioKey] = useState<string | null>(null)
  const [defaultSubtitleKey, setDefaultSubtitleKey] = useState<string | null>(null)

  // Опции экспорта
  const [createFolderStructure, setCreateFolderStructure] = useState(true)
  const [openFolderAfterExport, setOpenFolderAfterExport] = useState(true)

  // Номер сезона из графа франшизы (1 если нет франшизы)
  const [franchiseSeasonNumber, setFranchiseSeasonNumber] = useState<number>(1)

  // Тип экспорта (MKV или Web Player)
  const [exportType, setExportType] = useState<ExportType>('mkv')

  // Режим ресурсов для Web Player (всегда publish — только IPFS публикация)
  const [webResourceMode, setWebResourceMode] = useState<WebResourceMode>('publish')

  // Загрузка графа франшизы для определения номера сезона
  useEffect(() => {
    async function loadFranchiseOrder() {
      if (!anime.franchiseId || !anime.shikimoriId) {
        setFranchiseSeasonNumber(1)
        return
      }

      try {
        // Загружаем граф из API для определения сезона (IPFS cat пока не реализован)
        if (!window.electronAPI?.franchise) {
          setFranchiseSeasonNumber(1)
          return
        }
        const result = await window.electronAPI.franchise.fetchGraph(anime.shikimoriId)
        const graph = result.success ? (result.data?.graph ?? null) : null
        const seasonNum = getFranchiseSeasonNumber(graph, anime.shikimoriId)
        setFranchiseSeasonNumber(seasonNum)
      } catch {
        setFranchiseSeasonNumber(1)
      }
    }

    if (open) {
      loadFranchiseOrder()
    }
  }, [open, anime.franchiseId, anime.shikimoriId])

  // Preview имени файла и структуры папок
  const previewInfo = useMemo(() => {
    const year = anime.year || new Date().getFullYear()
    const seasonStr = String(franchiseSeasonNumber).padStart(2, '0')
    const sampleFileName =
      namingPattern
        .replace('{Anime}', anime.name)
        .replace('{Year}', String(year))
        .replace('{nn}', '01')
        .replace('{ss}', seasonStr)
        .replace('{Episode}', 'Episode 1') + '.mkv'

    let folderPath = ''
    if (createFolderStructure) {
      if (anime.franchise) {
        folderPath = `${anime.franchise}/${year} - ${anime.name}/`
      } else {
        folderPath = `${year} - ${anime.name}/`
      }
    }

    return { sampleFileName, folderPath }
  }, [namingPattern, anime.name, anime.year, anime.franchise, createFolderStructure, franchiseSeasonNumber])

  // Sensors для drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Собираем доступные дорожки
  const audioTracks = useMemo(() => collectAudioTracks(anime.episodes), [anime.episodes])
  const subtitleTracks = useMemo(() => collectSubtitleTracks(anime.episodes), [anime.episodes])

  // Готовые эпизоды — мигрированные в IPFS (видео + хотя бы одна аудиодорожка)
  const readyEpisodesList = useMemo(() => {
    return anime.episodes
      .filter(
        (ep) =>
          ep.transcodedCid && // Видео мигрировано в IPFS
          ep.audioTracks.some((t) => t.transcodedCid) // Хотя бы одна аудио в IPFS
      )
      .sort((a, b) => a.number - b.number)
  }, [anime.episodes])

  const readyEpisodes = readyEpisodesList.length

  // Сброс состояния при открытии
  useEffect(() => {
    if (open) {
      setStep('config')
      // Выбираем первую аудиодорожку по умолчанию
      if (audioTracks.length > 0 && selectedAudioKeys.length === 0) {
        setSelectedAudioKeys([audioTracks[0].key])
        setDefaultAudioKey(audioTracks[0].key)
      }
      // Сбрасываем default subtitle
      setDefaultSubtitleKey(null)
      // Выбираем все готовые эпизоды по умолчанию
      setSelectedEpisodeNumbers(new Set(readyEpisodesList.map((ep) => ep.number)))
      // Устанавливаем папку экспорта по умолчанию
      if (defaultExportPath && !outputDir) {
        setOutputDir(defaultExportPath)
      }
      // Устанавливаем паттерн по умолчанию
      setNamingPattern(defaultPattern)
    }
  }, [open, audioTracks, readyEpisodesList, defaultExportPath, defaultPattern])

  /**
   * Подготавливает данные эпизодов для очереди экспорта (IPFS-only, чистый формат)
   */
  const prepareQueueEpisodeData = useCallback((): QueueEpisodeExportData[] => {
    return anime.episodes
      .filter((ep) => selectedEpisodeNumbers.has(ep.number))
      .filter((ep) => ep.transcodedCid) // Должно быть видео в IPFS
      .filter((ep) => {
        // Должна быть хотя бы одна выбранная аудиодорожка в IPFS
        return ep.audioTracks.some((t) => {
          const key = getTrackKey(t.language, t.title)
          return selectedAudioKeys.includes(key) && t.transcodedCid
        })
      })
      .map((ep) => ({
        id: ep.id,
        number: ep.number,
        seasonNumber: franchiseSeasonNumber,
        name: ep.name,
        durationMs: ep.durationMs ?? undefined,
        videoCid: ep.transcodedCid!,
        audioTracks: ep.audioTracks
          .filter((t) => {
            const key = getTrackKey(t.language, t.title)
            return selectedAudioKeys.includes(key) && t.transcodedCid
          })
          .map((t) => ({
            language: t.language,
            title: t.title,
            transcodedCid: t.transcodedCid!,
            streamIndex: t.streamIndex,
          })),
        subtitleTracks: ep.subtitleTracks
          .filter((t) => {
            const key = getTrackKey(t.language, t.title)
            return selectedSubtitleKeys.includes(key) && t.fileCid
          })
          .map((t) => ({
            language: t.language,
            title: t.title,
            format: t.format,
            fileCid: t.fileCid!,
            fontCids: t.fonts.map((f) => f.fileCid).filter((cid): cid is string => !!cid),
          })),
        manifestCid: ep.manifestCid,
      }))
  }, [anime.episodes, selectedAudioKeys, selectedSubtitleKeys, selectedEpisodeNumbers, franchiseSeasonNumber])

  /**
   * Запуск экспорта — добавляет задачу в очередь
   */
  const handleStartExport = async () => {
    // Валидация
    if (selectedEpisodeNumbers.size === 0) {
      toaster.error({ title: 'Выберите хотя бы один эпизод' })
      return
    }

    if (selectedAudioKeys.length === 0) {
      toaster.error({ title: 'Выберите хотя бы одну аудиодорожку' })
      return
    }

    if (!outputDir) {
      toaster.error({ title: 'Выберите папку для экспорта' })
      return
    }

    if (!window.electronAPI?.exportQueue) {
      toaster.error({ title: 'Electron API недоступен' })
      return
    }

    const episodesData = prepareQueueEpisodeData()

    if (episodesData.length === 0) {
      toaster.error({
        title: 'Нет эпизодов для экспорта',
        description: 'Убедитесь, что выбранные дорожки доступны в IPFS',
      })
      return
    }

    // Вычисляем индексы default tracks по позиции в массиве
    const defaultAudioIndex = defaultAudioKey ? selectedAudioKeys.indexOf(defaultAudioKey) : 0
    const defaultSubtitleIndex = defaultSubtitleKey ? selectedSubtitleKeys.indexOf(defaultSubtitleKey) : undefined

    // Конфигурация для очереди экспорта
    const queueConfig: QueueExportConfig = {
      animeName: anime.name,
      originalName: anime.originalName ?? undefined,
      year: anime.year ?? undefined,
      outputDir,
      namingPattern,
      posterCid: anime.posterCid ?? undefined,
      episodes: episodesData,
      selectedAudioKeys,
      selectedSubtitleKeys,
      defaultAudioIndex: defaultAudioIndex >= 0 ? defaultAudioIndex : 0,
      defaultSubtitleIndex:
        defaultSubtitleIndex !== undefined && defaultSubtitleIndex >= 0 ? defaultSubtitleIndex : undefined,
      franchise: anime.franchise ?? undefined,
      seasonType: anime.seasonType ?? undefined,
      createFolderStructure,
      openFolderAfterExport,
    }

    try {
      const result = await window.electronAPI.exportQueue.add({
        type: 'mkv',
        animeId: anime.id,
        animeName: anime.name,
        config: queueConfig,
      })

      if (result.success && result.data) {
        toaster.success({
          title: 'Добавлено в очередь экспорта',
          description: `${episodesData.length} эпизод(ов) — ${anime.name}`,
        })
        // Закрываем диалог — прогресс теперь в ExportQueuePanel
        onOpenChange(false)
      } else {
        toaster.error({
          title: 'Ошибка добавления в очередь',
          description: result.error || 'Неизвестная ошибка',
        })
      }
    } catch (error) {
      toaster.error({
        title: 'Ошибка добавления в очередь',
        description: String(error),
      })
    }
  }

  /**
   * Запуск экспорта Web Player
   */
  const handleStartWebExport = async () => {
    // Валидация
    if (selectedEpisodeNumbers.size === 0) {
      toaster.error({ title: 'Выберите хотя бы один эпизод' })
      return
    }

    if (selectedAudioKeys.length === 0) {
      toaster.error({ title: 'Выберите хотя бы одну аудиодорожку' })
      return
    }

    // Папка требуется только для embedded и referenced режимов
    if (webResourceMode !== 'publish' && !outputDir) {
      toaster.error({ title: 'Выберите папку для экспорта' })
      return
    }

    if (!window.electronAPI?.webExport) {
      toaster.error({ title: 'Web Export API недоступен' })
      return
    }

    const episodesData = prepareQueueEpisodeData()

    if (episodesData.length === 0) {
      toaster.error({
        title: 'Нет эпизодов для экспорта',
        description: 'Убедитесь, что выбранные дорожки доступны в IPFS',
      })
      return
    }

    // Конфигурация для Web Export
    const queueConfig: QueueExportConfig = {
      animeName: anime.name,
      originalName: anime.originalName ?? undefined,
      year: anime.year ?? undefined,
      outputDir,
      namingPattern,
      posterCid: anime.posterCid ?? undefined,
      episodes: episodesData,
      selectedAudioKeys,
      selectedSubtitleKeys,
      defaultAudioIndex: 0,
      defaultSubtitleIndex: undefined,
      franchise: anime.franchise ?? undefined,
      seasonType: anime.seasonType ?? undefined,
      createFolderStructure: false,
      openFolderAfterExport: true,
    }

    try {
      toaster.loading({ title: 'Создание Web Player...', id: 'web-export' })

      const result = await window.electronAPI.webExport.start(queueConfig, {
        mode: webResourceMode,
        episodes: Array.from(selectedEpisodeNumbers),
        audioTracks: selectedAudioKeys,
        subtitleTracks: selectedSubtitleKeys,
        defaults: {
          audio: defaultAudioKey ?? undefined,
          subtitle: defaultSubtitleKey ?? undefined,
        },
        outputDir,
      })

      toaster.dismiss('web-export')

      if (result.success) {
        // Для режима publish показываем шаг result с кнопками копирования
        if (webResourceMode === 'publish' && result.rootCid) {
          const publicGateway = `https://ipfs.io/ipfs/${result.rootCid}`
          setPublishResult({
            rootCid: result.rootCid,
            gatewayUrl: result.gatewayUrl || `http://127.0.0.1:8081/ipfs/${result.rootCid}`,
            publicGatewayUrl: publicGateway,
          })
          setStep('result')
        } else {
          toaster.success({
            title: 'Web Player создан!',
            description: `Папка: ${result.outputPath}`,
          })
          onOpenChange(false)
        }
      } else {
        toaster.error({
          title: 'Ошибка создания Web Player',
          description: result.error || 'Неизвестная ошибка',
        })
      }
    } catch (error) {
      toaster.dismiss('web-export')
      toaster.error({
        title: 'Ошибка создания Web Player',
        description: String(error),
      })
    }
  }

  /**
   * Выбор папки через Electron dialog
   */
  const handleSelectFolder = async () => {
    if (!window.electronAPI?.dialog) {
      return
    }

    const folder = await window.electronAPI.dialog.selectFolder()
    if (folder) {
      setOutputDir(folder)
    }
  }

  /**
   * Переключение чекбокса аудиодорожки
   */
  const toggleAudioTrack = (key: string) => {
    setSelectedAudioKeys((prev) => {
      if (prev.includes(key)) {
        // При снятии выбора — если это была default, сбрасываем
        if (defaultAudioKey === key) {
          const newKeys = prev.filter((k) => k !== key)
          setDefaultAudioKey(newKeys[0] || null)
        }
        return prev.filter((k) => k !== key)
      } else {
        // При добавлении — если это первая дорожка, делаем её default
        if (prev.length === 0) {
          setDefaultAudioKey(key)
        }
        return [...prev, key]
      }
    })
  }

  /**
   * Переключение чекбокса субтитров
   */
  const toggleSubtitleTrack = (key: string) => {
    setSelectedSubtitleKeys((prev) => {
      if (prev.includes(key)) {
        // При снятии выбора — если это была default, сбрасываем
        if (defaultSubtitleKey === key) {
          const newKeys = prev.filter((k) => k !== key)
          setDefaultSubtitleKey(newKeys.length > 0 ? newKeys[0] : null)
        }
        return prev.filter((k) => k !== key)
      } else {
        return [...prev, key]
      }
    })
  }

  /**
   * Drag-and-drop для аудиодорожек
   */
  const handleAudioDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setSelectedAudioKeys((prev) => {
        const oldIndex = prev.indexOf(String(active.id))
        const newIndex = prev.indexOf(String(over.id))
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  /**
   * Drag-and-drop для субтитров
   */
  const handleSubtitleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setSelectedSubtitleKeys((prev) => {
        const oldIndex = prev.indexOf(String(active.id))
        const newIndex = prev.indexOf(String(over.id))
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  /**
   * Переключение выбора эпизода
   */
  const toggleEpisode = (num: number) => {
    setSelectedEpisodeNumbers((prev) => {
      const next = new Set(prev)
      if (next.has(num)) {
        next.delete(num)
      } else {
        next.add(num)
      }
      return next
    })
  }

  /**
   * Выбрать все готовые эпизоды
   */
  const selectAllEpisodes = () => {
    setSelectedEpisodeNumbers(new Set(readyEpisodesList.map((ep) => ep.number)))
  }

  /**
   * Снять выбор со всех эпизодов
   */
  const deselectAllEpisodes = () => {
    setSelectedEpisodeNumbers(new Set())
  }

  /**
   * Отмена экспорта — теперь через ExportQueuePanel
   * Эта функция сохранена для совместимости с UI (кнопка в progress step)
   */
  const handleCancel = () => {
    setStep('config')
  }

  return {
    // Состояние
    step,
    exportType,
    webResourceMode,
    selectedAudioKeys,
    selectedSubtitleKeys,
    selectedEpisodeNumbers,
    outputDir,
    namingPattern,
    defaultAudioKey,
    defaultSubtitleKey,
    createFolderStructure,
    openFolderAfterExport,
    publishResult,
    progress,
    result,
    isExporting,

    // Вычисляемые значения
    previewInfo,
    audioTracks,
    subtitleTracks,
    readyEpisodesList,
    readyEpisodes,
    sensors,

    // Действия (setters)
    setStep,
    setExportType,
    setWebResourceMode,
    setNamingPattern,
    setCreateFolderStructure,
    setOpenFolderAfterExport,
    setDefaultAudioKey,
    setDefaultSubtitleKey,

    // Обработчики
    toggleAudioTrack,
    toggleSubtitleTrack,
    toggleEpisode,
    selectAllEpisodes,
    deselectAllEpisodes,
    handleAudioDragEnd,
    handleSubtitleDragEnd,
    handleSelectFolder,
    handleStartExport,
    handleStartWebExport,
    handleCancel,
  }
}
