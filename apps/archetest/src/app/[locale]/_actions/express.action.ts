'use server'

import { getEnhancedPrisma } from '@/lib/db'
import { isValidityQuestion } from '../_data/validity-checks'
import { selectExpressQuestions } from '../_lib/express-select'
import type { QuizOptionData } from '../_lib/scoring-core'
import { fisherYatesShuffle } from '../_lib/stratified-shuffle'
import type { QuizQuestionDTO } from './quiz.action'

/**
 * Получить вопросы экспресс-теста (этап 5.3): ровно 3 вопроса на каждую из
 * 8 шкал гексаграммы = 24 вопроса. Гостевой режим — авторизация не требуется,
 * ничего не пишем на сервер (результаты живут в localStorage у клиента).
 *
 * Attention-check вопросы в экспресс не инжектятся: 24 вопроса слишком мало,
 * чтобы жертвовать покрытием шкал на проверки валидности.
 */
export async function getExpressQuestionsAction(): Promise<QuizQuestionDTO[]> {
  const db = getEnhancedPrisma()

  const questions = await db.quizQuestion.findMany({
    where: { active: true },
    select: { id: true, scenario: true, scenarioEn: true, options: true, sortOrder: true },
  })

  const pool = questions.filter((q) => !isValidityQuestion(q.sortOrder))
  const selected = selectExpressQuestions(pool)

  // Финальное перемешивание — чтобы вопросы одной шкалы не шли подряд
  return fisherYatesShuffle([...selected]).map((q) => ({
    id: q.id,
    scenario: q.scenario,
    scenarioEn: q.scenarioEn,
    options: JSON.parse(q.options) as QuizOptionData[],
  }))
}
