'use client'

/**
 * Хук для сканирования папки с видеофайлами
 *
 * Универсальный хук используемый в:
 * - FileScanStep (импорт визарда)
 * - ScanFolderDialog (добавление эпизодов)
 */

import type { MediaFileInfo } from '@/types/electron'
import { useCallback, useState } from 'react'

/**
 * Базовый интерфейс для файла со сканирования
 */
export interface BaseScannedFile extends MediaFileInfo {
  /** Номер эпизода (null если не распознан) */
  episodeNumber: number | null
  /** Выбран ли файл для импорта */
  selected: boolean
}

/**
 * Функция парсинга файла — должна вернуть номер эпизода или null
 */
export type ParseFileFn<T extends BaseScannedFile> = (file: MediaFileInfo) => Omit<T, keyof MediaFileInfo | 'selected'>

/**
 * Функция определения начального выбора файла
 */
export type InitialSelectionFn<T extends BaseScannedFile> = (file: T) => boolean

/**
 * Функция сортировки файлов
 */
export type SortFn<T extends BaseScannedFile> = (a: T, b: T) => number

/**
 * Опции хука
 */
export interface UseScanFolderOptions<T extends BaseScannedFile> {
  /** Функция парсинга файла (извлечение номера эпизода и т.д.) */
  parseFile: ParseFileFn<T>
  /** Функция определения начального выбора */
  getInitialSelection?: InitialSelectionFn<T>
  /** Функция сортировки */
  sortFiles?: SortFn<T>
}

/**
 * Результат хука
 */
export interface UseScanFolderResult<T extends BaseScannedFile> {
  /** Список файлов */
  files: T[]
  /** Установить файлы (для внешнего управления) */
  setFiles: React.Dispatch<React.SetStateAction<T[]>>
  /** Идёт сканирование */
  isScanning: boolean
  /** Сканировать папку */
  scan: (folderPath: string) => Promise<void>
  /** Переключить выбор файла по индексу */
  toggleFile: (index: number) => void
  /** Выбрать/снять все файлы с номером эпизода */
  toggleAll: () => void
  /** Сбросить состояние */
  reset: () => void
  /** Количество выбранных файлов с номером */
  selectedCount: number
  /** Всего файлов с номером */
  totalWithNumbers: number
}

/**
 * Сортировка по умолчанию — по номеру эпизода, null в конец
 */
function defaultSort<T extends BaseScannedFile>(a: T, b: T): number {
  if (a.episodeNumber === null && b.episodeNumber === null) {
    return 0
  }
  if (a.episodeNumber === null) {
    return 1
  }
  if (b.episodeNumber === null) {
    return -1
  }
  return a.episodeNumber - b.episodeNumber
}

/**
 * Хук для сканирования папки с видеофайлами
 *
 * @example
 * ```tsx
 * const { files, scan, toggleFile, toggleAll, isScanning } = useScanFolder({
 *   parseFile: (file) => {
 *     const info = parseEpisodeInfo(file.name)
 *     return { episodeNumber: info?.number ?? null, episodeType: info?.type ?? 'regular' }
 *   },
 *   getInitialSelection: (file) => file.episodeType === 'regular',
 * })
 * ```
 */
export function useScanFolder<T extends BaseScannedFile>(options: UseScanFolderOptions<T>): UseScanFolderResult<T> {
  const { parseFile, getInitialSelection, sortFiles = defaultSort } = options

  const [files, setFiles] = useState<T[]>([])
  const [isScanning, setIsScanning] = useState(false)

  /**
   * Сканировать папку
   */
  const scan = useCallback(
    async (folderPath: string) => {
      if (!window.electronAPI) {
        console.error('Electron API недоступен')
        return
      }

      setIsScanning(true)
      try {
        const result = await window.electronAPI.fs.scanFolder(folderPath, true)
        if (result.success) {
          const parsed = result.files
            .map((file) => {
              const parsed = parseFile(file)
              const baseFile = {
                ...file,
                ...parsed,
                selected: false,
              } as T

              // Определяем начальный выбор
              if (getInitialSelection) {
                baseFile.selected = getInitialSelection(baseFile)
              } else {
                // По умолчанию выбираем файлы с распознанным номером
                baseFile.selected = baseFile.episodeNumber !== null
              }

              return baseFile
            })
            .sort(sortFiles)

          setFiles(parsed)
        }
      } catch (error) {
        console.error('Ошибка сканирования:', error)
      } finally {
        setIsScanning(false)
      }
    },
    [parseFile, getInitialSelection, sortFiles]
  )

  /**
   * Переключить выбор файла
   */
  const toggleFile = useCallback((index: number) => {
    setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, selected: !f.selected } : f)))
  }, [])

  /**
   * Выбрать/снять все файлы с номером эпизода
   */
  const toggleAll = useCallback(() => {
    setFiles((prev) => {
      const validFiles = prev.filter((f) => f.episodeNumber !== null)
      const allSelected = validFiles.length > 0 && validFiles.every((f) => f.selected)
      return prev.map((f) => (f.episodeNumber !== null ? { ...f, selected: !allSelected } : f))
    })
  }, [])

  /**
   * Сбросить состояние
   */
  const reset = useCallback(() => {
    setFiles([])
    setIsScanning(false)
  }, [])

  // Вычисляемые значения
  const selectedCount = files.filter((f) => f.selected && f.episodeNumber !== null).length
  const totalWithNumbers = files.filter((f) => f.episodeNumber !== null).length

  return {
    files,
    setFiles,
    isScanning,
    scan,
    toggleFile,
    toggleAll,
    reset,
    selectedCount,
    totalWithNumbers,
  }
}
