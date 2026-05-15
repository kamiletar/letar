/**
 * Центральный экспорт всех утилит ИМОТ
 *
 * Этот файл экспортирует все утилиты для работы с методикой ИМОТ:
 * - Нумерология (расчет матрицы судьбы)
 * - Цветотип (определение цветового типа внешности)
 * - Интеграция (анализ точек пересечения между уровнями)
 * - Генерация плана трансформации
 */

// Нумерология
export {
  calculateNumerology,
  formatMatrixDescription,
  getArcanaInterpretation,
  type NumerologyMatrix,
} from './numerology'

// Цветотип
export {
  calculateColorType,
  getColorTypeQuestionnaire,
  getMakeupRecommendations,
  type ColorAnalysisInput,
  type ColorAnalysisResult,
} from './color-type'

// Анализ интеграции
export {
  analyzeIntegration,
  formatIntegrationReport,
  type ClientProfiles,
  type IntegrationAnalysis,
} from './integration-analysis'

// Генератор плана трансформации
export { formatPlanSummary, generatePlan, type GeneratedPlan } from './plan-generator'
