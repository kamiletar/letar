'use client'

import { Box, Button, Checkbox, Container, Heading, HStack, Progress, Text, VStack } from '@chakra-ui/react'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'
import { LuBrain, LuChartNoAxesCombined, LuTrendingUp } from 'react-icons/lu'
import { acceptDisclaimerAction } from '../_actions/disclaimer.action'
import type { QuizProgress } from '../_actions/quiz.action'
import { PERSONALITY_TYPES } from '../_data/personality-types'
import { PersonalityRadarChart } from './personality-radar-chart'
import { ProfileDetails } from './profile-details'

interface QuizIntroProps {
  onStart: () => void
  /** Прогресс пользователя (null для неавторизованных / первый раз) */
  progress?: QuizProgress | null
  /** Дисклеймер уже принят (из БД) */
  initialDisclaimerAccepted?: boolean
}

/** Полный текст дисклеймера (из disclaimer.md от психолога) */
const DISCLAIMER_RU = `Данный тест является инструментом самопознания и не предназначен для постановки медицинских или психологических диагнозов. Результаты теста носят ориентировочный характер и отражают выраженность определённых личностных черт, а не наличие психического расстройства.

Тест не заменяет консультацию квалифицированного специалиста — психолога, психотерапевта или психиатра. Если результаты вызывают у вас беспокойство или вы испытываете трудности в повседневной жизни, рекомендуется обратиться к специалисту для профессиональной оценки.

Результаты теста не могут использоваться в качестве основания для принятия медицинских, юридических, кадровых или иных решений, затрагивающих права и интересы человека.

Каждый человек уникален. Любой тип личности имеет свои сильные стороны и зоны роста. Высокий балл по какой-либо шкале не означает «проблему» — он указывает на выраженную черту, которая может быть как ресурсом, так и источником трудностей в зависимости от контекста.`

const DISCLAIMER_EN = `This test is a self-discovery tool and is not intended for medical or psychological diagnosis. Results are indicative and reflect the expression of certain personality traits, not the presence of a mental disorder.

The test does not replace consultation with a qualified specialist — psychologist, psychotherapist, or psychiatrist. If results cause concern or you experience difficulties in everyday life, professional evaluation is recommended.

Test results cannot be used as a basis for medical, legal, employment, or other decisions affecting a person's rights and interests.

Every person is unique. Every personality type has strengths and growth areas. A high score on any scale does not mean a "problem" — it indicates a pronounced trait that can be both a resource and a source of difficulty depending on context.`

export function QuizIntro({ onStart, progress, initialDisclaimerAccepted }: QuizIntroProps) {
  const t = useTranslations('quiz')
  const locale = useLocale()
  const isRu = locale === 'ru'
  const [showProfile, setShowProfile] = useState(false)
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(() => {
    // Приоритет: сервер (БД) → localStorage
    if (initialDisclaimerAccepted) { return true }
    if (typeof window === 'undefined') { return false }
    return localStorage.getItem('quiz_disclaimer_accepted') === '1'
  })

  // Сохраняем согласие в localStorage + БД
  useEffect(() => {
    if (disclaimerAccepted) {
      localStorage.setItem('quiz_disclaimer_accepted', '1')
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
    <Container maxW={showProfile ? '6xl' : '2xl'} py={16}>
      <VStack gap={8} textAlign="center">
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

              {progress!.availableCount > 0 ? (
                <Text fontSize="xs" color="fg.muted">
                  {isRu
                    ? `Доступно ещё ${
                        progress!.availableCount
                      } новых вопросов. Чем больше вопросов — тем точнее профиль.`
                    : `${progress!.availableCount} more questions available. More questions = more accurate profile.`}
                </Text>
              ) : (
                <Text fontSize="xs" color="green.500" fontWeight="bold">
                  {isRu ? '🎉 Вы ответили на все доступные вопросы!' : '🎉 You have answered all available questions!'}
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
          <Box
            w="100%"
            maxW="lg"
            p={5}
            borderRadius="lg"
            borderWidth="1px"
            borderColor="border"
            bg="bg.subtle"
            textAlign="left"
          >
            <Text fontSize="xs" color="fg.muted" whiteSpace="pre-line" mb={4}>
              {isRu ? DISCLAIMER_RU : DISCLAIMER_EN}
            </Text>
            <Checkbox.Root
              checked={disclaimerAccepted}
              onCheckedChange={(e) => {
                setDisclaimerAccepted(!!e.checked)
              }}
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label fontSize="sm">
                {isRu ? 'Я ознакомился и согласен' : 'I have read and agree'}
              </Checkbox.Label>
            </Checkbox.Root>
          </Box>
        )}

        <HStack gap={3}>
          <Button size="lg" colorPalette="blue" onClick={onStart} disabled={!disclaimerAccepted}>
            {hasProgress ? (isRu ? 'Продолжить тест' : 'Continue Test') : t('start')}
          </Button>
          {hasCumulativeScores && (
            <Button size="lg" variant="outline" onClick={() => setShowProfile(!showProfile)}>
              <LuChartNoAxesCombined />
              {t('myProfile')}
            </Button>
          )}
        </HStack>

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
              />
            )}
          </VStack>
        )}
      </VStack>
    </Container>
  )
}
