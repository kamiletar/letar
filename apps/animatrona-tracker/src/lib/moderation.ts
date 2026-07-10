/**
 * Чистая логика модерации аниме (только DB-операции).
 *
 * Не вызывает autoPinAnime и revalidatePath — это ответственность endpoint'а.
 * Используется в single `/moderate-anime/[id]` и batch `/moderate-anime/batch`.
 */

import type { getEnhancedPrisma } from './db'
import { invalidate } from './redis'

/** Действие модерации */
export type ModerationAction = 'approve' | 'reject' | 'approve_replacement'

/** Результат модерации одного аниме */
export interface ModerationResult {
  id: string
  success: boolean
  status?: string
  /** Нужна ли ревалидация кеша (при публикации/замене) */
  needsRevalidate?: boolean
  error?: string
}

/** Параметры для записи аудит-лога */
export interface ModerationLogParams {
  /** ID модератора, выполняющего действие */
  moderatorId: string
}

/**
 * Модерировать одно аниме — чистая DB-логика + запись аудит-лога.
 *
 * @param db - Enhanced Prisma Client с политиками доступа
 * @param id - ID аниме
 * @param action - Действие модерации
 * @param logParams - Параметры для записи лога (moderatorId)
 * @returns Результат с success/error
 */
export async function moderateOneAnime(
  db: ReturnType<typeof getEnhancedPrisma>,
  id: string,
  action: ModerationAction,
  logParams?: ModerationLogParams
): Promise<ModerationResult> {
  try {
    // Одобрить замену: новое → PUBLISHED, старое → HIDDEN
    if (action === 'approve_replacement') {
      const animeToApprove = await db.anime.findUnique({
        where: { id },
        select: { title: true, directoryCid: true, replacesAnimeId: true },
      })

      if (!animeToApprove) {
        return { id, success: false, error: 'Аниме не найдено' }
      }

      if (!animeToApprove.replacesAnimeId) {
        return { id, success: false, error: 'Это аниме не является кандидатом на замену' }
      }

      // Получаем directoryCid и pinnedOnId старого аниме
      const oldAnime = await db.anime.findUnique({
        where: { id: animeToApprove.replacesAnimeId },
        select: { directoryCid: true, pinnedOnId: true },
      })

      // Публикуем новое аниме, наследуя pinnedOnId со старого —
      // чтобы autoPinAnime пинил на тот же сервер
      const anime = await db.anime.update({
        where: { id },
        data: {
          status: 'PUBLISHED',
          ...(oldAnime?.pinnedOnId ? { pinnedOnId: oldAnime.pinnedOnId } : {}),
        },
      })

      // Скрываем старое аниме
      await db.anime.update({
        where: { id: animeToApprove.replacesAnimeId },
        data: { status: 'HIDDEN' },
      })

      // Мигрируем UserLibraryItems со старого аниме на новое —
      // чтобы десктоп-клиенты получили обновлённый directoryCid при sync
      const migratedItems = await db.userLibraryItem.findMany({
        where: { animeId: animeToApprove.replacesAnimeId },
        select: { id: true },
      })
      if (migratedItems.length > 0) {
        await db.userLibraryItem.updateMany({
          where: { animeId: animeToApprove.replacesAnimeId },
          data: { animeId: id },
        })
        console.warn(
          `[moderation] Мигрировано ${migratedItems.length} UserLibraryItem с ${animeToApprove.replacesAnimeId} → ${id}`
        )
      }

      // Записываем CidHistory если directoryCid изменился (для cleanup-old-pins)
      if (
        oldAnime?.directoryCid &&
        animeToApprove.directoryCid &&
        oldAnime.directoryCid !== animeToApprove.directoryCid
      ) {
        await db.cidHistory.create({
          data: {
            animeId: id,
            oldCid: oldAnime.directoryCid,
            newCid: animeToApprove.directoryCid,
          },
        })
      }

      // Записываем аудит-лог
      if (logParams) {
        await writeModerationLog(db, {
          action,
          animeId: id,
          animeTitle: animeToApprove.title,
          moderatorId: logParams.moderatorId,
          details: {
            previousStatus: 'PENDING',
            newStatus: 'PUBLISHED',
            replacedAnimeId: animeToApprove.replacesAnimeId,
            migratedLibraryItems: migratedItems.length,
          },
        })
      }

      // Инвалидируем Redis кэши (жанры, каталог, лидерборд, similar)
      await invalidateAnimeCache()

      return { id, success: true, status: anime.status, needsRevalidate: true }
    }

    // Получаем название для лога
    const animeData = logParams
      ? await db.anime.findUnique({ where: { id }, select: { title: true, status: true } })
      : null

    // Обычные действия: approve / reject
    const newStatus = action === 'approve' ? 'PUBLISHED' : 'REJECTED'
    const anime = await db.anime.update({
      where: { id },
      data: { status: newStatus },
    })

    // Записываем аудит-лог
    if (logParams && animeData) {
      await writeModerationLog(db, {
        action,
        animeId: id,
        animeTitle: animeData.title,
        moderatorId: logParams.moderatorId,
        details: {
          previousStatus: animeData.status,
          newStatus,
        },
      })
    }

    // Инвалидируем Redis при публикации
    if (action === 'approve') {
      await invalidateAnimeCache()
    }

    return {
      id,
      success: true,
      status: anime.status,
      needsRevalidate: action === 'approve',
    }
  } catch (err) {
    console.error(`[moderation] Ошибка аниме ${id}:`, err)
    return { id, success: false, error: err instanceof Error ? err.message : 'Ошибка БД' }
  }
}

/** Данные для записи лога */
interface LogEntry {
  action: string
  animeId: string
  animeTitle: string
  moderatorId: string
  details: Record<string, unknown>
}

/** Записать запись в аудит-лог модерации */
async function writeModerationLog(db: ReturnType<typeof getEnhancedPrisma>, entry: LogEntry): Promise<void> {
  try {
    await db.moderationLog.create({
      data: {
        action: entry.action,
        animeId: entry.animeId,
        animeTitle: entry.animeTitle,
        moderatorId: entry.moderatorId,
        details: JSON.stringify(entry.details),
      },
    })
  } catch (err) {
    // Ошибка лога не должна блокировать модерацию
    console.error('[moderation-log] Ошибка записи лога:', err)
  }
}

/** Инвалидировать все Redis-кэши связанные с аниме каталогом */
async function invalidateAnimeCache(): Promise<void> {
  await invalidate(
    'anime:genres',
    'anime:genres:catalog',
    'anime:total',
    'anime:latest',
    'anime:library-map',
    'anime:*:similar',
    'leaderboard:all',
    'api:anime:*'
  )
}
