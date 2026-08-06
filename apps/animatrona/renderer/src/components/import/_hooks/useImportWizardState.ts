/**
 * Хук для управления состоянием визарда импорта
 *
 * Группирует 15 useState в единый редьюсер для удобства управления
 */

import { useMemo, useReducer, useRef } from 'react'

import type { ParsedFolderInfo } from '@/lib/shikimori/parse-folder'
import type { ShikimoriAnimePreview } from '@/types/electron'

import type { ParsedFile } from '../FileScanStep'
import type { FileAnalysis, ImportSettings } from '../PreviewStep'
import type { Step } from '../StepIndicator'

/** Базовые шаги визарда (без калибровки донора) */
const BASE_STEPS: Step[] = [
  { id: 1, title: 'Папка' },
  { id: 2, title: 'Поиск' },
  { id: 3, title: 'Файлы' },
  { id: 4, title: 'Донор' },
  { id: 5, title: 'Настройки' },
  { id: 6, title: 'Импорт' },
]

/** Шаги визарда с калибровкой донора */
const DONOR_STEPS: Step[] = [
  { id: 1, title: 'Папка' },
  { id: 2, title: 'Поиск' },
  { id: 3, title: 'Файлы' },
  { id: 4, title: 'Донор' },
  { id: 5, title: 'Синхрон.' },
  { id: 6, title: 'Настройки' },
  { id: 7, title: 'Импорт' },
]

/** Логические названия шагов */
type LogicalStep = 'folder' | 'search' | 'files' | 'donor' | 'sync' | 'settings' | 'import' | 'unknown'

/** Состояние визарда */
export interface ImportWizardState {
  /** Текущий шаг */
  currentStep: number

  /** Шаг 1: Источник */
  source: {
    folderPath: string | null
    parsedInfo: ParsedFolderInfo | null
    isFileMode: boolean
    singleFilePath: string | null
  }

  /** Шаг 2: Аниме из Shikimori */
  anime: ShikimoriAnimePreview | null

  /** Шаг 3: Файлы */
  files: ParsedFile[]

  /** Шаг 4-5: Донор */
  donor: {
    enabled: boolean
    path: string | null
    files: ParsedFile[]
    syncOffset: number
  }

  /** Шаг 6: Настройки */
  settings: {
    fileAnalyses: FileAnalysis[]
    importSettings: ImportSettings
  }
}

/** Действия редьюсера */
type ImportWizardAction =
  | { type: 'SET_STEP'; step: number }
  | { type: 'GO_NEXT' }
  | { type: 'GO_BACK' }
  | { type: 'SET_SOURCE'; source: ImportWizardState['source'] }
  | { type: 'SET_FOLDER'; folderPath: string; parsedInfo: ParsedFolderInfo }
  | { type: 'SET_FILE'; filePath: string; folderPath: string; parsedInfo: ParsedFolderInfo }
  | { type: 'SET_ANIME'; anime: ShikimoriAnimePreview | null }
  | { type: 'SET_FILES'; files: ParsedFile[] }
  | { type: 'SET_DONOR_ENABLED'; enabled: boolean }
  | { type: 'SET_DONOR_PATH'; path: string | null }
  | { type: 'SET_DONOR_FILES'; files: ParsedFile[] }
  | { type: 'SET_SYNC_OFFSET'; offset: number }
  | { type: 'SET_FILE_ANALYSES'; analyses: FileAnalysis[] }
  | { type: 'SET_IMPORT_SETTINGS'; settings: ImportSettings }
  | { type: 'RESET' }

/** Начальное состояние */
const initialState: ImportWizardState = {
  currentStep: 1,
  source: {
    folderPath: null,
    parsedInfo: null,
    isFileMode: false,
    singleFilePath: null,
  },
  anime: null,
  files: [],
  donor: {
    enabled: false,
    path: null,
    files: [],
    syncOffset: 0,
  },
  settings: {
    fileAnalyses: [],
    importSettings: {
      profileId: null,
      audioMaxConcurrent: 4,
      videoMaxConcurrent: 2,
    },
  },
}

/** Редьюсер состояния визарда */
function importWizardReducer(state: ImportWizardState, action: ImportWizardAction): ImportWizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.step }

    case 'GO_NEXT':
      return { ...state, currentStep: state.currentStep + 1 }

    case 'GO_BACK':
      return { ...state, currentStep: Math.max(1, state.currentStep - 1) }

    case 'SET_SOURCE':
      return { ...state, source: action.source, files: [] }

    case 'SET_FOLDER':
      return {
        ...state,
        source: {
          folderPath: action.folderPath,
          parsedInfo: action.parsedInfo,
          isFileMode: false,
          singleFilePath: null,
        },
        files: [],
      }

    case 'SET_FILE':
      return {
        ...state,
        source: {
          folderPath: action.folderPath,
          parsedInfo: action.parsedInfo,
          isFileMode: true,
          singleFilePath: action.filePath,
        },
        files: [],
      }

    case 'SET_ANIME':
      return { ...state, anime: action.anime }

    case 'SET_FILES':
      return { ...state, files: action.files }

    case 'SET_DONOR_ENABLED':
      return {
        ...state,
        donor: { ...state.donor, enabled: action.enabled },
      }

    case 'SET_DONOR_PATH':
      return {
        ...state,
        donor: { ...state.donor, path: action.path },
      }

    case 'SET_DONOR_FILES':
      return {
        ...state,
        donor: { ...state.donor, files: action.files },
      }

    case 'SET_SYNC_OFFSET':
      return {
        ...state,
        donor: { ...state.donor, syncOffset: action.offset },
      }

    case 'SET_FILE_ANALYSES':
      return {
        ...state,
        settings: { ...state.settings, fileAnalyses: action.analyses },
      }

    case 'SET_IMPORT_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, importSettings: action.settings },
      }

    case 'RESET':
      return initialState

    default:
      return state
  }
}

