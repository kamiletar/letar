'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Box, Button, Container, Heading, Text, VStack } from '@chakra-ui/react'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { QuizProgress, QuizQuestionDTO } from '../_actions/quiz.action'
import { getRandomQuestionsAction, submitQuizAction } from '../_actions/quiz.action'
import { ACHIEVEMENTS_MAP } from '../_data/achievements'
import type { PersonalityTypeCode } from '../_data/personality-types'
import { QUESTION_BANK_VERSION } from '../_data/question-bank-version'
import { computeClientScores } from '../_lib/client-scoring'
import { clearQuizDraft, type QuizDraft, restoreQuizDraft, saveQuizDraft } from '../_lib/quiz-draft'
import type { ScaleConfidence } from '../_lib/scoring-core'
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
  /** Только явно завершённый тест разрешено автоматически отправлять после входа. */
  completed: true
  userId?: string | null
  mode?: 'full' | 'express'
  seed: number
  answers: { questionId: string; selectedOption: number }[]
  /** Пропущенные вопросы (видел и осознанно пропустил) */
  skipped: string[]
  /** Mood check-in перед сессией (этап 5.9.2), null если пропущен */
  mood: MoodValue | null
  /** Локаль прохождения (5.9.5): нормы ru/en раздельно; свойство сессии, не юзера */
  locale?: 'ru' | 'en'
}

const STORAGE_KEY = PENDING_QUIZ_KEY

type QuizState = 'intro' | 'mood' | 'quiz' | 'submitting' | 'results' | 'loading_more'

interface QuizContainerProps {
  questions: QuizQuestionDTO[]
  isAuthenticated: boolean
  userId?: string | null
  initialProgress: QuizProgress | null
  /** Дисклеймер уже принят (из БД) */
  initialDisclaimerAccepted?: boolean
}

