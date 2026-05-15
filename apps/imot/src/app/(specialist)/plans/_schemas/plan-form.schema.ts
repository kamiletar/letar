import { TransformationStageFormSchema as TransformationStageSchema } from '@/generated/form-schemas/enums/TransformationStage.form'
import { z } from 'zod/v4'

/**
 * Схема валидации для формы создания/редактирования плана трансформации.
 * Использует .strip() для обработки React Server Actions service fields.
 */
export const PlanFormSchema = z
  .object({
    clientId: z.string().min(1, 'Клиент обязателен для выбора'),
    currentStage: TransformationStageSchema.default('DIAGNOSTICS'),

    // Основной запрос клиента
    primaryRequest: z.string().min(1, 'Основной запрос клиента обязателен'),
    changeReason: z.string().optional(), // Причина изменения запроса (если редактируется)

    // Описания по этапам
    diagnosticsDescription: z.string().optional(),
    integrationDescription: z.string().optional(),
    strategyDescription: z.string().optional(),
    practiceDescription: z.string().optional(),
    expectedResults: z.string().optional(),

    // Ключевые точки и приоритеты (JSON массивы хранятся как строки)
    keyPoints: z.string().optional(),
    priorities: z.string().optional(),

    // Временные рамки
    startDate: z.string().optional(), // ISO string для date input
    expectedEndDate: z.string().optional(), // ISO string для date input

    // Статус
    isActive: z.boolean().default(true),
    isCompleted: z.boolean().default(false),

    notes: z.string().optional(),
  })
  .strip()

export type PlanFormData = z.infer<typeof PlanFormSchema>
