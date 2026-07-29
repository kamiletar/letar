'use client'

/**
 * Главный визард импорта видео
 *
 * Объединяет шаги: выбор папки → поиск в Shikimori → сканирование файлов → настройки → добавление в очередь
 *
 * АРХИТЕКТУРА v0.10.0:
 * - Wizard НЕ запускает импорт напрямую
 * - Последний шаг (settings) добавляет в очередь импорта
 * - Весь энкод происходит в ImportQueueProcessor (фоновый режим)
 * - Пользователь может продолжать пользоваться приложением пока идёт импорт
 */

import { Button, CloseButton, Dialog, HStack, Icon, Portal } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LuArrowLeft, LuArrowRight, LuExternalLink, LuListPlus } from 'react-icons/lu'

import { toaster } from '@/components/ui/toaster'
import { useImportQueue } from '@/hooks/useImportQueue'
import { generateSearchQueries, type ParsedFolderInfo, parseFolderName } from '@/lib/shikimori/parse-folder'
import type { ShikimoriAnimePreview } from '@/types/electron'
import type { ImportQueueAddData } from '../../../../shared/types/import-queue'

import { DonorSelectStep } from './DonorSelectStep'
import { FileScanStep, type ParsedFile } from './FileScanStep'
import { FolderSelectStep } from './FolderSelectStep'
import { type FileAnalysis, type ImportSettings, PreviewStep } from './PreviewStep'
import { ShikimoriSearchStep } from './ShikimoriSearchStep'
import { type Step, StepIndicator } from './StepIndicator'
import { SyncCalibrationStep } from './SyncCalibrationStep'

/** Базовые шаги визарда (без донора) */
const BASE_STEPS: Step[] = [
  { id: 1, title: 'Папка' },
  { id: 2, title: 'Поиск' },
  { id: 3, title: 'Файлы' },
  { id: 4, title: 'Донор' },
  // Шаг 5 (Синхрон.) добавляется динамически если донор включён
  { id: 5, title: 'Настройки' },
]

/** Шаги визарда с калибровкой донора */
const DONOR_STEPS: Step[] = [
  { id: 1, title: 'Папка' },
  { id: 2, title: 'Поиск' },
  { id: 3, title: 'Файлы' },
  { id: 4, title: 'Донор' },
  { id: 5, title: 'Синхрон.' },
  { id: 6, title: 'Настройки' },
]

/** Данные для быстрого импорта (пропуск шага выбора папки) */
interface ImportInitialData {
  /** Путь к папке */
  folderPath: string
  /** Пути к видеофайлам */
  videoFiles: string[]
  /** Пропустить шаг выбора папки */
  skipFolderSelect?: boolean
  /** Режим одиночного файла (фильм/OVA) */
  isFileMode?: boolean
  /** Полный путь к файлу (для isFileMode) */
  singleFilePath?: string
}

interface ImportWizardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Предустановленный shikimoriId для добавления связанного аниме */
  preselectedShikimoriId?: number
  /** Название предустановленного аниме */
  preselectedName?: string
  /** Начальный путь к папке (для Drag & Drop) */
  initialFolderPath?: string | null
  /** Данные для быстрого импорта из папочного режима плеера */
  initialData?: ImportInitialData
  /** URL источника (Rutracker и т.д.) — показывается в футере */
  sourceUrl?: string
  /** CID сырых байт .torrent файла раздачи в IPFS (если уже экспортирован) */
  sourceTorrentCid?: string
  /** Callback после успешного добавления в очередь */
  onQueued?: () => void
  /** ID существующего аниме — режим добавления/замены эпизодов без создания нового */
  existingAnimeId?: string
}

/**
 * Диалог визарда импорта
 */
