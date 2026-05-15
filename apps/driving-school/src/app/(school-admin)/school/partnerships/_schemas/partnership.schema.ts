'use strict'

import { z } from 'zod/v4'

import { LicenseCategoryFormSchema } from '@letar/driving-school-db/form-schemas/enums/LicenseCategory.form'

// Схема для создания запроса на партнёрство
export const CreatePartnershipSchema = z
  .object({
    partnerOrgId: z
      .string()
      .min(1, 'Выберите школу-партнёра')
      .meta({ ui: { title: 'Школа-партнёр' } }),

    terms: z
      .string()
      .nullable()
      .optional()
      .meta({
        ui: {
          title: 'Условия партнёрства',
          placeholder: 'Опишите условия сотрудничества',
          fieldType: 'textarea',
        },
      }),

    expiresAt: z
      .string() // ISO date string
      .nullable()
      .optional()
      .meta({ ui: { title: 'Срок действия' } }),

    // Категории при создании
    categories: z
      .array(
        z.object({
          category: LicenseCategoryFormSchema.meta({ ui: { title: 'Категория' } }),
          pricePerLesson: z
            .number()
            .min(0, 'Цена не может быть отрицательной')
            .nullable()
            .optional()
            .meta({ ui: { title: 'Цена за занятие', placeholder: '2000' } }),
          notes: z
            .string()
            .nullable()
            .optional()
            .meta({ ui: { title: 'Примечания', fieldType: 'textarea' } }),
        })
      )
      .min(1, 'Добавьте хотя бы одну категорию')
      .meta({ ui: { title: 'Категории партнёрства' } }),
  })
  .strip()

export type CreatePartnershipData = z.infer<typeof CreatePartnershipSchema>

// Схема для ответа на запрос партнёрства (принять/отклонить)
export const RespondPartnershipSchema = z
  .object({
    partnershipId: z.string().min(1, 'ID партнёрства обязателен'),
    accept: z.boolean(),
  })
  .strip()

export type RespondPartnershipData = z.infer<typeof RespondPartnershipSchema>

// Схема для обновления партнёрства (расторжение, приостановка)
export const UpdatePartnershipStatusSchema = z
  .object({
    partnershipId: z.string().min(1, 'ID партнёрства обязателен'),
    action: z.enum(['suspend', 'resume', 'terminate']),
    reason: z
      .string()
      .nullable()
      .optional()
      .meta({ ui: { title: 'Причина', placeholder: 'Укажите причину' } }),
  })
  .strip()

export type UpdatePartnershipStatusData = z.infer<typeof UpdatePartnershipStatusSchema>

// Схема для добавления категории к существующему партнёрству
export const AddPartnershipCategorySchema = z
  .object({
    partnershipId: z.string().min(1),
    category: LicenseCategoryFormSchema.meta({ ui: { title: 'Категория' } }),
    pricePerLesson: z
      .number()
      .min(0, 'Цена не может быть отрицательной')
      .nullable()
      .optional()
      .meta({ ui: { title: 'Цена за занятие', placeholder: '2000' } }),
    notes: z
      .string()
      .nullable()
      .optional()
      .meta({ ui: { title: 'Примечания', fieldType: 'textarea' } }),
  })
  .strip()

export type AddPartnershipCategoryData = z.infer<typeof AddPartnershipCategorySchema>

// Схема для обновления категории партнёрства
export const UpdatePartnershipCategorySchema = z
  .object({
    categoryId: z.string().min(1),
    pricePerLesson: z.number().min(0).nullable().optional(),
    isActive: z.boolean().optional(),
    notes: z.string().nullable().optional(),
  })
  .strip()

export type UpdatePartnershipCategoryData = z.infer<typeof UpdatePartnershipCategorySchema>
