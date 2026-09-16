/**
 * Пределы NVENC-обёртки ffmpeg, которые видит пользователь
 *
 * Общие для main (сборка аргументов) и renderer (форма профиля).
 * Замерено на ffmpeg N-124496 (2026-05) + драйвер 616.92, RTX 5080 Laptop.
 */

/**
 * Жёсткий потолок поверхностей в libavcodec/nvenc.c (MAX_REGISTERED_FRAMES).
 * `-surfaces 64` предел не поднимает: ffmpeg пишет «increasing used surfaces 64 -> 263»
 * и тут же обрезает обратно до 64.
 */
export const NVENC_MAX_SURFACES = 64

/**
 * Сколько кадров lookahead ffmpeg реально применит при данном числе B-кадров.
 *
 * nvenc.c: `min(surfaces, delay) − frameIntervalP − 4`, где delay ≤ surfaces − 1, а
 * frameIntervalP = B-кадры + 1. Больше этого ffmpeg молча режет с предупреждением
 * «Clipping lookahead depth to N (from M) due to lack of surfaces/delay».
 */
export function nvencLookaheadLimit(bFrames: number): number {
  return NVENC_MAX_SURFACES - 1 - (bFrames + 1) - 4
}

/**
 * Lookahead встроенных GPU-профилей.
 *
 * AV1 с tune UHQ по умолчанию берёт 7 B-кадров → предел 51. У AV1 HQ (5 B-кадров) предел 53,
 * у HEVC HQ (3 B-кадра) — 55, так что 51 применяется целиком во всех встроенных профилях.
 * Прежние 250 ffmpeg всё равно обрезал до 51–55.
 */
export const NVENC_BUILT_IN_LOOKAHEAD = nvencLookaheadLimit(7)

/** Верхняя граница поля lookahead в форме: больше не применится ни при каком числе B-кадров */
export const NVENC_LOOKAHEAD_UI_MAX = nvencLookaheadLimit(0)

/** Подсказка к полю lookahead в форме профиля */
export const NVENC_LOOKAHEAD_HELPER_TEXT =
  `ffmpeg применяет не больше ${nvencLookaheadLimit(7)}–${NVENC_LOOKAHEAD_UI_MAX} кадров: `
  + `предел зависит от числа B-кадров (AV1 UHQ — ${nvencLookaheadLimit(7)})`

/** Подсказка к переключателю временного фильтра (замер 2026-09-16: BDRip и WEB-DL, CQ 20–32, PLAN.md) */
export const NVENC_TEMPORAL_FILTER_HELPER_TEXT =
  'Только Blackwell (RTX 50): файл на 5–13% меньше при том же CQ, VMAF почти не меняется, кодирование до ~20% дольше'
