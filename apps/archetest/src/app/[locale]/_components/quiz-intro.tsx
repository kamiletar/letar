'use client'

import { Box, Button, Container, Heading, HStack, Progress, Text, VStack } from '@chakra-ui/react'
import { StickyActionBar, useScrollGate } from '@letar/ui'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'
import { LuBrain, LuChartNoAxesCombined, LuTrendingUp } from 'react-icons/lu'
import { acceptDisclaimerAction } from '../_actions/disclaimer.action'
import type { QuizProgress } from '../_actions/quiz.action'
import { DISCLAIMER_CONSENT_KEY } from '../_data/disclaimer'
import { PERSONALITY_TYPES } from '../_data/personality-types'
import { DisclaimerConsent } from './disclaimer-consent'
import { PersonalityRadarChart } from './personality-radar-chart'
import { ProfileDetails } from './profile-details'

interface QuizIntroProps {
  onStart: () => void
  /** Прогресс пользователя (null для неавторизованных / первый раз) */
  progress?: QuizProgress | null
  /** Дисклеймер уже принят (из БД) */
  initialDisclaimerAccepted?: boolean
}

export function QuizIntro({ onStart, progress, initialDisclaimerAccepted }: QuizIntroProps) {
  const t = useTranslations('quiz')
  const locale = useLocale()
  const isRu = locale === 'ru'
  const [showProfile, setShowProfile] = useState(false)
  // Scroll-гейт интро (5.4): CTA disabled, пока не прочитан весь текст и не дано согласие
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(() => {
    // Приоритет: сервер (БД) → localStorage
    if (initialDisclaimerAccepted) {
      return true
    }
    if (typeof window === 'undefined') {
      return false
    }
    return localStorage.getItem(DISCLAIMER_CONSENT_KEY) === '1'
  })

  // Сохраняем согласие в localStorage + БД
  useEffect(() => {
    if (disclaimerAccepted) {
      localStorage.setItem(DISCLAIMER_CONSENT_KEY, '1')
      // Сохраняем в БД (fire and forget)
      acceptDisclaimerAction().catch(() => {
        /* fire and forget */
      })
    }
  }, [disclaimerAccepted])

  // Scroll-гейт: пока согласие не дано — CTA включается только после прочтения текста (5.4)
  const { sentinelRef, reachedEnd } = useScrollGate({ enabled: !disclaimerAccepted })

  const hasProgress = progress && progress.totalAnswered > 0
  const hasCumulativeScores = progress?.cumulativeScores !== null && progress?.cumulativeScores !== undefined

  const chartData = useMemo(() => {
    const scoresSource = progress?.cumulativeScores?.normalized ?? progress?.averagedScores
    if (!scoresSource) {
      return undefined
    }
    return PERSONALITY_TYPES.map((type) => {
      const label = isRu ? type.label : type.labelEn
      const archetype = isRu ? type.archetype : type.archetypeEn
      return {
        type: type.code,
        label: `${label} ${archetype}`,
        clinicalLabel: isRu ? type.clinical : type.clinicalEn,
        value: scoresSource[type.code] ?? 0,
      }
    })
  }, [progress, isRu])

  const confidenceData = useMemo(() => {
    return progress?.cumulativeScores?.confidence ?? null
  }, [progress])

  return (
    <Container maxW={showProfile ? '6xl' : '2xl'} pt={16} pb={0}>
      {
        /*
         * pb резервирует место под StickyActionBar (высота панели + отступ от
         * cookie-баннера, обе переменные публикует сам @letar/ui). Без этого при полной
         * прокрутке чекбокс согласия из DisclaimerConsent (последний элемент перед
         * панелью) физически попадал в зону, перекрытую sticky-панелью — клик по нему
         * не долетал: `elementFromPoint` в его координатах возвращал HStack панели, а не
         * сам чекбокс. Баг тем незаметнее, что панель ВСЕГДА видна и КАЖЕТСЯ отдельной
         * от контента, хотя физически перекрывает его при скролле до конца (archetest,
         * safety-net.spec.ts/mood-check-in.spec.ts, 2026-07-29 — Playwright воспроизвёл
         * на все 3 браузерах: клик по чекбоксу не блокировался actionability-проверкой,
         * но `Начать тест` оставался disabled, потому что состояние чекбокса не менялось).
         */
      }
      <VStack
        gap={8}
        textAlign="center"
        pb="calc(var(--letar-sticky-actionbar-height, 0px) + var(--letar-cookie-banner-height, 0px) + 1rem)"
      >
        <LuBrain size={64} />
        <Heading size="2xl">{t('title')}</Heading>
        <Text fontSize="lg" color="fg.muted" maxW="lg">
          {t('description')}
        </Text>

        {/* Прогресс (для пользователей с историей) */}
        {hasProgress && (
          <Box w="100%" maxW="lg" p={5} borderRadius="lg" borderWidth="1px" borderColor="border" bg="bg.subtle">
            <VStack gap={3}>
              <HStack gap={2}>
                <LuTrendingUp />
                <Text fontWeight="bold">{isRu ? 'Ваш прогресс' : 'Your Progress'}</Text>
              </HStack>

              <HStack w="100%" justify="space-between">
                <Text fontSize="sm" color="fg.muted">
                  {isRu
                    ? `Пройдено: ${progress!.totalAnswered} из ${progress!.totalQuestions} вопросов`
                    : `Completed: ${progress!.totalAnswered} of ${progress!.totalQuestions} questions`}
                </Text>
                <Text fontSize="sm" fontWeight="bold" color="blue.500">
                  {progress!.coveragePercent}%
                </Text>
              </HStack>

              <Progress.Root value={progress!.coveragePercent} size="sm" colorPalette="blue" w="100%">
                <Progress.Track>
                  <Progress.Range />
                </Progress.Track>
              </Progress.Root>

              {progress!.availableCount > 0
                ? (
                  <Text fontSize="xs" color="fg.muted">
                    {isRu
                      ? `Доступно ещё ${
                        progress!.availableCount
                      } новых вопросов. Чем больше вопросов — тем точнее профиль.`
                      : `${progress!.availableCount} more questions available. More questions = more accurate profile.`}
                  </Text>
                )
                : (
                  <Text fontSize="xs" color="green.500" fontWeight="bold">
                    {isRu
                      ? '🎉 Вы ответили на все доступные вопросы!'
                      : '🎉 You have answered all available questions!'}
                  </Text>
                )}

              {progress!.sessionsCount > 0 && (
                <Text fontSize="xs" color="fg.muted">
                  {isRu
                    ? `Сессий пройдено: ${progress!.sessionsCount}`
                    : `Sessions completed: ${progress!.sessionsCount}`}
                </Text>
              )}
            </VStack>
          </Box>
        )}

        {/* Информация о тесте */}
        <VStack gap={3} fontSize="sm" color="fg.muted">
          <Text>
            {hasProgress
              ? isRu
                ? '50 новых вопросов-сценариев с 4 вариантами ответа'
                : '50 new scenario questions with 4 answer options'
              : t('info.questions')}
          </Text>
          <Text>{t('info.time')}</Text>
        </VStack>

        {/* Дисклеймер с чекбоксом (скрываем если уже принято ранее) */}
        {!disclaimerAccepted && (
          <DisclaimerConsent accepted={disclaimerAccepted} onChange={setDisclaimerAccepted} isRu={isRu} />
        )}

        {/* Накопительный профиль */}
        {showProfile && chartData && (
          <VStack gap={8} w="100%">
            <PersonalityRadarChart
              data={chartData}
              title={isRu ? 'Накопительный профиль' : 'Cumulative Profile'}
              color="green.500"
              confidence={confidenceData as Record<string, string> | undefined}
            />
            {confidenceData && (
              <Text fontSize="xs" color="fg.muted" maxW="lg">
                {isRu
                  ? 'Серые секторы на диаграмме — шкалы с недостаточным количеством ответов. Пройдите ещё вопросов для повышения точности.'
                  : 'Gray sectors on the chart — scales with insufficient answers. Complete more questions to improve accuracy.'}
              </Text>
            )}
            {progress?.cumulativeScores && (
              <ProfileDetails
                scores={progress.cumulativeScores.normalized}
                confidence={progress.cumulativeScores.confidence}
                relevantCounts={progress.cumulativeScores.relevantCounts}
              />
            )}
          </VStack>
        )}

        {/* Маркер конца контента для scroll-гейта (5.4) */}
        <Box ref={sentinelRef} aria-hidden h="1px" w="100%" />
      </VStack>

      {/* Липкая CTA — всегда видна; старт disabled пока не прочитано и не дано согласие (5.4) */}
      <StickyActionBar bg="bg" mx={{ base: -4, md: 0 }}>
        <Button
          size="lg"
          colorPalette="blue"
          w={{ base: '100%', sm: 'auto' }}
          minW={{ sm: '14rem' }}
          onClick={onStart}
          disabled={!disclaimerAccepted || !reachedEnd}
        >
          {hasProgress ? (isRu ? 'Продолжить тест' : 'Continue Test') : t('start')}
        </Button>
        {hasCumulativeScores && (
          <Button size="lg" variant="outline" onClick={() => setShowProfile(!showProfile)}>
            <LuChartNoAxesCombined />
            {t('myProfile')}
          </Button>
        )}
      </StickyActionBar>
    </Container>
  )
}
