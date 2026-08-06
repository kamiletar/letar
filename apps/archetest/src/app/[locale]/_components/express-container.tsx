'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Box, Button, Container, Heading, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { StickyActionBar } from '@letar/ui'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LuHexagon, LuTimer } from 'react-icons/lu'

import type { QuizQuestionDTO } from '../_actions/quiz.action'
import { DISCLAIMER_CONSENT_KEY } from '../_data/disclaimer'
import type { PersonalityTypeCode } from '../_data/personality-types'
import { computeClientScores } from '../_lib/client-scoring'
import { shuffleWithSeed } from '../_lib/seeded-shuffle'
import { EXPRESS_RESULT_KEY } from '../_lib/storage-keys'
import { DisclaimerConsentCheckbox, DisclaimerSummary } from './disclaimer-consent'
import { type ExpressAnswer, ExpressResults } from './express-results'
import { IcebreakerCard } from './icebreaker-card'
import { QuizProgressBar } from './quiz-progress-bar'
import { QuizQuestionCard } from './quiz-question-card'

type ExpressState = 'intro' | 'quiz' | 'results'

interface ExpressContainerProps {
  questions: QuizQuestionDTO[]
  isAuthenticated: boolean
}

/** Формат гостевого результата в localStorage */
interface StoredExpressResult {
  seed: number
  answers: ExpressAnswer[]
  scores: Record<PersonalityTypeCode, number>
  completedAt: string
}

/**
 * Контейнер экспресс-теста (этап 5.3, фестивальный режим): гостевой 24-вопросный
 * тест без регистрации. Результат считается на клиенте и сохраняется в localStorage
 * — на сервер ничего не отправляется до явной привязки к аккаунту.
 */
