import { z } from 'zod/v4'

import { LicenseCategoryFormSchema as LicenseCategorySchema } from '@letar/driving-school-db/form-schemas/enums/LicenseCategory.form'
import { TheoryFormatFormSchema as TheoryFormatSchema } from '@letar/driving-school-db/form-schemas/enums/TheoryFormat.form'
import { TransmissionTypeFormSchema as TransmissionTypeSchema } from '@letar/driving-school-db/form-schemas/enums/TransmissionType.form'

// Схема для создания/редактирования курса
export const CourseFormSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Название должно содержать минимум 2 символа')
      .meta({ ui: { title: 'Название курса', placeholder: 'Категория B АКПП' } }),

    category: LicenseCategorySchema.meta({ ui: { title: 'Категория ВУ' } }),

    transmissionType: TransmissionTypeSchema.nullable()
      .optional()
      .meta({ ui: { title: 'Тип трансмиссии' } }),

    practiceLessons: z
      .number()
      .min(1, 'Минимум 1 занятие')
      .meta({ ui: { title: 'Кол-во практических занятий', placeholder: '56' } }),

    lessonDuration: z
      .number()
      .min(30, 'Минимум 30 минут')
      .max(180, 'Максимум 180 минут')
      .default(90)
      .meta({ ui: { title: 'Длительность занятия (мин)', placeholder: '90' } }),

    theoryFormat: TheoryFormatSchema.meta({ ui: { title: 'Формат теории' } }),

    theoryHours: z
      .number()
      .min(0)
      .nullable()
      .optional()
      .meta({ ui: { title: 'Часов теории', placeholder: '190' } }),

    price: z
      .number()
      .min(0, 'Цена не может быть отрицательной')
      .meta({ ui: { title: 'Стоимость (руб)', placeholder: '45000' } }),

    description: z
      .string()
      .nullable()
      .optional()
      .meta({ ui: { title: 'Описание', placeholder: 'Полный курс обучения вождению...' } }),
  })
  .strip()

export type CourseFormData = z.infer<typeof CourseFormSchema>
