/**
 * Утилиты для покадровой перемотки на паузе
 */

/** Сколько кадров пропускаем за одно нажатие клавиши/клик кнопки */
export const FRAME_STEP_COUNT = 5

/** Fallback fps, если Shaka Player не сообщил реальный frameRate активной дорожки */
const FALLBACK_FPS = 24

/**
 * Минимальная часть API Shaka Player, нужная для определения fps активной дорожки.
 * Не привязано к нominal-типу `shaka.Player`, чтобы принимать и упрощённые
 * структурные обёртки над плеером (например частично типизированный `playerRef`).
 */
export interface ShakaFrameRateSource {
  getVariantTracks: () => { active: boolean; frameRate: number | null }[]
}

/**
 * Реальный fps активной видео-дорожки из Shaka Player.
 * Возвращает FALLBACK_FPS, если плеер не готов или дорожка не сообщает frameRate
 * (не все контейнеры/манифесты его содержат).
 */
export function getShakaFrameRate(player: ShakaFrameRateSource | null | undefined): number {
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