export function ExpressContainer({ questions, isAuthenticated }: ExpressContainerProps) {
  const t = useTranslations('express')
  const locale = useLocale()
  const isRu = locale === 'ru'

  const [state, setState] = useState<ExpressState>('intro')
  // Информированное согласие (5.6.3) — гость, хранение только в localStorage
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false)
  const [seed, setSeed] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Map<string, number>>(new Map())
  const [scores, setScores] = useState<Record<PersonalityTypeCode, number> | null>(null)
  /** Ответы завершённой сессии (для привязки к аккаунту) */
  const [finalAnswers, setFinalAnswers] = useState<ExpressAnswer[]>([])

  // Восстанавливаем гостевой результат из localStorage при монтировании
  const hydrated = useRef(false)
  useEffect(() => {
    if (hydrated.current) {
      return
    }
    hydrated.current = true
    try {
      // Ранее данное согласие (общий ключ с полным квизом)
      if (localStorage.getItem(DISCLAIMER_CONSENT_KEY) === '1') {
        setDisclaimerAccepted(true)
      }
      const raw = localStorage.getItem(EXPRESS_RESULT_KEY)
      if (!raw) {
        return
      }
      const stored: StoredExpressResult = JSON.parse(raw)
      if (stored.scores && stored.answers) {
        setSeed(stored.seed)
        setScores(stored.scores)
        setFinalAnswers(stored.answers)
        setState('results')
      }
    } catch {
      /* повреждённый localStorage — игнорируем, покажем интро */
    }
  }, [])

  // Перемешанные вопросы (детерминированно по seed)
  const shuffledQuestions = useMemo(() => {
    if (seed === 0) {
      return []
    }
    return shuffleWithSeed(questions, seed)
  }, [seed, questions])

  const currentQuestion = shuffledQuestions[currentIndex]

  // Перемешанные варианты ответа текущего вопроса (стабильно по seed + id)
  const shuffledOptions = useMemo(() => {
    if (!currentQuestion) {
      return []
    }
    const opts = currentQuestion.options.map((opt, i) => ({
      text: isRu ? opt.text : opt.textEn,
      originalIndex: i,
    }))
    const idHash = currentQuestion.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
    return shuffleWithSeed(opts, seed + idHash)
  }, [currentQuestion, seed, isRu])

  // Сохраняем согласие в localStorage (гость — на сервер ничего не уходит)
  const handleConsentChange = useCallback((accepted: boolean) => {
    setDisclaimerAccepted(accepted)
    try {
      if (accepted) {
        localStorage.setItem(DISCLAIMER_CONSENT_KEY, '1')
      }
    } catch {
      /* localStorage недоступен — согласие останется в состоянии */
    }
  }, [])

  const handleStart = useCallback(() => {
    setSeed(Date.now() % 2_000_000_000)
    setCurrentIndex(0)
    setAnswers(new Map())
    setScores(null)
    setState('quiz')
  }, [])

  const handleAnswer = useCallback(
    (originalOptionIndex: number) => {
      if (!currentQuestion) {
        return
      }
      setAnswers((prev) => {
        const next = new Map(prev)
        next.set(currentQuestion.id, originalOptionIndex)
        return next
      })
    },
    [currentQuestion],
  )

  const handleSkip = useCallback(() => {
    if (!currentQuestion) {
      return
    }
    setAnswers((prev) => {
      const next = new Map(prev)
      next.delete(currentQuestion.id)
      return next
    })
  }, [currentQuestion])

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const handleFinishRef = useRef<() => void>(() => {})

  const handleNext = useCallback(() => {
    if (currentIndex < shuffledQuestions.length - 1) {
      setCurrentIndex((i) => i + 1)
    } else {
      handleFinishRef.current()
    }
  }, [currentIndex, shuffledQuestions.length])

  const handleFinish = useCallback(() => {
    if (answers.size === 0) {
      toaster.error({
        title: isRu ? 'Нет ответов' : 'No answers',
        description: isRu ? 'Ответьте хотя бы на один вопрос.' : 'Answer at least one question.',
      })
      setState('intro')
      return
    }

    const computed = computeClientScores(answers, questions)
    const answersArray: ExpressAnswer[] = Array.from(answers.entries()).map(([questionId, selectedOption]) => ({
      questionId,
      selectedOption,
    }))

    // Гостевой результат — только в localStorage, без отправки на сервер
    try {
      const stored: StoredExpressResult = {
        seed,
        answers: answersArray,
        scores: computed,
        completedAt: new Date().toISOString(),
      }
      localStorage.setItem(EXPRESS_RESULT_KEY, JSON.stringify(stored))
    } catch {
      /* localStorage недоступен — результат покажем из состояния */
    }

    setScores(computed)
    setFinalAnswers(answersArray)
    setState('results')
  }, [answers, questions, seed, isRu])

  handleFinishRef.current = handleFinish

  const handleRetake = useCallback(() => {
    try {
      localStorage.removeItem(EXPRESS_RESULT_KEY)
    } catch {
      /* игнорируем */
    }
    setScores(null)
    setFinalAnswers([])
    setAnswers(new Map())
    setCurrentIndex(0)
    setState('intro')
  }, [])

  // INTRO
  if (state === 'intro') {
    return (
      <Container maxW="lg" pt={16} pb={0}>
        {/* pb резервирует место под StickyActionBar (высота панели + отступ от cookie-баннера) */}
        <VStack
          gap={8}
          textAlign="center"
          pb="calc(var(--letar-sticky-actionbar-height, 0px) + var(--letar-cookie-banner-height, 0px) + 1rem)"
        >
          <Icon fontSize="64px" color="purple.500">
            <LuHexagon />
          </Icon>
          <Heading size="2xl">{t('title')}</Heading>
          <Text fontSize="lg" color="fg.muted">
            {t('description')}
          </Text>

          <VStack gap={2} fontSize="sm" color="fg.muted">
            <Text>{t('info.questions')}</Text>
            <Text>
              <Icon mr={1} verticalAlign="text-bottom">
                <LuTimer />
              </Icon>
              {t('info.time')}
            </Text>
          </VStack>

          {/* Icebreaker для психологов (5.4) — разговор у стенда */}
          <IcebreakerCard />

          <Box w="100%" p={4} borderRadius="lg" borderWidth="1px" borderColor="border" bg="bg.subtle" textAlign="left">
            <Text fontSize="xs" color="fg.muted">
              {t('privacyNote')}
            </Text>
          </Box>

          {/* Сводка дисклеймера (5.6.3); чекбокс — в StickyActionBar ниже */}
          {!disclaimerAccepted && <DisclaimerSummary isRu={isRu} />}
        </VStack>

        {/* Липкая панель: чекбокс согласия (пока не принято) + CTA, всегда вместе на экране */}
        <StickyActionBar bg="bg" mx={{ base: -4, md: 0 }}>
          <VStack gap={3} w="100%">
            {!disclaimerAccepted && (
              <DisclaimerConsentCheckbox accepted={disclaimerAccepted} onChange={handleConsentChange} isRu={isRu} />
            )}
            <HStack justify="center" w="100%">
              <Button
                size="lg"
                colorPalette="purple"
                w={{ base: '100%', sm: 'auto' }}
                minW={{ sm: '14rem' }}
                onClick={handleStart}
                disabled={!disclaimerAccepted}
              >
                {t('start')}
              </Button>
            </HStack>
          </VStack>
        </StickyActionBar>
      </Container>
    )
  }

  // QUIZ
  if (state === 'quiz' && currentQuestion) {
    return (
      <Container maxW="2xl" py={8}>
        <VStack gap={8}>
          <QuizProgressBar current={currentIndex} total={shuffledQuestions.length} answered={answers.size} />
          <QuizQuestionCard
            scenario={isRu ? currentQuestion.scenario : currentQuestion.scenarioEn}
            options={shuffledOptions}
            questionNumber={currentIndex + 1}
            selectedOption={answers.get(currentQuestion.id)}
            onAnswer={handleAnswer}
            onNext={handleNext}
            onSkip={handleSkip}
          />
        </VStack>
      </Container>
    )
  }

  // RESULTS
  if (state === 'results' && scores) {
    return (
      <ExpressResults
        scores={scores}
        seed={seed}
        answers={finalAnswers}
        isAuthenticated={isAuthenticated}
        onRetake={handleRetake}
      />
    )
  }

  return null
}
