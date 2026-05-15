'use client'

/**
 * Хук для аудита IPFS хранилища — поиск осиротевших pins
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import type { ProgressLogEntry } from '@/components/ui/ProgressLog'

import type { PinInfo } from '../../../../../../shared/types/ipfs'

export interface MissingPinInfo {
  cid: string
  source: string
  animeName?: string
  manifestOnly: boolean
}

export interface AuditResult {
  dbCids: string[]
  referencedCids: string[]
  pinnedCids: string[]
  orphanedPins: PinInfo[]
  missingPins: string[]
  missingPinDetails?: MissingPinInfo[]
  errors: string[]
}

export interface NormalizeResult {
  unpinned: number
  kept: number
  errors: number
  directoriesProcessed: number
  directoriesFailed: number
}

export interface UseIpfsAuditReturn {
  /** Результат последнего аудита */
  result: AuditResult | null
  /** Идёт аудит */
  isRunning: boolean
  /** Лог прогресса аудита */
  auditLog: ProgressLogEntry[]
  /** Прогресс аудита */
  auditProgress: { current: number; total: number } | null
  /** Идёт очистка */
  isCleaning: boolean
  /** Прогресс очистки orphan pins */
  cleanProgress: { current: number; total: number } | null
  /** Идёт закрепление missing pins */
  isPinning: boolean
  /** Идёт нормализация pins */
  isNormalizing: boolean
  /** Лог прогресса нормализации */
  normalizeLog: ProgressLogEntry[]
  /** Прогресс нормализации */
  normalizeProgress: { current: number; total: number } | null
  /** Результат последней нормализации */
  normalizeResult: NormalizeResult | null
  /** Количество удалённых pins */
  cleanedCount: number
  /** Количество закреплённых missing pins */
  pinnedCount: number
  /** Ошибка */
  error: string | null
  /** Запустить аудит */
  runAudit: () => Promise<void>
  /** Удалить осиротевшие pins */
  cleanOrphans: () => Promise<void>
  /** Закрепить missing pins */
  pinMissing: () => Promise<void>
  /** Запустить GC после очистки */
  runGc: () => Promise<{ blocksRemoved: number; savedBytes: number } | null>
  /** Нормализовать pins (одноразовая чистка) */
  normalizePins: () => Promise<void>
}

