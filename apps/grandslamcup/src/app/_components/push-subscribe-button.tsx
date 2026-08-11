'use client'

/**
 * Кнопка подписки на push-уведомления о матчах.
 * Показывается только авторизованным пользователям, если браузер поддерживает push.
 */

import { Button, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { LuBell, LuBellOff } from 'react-icons/lu'

import { toaster } from './ui/toaster'

type SubState = 'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed'

export function PushSubscribeButton() {
  const [state, setState] = useState<SubState>('loading')

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported')
      return
    }
    if (Notification.permission === 'denied') {
      setState('denied')
      return
    }
    // Проверяем текущую подписку
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription()
      setState(sub ? 'subscribed' : 'unsubscribed')
    })
  }, [])

  const subscribe = useCallback(async () => {
    try {
      // Получаем VAPID ключ
      const vapidRes = await fetch('/api/push/vapid-key')
      if (!vapidRes.ok) {
        toaster.error({
          title: 'Push-уведомления не настроены на сервере',
          description: `HTTP ${vapidRes.status}`,
        })
        return
      }
      const { publicKey } = (await vapidRes.json()) as { publicKey?: string }
      if (!publicKey) {
        toaster.error({ title: 'VAPID ключ отсутствует на сервере' })
        return
      }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      })

      // Отправляем подписку на сервер
      const subJson = sub.toJSON()
      const saveRes = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: {
            p256dh: subJson.keys?.p256dh ?? '',
            auth: subJson.keys?.auth ?? '',
          },
        }),
      })

      if (!saveRes.ok) {
        // Пытаемся вытащить сообщение ошибки, но падаем gracefully
        const errorData = (await saveRes.json().catch(() => ({}))) as { error?: string }
        const errorMessage = errorData.error ?? `HTTP ${saveRes.status}`
        // Откатываем браузерную подписку чтобы не оставлять оркфан
        await sub.unsubscribe().catch(() => {
          // намеренно игнорируем — подписка и так не сохранена на сервере
        })
        toaster.error({
          title: 'Не удалось сохранить подписку',
          description: errorMessage,
        })
        setState('unsubscribed')
        return
      }

      setState('subscribed')
      toaster.success({ title: 'Уведомления включены' })
    } catch (error) {
      console.error('[push/subscribe] client error:', error)
      if (Notification.permission === 'denied') {
        setState('denied')
        toaster.error({ title: 'Уведомления заблокированы в настройках браузера' })
      } else {
        const description = error instanceof Error ? error.message : undefined
        toaster.error({ title: 'Не удалось подписаться', description })
      }
    }
  }, [])

  const unsubscribe = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        const delRes = await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        // Если сервер не смог удалить — всё равно снимаем подписку локально,
        // чтобы не блокировать пользователя; но показываем warning
        if (!delRes.ok) {
          console.warn('[push/unsubscribe] server responded', delRes.status)
        }
        await sub.unsubscribe()
      }
      setState('unsubscribed')
      toaster.success({ title: 'Уведомления отключены' })
    } catch (error) {
      console.error('[push/unsubscribe] client error:', error)
      const description = error instanceof Error ? error.message : undefined
      toaster.error({ title: 'Не удалось отписаться', description })
    }
  }, [])

  // Не показываем если не поддерживается или запрещено
  if (state === 'loading' || state === 'unsupported') {
    return null
  }

  if (state === 'denied') {
    return (
      <Button variant="ghost" size="sm" disabled title="Уведомления заблокированы в браузере">
        <LuBellOff size={16} />
        <Text display={{ base: 'none', md: 'inline' }} fontSize="sm">
          Заблокированы
        </Text>
      </Button>
    )
  }

  if (state === 'subscribed') {
    return (
      <Button variant="ghost" size="sm" onClick={unsubscribe} title="Отключить уведомления">
        <LuBell size={16} />
        <Text display={{ base: 'none', md: 'inline' }} fontSize="sm">
          Уведомления
        </Text>
      </Button>
    )
  }

  return (
    <Button variant="outline" size="sm" onClick={subscribe} title="Включить уведомления о матчах">
      <LuBellOff size={16} />
      <Text display={{ base: 'none', md: 'inline' }} fontSize="sm">
        Уведомления
      </Text>
    </Button>
  )
}

/** Конвертирует base64-encoded VAPID ключ в Uint8Array */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
