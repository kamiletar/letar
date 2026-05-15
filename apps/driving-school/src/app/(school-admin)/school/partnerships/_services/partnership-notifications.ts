/**
 * Сервис уведомлений для партнёрств между автошколами
 *
 * Отправляет Push и Telegram уведомления владельцам школ о:
 * - Новых запросах на партнёрство
 * - Принятии/отклонении партнёрства
 * - Приостановке/расторжении партнёрства
 */

import {
  notifyUser,
  type OrchestratorProviders,
  type OrchestratorRepository,
} from '@/lib/notifications/notification-orchestrator'
import type { NotificationType } from '@letar/driving-school-db/prisma'

// === Типы ===

export interface PartnershipNotificationParams {
  /** ID партнёрства */
  partnershipId: string
  /** Название школы-инициатора */
  initiatorName: string
  /** Название школы-партнёра */
  partnerName: string
  /** Репозиторий для уведомлений */
  repo: OrchestratorRepository
  /** Провайдеры (push, email, telegram) */
  providers: OrchestratorProviders
  /** URL приложения */
  appUrl?: string
}

export interface NotifySchoolOwnersParams extends PartnershipNotificationParams {
  /** ID пользователей-владельцев */
  ownerUserIds: string[]
  /** Тип уведомления */
  type: NotificationType
  /** Заголовок */
  title: string
  /** Текст */
  body: string
}

// === Функции ===

/**
 * Отправляет уведомление всем владельцам школы
 */
async function notifySchoolOwners(params: NotifySchoolOwnersParams): Promise<void> {
  const { ownerUserIds, type, title, body, partnershipId, repo, providers, appUrl } = params

  // Отправляем уведомление каждому владельцу
  await Promise.all(
    ownerUserIds.map((userId) =>
      notifyUser({
        userId,
        type,
        title,
        body,
        data: { partnershipId },
        repo,
        providers,
        appUrl,
      }).catch((error) => {
        console.error(`[PartnershipNotifications] Failed to notify user ${userId}:`, error)
      })
    )
  )
}

/**
 * Уведомление о новом запросе на партнёрство (для школы-партнёра)
 */
export async function notifyPartnershipRequestReceived(
  params: PartnershipNotificationParams & { partnerOwnerIds: string[] }
): Promise<void> {
  const { initiatorName, partnerOwnerIds, ...rest } = params

  await notifySchoolOwners({
    ...rest,
    ownerUserIds: partnerOwnerIds,
    type: 'PARTNERSHIP_REQUEST_RECEIVED',
    title: 'Новый запрос на партнёрство',
    body: `Автошкола "${initiatorName}" предлагает установить партнёрство. Рассмотрите запрос в разделе партнёрств.`,
    initiatorName,
  })
}

/**
 * Уведомление о принятии партнёрства (для школы-инициатора)
 */
export async function notifyPartnershipAccepted(
  params: PartnershipNotificationParams & { initiatorOwnerIds: string[] }
): Promise<void> {
  const { partnerName, initiatorOwnerIds, ...rest } = params

  await notifySchoolOwners({
    ...rest,
    ownerUserIds: initiatorOwnerIds,
    type: 'PARTNERSHIP_REQUEST_ACCEPTED',
    title: 'Партнёрство принято!',
    body: `Автошкола "${partnerName}" приняла ваш запрос на партнёрство. Теперь вы можете направлять учеников.`,
    partnerName,
  })
}

/**
 * Уведомление об отклонении партнёрства (для школы-инициатора)
 */
export async function notifyPartnershipRejected(
  params: PartnershipNotificationParams & { initiatorOwnerIds: string[] }
): Promise<void> {
  const { partnerName, initiatorOwnerIds, ...rest } = params

  await notifySchoolOwners({
    ...rest,
    ownerUserIds: initiatorOwnerIds,
    type: 'PARTNERSHIP_REQUEST_REJECTED',
    title: 'Запрос на партнёрство отклонён',
    body: `Автошкола "${partnerName}" отклонила ваш запрос на партнёрство.`,
    partnerName,
  })
}

/**
 * Уведомление о приостановке партнёрства (для обеих школ)
 */
export async function notifyPartnershipSuspended(
  params: PartnershipNotificationParams & { allOwnerIds: string[]; suspendedByName: string }
): Promise<void> {
  const { suspendedByName, allOwnerIds, ...rest } = params

  await notifySchoolOwners({
    ...rest,
    ownerUserIds: allOwnerIds,
    type: 'PARTNERSHIP_SUSPENDED',
    title: 'Партнёрство приостановлено',
    body: `Партнёрство с автошколой "${suspendedByName}" временно приостановлено. Направление учеников недоступно.`,
  })
}

/**
 * Уведомление о расторжении партнёрства (для обеих школ)
 */
export async function notifyPartnershipTerminated(
  params: PartnershipNotificationParams & { allOwnerIds: string[]; terminatedByName: string; reason?: string }
): Promise<void> {
  const { terminatedByName, reason, allOwnerIds, ...rest } = params

  const reasonText = reason ? ` Причина: ${reason}` : ''

  await notifySchoolOwners({
    ...rest,
    ownerUserIds: allOwnerIds,
    type: 'PARTNERSHIP_TERMINATED',
    title: 'Партнёрство расторгнуто',
    body: `Партнёрство с автошколой "${terminatedByName}" было расторгнуто.${reasonText}`,
  })
}

/**
 * Уведомление о возобновлении партнёрства (для школы-партнёра)
 */
export async function notifyPartnershipResumed(
  params: PartnershipNotificationParams & { partnerOwnerIds: string[] }
): Promise<void> {
  const { initiatorName, partnerOwnerIds, ...rest } = params

  await notifySchoolOwners({
    ...rest,
    ownerUserIds: partnerOwnerIds,
    type: 'PARTNERSHIP_REQUEST_ACCEPTED', // Используем тип "принято" для возобновления
    title: 'Партнёрство возобновлено',
    body: `Партнёрство с автошколой "${initiatorName}" было возобновлено. Направление учеников снова доступно.`,
    initiatorName,
  })
}
