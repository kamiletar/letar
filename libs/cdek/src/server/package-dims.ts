// Конвертация габаритов посылки из мм/г в формат СДЭК (см/г) — общая тонкая часть для всех
// приложений, считающих упаковку в миллиметрах. Сама формула оценки веса/размеров
// (намотка листов в рулон у aboi, суммирование объёмов коробок у svoichuzhie) товароспецифична
// и остаётся в приложениях (§23 PLAN-INFRA-1.md) — сюда поднят только последний шаг.

import type { CdekPackageDims } from './cdek-types'

export interface MmPackageDims {
  lengthMm: number
  widthMm: number
  heightMm: number
  weightG: number
}

/** Переводит габариты из мм/г в CdekPackageDims (см/г), округляя размеры вверх — СДЭК не принимает дробные см. */
export function mmToCdekPackageDims(dims: MmPackageDims): CdekPackageDims {
  return {
    weight: dims.weightG,
    length: Math.ceil(dims.lengthMm / 10),
    width: Math.ceil(dims.widthMm / 10),
    height: Math.ceil(dims.heightMm / 10),
  }
}
