/**
 * EventEmitter для событий сохранения прогресса просмотра с мобильного
 *
 * Позволяет main process уведомлять renderer об изменениях,
 * сделанных через мобильный сервер (без перезагрузки страницы).
 */

import { EventEmitter } from 'events'

export interface MobileProgressSavedEvent {
  animeId: string
  episodeId: string
}

export const mobileProgressEvents = new EventEmitter()
