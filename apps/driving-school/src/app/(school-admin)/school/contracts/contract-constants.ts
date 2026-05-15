/**
 * Константы для модуля контрактов.
 *
 * Маппинги типов шаблонов и статусов договоров — используются
 * на страницах списка шаблонов, генерации и просмотра договоров.
 */

/** Русские названия типов шаблонов */
export const TEMPLATE_TYPE_LABELS: Record<string, string> = {
  TRAINING_CONTRACT: 'Договор на обучение',
  THEORY_CONTRACT: 'Договор на теорию',
  PRACTICE_CONTRACT: 'Договор на практику',
  CUSTOM: 'Произвольный',
}

/** Цвета Badge для типов шаблонов */
export const TEMPLATE_TYPE_COLORS: Record<string, 'blue' | 'green' | 'orange' | 'gray'> = {
  TRAINING_CONTRACT: 'blue',
  THEORY_CONTRACT: 'green',
  PRACTICE_CONTRACT: 'orange',
  CUSTOM: 'gray',
}
