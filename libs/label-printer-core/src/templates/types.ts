/**
 * Типы для TSX шаблонов этикеток
 */

/**
 * Информация о товаре для шаблона
 */
export interface ProductInfo {
  /** Название товара */
  name: string
  /** Артикул */
  articleCode?: string
  /** Состав */
  composition?: string
  /** Цвет */
  color?: string
  /** Размер */
  size?: string
  /** Производитель */
  manufacturer?: string
}

/**
 * Данные для генерации этикетки
 */
export interface LabelData {
  /** Информация о товаре */
  product: ProductInfo
  /** DataMatrix код (base64 PNG) */
  dataMatrixBase64: string
  /** GTIN штрих-код (base64 PNG) */
  gtinBarcodeBase64: string
  /** GTIN-13 для отображения */
  gtin13?: string
}

/**
 * Размеры этикетки
 */
export interface LabelDimensions {
  width: number
  height: number
}

/**
 * Конфигурация шаблона
 */
export interface TemplateConfig {
  /** Название шаблона */
  name: string
  /** Описание */
  description?: string
  /** Размеры */
  dimensions: LabelDimensions
}
