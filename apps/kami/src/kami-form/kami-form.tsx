'use client'

/**
 * KamiForm — расширенный Form компонент для Kami
 *
 * Включает 5 Select компонентов для ENUM'ов:
 * - UserRole, SkillLevel, LearningItemType, LearningStatus, SurveyQuestionType
 *
 * @example
 * ```tsx
 * import { KamiForm } from '@/kami-form'
 *
 * <KamiForm initialValue={data} onSubmit={handleSubmit}>
 *   <KamiForm.Field.String name="title" label="Название" />
 *   <KamiForm.Select.UserRole name="role" label="Роль" />
 *   <KamiForm.Select.SkillLevel name="level" label="Уровень" />
 *   <KamiForm.Select.LearningItemType name="type" label="Тип" />
 *   <KamiForm.Select.LearningStatus name="status" label="Статус" />
 *   <KamiForm.Select.SurveyQuestionType name="questionType" label="Тип вопроса" />
 *   <KamiForm.Button.Submit>Сохранить</KamiForm.Button.Submit>
 * </KamiForm>
 * ```
 */

import { createForm } from '@letar/forms'

// Select компоненты для ENUM'ов
import {
  SelectLearningItemType,
  SelectLearningStatus,
  SelectSkillLevel,
  SelectSurveyQuestionType,
  SelectUserRole,
} from './selects'

export const KamiForm = createForm({
  extraSelects: {
    UserRole: SelectUserRole,
    SkillLevel: SelectSkillLevel,
    LearningItemType: SelectLearningItemType,
    LearningStatus: SelectLearningStatus,
    SurveyQuestionType: SelectSurveyQuestionType,
  },
})