/** Параметры хука */
export interface UseImportWizardStateOptions {
  /** Предустановленный shikimoriId */
  preselectedShikimoriId?: number
  /** Начальный путь к папке */
  initialFolderPath?: string | null
}

/** Результат хука */
export interface UseImportWizardStateResult {
  /** Состояние */
  state: ImportWizardState

  /** Шаги визарда (зависят от донора) */
  wizardSteps: Step[]

  /** Логическое название текущего шага */
  logicalStep: LogicalStep

  /** Можно ли перейти на следующий шаг */
  canGoNext: boolean

  /** Действия */
  actions: {
    goNext: () => void
    goBack: () => void
    setStep: (step: number) => void
    setFolder: (folderPath: string, parsedInfo: ParsedFolderInfo) => void
    setFile: (filePath: string, folderPath: string, parsedInfo: ParsedFolderInfo) => void
    setAnime: (anime: ShikimoriAnimePreview | null) => void
    setFiles: (files: ParsedFile[]) => void
    setDonorEnabled: (enabled: boolean) => void
    setDonorPath: (path: string | null) => void
    setDonorFiles: (files: ParsedFile[]) => void
    setSyncOffset: (offset: number) => void
    setFileAnalyses: (analyses: FileAnalysis[]) => void
    setImportSettings: (settings: ImportSettings) => void
    reset: () => void
  }

  /** Ref для отслеживания обработанного initialFolderPath */
  processedInitialPathRef: React.MutableRefObject<string | null>
}

/**
 * Хук для управления состоянием визарда импорта
 */
export function useImportWizardState(_options: UseImportWizardStateOptions = {}): UseImportWizardStateResult {
  const [state, dispatch] = useReducer(importWizardReducer, initialState)
  const processedInitialPathRef = useRef<string | null>(null)

  // Определяем какие шаги показывать
  const wizardSteps = useMemo(() => {
    if (state.donor.enabled && state.donor.files.length > 0) {
      const hasMatches = state.files.some(
        (f) =>
          f.selected && f.episodeNumber !== null && state.donor.files.some((d) => d.episodeNumber === f.episodeNumber),
      )
      if (hasMatches) {
        return DONOR_STEPS
      }
    }
    return BASE_STEPS
  }, [state.donor.enabled, state.donor.files, state.files])

  // Логическое название шага
  const logicalStep = useMemo((): LogicalStep => {
    const hasSyncStep = wizardSteps.length === 7
    if (hasSyncStep) {
      const names: LogicalStep[] = ['folder', 'search', 'files', 'donor', 'sync', 'settings', 'import']
      return names[state.currentStep - 1] || 'unknown'
    } else {
      const names: LogicalStep[] = ['folder', 'search', 'files', 'donor', 'settings', 'import']
      return names[state.currentStep - 1] || 'unknown'
    }
  }, [wizardSteps.length, state.currentStep])

  // Проверка возможности перехода
  const canGoNext = useMemo((): boolean => {
    switch (logicalStep) {
      case 'folder':
        return state.source.folderPath !== null && state.source.parsedInfo !== null
      case 'search':
        return state.anime !== null
      case 'files':
        return state.files.some((f) => f.selected && f.episodeNumber !== null)
      case 'donor':
      case 'sync':
        return true
      case 'settings':
        return state.settings.fileAnalyses.some((a) => a.mediaInfo !== null)
      default:
        return false
    }
  }, [logicalStep, state])

  // Действия
  const actions = useMemo(
    () => ({
      goNext: () => dispatch({ type: 'GO_NEXT' }),
      goBack: () => dispatch({ type: 'GO_BACK' }),
      setStep: (step: number) => dispatch({ type: 'SET_STEP', step }),
      setFolder: (folderPath: string, parsedInfo: ParsedFolderInfo) =>
        dispatch({ type: 'SET_FOLDER', folderPath, parsedInfo }),
      setFile: (filePath: string, folderPath: string, parsedInfo: ParsedFolderInfo) =>
        dispatch({ type: 'SET_FILE', filePath, folderPath, parsedInfo }),
      setAnime: (anime: ShikimoriAnimePreview | null) => dispatch({ type: 'SET_ANIME', anime }),
      setFiles: (files: ParsedFile[]) => dispatch({ type: 'SET_FILES', files }),
      setDonorEnabled: (enabled: boolean) => dispatch({ type: 'SET_DONOR_ENABLED', enabled }),
      setDonorPath: (path: string | null) => dispatch({ type: 'SET_DONOR_PATH', path }),
      setDonorFiles: (files: ParsedFile[]) => dispatch({ type: 'SET_DONOR_FILES', files }),
      setSyncOffset: (offset: number) => dispatch({ type: 'SET_SYNC_OFFSET', offset }),
      setFileAnalyses: (analyses: FileAnalysis[]) => dispatch({ type: 'SET_FILE_ANALYSES', analyses }),
      setImportSettings: (settings: ImportSettings) => dispatch({ type: 'SET_IMPORT_SETTINGS', settings }),
      reset: () => {
        dispatch({ type: 'RESET' })
        processedInitialPathRef.current = null
      },
    }),
    [],
  )

  return {
    state,
    wizardSteps,
    logicalStep,
    canGoNext,
    actions,
    processedInitialPathRef,
  }
}
