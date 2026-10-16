import { z } from 'zod/v4'
import { QUESTION_BANK_VERSION } from '../_data/question-bank-version'

export const QUIZ_DRAFT_PREFIX = 'archetest_quiz_draft_v1:'
export type QuizMode = 'full' | 'express'

const questionSchema = z.object({
  id: z.string().min(1),
  scenario: z.string(),
  scenarioEn: z.string(),
  options: z.array(z.object({ text: z.string(), textEn: z.string(), scoring: z.record(z.string(), z.number()) })).min(1)
    .max(4),
})

const draftSchema = z.object({
  bankVersion: z.literal(QUESTION_BANK_VERSION),
  seed: z.number().int().min(1).max(2_000_000_000),
  phase: z.enum(['mood', 'quiz']),
  questions: z.array(questionSchema).min(1).max(100),
  currentIndex: z.number().int().min(0),
  answers: z.array(z.tuple([z.string(), z.number().int().min(0).max(3)])).max(100),
  skipped: z.array(z.string()).max(100),
  mood: z.object({ valence: z.number().int().min(1).max(3), energy: z.number().int().min(1).max(3) }).nullable(),
}).refine((draft) => {
  const byId = new Map(draft.questions.map((question) => [question.id, question]))
  const answeredIds = new Set(draft.answers.map(([id]) => id))
  return draft.currentIndex < draft.questions.length
    && byId.size === draft.questions.length
    && answeredIds.size === draft.answers.length
    && draft.answers.every(([id, option]) => option < (byId.get(id)?.options.length ?? 0))
    && draft.skipped.every((id) => byId.has(id) && !answeredIds.has(id))
})

export type QuizDraft = z.infer<typeof draftSchema>

export function quizDraftKey(mode: QuizMode, userId: string | null): string {
  return `${QUIZ_DRAFT_PREFIX}${mode}:${userId ? `user:${userId}` : 'guest'}`
}

/** Черновик — локальный, не очередь отправки; баллы на сервере всегда пересчитываются. */
export function readQuizDraft(mode: QuizMode, userId: string | null): QuizDraft | null {
  try {
    const raw = localStorage.getItem(quizDraftKey(mode, userId))
    if (!raw) { return null }
    const parsed = draftSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    // Повреждённое или недоступное хранилище не должно ломать прохождение.
    return null
  }
}

/** Пишем из обработчика события, чтобы выход сразу после клика не опередил эффект. */
export function saveQuizDraft(mode: QuizMode, userId: string | null, draft: QuizDraft): void {
  try {
    localStorage.setItem(quizDraftKey(mode, userId), JSON.stringify(draft))
  } catch {
    // При запрете браузерного хранилища тест остаётся доступным в текущей вкладке.
  }
}

export function clearQuizDraft(mode: QuizMode, userId: string | null): void {
  try {
    localStorage.removeItem(quizDraftKey(mode, userId))
  } catch {
    // Браузер может запрещать доступ к localStorage.
  }
}

/** После входа переносим только гостевой черновик, никогда не читаем другой аккаунт. */
export function restoreQuizDraft(mode: QuizMode, userId: string | null): QuizDraft | null {
  const own = readQuizDraft(mode, userId)
  if (own || !userId) { return own }
  const guest = readQuizDraft(mode, null)
  if (guest) {
    saveQuizDraft(mode, userId, guest)
    // Проверяем запись перед удалением: при переполнении хранилища ответы не потеряются.
    if (readQuizDraft(mode, userId)) { clearQuizDraft(mode, null) }
  }
  return guest
}
