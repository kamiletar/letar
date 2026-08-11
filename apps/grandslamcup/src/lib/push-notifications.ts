'use server'

/**
 * Push-уведомления через web-push.
 * Используется для напоминаний о матчах за день.
 */

import type { PushSubscription as WebPushSubscription } from 'web-push'
import webpush from 'web-push'

import { prisma } from './db'

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:kami@letar.best'

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
}

export interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  url?: string
  tag?: string
}

/** Отправить push-уведомление на одну подписку */
async function sendToSubscription(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
): Promise<boolean> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('VAPID ключи не настроены, push пропущен')
    return false
  }

  const pushSubscription: WebPushSubscription = {
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.p256dh, auth: subscription.auth },
  }

  try {
    await webpush.sendNotification(pushSubscription, JSON.stringify(payload), {
      TTL: 60 * 60 * 24,
      urgency: 'normal',
    })
    return true
  } catch (error) {
    // Истёкшая подписка — удаляем
    if ((error as { statusCode?: number }).statusCode === 410) {
      await prisma.pushSubscription
        .delete({
          where: { endpoint: subscription.endpoint },
        })
        .catch(() => {})
      console.warn('Удалена истёкшая подписка:', subscription.endpoint)
    } else {
      console.error('Ошибка отправки push:', error)
    }
    return false
  }
}

/** Отправить push всем подписчикам */
export async function sendPushToAll(payload: PushPayload): Promise<{ sent: number; failed: number }> {
  const subscriptions = await prisma.pushSubscription.findMany()

  let sent = 0
  let failed = 0

  // Батчами по 100
  const batchSize = 100
  for (let i = 0; i < subscriptions.length; i += batchSize) {
    const batch = subscriptions.slice(i, i + batchSize)
    const results = await Promise.all(batch.map((sub) => sendToSubscription(sub, payload)))
    sent += results.filter(Boolean).length
    failed += results.filter((r) => !r).length
  }

  return { sent, failed }
}

/** Отправить push конкретному пользователю */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<{ sent: number; failed: number }> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  })

  let sent = 0
  let failed = 0

  for (const sub of subscriptions) {
    const success = await sendToSubscription(sub, payload)
    if (success) { sent++ }
    else { failed++ }
  }

  return { sent, failed }
}
