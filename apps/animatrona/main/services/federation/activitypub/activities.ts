/**
 * ActivityPub Activity Handling
 *
 * Обработка входящих и исходящих activities.
 */

import type { PrismaClient } from '@prisma/client'

import type {
  ActivityPubActivity,
  AnnounceActivity,
  CreateActivity,
  DeleteActivity,
  UpdateActivity,
  VideoSeriesObject,
} from '../../../../shared/types/federation'
import { createModuleLogger } from '../../../utils/logger'
import type { ActivityHandleResult, ActivityType } from './types'

const log = createModuleLogger('Activities')

/**
 * Обработать входящую activity
 */
export async function handleActivity(
  activity: ActivityPubActivity,
  prisma: PrismaClient,
): Promise<ActivityHandleResult> {
  const type = activity.type as ActivityType

  switch (type) {
    case 'Create':
      return handleCreate(activity as CreateActivity, prisma)

    case 'Update':
      return handleUpdate(activity as UpdateActivity, prisma)

    case 'Delete':
      return handleDelete(activity as DeleteActivity, prisma)

    case 'Announce':
      return handleAnnounce(activity as AnnounceActivity, prisma)

    default:
      return {
        success: false,
        activityId: activity.id,
        type,
        error: `Неподдерживаемый тип activity: ${type}`,
      }
  }
}

/**
 * Обработать Create activity (новый контент)
 */
async function handleCreate(activity: CreateActivity, prisma: PrismaClient): Promise<ActivityHandleResult> {
  const content = activity.object as VideoSeriesObject

  if (!content || !content.id) {
    return {
      success: false,
      activityId: activity.id,
      type: 'Create',
      error: 'Activity не содержит валидный object',
    }
  }

  try {
    // Находим трекер по actor
    const trackerUrl = extractTrackerUrl(activity.actor)
    const tracker = await prisma.tracker.findUnique({
      where: { url: trackerUrl },
    })

    if (!tracker) {
      return {
        success: false,
        activityId: activity.id,
        type: 'Create',
        error: `Трекер не найден: ${trackerUrl}`,
      }
    }

    // Проверяем дубликат
    const existing = await prisma.federatedContent.findUnique({
      where: {
        trackerId_remoteId: {
          trackerId: tracker.id,
          remoteId: content.id,
        },
      },
    })

    if (existing) {
      return {
        success: true,
        activityId: activity.id,
        type: 'Create',
        error: 'Контент уже существует',
      }
    }

    // Создаём запись федеративного контента
    await prisma.federatedContent.create({
      data: {
        trackerId: tracker.id,
        remoteId: content.id,
        contentJson: JSON.stringify(content),
        malId: content.externalIds?.mal ?? null,
        anilistId: content.externalIds?.anilist ?? null,
        shikimoriId: content.externalIds?.shikimori ?? null,
        anidbId: content.externalIds?.anidb ?? null,
      },
    })

    // Обновляем счётчик
    await prisma.tracker.update({
      where: { id: tracker.id },
      data: { contentSynced: { increment: 1 } },
    })

    return {
      success: true,
      activityId: activity.id,
      type: 'Create',
    }
  } catch (error) {
    return {
      success: false,
      activityId: activity.id,
      type: 'Create',
      error: (error as Error).message,
    }
  }
}

/**
 * Обработать Update activity (обновление контента)
 */
async function handleUpdate(activity: UpdateActivity, prisma: PrismaClient): Promise<ActivityHandleResult> {
  const content = activity.object as VideoSeriesObject

  if (!content || !content.id) {
    return {
      success: false,
      activityId: activity.id,
      type: 'Update',
      error: 'Activity не содержит валидный object',
    }
  }

  try {
    const trackerUrl = extractTrackerUrl(activity.actor)
    const tracker = await prisma.tracker.findUnique({
      where: { url: trackerUrl },
    })

    if (!tracker) {
      return {
        success: false,
        activityId: activity.id,
        type: 'Update',
        error: `Трекер не найден: ${trackerUrl}`,
      }
    }

    // Обновляем существующую запись
    await prisma.federatedContent.updateMany({
      where: {
        trackerId: tracker.id,
        remoteId: content.id,
      },
      data: {
        contentJson: JSON.stringify(content),
        malId: content.externalIds?.mal ?? null,
        anilistId: content.externalIds?.anilist ?? null,
        shikimoriId: content.externalIds?.shikimori ?? null,
        anidbId: content.externalIds?.anidb ?? null,
      },
    })

    return {
      success: true,
      activityId: activity.id,
      type: 'Update',
    }
  } catch (error) {
    return {
      success: false,
      activityId: activity.id,
      type: 'Update',
      error: (error as Error).message,
    }
  }
}

/**
 * Обработать Delete activity (удаление контента)
 */
async function handleDelete(activity: DeleteActivity, prisma: PrismaClient): Promise<ActivityHandleResult> {
  const remoteId = activity.object

  if (!remoteId) {
    return {
      success: false,
      activityId: activity.id,
      type: 'Delete',
      error: 'Activity не содержит object',
    }
  }

  try {
    const trackerUrl = extractTrackerUrl(activity.actor)
    const tracker = await prisma.tracker.findUnique({
      where: { url: trackerUrl },
    })

    if (!tracker) {
      return {
        success: false,
        activityId: activity.id,
        type: 'Delete',
        error: `Трекер не найден: ${trackerUrl}`,
      }
    }

    // Удаляем запись
    await prisma.federatedContent.deleteMany({
      where: {
        trackerId: tracker.id,
        remoteId,
      },
    })

    // Обновляем счётчик
    await prisma.tracker.update({
      where: { id: tracker.id },
      data: { contentSynced: { decrement: 1 } },
    })

    return {
      success: true,
      activityId: activity.id,
      type: 'Delete',
    }
  } catch (error) {
    return {
      success: false,
      activityId: activity.id,
      type: 'Delete',
      error: (error as Error).message,
    }
  }
}

/**
 * Обработать Announce activity (объявление о сидировании)
 */
async function handleAnnounce(activity: AnnounceActivity, _prisma: PrismaClient): Promise<ActivityHandleResult> {
  // Announce activities пока просто логируем
  // В будущем можно использовать для агрегации сидеров
  log.info('Получен Announce', {
    cid: activity.object,
    peerId: activity['animatrona:peerId'],
    size: activity['animatrona:size'],
    actor: activity.actor,
  })

  return {
    success: true,
    activityId: activity.id,
    type: 'Announce',
  }
}

/**
 * Извлечь URL трекера из actor ID
 */
function extractTrackerUrl(actor: string): string {
  try {
    const url = new URL(actor)
    return url.origin
  } catch {
    return actor
  }
}
