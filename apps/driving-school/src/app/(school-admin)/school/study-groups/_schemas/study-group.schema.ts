import { z } from 'zod/v4'

import { LessonScheduleSchema } from '@/lib/lesson-schedule'
import { LicenseCategoryFormSchema as LicenseCategorySchema } from '@letar/driving-school-db/form-schemas/enums/LicenseCategory.form'
import { StudyGroupScheduleFormSchema as StudyGroupScheduleSchema } from '@letar/driving-school-db/form-schemas/enums/StudyGroupSchedule.form'

/**
 * Схема формы для создания/редактирования учебной группы
 */
export const StudyGroupFormSchema = z
  .object({
    // Название группы (обязательное)
    name: z
      .string()
      .transform((val) => val.trim())
      .pipe(
        z
          .string()
          .min(1, { message: 'Введите название группы' })
          .max(100, { message: 'Название не должно превышать 100 символов' })
      )
      .meta({
        ui: {
          title: 'Название группы',
          placeholder: 'Группа B-1 январь 2024',
          description: 'Уникальное название для идентификации группы',
        },
      }),

    // Тип расписания (обязательное)
    schedule: StudyGroupScheduleSchema.meta({
      ui: {
        title: 'Тип расписания',
        fieldType: 'select',
        description: 'Как часто проходят занятия',
      },
    }),

    // Категории прав (минимум 1, теория может быть общей для A и B)
    categories: z
      .array(LicenseCategorySchema)
      .min(1, { message: 'Выберите хотя бы одну категорию' })
      .meta({
        ui: {
          title: 'Категории прав',
          fieldType: 'listbox',
          description: 'Для каких категорий группа',
        },
      }),

    // Дата начала обучения (обязательное)
    startDate: z
      .union([z.string(), z.date()])
      .transform((val) => {
        if (typeof val === 'string') {
          const date = new Date(val)
          if (isNaN(date.getTime())) {
            return null
          }
          return date
        }
        return val
      })
      .pipe(z.date({ message: 'Укажите дату начала обучения' }))
      .meta({
        ui: {
          title: 'Дата начала',
          fieldType: 'date',
          description: 'Когда начинается обучение',
        },
      }),

    // Дата окончания (опциональное)
    endDate: z
      .union([z.string(), z.date(), z.literal('')])
      .optional()
      .transform((val) => {
        if (!val || val === '') {
          return undefined
        }
        if (typeof val === 'string') {
          const date = new Date(val)
          if (isNaN(date.getTime())) {
            return undefined
          }
          return date
        }
        return val
      })
      .meta({
        ui: {
          title: 'Дата окончания',
          fieldType: 'date',
          description: 'Планируемая дата завершения',
        },
      }),

    // Расписание занятий по дням (JSON)
    lessonSchedule: z
      .union([z.string(), LessonScheduleSchema])
      .transform((val) => {
        if (typeof val === 'string') {
          try {
            return JSON.parse(val)
          } catch {
            return {}
          }
        }
        return val
      })
      .pipe(LessonScheduleSchema)
      .meta({
        ui: {
          title: 'Расписание занятий',
          description: 'Дни и время проведения занятий',
        },
      }),

    // Учебный класс (опциональное)
    classroomId: z
      .string()
      .optional()
      .meta({
        ui: {
          title: 'Учебный класс',
          fieldType: 'select',
          description: 'Филиал с типом «Учебный класс»',
        },
      }),

    // Часы теории (опциональное)
    theoryHours: z.coerce
      .number({ message: 'Введите корректное количество' })
      .int({ message: 'Количество должно быть целым числом' })
      .min(1, { message: 'Минимум 1 час' })
      .max(500, { message: 'Максимум 500 часов' })
      .optional()
      .meta({
        ui: {
          title: 'Часы теории',
          placeholder: '130',
          fieldType: 'number',
          description: 'Общее количество часов теории для группы',
        },
      }),

    // Максимальное количество учеников (обязательное)
    maxStudents: z.coerce
      .number({ message: 'Введите корректное количество' })
      .int({ message: 'Количество должно быть целым числом' })
      .min(1, { message: 'Минимум 1 ученик' })
      .max(100, { message: 'Максимум 100 учеников' })
      .meta({
        ui: {
          title: 'Макс. учеников',
          placeholder: '25',
          fieldType: 'number',
          description: 'Максимальное количество мест в группе',
        },
      }),

    // ID организации (скрытое поле)
    organizationId: z.string().min(1, { message: 'Не указана школа' }),
  })
  .strip()

export type StudyGroupFormData = z.infer<typeof StudyGroupFormSchema>

/**
 * Схема для добавления участника в группу
 */
export const AddMemberToGroupSchema = z
  .object({
    groupId: z.string().min(1, { message: 'Не указана группа' }),
    userId: z.string().min(1, { message: 'Не указан пользователь' }),
  })
  .strip()

export type AddMemberToGroupData = z.infer<typeof AddMemberToGroupSchema>

/**
 * Схема для массового добавления участников
 */
export const BulkAddMembersSchema = z
  .object({
    groupId: z.string().min(1, { message: 'Не указана группа' }),
    userIds: z.array(z.string()).min(1, { message: 'Выберите хотя бы одного ученика' }),
  })
  .strip()

export type BulkAddMembersData = z.infer<typeof BulkAddMembersSchema>

/**
 * Схема для удаления участника из группы
 */
export const RemoveMemberFromGroupSchema = z
  .object({
    memberId: z.string().min(1, { message: 'Не указан участник' }),
  })
  .strip()

export type RemoveMemberFromGroupData = z.infer<typeof RemoveMemberFromGroupSchema>
