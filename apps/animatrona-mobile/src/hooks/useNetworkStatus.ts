/**
 * useNetworkStatus — отслеживание статуса сети
 */

import NetInfo, { type NetInfoState } from '@react-native-community/netinfo'
import { useEffect, useState } from 'react'

export interface NetworkStatus {
  /** Есть ли подключение к сети */
  isConnected: boolean
  /** Тип подключения (wifi, cellular, etc.) */
  type: string | null
  /** Подробная информация */
  details: NetInfoState | null
}

/**
 * Хук для отслеживания статуса сети
 */
export function useNetworkStatus(): NetworkStatus {
  // Начинаем с true чтобы не показывать баннер до проверки
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    type: null,
    details: null,
  })

  useEffect(() => {
    // Получаем начальное состояние
    NetInfo.fetch().then((state) => {
      // isConnected может быть null на некоторых устройствах, считаем true
      // isInternetReachable более надёжный индикатор, но тоже может быть null
      const connected = state.isConnected ?? true
      setStatus({
        isConnected: connected,
        type: state.type,
        details: state,
      })
    })

    // Подписываемся на изменения
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected ?? true
      setStatus({
        isConnected: connected,
        type: state.type,
        details: state,
      })
    })

    return () => {
      unsubscribe()
    }
  }, [])

  return status
}
