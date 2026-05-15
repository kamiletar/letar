import { z } from 'zod/v4'

// === Схемы для валидации входных данных ГИБДД экзаменов ===

// Проверка готовности к теории
export const CheckGibddTheoryReadinessSchema = z
  .object({
    progressId: z.string().min(1, 'ID прогресса обязателен'),
  })
  .strip()

export type CheckGibddTheoryReadinessInput = z.infer<typeof CheckGibddTheoryReadinessSchema>

// Запись на экзамен теории ГИБДД
export const ScheduleGibddTheoryExamSchema = z
  .object({
    progressId: z.string().min(1, 'ID прогресса обязателен'),
    sessionId: z.string().min(1, 'ID сессии обязателен'),
    note: z.string().optional(),
  })
  .strip()

export type ScheduleGibddTheoryExamInput = z.infer<typeof ScheduleGibddTheoryExamSchema>

// Результат экзамена теории ГИБДД
export const RecordGibddTheoryResultSchema = z
  .object({
    registrationId: z.string().min(1, 'ID регистрации обязателен'),
    result: z.enum(['PASSED', 'FAILED', 'NO_SHOW']),
    notes: z.string().optional(),
  })
  .strip()

export type RecordGibddTheoryResultInput = z.infer<typeof RecordGibddTheoryResultSchema>

// Проверка готовности к практике
export const CheckGibddPracticeReadinessSchema = z
  .object({
    categoryProgressId: z.string().min(1, 'ID прогресса по категории обязателен'),
  })
  .strip()

export type CheckGibddPracticeReadinessInput = z.infer<typeof CheckGibddPracticeReadinessSchema>

// Запись на экзамен практики ГИБДД
export const ScheduleGibddPracticeExamSchema = z
  .object({
    categoryProgressId: z.string().min(1, 'ID прогресса по категории обязателен'),
    sessionId: z.string().min(1, 'ID сессии обязателен'),
    escortRequired: z.boolean().optional(),
    escortAmount: z.number().positive().optional(),
    note: z.string().optional(),
  })
  .strip()

export type ScheduleGibddPracticeExamInput = z.infer<typeof ScheduleGibddPracticeExamSchema>

// Результат экзамена практики ГИБДД
export const RecordGibddPracticeResultSchema = z
  .object({
    registrationId: z.string().min(1, 'ID регистрации обязателен'),
    result: z.enum(['PASSED', 'FAILED', 'NO_SHOW']),
    escortRequired: z.boolean().optional(),
    escortPaid: z.boolean().optional(),
    escortAmount: z.number().positive().optional(),
    notes: z.string().optional(),
  })
  .strip()

export type RecordGibddPracticeResultInput = z.infer<typeof RecordGibddPracticeResultSchema>

// Получение попыток ГИБДД
export const GetGibddAttemptsSchema = z
  .object({
    progressId: z.string().min(1, 'ID прогресса обязателен'),
    type: z.enum(['theory', 'practice']).optional(),
  })
  .strip()

export type GetGibddAttemptsInput = z.infer<typeof GetGibddAttemptsSchema>
