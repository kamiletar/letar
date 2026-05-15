/**
 * Переиспользуемый репозиторий для notification-orchestrator
 *
 * Извлечён из 7 дублированных копий в разных файлах.
 * Используется для отправки push, email и telegram уведомлений.
 *
 * @example
 * ```ts
 * import { createOrchestratorRepository, createNotificationProviders } from '@/lib/orchestrator-repository'
 *
 * // С enhanced клиентом (в server actions):
 * const repo = createOrchestratorRepository(db)
 *
 * // С базовым prisma (в cron, чатах):
 * const repo = createOrchestratorRepository()
 *
 * const providers = createNotificationProviders()
 * ```
 */

import { prisma } from '@/lib/db'
import { createNodemailerProvider } from '@/lib/email'
import type { OrchestratorProviders, OrchestratorRepository } from '@/lib/notifications'
import type { NotificationType, UserRole } from '@letar/driving-school-db/prisma'

import type { DbClient } from './db-types'

/**
 * Создаёт репозиторий для notification-orchestrator на базе Prisma.
 *
 * @param db - Enhanced Prisma клиент (опционально, по умолчанию — базовый prisma)
 */
export function createOrchestratorRepository(db?: DbClient): OrchestratorRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = (db ?? prisma) as any

  return {
    createNotification: async (data) => {
      const notification = await client.notification.create({
        data: {
          userId: data.userId,
          type: data.type as NotificationType,
          title: data.title,
          body: data.body,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: (data.data ?? undefined) as any,
        },
      })
      return { id: notification.id }
    },
    getNotificationById: async (id) => {
      const notification = await client.notification.findUnique({ where: { id } })
      if (!notification) {
        return null
      }
      return { ...notification, data: (notification.data as Record<string, unknown>) ?? null }
    },
    updateNotification: async (id, data) => {
      await client.notification.update({ where: { id }, data })
    },
    getNotificationsByUser: async (userId, options) => {
      const notifications = await client.notification.findMany({
        where: { userId, ...(options.unreadOnly ? { isRead: false } : {}) },
        orderBy: { createdAt: 'desc' },
        take: options.limit,
      })
      return notifications.map((n: Record<string, unknown>) => ({
        ...n,
        data: (n.data as Record<string, unknown>) ?? null,
      }))
    },
    markAllAsRead: async (userId) => {
      const result = await client.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      })
      return { count: result.count }
    },
    getNotificationSettings: async (userId) => {
      return client.notificationSettings.findUnique({ where: { userId } })
    },
    upsertNotificationSettings: async (userId, data) => {
      await client.notificationSettings.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
      })
    },
    getPushSubscriptionsByUser: async (userId) => {
      return client.pushSubscription.findMany({ where: { userId } })
    },
    createPushSubscription: async (data) => {
      const sub = await client.pushSubscription.create({ data })
      return { id: sub.id }
    },
    deletePushSubscription: async (id) => {
      await client.pushSubscription.delete({ where: { id } })
    },
    getPushSubscriptionByEndpoint: async (endpoint) => {
      return client.pushSubscription.findUnique({ where: { endpoint } })
    },
    getUserById: async (id) => {
      const user = await client.user.findUnique({
        where: { id },
        select: { id: true, name: true, email: true, roles: true },
      })
      if (!user) {
        return null
      }
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: (user.roles[0] || 'STUDENT') as UserRole,
      }
    },
    getTelegramLinkByUserId: async (userId) => {
      return client.telegramLink.findUnique({ where: { userId } })
    },
  }
}

/**
 * Создаёт провайдеры для отправки уведомлений
 */
export function createNotificationProviders(): OrchestratorProviders {
  return {
    email: createNodemailerProvider(),
  }
}