export function useIpfsAudit(): UseIpfsAuditReturn {
  const [result, setResult] = useState<AuditResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isCleaning, setIsCleaning] = useState(false)
  const [cleanProgress, setCleanProgress] = useState<{ current: number; total: number } | null>(null)
  const [isPinning, setIsPinning] = useState(false)
  const [cleanedCount, setCleanedCount] = useState(0)
  const [pinnedCount, setPinnedCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [auditLog, setAuditLog] = useState<ProgressLogEntry[]>([])
  const [auditProgress, setAuditProgress] = useState<{ current: number; total: number } | null>(null)
  const auditLogRef = useRef<ProgressLogEntry[]>([])
  const [isNormalizing, setIsNormalizing] = useState(false)
  const [normalizeLog, setNormalizeLog] = useState<ProgressLogEntry[]>([])
  const [normalizeProgress, setNormalizeProgress] = useState<{ current: number; total: number } | null>(null)
  const [normalizeResult, setNormalizeResult] = useState<NormalizeResult | null>(null)
  const normalizeLogRef = useRef<ProgressLogEntry[]>([])

  // Подписка на прогресс аудита (обход манифестов per-anime)
  useEffect(() => {
    const unsub = window.electronAPI?.ipfs.onAuditProgress((data) => {
      setAuditProgress({ current: data.current, total: data.total })
      const existing = auditLogRef.current.find((e) => e.name === data.name)
      if (!existing) {
        auditLogRef.current = [...auditLogRef.current, { name: data.name, status: 'ok' }]
      }
      setAuditLog([...auditLogRef.current])
    })
    // Подписка на шаги аудита (текстовое описание).
    // Если новый шаг имеет тот же префикс (до ":"), что последний — это обновление прогресса
    // того же шага (например "Проверка блоков: 100/500" → "200/500"), заменяем строку,
    // а не плодим новые. Иначе предыдущие "processing" помечаем как "ok".
    const unsubStep = window.electronAPI?.ipfs.onAuditStep?.((data) => {
      const newPrefix = data.step.split(':')[0]
      const last = auditLogRef.current[auditLogRef.current.length - 1]
      if (last && last.status === 'processing' && last.name.split(':')[0] === newPrefix) {
        auditLogRef.current = [...auditLogRef.current.slice(0, -1), { name: data.step, status: 'processing' }]
      } else {
        const completed = auditLogRef.current.map((e) =>
          e.status === 'processing' ? { ...e, status: 'ok' as const } : e
        )
        auditLogRef.current = [...completed, { name: data.step, status: 'processing' }]
      }
      setAuditLog([...auditLogRef.current])
    })
    // Подписка на шаги нормализации pins (та же логика «свернуть progress-обновления»)
    const unsubNormalize = window.electronAPI?.ipfs.onNormalizeStep?.((data) => {
      if (typeof data.current === 'number' && typeof data.total === 'number' && data.total > 0) {
        setNormalizeProgress({ current: data.current, total: data.total })
      }
      const newPrefix = data.step.split(':')[0]
      const last = normalizeLogRef.current[normalizeLogRef.current.length - 1]
      if (last && last.status === 'processing' && last.name.split(':')[0] === newPrefix) {
        normalizeLogRef.current = [...normalizeLogRef.current.slice(0, -1), { name: data.step, status: 'processing' }]
      } else {
        const completed = normalizeLogRef.current.map((e) =>
          e.status === 'processing' ? { ...e, status: 'ok' as const } : e
        )
        normalizeLogRef.current = [...completed, { name: data.step, status: 'processing' }]
      }
      setNormalizeLog([...normalizeLogRef.current])
    })

    return () => {
      unsub?.()
      unsubStep?.()
      unsubNormalize?.()
    }
  }, [])

  const runAudit = useCallback(async () => {
    const api = window.electronAPI
    if (!api) {
      return
    }

    setIsRunning(true)
    setError(null)
    setCleanedCount(0)
    setAuditLog([])
    setAuditProgress(null)
    auditLogRef.current = []

    try {
      const res = await api.ipfs.findOrphanedPins()
      if (res.success && res.data) {
        setResult(res.data)
      } else {
        setError(res.error ?? 'Неизвестная ошибка')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка аудита')
    } finally {
      setIsRunning(false)
    }
  }, [])

  const cleanOrphans = useCallback(async () => {
    const api = window.electronAPI
    if (!api || !result?.orphanedPins.length) {
      return
    }

    setIsCleaning(true)
    setError(null)
    setCleanProgress({ current: 0, total: result.orphanedPins.length })

    // Подписка на прогресс bulk-unpin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tsgo баг
    const unsub = (api.ipfs as any).onBulkUnpinProgress?.((data: { current: number; total: number }) => {
      setCleanProgress(data)
    })

    try {
      const cids = result.orphanedPins.map((p) => p.cid)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tsgo баг: bulkUnpin не виден в большом объектном типе
      const res = await (api.ipfs as any).bulkUnpin(cids)
      if (res.success && res.data) {
        setCleanedCount(res.data.unpinned)
      } else {
        setError(res.error ?? 'Ошибка очистки')
      }

      // Убираем удалённые пины из результата без полного перезапуска аудита
      setResult((prev) => (prev ? { ...prev, orphanedPins: [] } : prev))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка очистки')
    } finally {
      unsub?.()
      setIsCleaning(false)
    }
  }, [result])

  const pinMissing = useCallback(async () => {
    const api = window.electronAPI
    if (!api || !result?.missingPins.length) {
      return
    }

    setIsPinning(true)
    setError(null)

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tsgo баг: не видит pinMissing в большом объектном типе (90+ свойств)
      const res = await (api.ipfs as any).pinMissing(result.missingPins)
      if (res.success && res.data) {
        setPinnedCount(res.data.pinned)
      }

      // Перезапускаем аудит
      const auditRes = await api.ipfs.findOrphanedPins()
      if (auditRes.success && auditRes.data) {
        setResult(auditRes.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка закрепления')
    } finally {
      setIsPinning(false)
    }
  }, [result])

  const runGc = useCallback(async () => {
    const api = window.electronAPI
    if (!api) {
      return null
    }

    try {
      const res = await api.ipfs.repoGc()
      if (res.success && res.data) {
        return res.data as { blocksRemoved: number; savedBytes: number }
      }
    } catch {
      // Пропускаем
    }
    return null
  }, [])

  const normalizePins = useCallback(async () => {
    const api = window.electronAPI
    if (!api) {
      return
    }

    setIsNormalizing(true)
    setError(null)
    setNormalizeLog([])
    setNormalizeProgress(null)
    setNormalizeResult(null)
    normalizeLogRef.current = []

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tsgo баг: не видит normalizePins в большом объектном типе
      const res = await (api.ipfs as any).normalizePins()
      if (res.success && res.data) {
        setNormalizeResult(res.data as NormalizeResult)
        // Помечаем все processing шаги как ok
        normalizeLogRef.current = normalizeLogRef.current.map((e) =>
          e.status === 'processing' ? { ...e, status: 'ok' as const } : e
        )
        setNormalizeLog([...normalizeLogRef.current])
      } else {
        setError(res.error ?? 'Ошибка нормализации')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка нормализации')
    } finally {
      setIsNormalizing(false)
    }
  }, [])

  return {
    result,
    isRunning,
    auditLog,
    auditProgress,
    isCleaning,
    cleanProgress,
    isPinning,
    isNormalizing,
    normalizeLog,
    normalizeProgress,
    normalizeResult,
    cleanedCount,
    pinnedCount,
    error,
    runAudit,
    cleanOrphans,
    pinMissing,
    runGc,
    normalizePins,
  }
}
