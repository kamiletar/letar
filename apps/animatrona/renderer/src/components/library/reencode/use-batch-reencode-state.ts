'use client'

/**
 * Хук состояния диалога пакетной перекодировки аудио
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import type {
  BatchReencodePreview,
  BatchReencodeProgress,
  BatchReencodeResult,
} from '../../../../../shared/types/audio-reencode'

/** Хелпер — доступ к audioReencode API (tsgo не видит расширенный ElectronAPI) */
function getBatchApi() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window.electronAPI as any)?.audioReencode as
    | {
        batchPreview: () => Promise<{ success: boolean; data?: BatchReencodePreview; error?: string }>
        batchStart: () => Promise<{ success: boolean; data?: BatchReencodeResult; error?: string }>
        batchCancel: () => Promise<{ success: boolean; error?: string }>
        onBatchProgress: (cb: (progress: BatchReencodeProgress) => void) => () => void
      }
    | undefined
}

export type BatchReencodeStep = 'preview' | 'progress' | 'result'

interface UseBatchReencodeStateOptions {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function useBatchReencodeState({ open, onOpenChange }: UseBatchReencodeStateOptions) {
  const [step, setStep] = useState<BatchReencodeStep>('preview')
  const [preview, setPreview] = useState<BatchReencodePreview | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [progress, setProgress] = useState<BatchReencodeProgress | null>(null)
  const [result, setResult] = useState<BatchReencodeResult | null>(null)
  const [isReencoding, setIsReencoding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const unsubRef = useRef<(() => void) | null>(null)

  // Загружаем предпросмотр при открытии
  useEffect(() => {
    if (!open) {
      // Сброс при закрытии
      setStep('preview')
      setPreview(null)
      setProgress(null)
      setResult(null)
      setError(null)
      setIsReencoding(false)
      unsubRef.current?.()
      unsubRef.current = null
      return
    }

    const loadPreview = async () => {
      const api = getBatchApi()
      if (!api) return

      setIsLoadingPreview(true)
      setError(null)

      try {
        const res = await api.batchPreview()
        if (res.success && res.data) {
          setPreview(res.data)
        } else {
          setError(res.error ?? 'Ошибка загрузки предпросмотра')
        }
      } catch (err) {
        setError(String(err))
      } finally {
        setIsLoadingPreview(false)
      }
    }

    loadPreview()
  }, [open])

  // Запуск пакетной перекодировки
  const handleStart = useCallback(async () => {
    const api = getBatchApi()
    if (!api) return

    setStep('progress')
    setIsReencoding(true)
    setError(null)

    // Подписка на прогресс
    unsubRef.current = api.onBatchProgress((p) => {
      setProgress(p)
    })

    try {
      const res = await api.batchStart()
      if (res.success && res.data) {
        setResult(res.data)
      } else {
        setError(res.error ?? 'Ошибка перекодировки')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setIsReencoding(false)
      unsubRef.current?.()
      unsubRef.current = null
      setStep('result')
    }
  }, [])

  // Отмена перекодировки
  const handleCancel = useCallback(async () => {
    const api = getBatchApi()
    if (!api) return
    await api.batchCancel()
  }, [])

  // Cleanup при размонтировании
  useEffect(() => {
    return () => {
      unsubRef.current?.()
      unsubRef.current = null
    }
  }, [])

  // Закрытие
  const handleClose = useCallback(() => {
    if (!isReencoding) {
      onOpenChange(false)
    }
  }, [isReencoding, onOpenChange])

  return {
    step,
    preview,
    isLoadingPreview,
    progress,
    result,
    isReencoding,
    error,
    handleStart,
    handleCancel,
    handleClose,
  }
}

export type UseBatchReencodeStateReturn = ReturnType<typeof useBatchReencodeState>
