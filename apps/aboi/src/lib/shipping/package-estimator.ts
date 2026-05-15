// Расчёт габаритов рулона обоев для СДЭК

const ROLL_WIDTH_M = 1.07 // ширина полотна, метры
const PAPER_THICKNESS_MM = 0.5 // толщина флизелина, мм
const CORE_DIAMETER_MM = 76 // стандартный сердечник 3"
const TUBE_LENGTH_MM = 1100 // длина коробки всегда 110 см
const WEIGHT_PER_METER_G = 350 // вес флизелина, г/м
const PACKAGING_WEIGHT_G = 300 // вес трубы + упаковки, г

export interface PackageDimensions {
  lengthMm: number
  widthMm: number
  heightMm: number
  weightG: number
}

/**
 * Оценивает внешние габариты коробки и вес для заказа обоев.
 * Формула диаметра рулона — промышленный стандарт для намотки:
 * outerRadius = sqrt(coreRadius² + (totalArea × thickness) / π)
 */
export function estimatePackage(totalMeters: number): PackageDimensions {
  const coreRadiusMm = CORE_DIAMETER_MM / 2
  // Общая площадь сечения намотанной бумаги (мм²)
  const totalAreaMm2 = totalMeters * (ROLL_WIDTH_M * 1000) * PAPER_THICKNESS_MM
  // Внешний радиус рулона
  const outerRadiusMm = Math.sqrt(coreRadiusMm ** 2 + totalAreaMm2 / Math.PI)
  // Диаметр + 20 мм запас для коробки
  const boxSideMm = Math.round(outerRadiusMm * 2) + 20
  const weightG = Math.round(totalMeters * WEIGHT_PER_METER_G + PACKAGING_WEIGHT_G)

  return {
    lengthMm: TUBE_LENGTH_MM,
    widthMm: boxSideMm,
    heightMm: boxSideMm,
    weightG,
  }
}

/** Конвертирует PackageDimensions в объект для CDEK API (вес в граммах, размеры в сантиметрах). */
export function toCdekPackage(dims: PackageDimensions, number?: string) {
  return {
    number,
    weight: dims.weightG,
    length: Math.ceil(dims.lengthMm / 10),
    width: Math.ceil(dims.widthMm / 10),
    height: Math.ceil(dims.heightMm / 10),
  }
}
