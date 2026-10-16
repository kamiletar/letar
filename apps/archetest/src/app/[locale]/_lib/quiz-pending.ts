import { z } from 'zod/v4'
import { PENDING_QUIZ_KEY } from './storage-keys'

const pendingSchema = z.object({
  completed: z.literal(true),
  userId: z.string().nullable().optional(),
  mode: z.enum(['full', 'express']).default('full'),
  seed: z.number().int().min(1).max(2_000_000_000),
  answers: z.array(z.object({ questionId: z.string().min(1), selectedOption: z.number().int().min(0).max(3) }))
    .min(1).max(100),
  skipped: z.array(z.string()).max(100).default([]),
  mood: z.object({ valence: z.number().min(1).max(3), energy: z.number().min(1).max(3) }).nullable().default(null),
  locale: z.enum(['ru', 'en']).optional(),
  // Только предварительный показ: при сохранении сервер заново считает баллы из ответов.
  previewScores: z.record(z.string(), z.number().min(0).max(100)).optional(),
})

export type PendingQuiz = z.infer<typeof pendingSchema>

/** Чужой результат нельзя ни показывать, ни переносить в текущий аккаунт. */
export function readPendingQuiz(userId: string | null): PendingQuiz | null {
  try {
    const raw = sessionStorage.getItem(PENDING_QUIZ_KEY)
    const parsed = pendingSchema.safeParse(raw ? JSON.parse(raw) : null)
    if (!parsed.success) { return null }
    return parsed.data.userId && parsed.data.userId !== userId ? null : parsed.data
  } catch {
    return null
  }
}

export function savePendingQuiz(pending: PendingQuiz): void {
  try {
    sessionStorage.setItem(PENDING_QUIZ_KEY, JSON.stringify(pending))
  } catch {
    // При недоступном хранилище текущий экран результатов остаётся доступен.
  }
}
