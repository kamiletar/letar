'use server'

import type { NotificationType } from '@/generated/prisma'
import type { PushSubscription as WebPushSubscription } from 'web-push'
import webpush from 'web-push'
import { prisma } from './db'

// Initialize web-push with VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com'

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
}

export interface PushPayload {
  title: string
  body: string
  icon?: string
  image?: string
  badge?: string
  url?: string
  tag?: string
  data?: Record<string, unknown>
}

/**
 * Send push notification to a specific subscription
 */
async function sendToSubscription(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<boolean> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('VAPID keys not configured, skipping push notification')
    return false
  }

  const pushSubscription: WebPushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  }

  try {
    await webpush.sendNotification(pushSubscription, JSON.stringify(payload), {
      TTL: 60 * 60 * 24, // 24 hours
      urgency: 'normal',
    })
    return true
  } catch (error) {
    // If subscription is expired or invalid, remove it
    if ((error as { statusCode?: number }).statusCode === 410) {
      await prisma.pushSubscription.delete({
        where: { endpoint: subscription.endpoint },
      })
      console.warn('Removed expired subscription:', subscription.endpoint)
    } else {
      console.error('Failed to send push notification:', error)
    }
    return false
  }
}

/**
 * Send notification to a specific user
 */
export async function sendPushToUser(
  userId: string,
  type: NotificationType,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  // Get user's subscriptions that have this notification type enabled
  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      userId,
      ...(type === 'NEW_PRODUCT' ? { newProducts: true } : {}),
      ...(type === 'ORDER_STATUS' ? { orderStatus: true } : {}),
      ...(type === 'PROMOTION' ? { promotions: true } : {}),
      ...(type === 'CART_REMINDER' ? { cartReminder: true } : {}),
    },
  })

  let sent = 0
  let failed = 0

  for (const sub of subscriptions) {
    const success = await sendToSubscription(sub, payload)
    if (success) {
      sent++
    } else {
      failed++
    }
  }

  return { sent, failed }
}

/**
 * Send notification to all subscribers of a specific type
 */
export async function sendPushToAll(
  type: NotificationType,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  // Get all subscriptions that have this notification type enabled
  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      ...(type === 'NEW_PRODUCT' ? { newProducts: true } : {}),
      ...(type === 'ORDER_STATUS' ? { orderStatus: true } : {}),
      ...(type === 'PROMOTION' ? { promotions: true } : {}),
      ...(type === 'CART_REMINDER' ? { cartReminder: true } : {}),
    },
  })

  let sent = 0
  let failed = 0

  // Send in batches to avoid overwhelming the push service
  const batchSize = 100
  for (let i = 0; i < subscriptions.length; i += batchSize) {
    const batch = subscriptions.slice(i, i + batchSize)
    const results = await Promise.all(
      batch.map((sub: { endpoint: string; p256dh: string; auth: string }) => sendToSubscription(sub, payload))
    )
    sent += results.filter(Boolean).length
    failed += results.filter((r) => !r).length
  }

  return { sent, failed }
}

// ==================== Convenience functions for specific notification types ====================

/**
 * Notify user about order status change
 */
export async function notifyOrderStatus(
  userId: string,
  orderNumber: string,
  status: string,
  statusText: string
): Promise<void> {
  const payload: PushPayload = {
    title: `Заказ ${orderNumber}`,
    body: statusText,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    url: `/profile/orders`,
    tag: `order-${orderNumber}`,
    data: { orderNumber, status },
  }

  await sendPushToUser(userId, 'ORDER_STATUS', payload)

  // Log notification
  await prisma.pushNotification.create({
    data: {
      type: 'ORDER_STATUS',
      title: payload.title,
      body: payload.body,
      url: payload.url,
      targetUserId: userId,
      data: { orderNumber, status },
      sentAt: new Date(),
      sentCount: 1,
    },
  })
}

/**
 * Notify all subscribers about a new product
 */
export async function notifyNewProduct(
  productName: string,
  productUrl: string,
  imageUrl?: string
): Promise<{ sent: number; failed: number }> {
  const payload: PushPayload = {
    title: 'Новое поступление!',
    body: productName,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    image: imageUrl,
    url: productUrl,
    tag: 'new-product',
  }

  const result = await sendPushToAll('NEW_PRODUCT', payload)

  // Log notification
  await prisma.pushNotification.create({
    data: {
      type: 'NEW_PRODUCT',
      title: payload.title,
      body: payload.body,
      url: payload.url,
      image: imageUrl,
      targetAll: true,
      sentAt: new Date(),
      sentCount: result.sent,
    },
  })

  return result
}

/**
 * Notify all subscribers about a promotion
 */
export async function notifyPromotion(
  title: string,
  body: string,
  url: string,
  imageUrl?: string
): Promise<{ sent: number; failed: number }> {
  const payload: PushPayload = {
    title,
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    image: imageUrl,
    url,
    tag: 'promotion',
  }

  const result = await sendPushToAll('PROMOTION', payload)

  // Log notification
  await prisma.pushNotification.create({
    data: {
      type: 'PROMOTION',
      title: payload.title,
      body: payload.body,
      url: payload.url,
      image: imageUrl,
      targetAll: true,
      sentAt: new Date(),
      sentCount: result.sent,
    },
  })

  return result
}

/**
 * Remind user about abandoned cart
 */
export async function notifyCartReminder(userId: string, itemCount: number): Promise<void> {
  const payload: PushPayload = {
    title: 'Вы забыли товары в корзине',
    body: `У вас ${itemCount} ${getItemWord(itemCount)} в корзине. Завершите покупку!`,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    url: '/cart',
    tag: 'cart-reminder',
    data: { itemCount },
  }

  await sendPushToUser(userId, 'CART_REMINDER', payload)

  // Log notification
  await prisma.pushNotification.create({
    data: {
      type: 'CART_REMINDER',
      title: payload.title,
      body: payload.body,
      url: payload.url,
      targetUserId: userId,
      data: { itemCount },
      sentAt: new Date(),
      sentCount: 1,
    },
  })
}

// Helper for Russian plural forms
function getItemWord(count: number): string {
  const lastTwo = count % 100
  const lastOne = count % 10

  if (lastTwo >= 11 && lastTwo <= 14) {
    return 'товаров'
  }
  if (lastOne === 1) {
    return 'товар'
  }
  if (lastOne >= 2 && lastOne <= 4) {
    return 'товара'
  }
  return 'товаров'
}
