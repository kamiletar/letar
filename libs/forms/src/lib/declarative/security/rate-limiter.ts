'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Конфигурация клиентского rate limiting
 */
export interface RateLimitConfig {
  /** Максимальное количество submit за окно (по умолчанию: 3) */
  maxSubmits: number
  /** Размер окна в миллисекундах (по умолчанию: 60000 = 1 минута) */
  windowMs: number
}

/**
 * Состояние rate limiter
 */
export interface RateLimitState {
  /** Submit заблокирован (лимит исчерпан) */
  isBlocked: boolean
  /** Оставшиеся попытки */
  remaining: number
  /** Секунд до разблокировки (0 если не заблокирован) */
  secondsLeft: number
  /** Зарегистрировать попытку submit */
  recordAttempt: () => boolean
  /** Сбросить счётчик */
  reset: () => void
}

const STORAGE_KEY_PREFIX = 'form-rate-limit:'

/**
 * Хук клиентского rate limiting для формы.
 * Хранит счётчик попыток в sessionStorage.
 * Graceful degradation — если sessionStorage недоступен, submit всегда разрешён.
 */
export function useRateLimit(config: RateLimitConfig | undefined, formId?: string): RateLimitState | null {
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [isBlocked, setIsBlocked] = useState(false)
  // Счётчик для триггера re-render при recordAttempt
  const [, setAttemptVersion] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Стабильный ключ хранилища
  const storageKey = `${STORAGE_KEY_PREFIX}${formId ?? 'default'}`

  // Получить timestamps попыток из sessionStorage
  const getAttempts = useCallback((): number[] => {
    if (!config) return []
    try {
      const raw = sessionStorage.getItem(storageKey)
      if (!raw) return []
      const attempts = JSON.parse(raw) as number[]
      const now = Date.now()
      // Отфильтровать устаревшие
      return attempts.filter((ts) => now - ts < config.windowMs)
    } catch {
      return []
    }
  }, [config, storageKey])

  // Сохранить timestamps
  const saveAttempts = useCallback(
    (attempts: number[]) => {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(attempts))
      } catch {
        // sessionStorage недоступен — graceful degradation
      }
    },
    [storageKey],
  )

  // Запустить таймер обратного отсчёта
  const startCountdown = useCallback(
    (blockUntil: number) => {
      if (timerRef.current) clearInterval(timerRef.current)

      const updateTimer = () => {
        const remaining = Math.ceil((blockUntil - Date.now()) / 1000)
        if (remaining <= 0) {
          setIsBlocked(false)
          setSecondsLeft(0)
          if (timerRef.current) clearInterval(timerRef.current)
          timerRef.current = null
          // Очистить устаревшие записи
          saveAttempts(getAttempts())
        } else {
          setSecondsLeft(remaining)
        }
      }

      updateTimer()
      timerRef.current = setInterval(updateTimer, 1000)
    },
    [getAttempts, saveAttempts],
  )

  // Зарегистрировать попытку — возвращает true если разрешено
  const recordAttempt = useCallback((): boolean => {
    if (!config) return true

    const attempts = getAttempts()
    if (attempts.length >= config.maxSubmits) {
      // Заблокировать
      setIsBlocked(true)
      const oldestAttempt = Math.min(...attempts)
      const blockUntil = oldestAttempt + config.windowMs
      startCountdown(blockUntil)
      return false
    }

    // Записать попытку
    attempts.push(Date.now())
    saveAttempts(attempts)
    setAttemptVersion((v) => v + 1) // Триггер re-render для обновления remaining
    return true
  }, [config, getAttempts, saveAttempts, startCountdown])

  // Сброс
  const reset = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey)
    } catch {
      // Ignore
    }
    setIsBlocked(false)
    setSecondsLeft(0)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [storageKey])

  // Очистка таймера при unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // Проверить блокировку при монтировании
  useEffect(() => {
    if (!config) return
    const attempts = getAttempts()
    if (attempts.length >= config.maxSubmits) {
      setIsBlocked(true)
      const oldestAttempt = Math.min(...attempts)
      const blockUntil = oldestAttempt + config.windowMs
      if (blockUntil > Date.now()) {
        startCountdown(blockUntil)
      }
    }
  }, [config, getAttempts, startCountdown])

  if (!config) return null

  const attempts = getAttempts()

  return {
    isBlocked,
    remaining: Math.max(0, config.maxSubmits - attempts.length),
    secondsLeft,
    recordAttempt,
    reset,
  }
}
