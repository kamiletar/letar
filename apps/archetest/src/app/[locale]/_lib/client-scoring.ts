import type { QuizQuestionDTO } from '../_actions/quiz.action'
import { ALL_SCALE_CODES, type PersonalityTypeCode } from '../_data/personality-types'

/**
 * Клиентский предварительный подсчёт нормализованных баллов (0–100) — общий для
 * полного квиза и экспресса. Даёт мгновенный UI до серверного ответа; авторитетный
 * пересчёт всегда делает сервер (calculateScores), клиентскому не доверяем.
 *
 * Формула (TZ v2): normalized[S] = raw[S] / actual_max[S] × 100, где actual_max[S] —
 * сумма максимумов балла шкалы S среди вариантов каждого отвеченного вопроса.
 */
export function computeClientScores(
  answers: Map<string, number>,
  questions: QuizQuestionDTO[],
): Record<PersonalityTypeCode, number> {
  const raw: Record<string, number> = {}
  const actualMax: Record<string, number> = {}
  for (const code of ALL_SCALE_CODES) {
    raw[code] = 0
    actualMax[code] = 0
  }

  const questionsMap = new Map(questions.map((q) => [q.id, q]))

  for (const [qId, optIndex] of answers) {
    const question = questionsMap.get(qId)
    if (!question) {
      continue
    }

    const option = question.options[optIndex]
    if (option) {
      for (const [code, score] of Object.entries(option.scoring)) {
        raw[code] = (raw[code] || 0) + score
      }
    }

    // actual_max: для каждой шкалы — максимум среди вариантов этого вопроса
    const qMax: Record<string, number> = {}
    for (const opt of question.options) {
      for (const [code, score] of Object.entries(opt.scoring)) {
        qMax[code] = Math.max(qMax[code] ?? 0, score)
      }
    }
    for (const [code, max] of Object.entries(qMax)) {
      actualMax[code] = (actualMax[code] ?? 0) + max
    }
  }

  const normalized: Record<string, number> = {}
  for (const code of ALL_SCALE_CODES) {
    const max = actualMax[code] ?? 0
    normalized[code] = max > 0 ? Math.round(((raw[code] || 0) / max) * 1000) / 10 : 0
  }
  return normalized as Record<PersonalityTypeCode, number>
}
