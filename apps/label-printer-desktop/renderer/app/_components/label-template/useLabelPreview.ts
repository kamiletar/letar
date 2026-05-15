'use client'

import { toPng } from 'html-to-image'
import { useCallback, useRef, useState } from 'react'

export interface UseLabelPreviewResult {
  /** Ref для компонента этикетки */
  labelRef: React.RefObject<HTMLDivElement | null>
  /** Генерирует PNG и возвращает base64 */
  generatePng: () => Promise<string>
  /** Статус генерации */
  isGenerating: boolean
  /** Ошибка генерации */
  error: string | null
}

/**
 * Хук для генерации PNG предпросмотра этикетки
 * Использует html-to-image для конвертации DOM элемента в PNG
 */
export function useLabelPreview(): UseLabelPreviewResult {
  const labelRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generatePng = useCallback(async (): Promise<string> => {
    if (!labelRef.current) {
      throw new Error('Label element not found')
    }

    setIsGenerating(true)
    setError(null)

    try {
      const dataUrl = await toPng(labelRef.current, {
        quality: 1,
        pixelRatio: 2, // Высокое разрешение для печати
        backgroundColor: '#ffffff',
      })

      // Убираем prefix "data:image/png;base64,"
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
      return base64
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      throw err
    } finally {
      setIsGenerating(false)
    }
  }, [])

  return {
    labelRef,
    generatePng,
    isGenerating,
    error,
  }
}

export default useLabelPreview
