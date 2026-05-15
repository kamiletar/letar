/**
 * Student Progress — Бизнес-логика валидации прогресса ученика
 *
 * Включает:
 * - Валидация теории ГИБДД (6 месяцев действия, интервалы пересдачи)
 * - Валидация практики (3 попытки + 6 мес cooldown)
 * - Проверка готовности к выдаче прав
 * - Расчет общего прогресса обучения
 */

export * from './license-readiness'
export * from './practice-validation'
export * from './progress-calculator'
export * from './theory-validation'
