/**
 * Хук для информации о хранилище
 *
 * Возвращает размер скачанных файлов и свободное место.
 */

import { useCallback, useEffect, useState } from 'react'

import { getStorageInfo, type StorageInfo } from '@/services/fileStorage'

interface UseStorageInfoResult {
  /** Информация о хранилище */
  info: StorageInfo | null
  /** Загружается */
  loading: boolean
  /** Обновить данные */
  refresh: () => void
}

export function useStorageInfo(): UseStorageInfoResult {
  const [info, setInfo] = useState<StorageInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getStorageInfo()
      setInfo(data)
    } catch (error) {
      console.warn('[useStorageInfo] Ошибка:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { info, loading, refresh }
}
