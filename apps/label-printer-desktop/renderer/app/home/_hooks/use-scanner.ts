import { toPng } from 'html-to-image'
import { useCallback, useEffect, useState } from 'react'
import { recordPrintJob } from '../_actions'
import type { ScanEvent } from './use-scans'

/** Пропсы для useScannerConnection */
export interface UseScannerConnectionProps {
  /** Callback при получении кода от сканера */
  onScan: (code: string) => void
}

/**
 * Хук подключения к сканеру
 * Управляет подпиской на события сканера
 */
export function useScannerConnection({ onScan }: UseScannerConnectionProps) {
  const [isListening, setIsListening] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI) {
      return
    }

    setIsListening(true)
    const unsubscribe = window.electronAPI.on.scannerInput(onScan)

    return () => {
      setIsListening(false)
      unsubscribe()
    }
  }, [onScan])

  return { isListening }
}

/** Пропсы для usePrint */
export interface UsePrintProps {
  /** Refs к элементам этикеток */
  labelRefs: React.RefObject<Map<string, HTMLDivElement | null>>
  /** Функция получения ключа скана */
  getScanKey: (scan: ScanEvent) => string
  /** Callback обновления статуса скана */
  onUpdateScan: (code: string, timestamp: Date, updates: Partial<ScanEvent>) => void
}

/**
 * Хук печати этикеток
 * Инкапсулирует логику генерации PNG, отправки на печать и записи в историю
 */
export function usePrint({ labelRefs, getScanKey, onUpdateScan }: UsePrintProps) {
  const handlePrint = useCallback(
    async (scanEvent: ScanEvent) => {
      const scanKey = getScanKey(scanEvent)
      const labelElement = labelRefs.current.get(scanKey)

      if (!labelElement) {
        console.error('Label element not found for scan:', scanKey)
        return
      }

      try {
        // ВАЖНО: Сначала генерируем PNG, ПОТОМ меняем статус
        // Иначе элемент скроется и toPng отрендерит пустоту
        const dataUrl = await toPng(labelElement, {
          quality: 1,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
        })

        // Теперь обновляем статус
        onUpdateScan(scanEvent.code, scanEvent.timestamp, { status: 'printing' })

        // Убираем prefix и отправляем на печать
        const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
        const result = await window.electronAPI.print.printImage(base64)

        // Записываем в историю печати при успехе
        if (result.success && scanEvent.parsedCode) {
          try {
            await recordPrintJob({
              fullCode: scanEvent.parsedCode.fullCode,
              gtin: scanEvent.parsedCode.gtin,
              serialNumber: scanEvent.parsedCode.serialNumber,
              cryptoCode: scanEvent.parsedCode.cryptoCode,
              productId: scanEvent.product?.id,
            })
          } catch (e) {
            console.error('Не удалось записать PrintJob:', e)
          }
        }

        onUpdateScan(scanEvent.code, scanEvent.timestamp, {
          result,
          status: result.success ? 'success' : 'error',
        })
      } catch (error) {
        onUpdateScan(scanEvent.code, scanEvent.timestamp, {
          result: { success: false, error: String(error) },
          status: 'error',
        })
      }
    },
    [labelRefs, getScanKey, onUpdateScan]
  )

  return { handlePrint }
}
