import { useCallback, useRef, useState } from 'react'
import type { Product } from '../../../../src/generated/prisma'
import type { BarcodeData, ParsedMarkingCode, PrintResult, ValidationResult } from '../../../types/electron'
import type { LabelData } from '../../_components/label-template'
import { checkDuplicate, findProductByGtin } from '../_actions'

/** Событие сканирования */
export interface ScanEvent {
  /** Сырой код */
  code: string
  /** Время сканирования */
  timestamp: Date
  /** Результат печати */
  result?: PrintResult
  /** Результат валидации */
  validation?: ValidationResult
  /** Распарсенный код */
  parsedCode?: ParsedMarkingCode
  /** Найденный товар */
  product?: Product | null
  /** Данные для шаблона этикетки */
  labelData?: LabelData
  /** Данные баркодов */
  barcodeData?: BarcodeData
  /** Код уже был напечатан ранее */
  isDuplicate?: boolean
  /** Статус обработки */
  status: 'validating' | 'preview' | 'printing' | 'success' | 'error'
}

/** Максимальное количество сканов в истории */
const MAX_SCANS = 10

/**
 * Хук управления состоянием сканирований
 * Инкапсулирует логику добавления, обновления и обработки сканов
 */
export function useScans() {
  const [lastScans, setLastScans] = useState<ScanEvent[]>([])

  /** Refs для каждого LabelTemplate по индексу скана */
  const labelRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())

  /** Получить уникальный ключ скана */
  const getScanKey = useCallback((scan: ScanEvent) => `${scan.code}-${scan.timestamp.getTime()}`, [])

  /** Обновить скан по коду и timestamp */
  const updateScan = useCallback((code: string, timestamp: Date, updates: Partial<ScanEvent>) => {
    setLastScans((prev) =>
      prev.map((s) => (s.code === code && s.timestamp.getTime() === timestamp.getTime() ? { ...s, ...updates } : s))
    )
  }, [])

  /** Обработать сканирование */
  const processScan = useCallback(
    async (code: string) => {
      if (!code.trim()) {
        return
      }

      const scanEvent: ScanEvent = {
        code,
        timestamp: new Date(),
        status: 'validating',
      }

      setLastScans((prev) => [scanEvent, ...prev.slice(0, MAX_SCANS - 1)])

      try {
        // Валидируем код
        const validation = await window.electronAPI.print.validate(code)

        if (!validation.isValid) {
          updateScan(code, scanEvent.timestamp, {
            status: 'error',
            validation,
            result: { success: false, error: validation.error?.message },
          })
          return
        }

        updateScan(code, scanEvent.timestamp, { status: 'validating', validation, parsedCode: validation.code })

        // Параллельно: поиск товара + генерация баркодов + проверка дубликата
        const [product, barcodeData, existingJob] = await Promise.all([
          validation.code?.gtin ? findProductByGtin(validation.code.gtin) : Promise.resolve(null),
          window.electronAPI.print.generateBarcodes(code),
          validation.code?.fullCode ? checkDuplicate(validation.code.fullCode) : Promise.resolve(null),
        ])

        const isDuplicate = existingJob?.printed === true

        // Формируем данные для шаблона
        const labelData: LabelData = {
          product: {
            name: product?.name || 'Товар',
            articleCode: product?.articleCode || barcodeData.gtin13,
            composition: product?.composition || undefined,
            color: product?.color || undefined,
          },
          dataMatrixBase64: barcodeData.dataMatrixBase64,
          gtinBarcodeBase64: barcodeData.gtinBarcodeBase64,
          gtin13: barcodeData.gtin13,
        }

        updateScan(code, scanEvent.timestamp, {
          product,
          barcodeData,
          labelData,
          isDuplicate,
          status: 'preview',
        })
      } catch (error) {
        updateScan(code, scanEvent.timestamp, {
          status: 'error',
          result: { success: false, error: String(error) },
        })
      }
    },
    [updateScan]
  )

  /** Обновить скан после создания товара */
  const updateScanWithProduct = useCallback((scanKey: string, product: Product) => {
    setLastScans((prev) =>
      prev.map((s) => {
        const key = `${s.code}-${s.timestamp.getTime()}`
        if (key === scanKey) {
          const labelData: LabelData = {
            product: {
              name: product.name,
              articleCode: product.articleCode || s.barcodeData?.gtin13,
              composition: product.composition || undefined,
              color: product.color || undefined,
            },
            dataMatrixBase64: s.labelData?.dataMatrixBase64 || '',
            gtinBarcodeBase64: s.labelData?.gtinBarcodeBase64 || '',
            gtin13: s.barcodeData?.gtin13,
          }
          return { ...s, product, labelData }
        }
        return s
      })
    )
  }, [])

  return {
    lastScans,
    labelRefs,
    getScanKey,
    processScan,
    updateScan,
    updateScanWithProduct,
  }
}
