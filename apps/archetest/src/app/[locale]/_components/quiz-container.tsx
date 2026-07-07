'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Box, Button, Container, Heading, Text, VStack } from '@chakra-ui/react'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { QuizProgress, QuizQuestionDTO, ScaleConfidence } from '../_actions/quiz.action'
import { getRandomQuestionsAction, submitQuizAction } from '../_actions/quiz.action'
import { ACHIEVEMENTS_MAP } from '../_data/achievements'
import type { PersonalityTypeCode } from '../_data/personality-types'
import { computeClientScores } from '../_lib/client-scoring'
import { shuffleWithSeed } from '../_lib/seeded-shuffle'
import { PENDING_QUIZ_KEY } from '../_lib/storage-keys'
import type { MoodValue } from './mood-check-in'
import { MoodCheckIn } from './mood-check-in'
import { QuizIntro } from './quiz-intro'
import { QuizProgressBar } from './quiz-progress-bar'
import { QuizQuestionCard } from './quiz-question-card'
import { QuizResults } from './quiz-results'

/** Формат данных для sessionStorage */
interface PendingQuiz {
  seed: number
  answers: { questionId: string; selectedOption: number }[]
  /** Пропущенные вопросы (видел и осознанно пропустил) */
  skipped: string[]
  /** Mood check-in перед сессией (этап 5.9.2), null если пропущен */
  mood: MoodValue | null
}

const STORAGE_KEY = PENDING_QUIZ_KEY

type QuizState = 'intro' | 'mood' | 'quiz' | 'submitting' | 'results' | 'loading_more'

interface QuizContainerProps {
  questions: QuizQuestionDTO[]
  isAuthenticated: boolean
  initialProgress: QuizProgress | null
  /** Дисклеймер уже принят (из БД) */
  initialDisclaimerAccepted?: boolean
}

