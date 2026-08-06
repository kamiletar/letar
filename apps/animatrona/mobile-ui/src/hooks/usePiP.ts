/**
 * usePiP — Picture-in-Picture API
 *
 * Позволяет смотреть видео в мини-окне поверх других приложений.
 * Поддерживается в Chrome, Edge, Safari.
 */

import { useCallback, useEffect, useState } from 'react'

interface UsePiPOptions {
  /** Ref на video элемент */
  videoRef: React.RefObject<HTMLVideoElement | null>
}

export function usePiP(options: UsePiPOptions) {
  const { videoRef } = options

  const [isPiPActive, setIsPiPActive] = useState(false)
  const [isSupported, setIsSupported] = useState(false)

  // Проверка поддержки
  useEffect(() => {
    setIsSupported(
      typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && document.pictureInPictureEnabled,
    )
  }, [])

  // Слушаем события PiP
  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }

    const handleEnterPiP = () => {
      setIsPiPActive(true)
      // PiP режим активирован
    }

    const handleLeavePiP = () => {
      setIsPiPActive(false)
      // PiP режим деактивирован
    }

    video.addEventListener('enterpictureinpicture', handleEnterPiP)
    video.addEventListener('leavepictureinpicture', handleLeavePiP)

    // Проверка начального состояния
    setIsPiPActive(document.pictureInPictureElement === video)

    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnterPiP)
      video.removeEventListener('leavepictureinpicture', handleLeavePiP)
    }
  }, [videoRef])

  // Войти в PiP
  const enterPiP = useCallback(async () => {
    const video = videoRef.current
    if (!video || !isSupported) {
      return
    }

    try {
      await video.requestPictureInPicture()
    } catch (err) {
      console.warn('[usePiP] Failed to enter PiP:', err)
    }
  }, [videoRef, isSupported])

  // Выйти из PiP
  const exitPiP = useCallback(async () => {
    if (!document.pictureInPictureElement) {
      return
    }

    try {
      await document.exitPictureInPicture()
    } catch (err) {
      console.warn('[usePiP] Failed to exit PiP:', err)
    }
  }, [])

  // Toggle PiP
  const togglePiP = useCallback(() => {
    if (isPiPActive) {
      exitPiP()
    } else {
      enterPiP()
    }
  }, [isPiPActive, enterPiP, exitPiP])

  return {
    isPiPActive,
    isSupported,
    enterPiP,
    exitPiP,
    togglePiP,
  }
}
