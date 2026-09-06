/**
 * Утилиты для покадровой перемотки на паузе
 */

import type Shaka from 'shaka-player'

/** Сколько кадров пропускаем за одно нажатие клавиши/клик кнопки */
export const FRAME_STEP_COUNT = 5

/** Fallback fps, если Shaka Player не сообщил реальный frameRate активной дорожки */
const FALLBACK_FPS = 24

/**
 * Реальный fps активной видео-дорожки из Shaka Player.
 * Возвращает FALLBACK_FPS, если плеер не готов или дорожка не сообщает frameRate
 * (не все контейнеры/манифесты его содержат).
 */
export function getShakaFrameRate(player: Shaka.Player | null): number {
  if (!player) {
    return FALLBACK_FPS
  }

  try {
    const activeTrack = player.getVariantTracks().find((track) => track.active)
    return activeTrack?.frameRate || FALLBACK_FPS
  } catch {
    return FALLBACK_FPS
  }
}