export function QuizContainer({
  questions,
  isAuthenticated,
  initialProgress,
  initialDisclaimerAccepted,
}: QuizContainerProps) {
  const t = useTranslations('quiz')
  const locale = useLocale()
  const isRu = locale === 'ru'

  const [state, setState] = useState<QuizState>('intro')
  const [seed, setSeed] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Map<string, number>>(new Map())
  /** Пропущенные вопросы (видел и осознанно пропустил) */
  const [skipped, setSkipped] = useState<Set<string>>(new Set())
  /** Mood check-in перед сессией (этап 5.9.2), null если пропущен */
  const [mood, setMood] = useState<MoodValue | null>(null)
  /** Показано ли мягкое напоминание о пропусках */
  const [skipReminderShown, setSkipReminderShown] = useState(false)
  const [scores, setScores] = useState<Record<PersonalityTypeCode, number> | null>(null)
  /** Достоверность шкал (от сервера) */
  const [confidence, setConfidence] = useState<Record<PersonalityTypeCode, ScaleConfidence> | null>(null)
  const [averagedScores, setAveragedScores] = useState<Record<PersonalityTypeCode, number> | null>(
    initialProgress?.averagedScores ?? null
  )
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [newAchievements, setNewAchievements] = useState<string[]>([])
  const [rankInfo, setRankInfo] = useState<{ rankCode: string; xp: number } | null>(null)
  /** Прогресс (обновляется после каждого сабмита) */
  const [progress, setProgress] = useState<QuizProgress | null>(initialProgress)
  /** Текущие вопросы (могут подгружаться при «продолжить») */
  const [currentQuestions, setCurrentQuestions] = useState<QuizQuestionDTO[]>(questions)

  // Перемешанные вопросы (с id)
  const shuffledQuestions = useMemo(() => {
    if (seed === 0) {
      return []
    }
    return shuffleWithSeed(currentQuestions, seed)
  }, [seed, currentQuestions])

  // Перемешанные варианты ответа для текущего вопроса
  const currentQuestion = shuffledQuestions[currentIndex]
  const shuffledOptions = useMemo(() => {
    if (!currentQuestion) {
      return []
    }
    const opts = currentQuestion.options.map((opt, i) => ({
      text: isRu ? opt.text : opt.textEn,
      originalIndex: i,
    }))
    // Используем seed + hash от id для стабильного порядка
    const idHash = currentQuestion.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
    return shuffleWithSeed(opts, seed + idHash)
  }, [currentQuestion, seed, isRu])

  // Показать toast для каждого нового достижения
  const showAchievementToasts = useCallback(
    (codes: string[]) => {
      for (const code of codes) {
        const def = ACHIEVEMENTS_MAP.get(code)
        if (def) {
          toaster.success({
            title: `${def.icon} ${isRu ? def.label : def.labelEn}`,
            description: `+${def.xpReward} XP`,
          })
        }
      }
    },
    [isRu]
  )

  // Проверяем pending данные из sessionStorage при маунте
  const hasProcessedPending = useRef(false)
  useEffect(() => {
    if (hasProcessedPending.current) {
      return
    }
    hasProcessedPending.current = true

    try {
      const pendingRaw = sessionStorage.getItem(STORAGE_KEY)
      if (!pendingRaw || !isAuthenticated) {
        return
      }

      const pending: PendingQuiz = JSON.parse(pendingRaw)
      sessionStorage.removeItem(STORAGE_KEY)

      // Автосабмит pending данных
      setState('submitting')
      submitQuizAction({
        seed: pending.seed,
        answers: pending.answers,
        skipped: pending.skipped ?? [],
        moodValence: pending.mood?.valence,
        moodEnergy: pending.mood?.energy,
      }).then((result) => {
        if (result.error) {
          setSubmitError(result.error)
          setState('intro')
          return
        }
        if (result.data) {
          setScores(result.data.scores.normalized)
          setConfidence(result.data.scores.confidence)
          setAveragedScores(result.data.averagedScores)
          setNewAchievements(result.data.newAchievements)
          setRankInfo(result.data.rankInfo)
          if (result.data.progress) {
            setProgress((prev) => (prev ? { ...prev, ...result.data!.progress } : null))
          }
          showAchievementToasts(result.data.newAchievements)
          setState('results')
        }
      })
    } catch {
      // Ошибка парсинга — игнорируем
    }
  }, [isAuthenticated])

  // Начать тест — сперва mood check-in (5.9.2)
  const handleStart = useCallback(() => {
    // seed должен влезать в Int (max ~2.1 млрд), Date.now() > 1.7 трлн
    const newSeed = Date.now() % 2_000_000_000
    setSeed(newSeed)
    setCurrentIndex(0)
    setAnswers(new Map())
    setSkipped(new Set())
    setMood(null)
    setSkipReminderShown(false)
    setScores(null)
    setConfidence(null)
    setSubmitError(null)
    setNewAchievements([])
    setRankInfo(null)
    setState('mood')
  }, [])

  // Mood check-in завершён (выбор или пропуск) — переходим к вопросам
  const handleMoodDone = useCallback((value: MoodValue | null) => {
    setMood(value)
    setState('quiz')
  }, [])

  // Сохранить прогресс в sessionStorage (защита от потери ответов при ошибке)
  const saveProgress = useCallback(
    (answerMap: Map<string, number>) => {
      try {
        const pending: PendingQuiz = {
          seed,
          skipped: Array.from(skipped),
          mood,
          answers: Array.from(answerMap.entries()).map(([questionId, selectedOption]) => ({
            questionId,
            selectedOption,
          })),
        }
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending))
      } catch {
        // sessionStorage недоступен — игнорируем
      }
    },
    [seed, skipped, mood]
  )

  // Ответ на вопрос
  const handleAnswer = useCallback(
    (originalOptionIndex: number) => {
      if (!currentQuestion) {
        return
      }
      setAnswers((prev) => {
        const next = new Map(prev)
        next.set(currentQuestion.id, originalOptionIndex)
        // Сохраняем прогресс после каждого ответа
        saveProgress(next)
        return next
      })
    },
    [currentQuestion, saveProgress]
  )

  // Пропуск вопроса (убрать ответ если был, добавить в skipped)
  const handleSkip = useCallback(() => {
    if (!currentQuestion) {
      return
    }
    // Убираем ответ если был
    setAnswers((prev) => {
      const next = new Map(prev)
      next.delete(currentQuestion.id)
      saveProgress(next)
      return next
    })
    // Добавляем в пропущенные
    setSkipped((prev) => {
      const next = new Set(prev)
      next.add(currentQuestion.id)
      return next
    })
    // Мягкое напоминание при > 30% пропусков (один раз)
    const seen = currentIndex + 1
    const skippedCount = skipped.size + 1 // +1 за текущий
    if (!skipReminderShown && seen >= 10 && skippedCount / seen > 0.3) {
      setSkipReminderShown(true)
      toaster.info({
        title: isRu ? 'Старайтесь выбирать наиболее близкий вариант' : 'Try to choose the closest option',
        description: isRu
          ? 'Даже если ни один ответ не описывает вас идеально — выберите наиболее подходящий. Это повысит точность результата.'
          : 'Even if no answer perfectly describes you — choose the closest one. This will improve accuracy.',
      })
    }
  }, [currentQuestion, saveProgress, skipped, currentIndex, skipReminderShown, isRu])

  // Ref для handleFinish (нужен в handleNext до определения handleFinish)
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const handleFinishRef = useRef<() => void>(() => {})

  // Следующий вопрос (или автозавершение на последнем)
  const handleNext = useCallback(() => {
    if (currentIndex < shuffledQuestions.length - 1) {
      setCurrentIndex((i) => i + 1)
    } else {
      // Последний вопрос — автоматически завершаем
      handleFinishRef.current()
    }
  }, [currentIndex, shuffledQuestions.length])

  // Client-side предварительный подсчёт баллов (общий хелпер, авторитет — сервер)
  const calculateClientScores = useCallback(
    (answerMap: Map<string, number>): Record<PersonalityTypeCode, number> =>
      computeClientScores(answerMap, currentQuestions),
    [currentQuestions]
  )

  // Завершить тест
  const handleFinish = useCallback(async () => {
    const answersArray = Array.from(answers.entries()).map(([questionId, selectedOption]) => ({
      questionId,
      selectedOption,
    }))

    // Если все вопросы пропущены — нечего сабмитить
    if (answersArray.length === 0) {
      toaster.error({
        title: isRu ? 'Нет ответов' : 'No answers',
        description: isRu
          ? 'Вы пропустили все вопросы. Ответьте хотя бы на один.'
          : 'You skipped all questions. Please answer at least one.',
      })
      setState('intro')
      return
    }

    if (isAuthenticated) {
      // Показать результаты сразу (client-side)
      const clientScores = calculateClientScores(answers)
      setScores(clientScores)
      setState('submitting')

      try {
        // Сабмит на сервер (авторитетный подсчёт) — с пропущенными
        const result = await submitQuizAction({
          seed,
          answers: answersArray,
          skipped: Array.from(skipped),
          moodValence: mood?.valence,
          moodEnergy: mood?.energy,
        })
        if (result.error) {
          setSubmitError(result.error)
          setState('results') // Показываем client-side результаты
          return
        }
        if (result.data) {
          // Успех — очищаем sessionStorage
          sessionStorage.removeItem(STORAGE_KEY)
          setScores(result.data.scores.normalized)
          setConfidence(result.data.scores.confidence)
          setAveragedScores(result.data.averagedScores)
          setNewAchievements(result.data.newAchievements)
          setRankInfo(result.data.rankInfo)
          // Обновляем прогресс
          if (result.data.progress) {
            setProgress((prev) => ({
              totalAnswered: result.data!.progress!.totalAnswered,
              totalSkipped: prev?.totalSkipped ?? 0,
              totalQuestions: result.data!.progress!.totalQuestions,
              coveragePercent: result.data!.progress!.coveragePercent,
              availableCount: result.data!.progress!.availableCount,
              sessionsCount: (prev?.sessionsCount ?? 0) + 1,
              cumulativeScores: prev?.cumulativeScores ?? null,
              averagedScores: result.data!.averagedScores,
            }))
          }
          showAchievementToasts(result.data.newAchievements)
          setState('results')
        }
      } catch {
        // Сетевая ошибка или 404 (после деплоя) — показываем client-side результаты
        // Ответы остаются в sessionStorage для повторной отправки
        setSubmitError('network_error')
        setState('results')
      }
    } else {
      // Гость: показываем client-side результаты, сохраняем ответы для автосабмита после логина
      const clientScores = calculateClientScores(answers)
      setScores(clientScores)
      const pending: PendingQuiz = { seed, answers: answersArray, skipped: Array.from(skipped), mood }
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending))
      setState('results')
    }
  }, [answers, isAuthenticated, seed, calculateClientScores, skipped, mood, showAchievementToasts])

  // Обновляем ref для автозавершения
  handleFinishRef.current = handleFinish

  // Продолжить (загрузить новые вопросы и начать следующую порцию)
  const handleContinue = useCallback(async () => {
    setState('loading_more')
    try {
      const newQuestions = await getRandomQuestionsAction(50)
      if (newQuestions.length === 0) {
        toaster.info({
          title: isRu ? 'Все вопросы пройдены!' : 'All questions completed!',
          description: isRu
            ? 'Вы ответили на все доступные вопросы. Поздравляем!'
            : 'You have answered all available questions. Congratulations!',
        })
        setState('results')
        return
      }
      setCurrentQuestions(newQuestions)
      const newSeed = Date.now() % 2_000_000_000
      setSeed(newSeed)
      setCurrentIndex(0)
      setAnswers(new Map())
      setSkipped(new Set())
      setMood(null)
      setSkipReminderShown(false)
      setScores(null)
      setConfidence(null)
      setSubmitError(null)
      setNewAchievements([])
      setRankInfo(null)
      setState('mood')
    } catch {
      toaster.error({
        title: isRu ? 'Ошибка загрузки' : 'Loading error',
        description: isRu ? 'Не удалось загрузить новые вопросы' : 'Failed to load new questions',
      })
      setState('results')
    }
  }, [isRu])

  // Начать заново (вернуться на интро)
  const handleRestart = useCallback(() => {
    setState('intro')
    setCurrentIndex(0)
    setAnswers(new Map())
    setSkipped(new Set())
    setMood(null)
    setSkipReminderShown(false)
    setScores(null)
    setConfidence(null)
    setSubmitError(null)
    setNewAchievements([])
    setRankInfo(null)
  }, [])

  // INTRO
  if (state === 'intro') {
    return <QuizIntro onStart={handleStart} progress={progress} initialDisclaimerAccepted={initialDisclaimerAccepted} />
  }

  // MOOD CHECK-IN (5.9.2) — перед каждой новой порцией вопросов
  if (state === 'mood') {
    return <MoodCheckIn isRu={isRu} onSubmit={(value) => handleMoodDone(value)} onSkip={() => handleMoodDone(null)} />
  }

  // Нет вопросов в БД — показываем сообщение
  if (state === 'quiz' && shuffledQuestions.length === 0) {
    return (
      <Container maxW="md" py={16}>
        <VStack gap={6} textAlign="center">
          <Heading size="xl">{t('noQuestions')}</Heading>
          <Text color="fg.muted">{t('noQuestionsHint')}</Text>
          <Button size="lg" variant="outline" onClick={handleRestart}>
            {t('backToIntro')}
          </Button>
        </VStack>
      </Container>
    )
  }

  // QUIZ
  if (state === 'quiz' && currentQuestion) {
    return (
      <Container maxW="2xl" py={8}>
        <VStack gap={8}>
          <QuizProgressBar
            current={currentIndex}
            total={shuffledQuestions.length}
            answered={answers.size}
            globalProgress={
              progress
                ? {
                    totalAnswered: progress.totalAnswered + answers.size,
                    totalQuestions: progress.totalQuestions,
                  }
                : undefined
            }
          />
          <QuizQuestionCard
            scenario={isRu ? currentQuestion.scenario : currentQuestion.scenarioEn}
            options={shuffledOptions}
            questionNumber={currentIndex + 1}
            selectedOption={answers.get(currentQuestion.id)}
            onAnswer={handleAnswer}
            onNext={handleNext}
            onSkip={handleSkip}
          />
          {/* Навигация между вопросами */}
          <ButtonGroup currentIndex={currentIndex} total={shuffledQuestions.length} onChange={setCurrentIndex} />
        </VStack>
      </Container>
    )
  }

  // LOADING MORE
  if (state === 'loading_more') {
    return (
      <Container maxW="md" py={16}>
        <VStack gap={4} textAlign="center">
          <Heading size="lg">{isRu ? 'Загружаем новые вопросы...' : 'Loading new questions...'}</Heading>
        </VStack>
      </Container>
    )
  }

  // SUBMITTING
  if (state === 'submitting') {
    return (
      <Container maxW="md" py={16}>
        <VStack gap={4} textAlign="center">
          <Heading size="lg">{t('submitting')}</Heading>
          {scores && <Text color="fg.muted">{t('submittingHint')}</Text>}
        </VStack>
      </Container>
    )
  }

  // RESULTS
  if (state === 'results' && scores) {
    return (
      <>
        {submitError && (
          <Container maxW="2xl" py={2}>
            <VStack gap={2}>
              <Text color="red.500" fontSize="sm" textAlign="center">
                {t('submitError')}
              </Text>
              <Button
                size="sm"
                variant="outline"
                colorPalette="red"
                loading={false}
                onClick={async () => {
                  setState('submitting')
                  try {
                    const answersArray = Array.from(answers.entries()).map(([questionId, selectedOption]) => ({
                      questionId,
                      selectedOption,
                    }))
                    const result = await submitQuizAction({
                      seed,
                      answers: answersArray,
                      skipped: Array.from(skipped),
                      moodValence: mood?.valence,
                      moodEnergy: mood?.energy,
                    })
                    if (result.error) {
                      setSubmitError(result.error)
                      setState('results')
                      return
                    }
                    if (result.data) {
                      sessionStorage.removeItem(STORAGE_KEY)
                      setScores(result.data.scores.normalized)
                      setConfidence(result.data.scores.confidence)
                      setAveragedScores(result.data.averagedScores)
                      setNewAchievements(result.data.newAchievements)
                      setRankInfo(result.data.rankInfo)
                      if (result.data.progress) {
                        setProgress((prev) => ({
                          totalAnswered: result.data!.progress!.totalAnswered,
                          totalSkipped: prev?.totalSkipped ?? 0,
                          totalQuestions: result.data!.progress!.totalQuestions,
                          coveragePercent: result.data!.progress!.coveragePercent,
                          availableCount: result.data!.progress!.availableCount,
                          sessionsCount: (prev?.sessionsCount ?? 0) + 1,
                          cumulativeScores: prev?.cumulativeScores ?? null,
                          averagedScores: result.data!.averagedScores,
                        }))
                      }
                      showAchievementToasts(result.data.newAchievements)
                      setSubmitError(null)
                      setState('results')
                    }
                  } catch {
                    setSubmitError('network_error')
                    setState('results')
                  }
                }}
              >
                {isRu ? 'Повторить отправку' : 'Retry'}
              </Button>
            </VStack>
          </Container>
        )}
        <QuizResults
          scores={scores}
          confidence={confidence}
          averagedScores={averagedScores}
          isAuthenticated={isAuthenticated}
          onRestart={handleRestart}
          onContinue={progress && progress.availableCount > 0 ? handleContinue : undefined}
          newAchievements={newAchievements}
          rankInfo={rankInfo}
          progress={
            progress
              ? {
                  totalAnswered: progress.totalAnswered,
                  totalQuestions: progress.totalQuestions,
                  coveragePercent: progress.coveragePercent,
                  availableCount: progress.availableCount,
                }
              : undefined
          }
        />
      </>
    )
  }

  return null
}

/** Кнопки навигации «Назад / Вперёд» между вопросами */
function ButtonGroup({
  currentIndex,
  total,
  onChange,
}: {
  currentIndex: number
  total: number
  onChange: (i: number) => void
}) {
  const t = useTranslations('quiz')

  return (
    <VStack gap={2} direction="row">
      <Box display="flex" gap={2}>
        <Button size="sm" variant="ghost" disabled={currentIndex === 0} onClick={() => onChange(currentIndex - 1)}>
          {t('prev')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={currentIndex >= total - 1}
          onClick={() => onChange(currentIndex + 1)}
        >
          {t('next')}
        </Button>
      </Box>
    </VStack>
  )
}
