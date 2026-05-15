/**
 * Метки для ENUM'ов Kami
 *
 * Реэкспорт из сгенерированных схем + дополнительные утилиты
 */

import type { LearningStatus } from '@/generated/prisma'

// Реэкспорт generated labels (авто-генерация из doc-комментариев в schema.zmodel)
export { LearningItemTypeLabels } from '@/generated/form-schemas/enums/LearningItemType.form'
export { LearningStatusLabels } from '@/generated/form-schemas/enums/LearningStatus.form'
export { SkillLevelLabels } from '@/generated/form-schemas/enums/SkillLevel.form'
export { SurveyQuestionTypeLabels } from '@/generated/form-schemas/enums/SurveyQuestionType.form'
export { UserRoleLabels } from '@/generated/form-schemas/enums/UserRole.form'

/** Цвета статусов обучения для Badge */
export const LearningStatusColors: Record<LearningStatus, string> = {
  WANT_TO_LEARN: 'purple',
  IN_PROGRESS: 'blue',
  COMPLETED: 'green',
  ABANDONED: 'gray',
}
