'use client'

import { Box, Button, Container, Heading, HStack, Progress, Text, VStack } from '@chakra-ui/react'
import { StickyActionBar } from '@letar/ui'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'
import { LuBrain, LuChartNoAxesCombined, LuTrendingUp } from 'react-icons/lu'
import { acceptDisclaimerAction } from '../_actions/disclaimer.action'
import type { QuizProgress } from '../_actions/quiz.action'
import { DISCLAIMER_CONSENT_KEY } from '../_data/disclaimer'
import { PERSONALITY_TYPES } from '../_data/personality-types'
import { DisclaimerConsentCheckbox, DisclaimerSummary } from './disclaimer-consent'
import { PersonalityRadarChart } from './personality-radar-chart'
import { ProfileDetails } from './profile-details'
import { STICKY_BAR_BLEED } from './sticky-bar-bleed'

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
  // Дефолт совпадает на сервере и при первом клиентском рендере — localStorage
  // читается только в useEffect ниже, иначе гидратация "поженит" DOM с чужим
  // значением и клик по чекбоксу перестанет срабатывать
  // (см. .claude/docs/ssr-hydration-persisted-state.md)
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(() => Boolean(initialDisclaimerAccepted))

  // Приоритет: сервер (БД) → localStorage — подтягиваем сохранённое согласие после монтирования
  useEffect(() => {
    if (!initialDisclaimerAccepted && localStorage.getItem(DISCLAIMER_CONSENT_KEY) === '1') {
      // Гидратация из localStorage после монтирования, см. комментарий у useState выше
      // oxlint-disable-next-line react/set-state-in-effect
      setDisclaimerAccepted(true)
    }
  }, [initialDisclaimerAccepted])

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
      {/* pb резервирует место под StickyActionBar (высота панели + отступ от cookie-баннера) */}
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
                <Text fontSize="sm" fontWeight="bold" color="brand.fg">
                  {progress!.coveragePercent}%
                </Text>
              </HStack>

              <Progress.Root value={progress!.coveragePercent} size="sm" colorPalette="brand" w="100%">
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
                  <Text fontSize="xs" color="success.fg" fontWeight="bold">
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

        {/* Сводка дисклеймера (скрываем если уже принято ранее); чекбокс — в StickyActionBar ниже */}
        {!disclaimerAccepted && <DisclaimerSummary isRu={isRu} />}

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
                  ? 'Бледные коды на диаграмме — шкалы с недостаточным количеством ответов. Пройдите ещё вопросов для повышения точности.'
                  : 'Faded codes on the chart — scales with insufficient answers. Complete more questions to improve accuracy.'}
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
      </VStack>

      {/* Липкая панель: чекбокс согласия (пока не принято) + CTA, всегда вместе на экране (UX-фикс 2026-07-29) */}
      <StickyActionBar bg="bg" {...STICKY_BAR_BLEED}>
        <VStack gap={3} w="100%">
          {!disclaimerAccepted && (
            <DisclaimerConsentCheckbox accepted={disclaimerAccepted} onChange={setDisclaimerAccepted} isRu={isRu} />
          )}
          {
            /* На телефоне кнопки делят ширину поровну (flex: 1): прежний `w=100%` у первой
              выталкивал «Мой профиль» за край экрана и давал горизонтальный скролл */
          }
          <HStack gap={3} justify="center" w="100%">
            <Button
              size="lg"
              colorPalette="brand"
              flex={{ base: '1', sm: 'initial' }}
              minW={{ base: 0, sm: '14rem' }}
              onClick={onStart}
              disabled={!disclaimerAccepted}
            >
              {hasProgress ? (isRu ? 'Продолжить тест' : 'Continue Test') : t('start')}
            </Button>
            {hasCumulativeScores && (
              <Button
                size="lg"
                variant="outline"
                flex={{ base: '1', sm: 'initial' }}
                minW={0}
                aria-expanded={showProfile}
                onClick={() => setShowProfile(!showProfile)}
              >
                <LuChartNoAxesCombined />
                {t('myProfile')}
              </Button>
            )}
          </HStack>
        </VStack>
      </StickyActionBar>
    </Container>
  )
}
