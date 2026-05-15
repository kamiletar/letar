'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { parseImportData } from '@/lib/excel'
import { useCallback, useState, useTransition } from 'react'

import { importData } from '../../_actions/import.action'
import type {
  ColumnMapping,
  ImportDataType,
  ImportOptions,
  ImportResult,
  ImportRow,
  ImportWizardState,
  ParsedRow,
  SystemField,
  WizardStep,
} from './types'

const initialState: ImportWizardState = {
  currentStep: 'type',
  dataType: null,
  selectedFile: null,
  fileBuffer: null,
  headers: [],
  mapping: [],
  systemFields: [],
  parsedRows: [],
  options: {
    updateExisting: true,
    skipErrors: true,
    sendInvites: false,
  },
  importResult: null,
}

/**
 * Хук для управления состоянием визарда импорта.
 */
export function useImportWizard(schoolId: string) {
  const [isPending, startTransition] = useTransition()

  const [currentStep, setCurrentStep] = useState<WizardStep>(initialState.currentStep)
  const [dataType, setDataType] = useState<ImportDataType | null>(initialState.dataType)
  const [selectedFile, setSelectedFile] = useState<File | null>(initialState.selectedFile)
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(initialState.fileBuffer)
  const [headers, setHeaders] = useState<string[]>(initialState.headers)
  const [mapping, setMapping] = useState<ColumnMapping[]>(initialState.mapping)
  const [systemFields, setSystemFields] = useState<SystemField[]>(initialState.systemFields)
  const [parsedRows, setParsedRows] = useState<ParsedRow<ImportRow>[]>(initialState.parsedRows)
  const [options, setOptions] = useState<ImportOptions>(initialState.options)
  const [importResult, setImportResult] = useState<ImportResult | null>(initialState.importResult)

  /**
   * Получение индекса шага для Steps компонента.
   */
  const getStepIndex = useCallback(() => {
    switch (currentStep) {
      case 'type':
        return 0
      case 'upload':
        return 1
      case 'mapping':
        return 2
      case 'preview':
        return 3
      case 'complete':
        return 4
      default:
        return 0
    }
  }, [currentStep])

  /**
   * Выбор типа данных.
   */
  const handleTypeSelect = useCallback((type: ImportDataType) => {
    setDataType(type)
    setCurrentStep('upload')
  }, [])

  /**
   * Выбор файла.
   */
  const handleFileSelect = useCallback(
    async (file: File) => {
      setSelectedFile(file)

      const buffer = await file.arrayBuffer()
      setFileBuffer(buffer)

      if (!dataType) {
        return
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', dataType)

      try {
        const response = await fetch('/api/import/parse', {
          method: 'POST',
          body: formData,
        })

        const result = await response.json()

        if (!response.ok || !result.success) {
          toaster.error({ title: 'Ошибка', description: result.error || 'Не удалось прочитать файл' })
          return
        }

        setHeaders(result.headers)
        setMapping(result.suggestedMapping)
        setSystemFields(result.systemFields)
        setCurrentStep('mapping')
      } catch {
        toaster.error({ title: 'Ошибка', description: 'Не удалось прочитать файл' })
      }
    },
    [dataType]
  )

  /**
   * Очистка файла.
   */
  const handleFileClear = useCallback(() => {
    setSelectedFile(null)
    setFileBuffer(null)
    setHeaders([])
    setMapping([])
  }, [])

  /**
   * Переход к предпросмотру.
   */
  const handleGoToPreview = useCallback(() => {
    if (!fileBuffer || !dataType) {
      return
    }

    // Проверяем что все обязательные поля смаплены
    const requiredFields = systemFields.filter((f) => f.required)
    const missingRequired = requiredFields.filter((f) => !mapping.some((m) => m.systemField === f.key))

    if (missingRequired.length > 0) {
      toaster.error({
        title: 'Ошибка',
        description: `Не указаны обязательные поля: ${missingRequired.map((f) => f.label).join(', ')}`,
      })
      return
    }

    // Парсим данные с маппингом
    const result = parseImportData<ImportRow>(fileBuffer, dataType, mapping)

    if (!result.success) {
      toaster.error({ title: 'Ошибка', description: result.error || 'Ошибка парсинга данных' })
      return
    }

    setParsedRows(result.rows)
    setCurrentStep('preview')
  }, [fileBuffer, dataType, mapping, systemFields])

  /**
   * Выполнение импорта.
   */
  const handleImport = useCallback(() => {
    if (!fileBuffer || !dataType) {
      return
    }

    startTransition(async () => {
      const result = await importData(schoolId, dataType, fileBuffer, mapping, options)

      if (!result.success) {
        toaster.error({ title: 'Ошибка', description: result.error || 'Ошибка импорта' })
        return
      }

      setImportResult({
        imported: result.imported,
        updated: result.updated,
        skipped: result.skipped,
        errors: result.errors,
      })
      setCurrentStep('complete')
    })
  }, [fileBuffer, dataType, schoolId, mapping, options])

  /**
   * Возврат на предыдущий шаг.
   */
  const handleBack = useCallback(() => {
    switch (currentStep) {
      case 'upload':
        setCurrentStep('type')
        setDataType(null)
        break
      case 'mapping':
        setCurrentStep('upload')
        break
      case 'preview':
        setCurrentStep('mapping')
        break
    }
  }, [currentStep])

  /**
   * Сброс визарда.
   */
  const resetWizard = useCallback(() => {
    setCurrentStep(initialState.currentStep)
    setDataType(initialState.dataType)
    setSelectedFile(initialState.selectedFile)
    setFileBuffer(initialState.fileBuffer)
    setHeaders(initialState.headers)
    setMapping(initialState.mapping)
    setParsedRows(initialState.parsedRows)
    setImportResult(initialState.importResult)
  }, [])

  return {
    // Состояние
    currentStep,
    dataType,
    selectedFile,
    fileBuffer,
    headers,
    mapping,
    systemFields,
    parsedRows,
    options,
    importResult,
    isPending,

    // Сеттеры
    setMapping,
    setOptions,

    // Вычисляемые значения
    getStepIndex,

    // Действия
    handleTypeSelect,
    handleFileSelect,
    handleFileClear,
    handleGoToPreview,
    handleImport,
    handleBack,
    resetWizard,
  }
}
