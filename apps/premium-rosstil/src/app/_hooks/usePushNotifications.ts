'use client'

import { useCallback, useEffect, useState } from 'react'

type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported'

interface PushPreferences {
  newProducts?: boolean
  orderStatus?: boolean
  promotions?: boolean
  cartReminder?: boolean
}

interface UsePushNotificationsReturn {
  permission: PushPermission
  isSubscribed: boolean
  isLoading: boolean
  error: string | null
  subscribe: (preferences?: PushPreferences) => Promise<boolean>
  unsubscribe: () => Promise<boolean>
  updatePreferences: (preferences: PushPreferences) => Promise<boolean>
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length) as Uint8Array<ArrayBuffer>
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
  const ua = navigator.userAgent
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet'
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile'
  }
  return 'desktop'
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [permission, setPermission] = useState<PushPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Проверяем начальное состояние
  useEffect(() => {
    const checkSubscription = async () => {
      // Проверяем поддержку push-уведомлений
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setPermission('unsupported')
        setIsLoading(false)
        return
      }

      // Получаем текущее разрешение
      const currentPermission = Notification.permission as PushPermission
      setPermission(currentPermission)

      // Проверяем, есть ли уже подписка
      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        setIsSubscribed(!!subscription)
      } catch (err) {
        console.error('Error checking subscription:', err)
      }

      setIsLoading(false)
    }

    checkSubscription()
  }, [])

  const subscribe = useCallback(async (preferences?: PushPreferences): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      // Запрашиваем разрешение, если не получено
      if (Notification.permission !== 'granted') {
        const result = await Notification.requestPermission()
        setPermission(result as PushPermission)
        if (result !== 'granted') {
          setError('Разрешение на уведомления не получено')
          setIsLoading(false)
          return false
        }
      }

      // Получаем публичный ключ VAPID
      const vapidResponse = await fetch('/api/push/vapid-key')
      if (!vapidResponse.ok) {
        throw new Error('Failed to get VAPID key')
      }
      const { publicKey } = await vapidResponse.json()

      // Подписываемся на push
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      // Отправляем подписку на сервер
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey('p256dh')!)))),
            auth: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey('auth')!)))),
          },
          userAgent: navigator.userAgent,
          deviceType: getDeviceType(),
          preferences,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save subscription')
      }

      setIsSubscribed(true)
      setIsLoading(false)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка подписки на уведомления'
      setError(message)
      setIsLoading(false)
      return false
    }
  }, [])

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        // Отписываемся от push-сервиса
        await subscription.unsubscribe()

        // Удаляем с сервера
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
          }),
        })
      }

      setIsSubscribed(false)
      setIsLoading(false)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка отписки от уведомлений'
      setError(message)
      setIsLoading(false)
      return false
    }
  }, [])

  const updatePreferences = useCallback(async (preferences: PushPreferences): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (!subscription) {
        setError('Нет активной подписки')
        setIsLoading(false)
        return false
      }

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey('p256dh')!)))),
            auth: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey('auth')!)))),
          },
          preferences,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update preferences')
      }

      setIsLoading(false)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка обновления настроек'
      setError(message)
      setIsLoading(false)
      return false
    }
  }, [])

  return {
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    updatePreferences,
  }
}
