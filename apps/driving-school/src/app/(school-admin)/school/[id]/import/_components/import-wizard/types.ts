import type { ColumnMapping, ImportDataType, ImportOptions, ImportRow, ParsedRow, SystemField } from '@/lib/excel'

/**
 * Типы шагов визарда импорта.
 */
export type WizardStep = 'type' | 'upload' | 'mapping' | 'preview' | 'complete'

/**
 * Результат импорта.
 */
export interface ImportResult {
  imported: number
  updated: number
  skipped: number
  errors: Array<{ rowIndex: number; error: string }>
}

/**
 * Пропсы для ImportWizard.
 */
export interface ImportWizardProps {
  schoolId: string
  schoolName: string
}

/**
 * Состояние визарда импорта.
 */
export interface ImportWizardState {
  currentStep: WizardStep
  dataType: ImportDataType | null
  selectedFile: File | null
  fileBuffer: ArrayBuffer | null
  headers: string[]
  mapping: ColumnMapping[]
  systemFields: SystemField[]
  parsedRows: ParsedRow<ImportRow>[]
  options: ImportOptions
  importResult: ImportResult | null
}

/**
 * Действия визарда импорта.
 */
export interface ImportWizardActions {
  setCurrentStep: (step: WizardStep) => void
  setDataType: (type: ImportDataType | null) => void
  setSelectedFile: (file: File | null) => void
  setFileBuffer: (buffer: ArrayBuffer | null) => void
  setHeaders: (headers: string[]) => void
  setMapping: (mapping: ColumnMapping[]) => void
  setSystemFields: (fields: SystemField[]) => void
  setParsedRows: (rows: ParsedRow<ImportRow>[]) => void
  setOptions: (options: ImportOptions) => void
  setImportResult: (result: ImportResult | null) => void
  resetWizard: () => void
}

export type { ColumnMapping, ImportDataType, ImportOptions, ImportRow, ParsedRow, SystemField }