export function QuizContainer({
  questions,
  isAuthenticated,
  userId = null,
  initialProgress,
  initialDisclaimerAccepted,
}: QuizContainerProps) {
  const t = useTranslations('quiz')
  const tc = useTranslations('quiz.container')
  const locale = useLocale()
  const isRu = locale === 'ru'
  /** Локаль прохождения для сохранения в сессию (5.9.5, нормы ru/en) */
  const sessionLocale = isRu ? ('ru' as const) : ('en' as const)

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
  /** Число отвеченных релевантных вопросов по шкалам (от сервера) — вход ipsative-интервалов (5.6) */
  const [relevantCounts, setRelevantCounts] = useState<Record<PersonalityTypeCode, number> | null>(null)
  const [averagedScores, setAveragedScores] = useState<Record<PersonalityTypeCode, number> | null>(
    initialProgress?.averagedScores ?? null,
  )
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [newAchievements, setNewAchievements] = useState<string[]>([])
  const [rankInfo, setRankInfo] = useState<{ rankCode: string; xp: number } | null>(null)
  /** Вошла ли последняя сессия в XP (5.9.3: XP-гранула — сутки); undefined до первого сабмита */
  const [xpCountedToday, setXpCountedToday] = useState<boolean | undefined>(undefined)
  /** Прогресс (обновляется после каждого сабмита) */
  const [progress, setProgress] = useState<QuizProgress | null>(initialProgress)
  /** Текущие вопросы (могут подгружаться при «продолжить») */
  const [currentQuestions, setCurrentQuestions] = useState<QuizQuestionDTO[]>(questions)

  const persistDraft = useCallback((changes: Partial<QuizDraft> = {}) => {
    saveQuizDraft('full', userId, {
      bankVersion: QUESTION_BANK_VERSION,
      seed,
      phase: state === 'mood' ? 'mood' : 'quiz',
      questions: currentQuestions,
      currentIndex,
      answers: Array.from(answers),
      skipped: Array.from(skipped),
      mood,
      ...changes,
    })
  }, [userId, seed, state, currentQuestions, currentIndex, answers, skipped, mood])

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
    [isRu],
  )

  // Проверяем pending данные из sessionStorage при маунте
  const hasProcessedPending = useRef(false)
  useEffect(() => {
    if (hasProcessedPending.current) {
      return
    }
    hasProcessedPending.current = true

    let pending: PendingQuiz | null = null
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      const stored: PendingQuiz | null = raw ? JSON.parse(raw) : null
      // Незавершённые записи старого формата и результат другого аккаунта не отправляем.
      if (isAuthenticated && stored?.completed === true && (!stored.userId || stored.userId === userId)) {
        pending = stored
      }
    } catch {
      // Повреждённая очередь не мешает восстановить черновик.
    }

    const draft = restoreQuizDraft('full', userId)
    if (draft && pending?.mode !== 'express') {
      // Синхронизация с браузерным хранилищем после гидратации, не чтение в рендере.
      // oxlint-disable-next-line react/set-state-in-effect -- восстановление внешнего состояния
      setCurrentQuestions(draft.questions)
      setSeed(draft.seed)
      setCurrentIndex(draft.currentIndex)
      setAnswers(new Map(draft.answers))
      setSkipped(new Set(draft.skipped))
      setMood(draft.mood)
      setState(draft.phase)
      return
    }

    if (!pending) { return }
    const pendingMode = pending.mode ?? 'full'

    // Автосабмит pending данных с сервера — легитимная синхронизация с внешней
    // системой (sessionStorage + сетевой запрос), не производное от пропсов значение
    // oxlint-disable-next-line react/set-state-in-effect -- см. комментарий выше
    setState('submitting')
    submitQuizAction({
      seed: pending.seed,
      answers: pending.answers,
      skipped: pending.skipped ?? [],
      moodValence: pending.mood?.valence,
      moodEnergy: pending.mood?.energy,
      locale: pending.locale,
    }).then((result) => {
      if (result.error) {
        setSubmitError(result.error)
        setState('intro')
        return
      }
      if (result.data) {
        sessionStorage.removeItem(STORAGE_KEY)
        clearQuizDraft(pendingMode, userId)
        setScores(result.data.scores.normalized)
        setConfidence(result.data.scores.confidence)
        setRelevantCounts(result.data.scores.relevantCounts)
        setAveragedScores(result.data.averagedScores)
        setNewAchievements(result.data.newAchievements)
        setRankInfo(result.data.rankInfo)
        setXpCountedToday(result.data.xpCountedToday)
        if (result.data.progress) {
          setProgress((prev) => (prev ? { ...prev, ...result.data!.progress } : null))
        }
        showAchievementToasts(result.data.newAchievements)
        setState('results')
      }
    }).catch(() => {
      setSubmitError('network_error')
      setState('intro')
    })
  }, [isAuthenticated, userId, showAchievementToasts])

  // Начать тест — сперва mood check-in (5.9.2)
  const handleStart = useCallback(() => {
    // seed должен влезать в Int (max ~2.1 млрд), Date.now() > 1.7 трлн
    const newSeed = Date.now() % 2_000_000_000 || 1
    clearQuizDraft('full', userId)
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch { /* хранилище может быть недоступно */ }
    persistDraft({ seed: newSeed, phase: 'mood', currentIndex: 0, answers: [], skipped: [], mood: null })
    setSeed(newSeed)
    setCurrentIndex(0)
    setAnswers(new Map())
    setSkipped(new Set())
    setMood(null)
    setSkipReminderShown(false)
    setScores(null)
    setConfidence(null)
    setRelevantCounts(null)
    setSubmitError(null)
    setNewAchievements([])
    setRankInfo(null)
    setXpCountedToday(undefined)
    setState('mood')
  }, [userId, persistDraft])

  // Mood check-in завершён (выбор или пропуск) — переходим к вопросам
  const handleMoodDone = useCallback((value: MoodValue | null) => {
    persistDraft({ phase: 'quiz', mood: value })
    setMood(value)
    setState('quiz')
  }, [persistDraft])

  // Ответ на вопрос
  const handleAnswer = useCallback(
    (originalOptionIndex: number) => {
      if (!currentQuestion) {
        return
      }
      const next = new Map(answers)
      next.set(currentQuestion.id, originalOptionIndex)
      const nextSkipped = new Set(skipped)
      nextSkipped.delete(currentQuestion.id)
      persistDraft({ answers: Array.from(next), skipped: Array.from(nextSkipped) })
      setAnswers(next)
      setSkipped(nextSkipped)
    },
    [currentQuestion, answers, skipped, persistDraft],
  )

  // Пропуск вопроса (убрать ответ если был, добавить в skipped)
  const handleSkip = useCallback(() => {
    if (!currentQuestion) {
      return
    }
    const nextAnswers = new Map(answers)
    nextAnswers.delete(currentQuestion.id)
    const nextSkipped = new Set(skipped)
    nextSkipped.add(currentQuestion.id)
    persistDraft({ answers: Array.from(nextAnswers), skipped: Array.from(nextSkipped) })
    setAnswers(nextAnswers)
    setSkipped(nextSkipped)
    // Мягкое напоминание при > 30% пропусков (один раз)
    const seen = currentIndex + 1
    const skippedCount = skipped.size + 1 // +1 за текущий
    if (!skipReminderShown && seen >= 10 && skippedCount / seen > 0.3) {
      setSkipReminderShown(true)
      toaster.info({
        title: tc('skipReminderTitle'),
        description: tc('skipReminderText'),
      })
    }
  }, [currentQuestion, answers, persistDraft, skipped, currentIndex, skipReminderShown, tc])

  const handleChangeIndex = useCallback((index: number) => {
    persistDraft({ currentIndex: index })
    setCurrentIndex(index)
  }, [persistDraft])

  // Ref для handleFinish (нужен в handleNext до определения handleFinish)
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const handleFinishRef = useRef<() => void>(() => {})

  // Следующий вопрос (или автозавершение на последнем)
  const handleNext = useCallback(() => {
    if (currentIndex < shuffledQuestions.length - 1) {
      handleChangeIndex(currentIndex + 1)
    } else {
      // Последний вопрос — автоматически завершаем
      handleFinishRef.current()
    }
  }, [currentIndex, shuffledQuestions.length, handleChangeIndex])

  // Client-side предварительный подсчёт баллов (общий хелпер, авторитет — сервер)
  const calculateClientScores = useCallback(
    (answerMap: Map<string, number>): Record<PersonalityTypeCode, number> =>
      computeClientScores(answerMap, currentQuestions),
    [currentQuestions],
  )

  // Завершить тест
  const handleFinish = useCallback(async () => {
    const answersArray = Array.from(answers.entries()).map(([questionId, selectedOption]) => ({
      questionId,
      selectedOption,
    }))

    // Если все вопросы пропущены — нечего сабмитить
    if (answersArray.length === 0) {
      clearQuizDraft('full', userId)
      toaster.error({
        title: tc('noAnswersTitle'),
        description: tc('noAnswersText'),
      })
      setState('intro')
      return
    }

    // Очередь отправки создаётся только при явном завершении, отдельно от черновика.
    try {
      const pending: PendingQuiz = {
        completed: true,
        userId,
        mode: 'full',
        seed,
        answers: answersArray,
        skipped: Array.from(skipped),
        mood,
        locale: sessionLocale,
      }
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending))
    } catch {
      // Запрет sessionStorage не мешает отправить результат в текущей вкладке.
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
          locale: sessionLocale,
        })
        if (result.error) {
          setSubmitError(result.error)
          setState('results') // Показываем client-side результаты
          return
        }
        if (result.data) {
          // Успех — очищаем sessionStorage
          sessionStorage.removeItem(STORAGE_KEY)
          clearQuizDraft('full', userId)
          setScores(result.data.scores.normalized)
          setConfidence(result.data.scores.confidence)
          setRelevantCounts(result.data.scores.relevantCounts)
          setAveragedScores(result.data.averagedScores)
          setNewAchievements(result.data.newAchievements)
          setRankInfo(result.data.rankInfo)
          setXpCountedToday(result.data.xpCountedToday)
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
      clearQuizDraft('full', userId)
      setState('results')
    }
  }, [
    answers,
    isAuthenticated,
    seed,
    calculateClientScores,
    skipped,
    mood,
    sessionLocale,
    showAchievementToasts,
    tc,
    userId,
  ])

  // Обновляем ref для автозавершения вне рендера — чтение/запись ref.current
  // в теле компонента не отслеживается React (react/refs), нужен эффект
  useEffect(() => {
    handleFinishRef.current = handleFinish
  }, [handleFinish])

  // Продолжить (загрузить новые вопросы и начать следующую порцию)
  const handleContinue = useCallback(async () => {
    setState('loading_more')
    try {
      const newQuestions = await getRandomQuestionsAction(50)
      if (newQuestions.length === 0) {
        toaster.info({
          title: tc('allDoneTitle'),
          description: tc('allDoneText'),
        })
        setState('results')
        return
      }
      setCurrentQuestions(newQuestions)
      const newSeed = Date.now() % 2_000_000_000 || 1
      persistDraft({
        questions: newQuestions,
        seed: newSeed,
        phase: 'mood',
        currentIndex: 0,
        answers: [],
        skipped: [],
        mood: null,
      })
      setSeed(newSeed)
      setCurrentIndex(0)
      setAnswers(new Map())
      setSkipped(new Set())
      setMood(null)
      setSkipReminderShown(false)
      setScores(null)
      setConfidence(null)
      setRelevantCounts(null)
      setSubmitError(null)
      setNewAchievements([])
      setRankInfo(null)
      setXpCountedToday(undefined)
      setState('mood')
    } catch {
      toaster.error({
        title: tc('loadErrorTitle'),
        description: tc('loadErrorText'),
      })
      setState('results')
    }
  }, [tc, persistDraft])

  // Начать заново (вернуться на интро)
  const handleRestart = useCallback(() => {
    clearQuizDraft('full', userId)
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch { /* хранилище может быть недоступно */ }
    setState('intro')
    setCurrentIndex(0)
    setAnswers(new Map())
    setSkipped(new Set())
    setMood(null)
    setSkipReminderShown(false)
    setScores(null)
    setConfidence(null)
    setRelevantCounts(null)
    setSubmitError(null)
    setNewAchievements([])
    setRankInfo(null)
    setXpCountedToday(undefined)
  }, [userId])

  // INTRO
  if (state === 'intro') {
    return <QuizIntro onStart={handleStart} progress={progress} initialDisclaimerAccepted={initialDisclaimerAccepted} />
  }

  // MOOD CHECK-IN (5.9.2) — перед каждой новой порцией вопросов
  if (state === 'mood') {
    return <MoodCheckIn onSubmit={(value) => handleMoodDone(value)} onSkip={() => handleMoodDone(null)} />
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
            globalProgress={progress
              ? {
                totalAnswered: progress.totalAnswered + answers.size,
                totalQuestions: progress.totalQuestions,
              }
              : undefined}
          />
          <QuizQuestionCard
            // key на id вопроса — размонтирует/монтирует карточку заново при смене
            // вопроса, сбрасывая локальный стейт (optimisticIndex/justAnswered) без
            // отдельного эффекта-синхронизации
            key={currentQuestion.id}
            scenario={isRu ? currentQuestion.scenario : currentQuestion.scenarioEn}
            options={shuffledOptions}
            questionNumber={currentIndex + 1}
            selectedOption={answers.get(currentQuestion.id)}
            canContinue={skipped.has(currentQuestion.id)}
            isLastQuestion={currentIndex === shuffledQuestions.length - 1}
            onAnswer={handleAnswer}
            onNext={handleNext}
            onSkip={handleSkip}
          />
          {/* Навигация между вопросами */}
          <ButtonGroup currentIndex={currentIndex} total={shuffledQuestions.length} onChange={handleChangeIndex} />
        </VStack>
      </Container>
    )
  }

  // LOADING MORE
  if (state === 'loading_more') {
    return (
      <Container maxW="md" py={16}>
        <VStack gap={4} textAlign="center">
          <Heading size="lg">{tc('loadingMore')}</Heading>
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
                      locale: sessionLocale,
                    })
                    if (result.error) {
                      setSubmitError(result.error)
                      setState('results')
                      return
                    }
                    if (result.data) {
                      sessionStorage.removeItem(STORAGE_KEY)
                      clearQuizDraft('full', userId)
                      setScores(result.data.scores.normalized)
                      setConfidence(result.data.scores.confidence)
                      setRelevantCounts(result.data.scores.relevantCounts)
                      setAveragedScores(result.data.averagedScores)
                      setNewAchievements(result.data.newAchievements)
                      setRankInfo(result.data.rankInfo)
                      setXpCountedToday(result.data.xpCountedToday)
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
                {tc('retry')}
              </Button>
            </VStack>
          </Container>
        )}
        <QuizResults
          scores={scores}
          confidence={confidence}
          relevantCounts={relevantCounts}
          averagedScores={averagedScores}
          isAuthenticated={isAuthenticated}
          onRestart={handleRestart}
          onContinue={progress && progress.availableCount > 0 ? handleContinue : undefined}
          newAchievements={newAchievements}
          rankInfo={rankInfo}
          xpCountedToday={xpCountedToday}
          progress={progress
            ? {
              totalAnswered: progress.totalAnswered,
              totalQuestions: progress.totalQuestions,
              coveragePercent: progress.coveragePercent,
              availableCount: progress.availableCount,
            }
            : undefined}
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
