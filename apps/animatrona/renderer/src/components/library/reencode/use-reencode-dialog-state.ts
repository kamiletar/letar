'use client'

/**
 * Хук состояния диалога перекодировки аудио
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import type { ReencodePreview, ReencodeProgress, ReencodeResult } from '../../../../../shared/types/audio-reencode'

/** Хелпер — доступ к audioReencode API (tsgo не видит расширенный ElectronAPI) */
function getReencodeApi() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window.electronAPI as any)?.audioReencode as
    | {
      preview: (
        animeId: string,
        targetBitrate: number,
      ) => Promise<{ success: boolean; data?: ReencodePreview; error?: string }>
      start: (
        animeId: string,
        targetBitrate: number,
      ) => Promise<{ success: boolean; data?: ReencodeResult; error?: string }>
      cancel: () => Promise<{ success: boolean; error?: string }>
      onProgress: (cb: (progress: ReencodeProgress) => void) => () => void
    }
    | undefined
}

export type ReencodeStep = 'preview' | 'progress' | 'result'

interface UseReencodeDialogStateOptions {
  animeId: string
  targetBitrate: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function useReencodeDialogState({ animeId, targetBitrate, open, onOpenChange }: UseReencodeDialogStateOptions) {
  const [step, setStep] = useState<ReencodeStep>('preview')
  const [preview, setPreview] = useState<ReencodePreview | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [progress, setProgress] = useState<ReencodeProgress | null>(null)
  const [result, setResult] = useState<ReencodeResult | null>(null)
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
      const api = getReencodeApi()
      if (!api) {
        return
      }

      setIsLoadingPreview(true)
      setError(null)

      try {
        const res = await api.preview(animeId, targetBitrate)
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
  }, [open, animeId, targetBitrate])

  // Запуск перекодировки
  const handleStart = useCallback(async () => {
    const api = getReencodeApi()
    if (!api) {
      return
    }

    setStep('progress')
    setIsReencoding(true)
    setError(null)

    // Подписка на прогресс
    unsubRef.current = api.onProgress((p) => {
      setProgress(p)
    })

    try {
      const res = await api.start(animeId, targetBitrate)
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
  }, [animeId, targetBitrate])

  // Отмена перекодировки
  const handleCancel = useCallback(async () => {
    const api = getReencodeApi()
    if (!api) {
      return
    }
    await api.cancel()
  }, [])

  // Cleanup при размонтировании (утечка подписки)
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
    targetBitrate,
    handleStart,
    handleCancel,
    handleClose,
  }
}

export type UseReencodeDialogStateReturn = ReturnType<typeof useReencodeDialogState>