export function ImportWizardDialog({
  open,
  onOpenChange,
  preselectedShikimoriId,
  preselectedName,
  initialFolderPath,
  initialData,
  sourceUrl,
  sourceTorrentCid,
  onQueued,
  existingAnimeId,
}: ImportWizardDialogProps) {
  // Router для навигации
  const router = useRouter()

  // Hook очереди импорта (event-driven)
  const { addItems } = useImportQueue()

  // Ref для отслеживания обработанного initialFolderPath (предотвращает повторную обработку)
  const processedInitialPathRef = useRef<string | null>(null)
  // Ref для отслеживания обработанного initialData (для импорта из папочного режима)
  const processedInitialDataRef = useRef<boolean>(false)

  // Состояние визарда
  const [currentStep, setCurrentStep] = useState(1)

  // Шаг 1: Папка или файл
  const [folderPath, setFolderPath] = useState<string | null>(null)
  const [parsedInfo, setParsedInfo] = useState<ParsedFolderInfo | null>(null)
  const [isFileMode, setIsFileMode] = useState(false)
  const [singleFilePath, setSingleFilePath] = useState<string | null>(null)

  // Шаг 2: Shikimori
  const [selectedAnime, setSelectedAnime] = useState<ShikimoriAnimePreview | null>(null)

  // Шаг 3: Файлы
  const [files, setFiles] = useState<ParsedFile[]>([])

  // Шаг 4: Донор
  const [donorEnabled, setDonorEnabled] = useState(false)
  const [donorPath, setDonorPath] = useState<string | null>(null)
  const [donorFiles, setDonorFiles] = useState<ParsedFile[]>([])

  // Шаг 5: Синхронизация донора (если включён)
  const [syncOffset, setSyncOffset] = useState(0)

  // Пути файлов, уже добавленных в очередь импорта
  const [queuedFilePaths, setQueuedFilePaths] = useState<Set<string>>(new Set())

  // Двухфазный импорт: сериал ↔ спешлы (максимум 1 переключение)
  const [phaseCount, setPhaseCount] = useState(0)
  // Сохраняем оригинальный preselectedShikimoriId для восстановления при возврате к сериалу
  const originalShikimoriIdRef = useRef<number | undefined>(preselectedShikimoriId)
  // Динамический override для preselectedShikimoriId (undefined = не задан, null = явно сброшен)
  const [preselectedIdOverride, setPreselectedIdOverride] = useState<number | null | undefined>(undefined)
  // Эффективный preselectedId: override > prop
  const effectivePreselectedId =
    preselectedIdOverride === undefined ? preselectedShikimoriId : (preselectedIdOverride ?? undefined)

  // Шаг 6: Предпросмотр и настройки
  const [fileAnalyses, setFileAnalyses] = useState<FileAnalysis[]>([])
  const [importSettings, setImportSettings] = useState<ImportSettings>({
    profileId: null,
    audioMaxConcurrent: 4,
    videoMaxConcurrent: 2,
  })

  /** Определяем какие шаги показывать */
  const wizardSteps = useMemo(() => {
    // Если донор включён и есть совпадающие файлы — показываем шаг калибровки
    if (donorEnabled && donorFiles.length > 0) {
      const hasMatches = files.some(
        (f) => f.selected && f.episodeNumber !== null && donorFiles.some((d) => d.episodeNumber === f.episodeNumber)
      )
      if (hasMatches) {
        return DONOR_STEPS
      }
    }
    return BASE_STEPS
  }, [donorEnabled, donorFiles, files])

  /** Общее количество шагов */
  const totalSteps = wizardSteps.length

  /** Сброс состояния */
  const resetState = useCallback(() => {
    setCurrentStep(1)
    setFolderPath(null)
    setParsedInfo(null)
    setIsFileMode(false)
    setSingleFilePath(null)
    setSelectedAnime(null)
    setFiles([])
    setDonorEnabled(false)
    setDonorPath(null)
    setDonorFiles([])
    setSyncOffset(0)
    setFileAnalyses([])
    setImportSettings({ profileId: null, audioMaxConcurrent: 4, videoMaxConcurrent: 2 })
    setPhaseCount(0)
    processedInitialPathRef.current = null
    processedInitialDataRef.current = false
  }, [])

  // Обработка initialFolderPath (для Drag & Drop)
  useEffect(() => {
    const processInitialPath = async () => {
      // Проверяем условия для обработки
      if (!open || !initialFolderPath) {
        return
      }
      if (processedInitialPathRef.current === initialFolderPath) {
        return
      }
      if (!window.electronAPI) {
        return
      }

      // Запоминаем обработанный путь
      processedInitialPathRef.current = initialFolderPath

      try {
        // Сканируем файлы в папке
        const scanResult = await window.electronAPI.fs.scanFolder(initialFolderPath, false)
        const fileNames = scanResult.success ? scanResult.files.map((f) => f.name) : []

        // Парсим с учётом имён файлов
        const info = parseFolderName(initialFolderPath, fileNames)

        // Устанавливаем состояние
        setIsFileMode(false)
        setSingleFilePath(null)
        setFolderPath(initialFolderPath)
        setParsedInfo(info)
        setFiles([])
      } catch (error) {
        console.error('[ImportWizard] Error processing initialFolderPath:', error)
      }
    }

    processInitialPath()
  }, [open, initialFolderPath])

  // Обработка initialData (для быстрого импорта из папочного режима)
  useEffect(() => {
    const processInitialData = async () => {
      // Проверяем условия для обработки
      if (!open || !initialData?.skipFolderSelect) {
        return
      }
      if (processedInitialDataRef.current) {
        return
      }
      if (!window.electronAPI) {
        return
      }

      // Запоминаем что обработали
      processedInitialDataRef.current = true

      try {
        // Парсим имя папки для получения информации об аниме
        const fileNames = initialData.videoFiles.map((f) => f.split(/[/\\]/).pop() || '')
        const info = parseFolderName(initialData.folderPath, fileNames)

        // Устанавливаем состояние как если бы папка/файл были выбраны
        if (initialData.isFileMode && initialData.singleFilePath) {
          setIsFileMode(true)
          setSingleFilePath(initialData.singleFilePath)
        } else {
          setIsFileMode(false)
          setSingleFilePath(null)
        }
        setFolderPath(initialData.folderPath)
        setParsedInfo(info)
        setFiles([])

        // Если есть preselectedShikimoriId — загружаем аниме и пропускаем поиск (шаг 3)
        if (preselectedShikimoriId && window.electronAPI?.shikimori) {
          try {
            const result = await window.electronAPI.shikimori.getDetails(preselectedShikimoriId)
            if (result.success && result.data) {
              setSelectedAnime(result.data)
              setCurrentStep(3)
              return
            }
          } catch {
            // Если не удалось загрузить — fallback на поиск
          }
        }
        // Иначе — на шаг поиска в Shikimori (шаг 2)
        setCurrentStep(2)
      } catch (error) {
        console.error('[ImportWizard] Error processing initialData:', error)
      }
    }

    processInitialData()
  }, [open, initialData])

  /** Обработчик выбора папки (сбрасывает режим файла) */
  const handleFolderSelect = useCallback((path: string, info: ParsedFolderInfo) => {
    setIsFileMode(false)
    setSingleFilePath(null)
    setFolderPath(path)
    setParsedInfo(info)
    setFiles([]) // Сбрасываем файлы при смене источника
  }, [])

  /** Обработчик выбора файла (для фильма) */
  const handleFileSelect = useCallback((filePath: string, folderPath: string, info: ParsedFolderInfo) => {
    setIsFileMode(true)
    setSingleFilePath(filePath)
    setFolderPath(folderPath)
    setParsedInfo(info)
    setFiles([]) // Сбрасываем файлы при смене источника
  }, [])

  /** Получить строку поиска */
  const getSearchQuery = useCallback((): string => {
    if (!parsedInfo) {
      return ''
    }
    const queries = generateSearchQueries(parsedInfo)
    return queries[0] || parsedInfo.animeName
  }, [parsedInfo])

  /**
   * Получить номер "логического" шага по текущему индексу
   * Логические шаги: folder=1, search=2, files=3, donor=4, sync=5, settings=6
   * Если донор отключён, sync пропускается
   */
  const getLogicalStep = useCallback(
    (step: number): string => {
      const hasSyncStep = wizardSteps.length === 6
      if (hasSyncStep) {
        // 6 шагов: folder, search, files, donor, sync, settings
        const names = ['folder', 'search', 'files', 'donor', 'sync', 'settings']
        return names[step - 1] || 'unknown'
      } else {
        // 5 шагов: folder, search, files, donor, settings
        const names = ['folder', 'search', 'files', 'donor', 'settings']
        return names[step - 1] || 'unknown'
      }
    },
    [wizardSteps.length]
  )

  /** Проверка возможности перехода на следующий шаг */
  const canGoNext = useCallback((): boolean => {
    const logicalStep = getLogicalStep(currentStep)

    switch (logicalStep) {
      case 'folder':
        return folderPath !== null && parsedInfo !== null
      case 'search':
        return selectedAnime !== null
      case 'files':
        return files.some((f) => f.selected && f.episodeNumber !== null)
      case 'donor':
        // Всегда можно перейти дальше (донор опционален)
        // Если донор включён без файлов — предупредим, но разрешим
        return true
      case 'sync':
        // Калибровка всегда опциональна
        return true
      case 'settings':
        // Можно перейти если есть хотя бы один успешно проанализированный файл
        return fileAnalyses.some((a) => a.mediaInfo !== null)
      default:
        return false
    }
  }, [currentStep, getLogicalStep, folderPath, parsedInfo, selectedAnime, files, fileAnalyses])

  /** Переход на следующий шаг */
  const goNext = useCallback(() => {
    if (currentStep < totalSteps && canGoNext()) {
      setCurrentStep((prev) => prev + 1)
    }
  }, [currentStep, totalSteps, canGoNext])

  /** Переход на предыдущий шаг */
  const goBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
    }
  }, [currentStep])

  /** Переключить на спешлы и вернуться к поиску */
  const handleImportSpecials = useCallback(() => {
    // Выбираем только спешлы
    setFiles((prev) =>
      prev.map((f) => ({
        ...f,
        selected: f.episodeNumber !== null && f.episodeType === 'ova',
      }))
    )
    // Сбрасываем выбранное аниме и preselected (спешлы — другое аниме на Shikimori)
    setSelectedAnime(null)
    setPreselectedIdOverride(null) // Явно сбросить — спешлы не имеют preselected
    // Возвращаемся на шаг поиска (шаг 2)
    setCurrentStep(2)
  }, [])

  /** Добавить в очередь импорта */
  const addToQueue = useCallback(async () => {
    if (!folderPath || !selectedAnime || !parsedInfo) {
      return
    }

    // Конвертируем данные в формат очереди
    const queueData: ImportQueueAddData = {
      folderPath,
      parsedInfo: {
        animeName: parsedInfo.animeName,
        seasonNumber: parsedInfo.seasonNumber,
        subGroup: parsedInfo.subGroup,
        quality: parsedInfo.quality,
        original: parsedInfo.original,
        source: parsedInfo.source,
        isBdRemux: parsedInfo.isBdRemux,
        rutrackerUrl: parsedInfo.rutrackerUrl ?? sourceUrl,
        sourceTorrentCid,
      },
      selectedAnime: {
        id: selectedAnime.id,
        name: selectedAnime.name,
        russian: selectedAnime.russian,
        description: selectedAnime.description,
        descriptionHtml: selectedAnime.descriptionHtml,
        posterUrl: selectedAnime.poster?.originalUrl || selectedAnime.poster?.mainUrl || null,
        kind: selectedAnime.kind,
        status: selectedAnime.status,
        episodes: selectedAnime.episodes,
        airedOn: selectedAnime.airedOn
          ? `${selectedAnime.airedOn.year}-${String(selectedAnime.airedOn.month ?? 1).padStart(2, '0')}-${String(
              selectedAnime.airedOn.day ?? 1
            ).padStart(2, '0')}`
          : null,
      },
      files: files.map((f) => ({
        path: f.path,
        name: f.name,
        episodeNumber: f.episodeNumber,
        selected: f.selected,
      })),
      importSettings: {
        profileId: importSettings.profileId,
        audioMaxConcurrent: importSettings.audioMaxConcurrent,
        videoMaxConcurrent: importSettings.videoMaxConcurrent,
        anime4kEnabled: importSettings.anime4kEnabled ?? false,
        denoiseEnabled: importSettings.denoiseEnabled ?? false,
      },
      // Принудительное использование CPU
      forceCpu: importSettings.forceCpu ?? false,
      // VMAF настройки (подбор CQ выполняется в очереди)
      vmafSettings: importSettings.vmafEnabled
        ? {
            enabled: true,
            targetVmaf: importSettings.targetVmaf ?? 94,
          }
        : undefined,
      // Данные профиля кодирования для main process (VMAF и транскодирование)
      encodingProfile: importSettings.selectedProfile
        ? {
            id: importSettings.selectedProfile.id,
            name: importSettings.selectedProfile.name,
            codec: importSettings.selectedProfile.codec as 'AV1' | 'HEVC' | 'H264',
            useGpu: importSettings.selectedProfile.useGpu,
            rateControl: importSettings.selectedProfile.rateControl as 'CONSTQP' | 'VBR',
            cq: importSettings.selectedProfile.cq,
            maxBitrate: importSettings.selectedProfile.maxBitrate,
            preset: importSettings.selectedProfile.preset,
            tune: importSettings.selectedProfile.tune,
            multipass: importSettings.selectedProfile.multipass,
            spatialAq: importSettings.selectedProfile.spatialAq,
            temporalAq: importSettings.selectedProfile.temporalAq,
            aqStrength: importSettings.selectedProfile.aqStrength,
            lookahead: importSettings.selectedProfile.lookahead,
            lookaheadLevel: importSettings.selectedProfile.lookaheadLevel,
            gopSize: importSettings.selectedProfile.gopSize,
            bRefMode: importSettings.selectedProfile.bRefMode,
            bFrames: null, // Not in schema, use null
            preferCpu: importSettings.selectedProfile.preferCpu ?? false,
          }
        : undefined,
      // Данные донора (если включён)
      donorPath: donorEnabled ? donorPath : null,
      donorFiles: donorEnabled
        ? donorFiles.map((f) => ({
            path: f.path,
            name: f.name,
            episodeNumber: f.episodeNumber,
            selected: f.selected,
          }))
        : [],
      syncOffset: donorEnabled ? syncOffset : 0,
      // Режим добавления/замены эпизодов существующего аниме
      isRetranscode: !!existingAnimeId,
      existingAnimeId: existingAnimeId,
      // Режим импорта одиночного файла — не сканировать внешние субтитры
      isFileMode,
      // Анализ файлов с рекомендациями по аудиодорожкам
      fileAnalyses: fileAnalyses
        .filter((a): a is typeof a & { file: { episodeNumber: number } } => a.file.episodeNumber !== null)
        .map((a) => ({
          episodeNumber: a.file.episodeNumber,
          audioRecommendations: a.audioRecommendations
            .filter((r) => r.enabled)
            .map((r) => ({
              trackIndex: r.trackIndex,
              action: r.action,
              enabled: r.enabled,
              isExternal: r.isExternal,
              externalPath: r.externalPath,
              groupName: r.groupName,
              language: r.language,
              dubGroup: r.dubGroup,
            })),
          subtitleRecommendations: a.subtitleRecommendations
            .filter((r) => r.enabled)
            .map((r) => ({
              streamIndex: r.streamIndex,
              language: r.language,
              title: r.title,
              format: r.format,
              isExternal: r.isExternal,
              externalPath: r.externalPath,
              enabled: r.enabled,
              dubGroup: r.dubGroup,
              subtitleType: r.subtitleType,
              matchedFonts: r.matchedFonts,
            })),
        })),
    }

    // Добавляем в очередь через IPC (main process)
    await addItems([queueData])

    // Уведомляем вызывающий код (торренты → обновить importStatus)
    if (onQueued) {
      // Режим набора: BundleGroupingDialog управляет переходом к следующей группе и закрытием
      onQueued()
      return
    }

    // Обновляем queuedFilePaths (файлы, которые только что добавили)
    const newQueuedPaths = new Set(queuedFilePaths)
    for (const f of files) {
      if (f.selected) {
        newQueuedPaths.add(f.path)
      }
    }
    setQueuedFilePaths(newQueuedPaths)

    // Двухфазный импорт: максимум одно переключение (сериал → спешлы ИЛИ спешлы → сериал)
    // phaseCount === 0 — первая фаза, можно переключиться; >= 1 — уже переключались, закрываем
    if (phaseCount === 0) {
      const importedRegular = files.some((f) => f.selected && f.episodeType === 'regular')
      const importedOva = files.some((f) => f.selected && f.episodeType === 'ova')
      const selectedCount = files.filter((f) => f.selected).length
      // Pending = есть номер, НЕ выбран, НЕ в очереди
      const pendingOva = files.filter(
        (f) => f.episodeType === 'ova' && f.episodeNumber !== null && !f.selected && !newQueuedPaths.has(f.path)
      )
      const pendingRegular = files.filter(
        (f) => f.episodeType === 'regular' && f.episodeNumber !== null && !f.selected && !newQueuedPaths.has(f.path)
      )

      // Добавили сериал → переключаемся на спешлы
      if (importedRegular && pendingOva.length > 0) {
        toaster.success({ title: `Сериал добавлен в очередь (${selectedCount} эп.) — выберите аниме для спешлов` })
        setPhaseCount(1)
        handleImportSpecials()
        return
      }

      // Добавили спешлы → переключаемся на сериал
      if (importedOva && pendingRegular.length > 0) {
        toaster.success({ title: `Спешлы добавлены в очередь (${selectedCount} эп.) — выберите аниме для сериала` })
        setPhaseCount(1)
        setFiles((prev) =>
          prev.map((f) => ({
            ...f,
            selected: f.episodeNumber !== null && f.episodeType === 'regular',
          }))
        )
        setSelectedAnime(null)
        // Восстанавливаем preselected для авто-загрузки сериала на шаге поиска
        setPreselectedIdOverride(originalShikimoriIdRef.current ?? undefined)
        setCurrentStep(2)
        return
      }
    }

    // Всё добавлено — закрываем
    onOpenChange(false)
    router.push('/import?tab=queue')
  }, [
    folderPath,
    selectedAnime,
    parsedInfo,
    files,
    fileAnalyses,
    importSettings,
    donorEnabled,
    donorPath,
    donorFiles,
    syncOffset,
    addItems,
    onOpenChange,
    router,
    handleImportSpecials,
    queuedFilePaths,
    phaseCount,
  ])

  // Загрузить пути файлов из очереди импорта при открытии
  useEffect(() => {
    if (!open) {
      return
    }
    const api = window.electronAPI
    if (!api?.importQueue?.getState) {
      return
    }
    api.importQueue
      .getState()
      .then(
        (res: { success: boolean; data?: { items: Array<{ files: Array<{ path: string; selected: boolean }> }> } }) => {
          if (res.success && res.data?.items) {
            const paths = new Set<string>()
            for (const item of res.data.items) {
              for (const f of item.files) {
                if (f.selected) {
                  paths.add(f.path)
                }
              }
            }
            setQueuedFilePaths(paths)
          }
        }
      )
      .catch(() => {
        // Ошибка не критична
      })
  }, [open])

  /** Закрытие диалога */
  const handleClose = useCallback(() => {
    onOpenChange(false)
    // Сбрасываем состояние с задержкой (после анимации закрытия)
    setTimeout(resetState, 300)
  }, [onOpenChange, resetState])

  return (
    <Dialog.Root
      lazyMount
      open={open}
      onOpenChange={(e) => {
        if (!e.open) {
          handleClose()
        }
      }}
      size="xl"
      scrollBehavior="inside"
      closeOnEscape={false}
      closeOnInteractOutside={false}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content bg="bg.panel" borderColor="border.subtle" maxW="800px">
            {/* Заголовок */}
            <Dialog.Header borderBottomWidth="1px" borderColor="border.subtle">
              <Dialog.Title>Импорт видео</Dialog.Title>
            </Dialog.Header>

            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>

            {/* Индикатор шагов */}
            <StepIndicator steps={wizardSteps} currentStep={currentStep} />

            {/* Контент */}
            <Dialog.Body py={4}>
              {/* Шаг: Выбор папки или файла */}
              {getLogicalStep(currentStep) === 'folder' && (
                <FolderSelectStep
                  folderPath={folderPath}
                  parsedInfo={parsedInfo}
                  onFolderSelect={handleFolderSelect}
                  isFileMode={isFileMode}
                  singleFilePath={singleFilePath}
                  onFileSelect={handleFileSelect}
                />
              )}

              {/* Шаг: Поиск в Shikimori */}
              {getLogicalStep(currentStep) === 'search' && (
                <ShikimoriSearchStep
                  initialQuery={preselectedName || getSearchQuery()}
                  selectedAnime={selectedAnime}
                  onAnimeSelect={setSelectedAnime}
                  preselectedShikimoriId={effectivePreselectedId}
                  seasonNumber={parsedInfo?.seasonNumber ?? undefined}
                />
              )}

              {/* Шаг: Сканирование файлов */}
              {getLogicalStep(currentStep) === 'files' && folderPath && (
                <FileScanStep
                  folderPath={folderPath}
                  files={files}
                  onFilesChange={setFiles}
                  isFileMode={isFileMode}
                  singleFilePath={singleFilePath}
                  episodesCount={selectedAnime?.episodes}
                  onImportSpecials={handleImportSpecials}
                  queuedFilePaths={queuedFilePaths}
                />
              )}

              {/* Шаг: Выбор донора */}
              {getLogicalStep(currentStep) === 'donor' && (
                <DonorSelectStep
                  enabled={donorEnabled}
                  onEnabledChange={setDonorEnabled}
                  donorPath={donorPath}
                  onDonorPathChange={setDonorPath}
                  donorFiles={donorFiles}
                  onDonorFilesChange={setDonorFiles}
                  originalFiles={files}
                />
              )}

              {/* Шаг: Калибровка синхронизации */}
              {getLogicalStep(currentStep) === 'sync' && (
                <SyncCalibrationStep
                  originalFiles={files}
                  donorFiles={donorFiles}
                  syncOffset={syncOffset}
                  onSyncOffsetChange={setSyncOffset}
                />
              )}

              {/* Шаг: Предпросмотр и настройки (последний шаг) */}
              {getLogicalStep(currentStep) === 'settings' && folderPath && (
                <PreviewStep
                  files={files}
                  folderPath={folderPath}
                  sourceYear={selectedAnime?.airedOn?.year ?? undefined}
                  onAnalysisComplete={setFileAnalyses}
                  onSettingsChange={setImportSettings}
                />
              )}
            </Dialog.Body>

            {/* Футер */}
            <Dialog.Footer borderTopWidth="1px" borderColor="border.subtle">
              <HStack justify="space-between" w="full">
                {/* Левая часть: Назад + ссылка на источник */}
                <HStack gap={3}>
                  {currentStep > 1 && (
                    <Button variant="ghost" onClick={goBack}>
                      <Icon as={LuArrowLeft} mr={2} />
                      Назад
                    </Button>
                  )}
                  {sourceUrl ? (
                    <Button
                      variant="ghost"
                      size="xs"
                      color="fg.muted"
                      onClick={() => window.electronAPI?.app.openExternal(sourceUrl)}
                      title={sourceUrl}
                    >
                      <Icon as={LuExternalLink} mr={1} />
                      Rutracker
                    </Button>
                  ) : (
                    parsedInfo?.animeName && (
                      <Button
                        variant="ghost"
                        size="xs"
                        color="fg.muted"
                        onClick={() =>
                          window.electronAPI?.app.openExternal(
                            `https://rutracker.org/forum/tracker.php?nm=${encodeURIComponent(parsedInfo.animeName)}`
                          )
                        }
                        title="Поиск на Rutracker"
                      >
                        <Icon as={LuExternalLink} mr={1} />
                        Rutracker
                      </Button>
                    )
                  )}
                </HStack>

                {/* Правая часть */}
                <HStack gap={2}>
                  {/* Отмена */}
                  <Button variant="outline" onClick={handleClose}>
                    Отмена
                  </Button>

                  {/* Далее (все шаги кроме последнего) */}
                  {getLogicalStep(currentStep) !== 'settings' && (
                    <Button colorPalette="purple" onClick={goNext} disabled={!canGoNext()}>
                      Далее
                      <Icon as={LuArrowRight} ml={2} />
                    </Button>
                  )}

                  {/* В очередь (последний шаг) */}
                  {getLogicalStep(currentStep) === 'settings' && (
                    <Button colorPalette="purple" onClick={addToQueue} disabled={!canGoNext()}>
                      <Icon as={LuListPlus} mr={2} />В очередь (
                      {fileAnalyses.filter((a) => a.mediaInfo !== null).length})
                    </Button>
                  )}
                </HStack>
              </HStack>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
