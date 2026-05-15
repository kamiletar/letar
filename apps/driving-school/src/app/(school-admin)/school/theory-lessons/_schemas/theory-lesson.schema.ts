import { z } from 'zod/v4'

import { TheoryLessonStatusFormSchema as TheoryLessonStatusSchema } from '@letar/driving-school-db/form-schemas/enums/TheoryLessonStatus.form'

// Схема для создания/редактирования занятия
export const TheoryLessonFormSchema = z
  .object({
    groupId: z
      .string()
      .min(1, 'Группа обязательна')
      .meta({
        ui: {
          title: 'Учебная группа',
          fieldType: 'select',
          description: 'Выберите группу для занятия',
        },
      }),
    topicId: z
      .string()
      .min(1, 'Тема обязательна')
      .meta({
        ui: {
          title: 'Тема занятия',
          fieldType: 'select',
          description: 'Выберите тему из программы',
        },
      }),
    scheduledAt: z.coerce.date({ message: 'Укажите дату и время' }).meta({
      ui: {
        title: 'Дата и время',
        fieldType: 'datetime',
        description: 'Когда проводится занятие',
      },
    }),
    duration: z.coerce
      .number()
      .int()
      .min(15, 'Минимум 15 минут')
      .max(480, 'Максимум 8 часов')
      .default(120)
      .meta({
        ui: {
          title: 'Длительность',
          placeholder: '120',
          fieldType: 'number',
          description: 'Продолжительность в минутах',
        },
      }),
    instructorId: z
      .string()
      .optional()
      .meta({
        ui: {
          title: 'Преподаватель',
          fieldType: 'select',
          description: 'Кто ведёт занятие',
        },
      }),
    location: z
      .string()
      .max(200, 'Максимум 200 символов')
      .optional()
      .meta({
        ui: {
          title: 'Место проведения',
          placeholder: 'Аудитория 101',
          description: 'Где проводится занятие',
        },
      }),
  })
  .strip()

export type TheoryLessonFormData = z.infer<typeof TheoryLessonFormSchema>

// Схема для отмены занятия
export const CancelLessonSchema = z
  .object({
    lessonId: z.string().min(1),
    reason: z
      .string()
      .min(1, 'Укажите причину отмены')
      .max(500, 'Максимум 500 символов')
      .meta({
        ui: {
          title: 'Причина отмены',
          placeholder: 'Укажите причину...',
          fieldType: 'textarea',
        },
      }),
  })
  .strip()

export type CancelLessonData = z.infer<typeof CancelLessonSchema>

// Схема для переноса занятия
export const RescheduleLessonSchema = z
  .object({
    lessonId: z.string().min(1),
    newScheduledAt: z.coerce.date({ message: 'Укажите новую дату и время' }).meta({
      ui: {
        title: 'Новая дата и время',
        fieldType: 'datetime',
      },
    }),
  })
  .strip()

export type RescheduleLessonData = z.infer<typeof RescheduleLessonSchema>

// Схема для изменения статуса занятия
export const UpdateLessonStatusSchema = z
  .object({
    lessonId: z.string().min(1),
    status: TheoryLessonStatusSchema.meta({
      ui: {
        title: 'Статус',
        fieldType: 'select',
      },
    }),
  })
  .strip()

export type UpdateLessonStatusData = z.infer<typeof UpdateLessonStatusSchema>
