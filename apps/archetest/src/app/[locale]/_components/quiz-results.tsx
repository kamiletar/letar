'use client'

import { useShowClinicalNames } from '@/app/_hooks/use-psychologist'
import { Link } from '@/i18n/navigation'
import { Alert, Box, Button, Container, Heading, HStack, Progress, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo } from 'react'
import { LuArrowRight, LuTriangleAlert } from 'react-icons/lu'
import type { PersonalityTypeCode } from '../_data/personality-types'
import { HEXAGRAM_SCALE_CODES, PERSONALITY_TYPES } from '../_data/personality-types'
import { needsDarkReassurance, needsSafetyNet } from '../_lib/safety-net'
import type { ScaleConfidence } from '../_lib/scoring-core'
import { AchievementCard } from './achievement-card'
import { HexagramChart } from './hexagram-chart'
import { PersonalityRadarChart } from './personality-radar-chart'
import { ProfileDetails } from './profile-details'
import { PsychologistLinkBlock } from './psychologist-link-block'
import { RankBadge } from './rank-badge'
import { DarkReassuranceNote, SafetyNetBlock } from './safety-net-block'
import { ShareResultButton } from './share-result-button'
import { StatesBlock } from './states-block'

interface QuizResultsProps {
  scores: Record<PersonalityTypeCode, number>
  /** Достоверность шкал (от сервера) */
  confidence?: Record<PersonalityTypeCode, ScaleConfidence> | null
  /** Число отвеченных релевантных вопросов по шкалам (от сервера) — вход ipsative-интервалов (5.6) */
  relevantCounts?: Record<PersonalityTypeCode, number> | null
  averagedScores: Record<PersonalityTypeCode, number> | null
  /** Авторизирован ли пользователь */
  isAuthenticated?: boolean
  onRestart: () => void
  /** Продолжить с новыми вопросами (null если все пройдены) */
  onContinue?: () => void
  newAchievements?: string[]
  rankInfo?: { rankCode: string; xp: number } | null
  /**
   * Вошла ли сессия в XP (5.9.3, гибрид: XP-гранула — сутки).
   * false → мягкая подпись «XP за сегодня уже получены», undefined → подпись не показывается
   */
  xpCountedToday?: boolean
  /** Прогресс прохождения */
  progress?: {
    totalAnswered: number
    totalQuestions: number
    coveragePercent: number
    availableCount: number
  }
}

/**
 * Генерация предупреждений по правилам BAR-фильтра.
 *
 * Клиническая лексика (названия расстройств, «клиническая оценка», дифференциальная
 * диагностика) показывается ТОЛЬКО психологу/админу (`showClinical`, этап 5.6.1).
 * Юзер видит мягкую developmental-формулировку без ярлыков — сопровождение специалиста
 * при этом предлагается в блоке «Состояния» через практики.
 */
function getWarnings(
  scores: Record<PersonalityTypeCode, number>,
  showClinical: boolean,
): { type: 'info' | 'warning'; messageKey: 'barClinical' | 'barUser' | 'borBar' | 'dprBar' }[] {
  const warnings: { type: 'info' | 'warning'; messageKey: 'barClinical' | 'barUser' | 'borBar' | 'dprBar' }[] = []

  // BAR ≥ 40%: цикличность настроения может завышать эмоциональные шкалы
  if ((scores.BAR ?? 0) >= 40) {
    warnings.push({ type: 'warning', messageKey: showClinical ? 'barClinical' : 'barUser' })
  }

  // Дифференциальные заметки — только для психолога (клинический контекст)
  if (!showClinical) {
    return warnings
  }

  // BOR ≥ 40% + BAR ≥ 40%: дифференциальная диагностика
  if ((scores.BOR ?? 0) >= 40 && (scores.BAR ?? 0) >= 40) {
    warnings.push({ type: 'info', messageKey: 'borBar' })
  }

  // DPR ≥ 40% + BAR ≥ 30%: маскировка
  if ((scores.DPR ?? 0) >= 40 && (scores.BAR ?? 0) >= 30) {
    warnings.push({ type: 'info', messageKey: 'dprBar' })
  }

  return warnings
}

/** Метка достоверности для UI */
export function QuizResults({
  scores,
  confidence,
  relevantCounts,
  averagedScores,
  isAuthenticated = true,
  onRestart,
  onContinue,
  newAchievements,
  rankInfo,
  xpCountedToday,
  progress,
}: QuizResultsProps) {
  const t = useTranslations('quiz')
  const locale = useLocale()
  const isRu = locale === 'ru'
  const showClinical = useShowClinicalNames()
  // Данные для радарного чарта — формат «Бдительный Страж»
  const chartData = useMemo(
    () =>
      PERSONALITY_TYPES.map((type) => {
        const label = isRu ? type.label : type.labelEn
        const archetype = isRu ? type.archetype : type.archetypeEn
        return {
          type: type.code,
          label: `${label} ${archetype}`,
          clinicalLabel: isRu ? type.clinical : type.clinicalEn,
          value: scores[type.code] ?? 0,
        }
      }),
    [scores, isRu],
  )

  const comparisonData = useMemo(
    () =>
      averagedScores
        ? PERSONALITY_TYPES.map((type) => {
          const label = isRu ? type.label : type.labelEn
          const archetype = isRu ? type.archetype : type.archetypeEn
          return {
            type: type.code,
            label: `${label} ${archetype}`,
            clinicalLabel: isRu ? type.clinical : type.clinicalEn,
            value: averagedScores[type.code] ?? 0,
          }
        })
        : undefined,
    [averagedScores, isRu],
  )

  // Предупреждения BAR-фильтра (клиническая лексика — только психологу)
  const warnings = useMemo(() => getWarnings(scores, showClinical), [scores, showClinical])
  // Safety-net (5.6.4): кризисный блок при выраженных шкалах состояния (DPR/BAR/BOR ≥ 60%)
  const showSafetyNet = useMemo(() => needsSafetyNet(scores), [scores])
  // Мягкая формулировка при высоких «тёмных» шкалах
  const showDarkReassurance = useMemo(() => needsDarkReassurance(scores), [scores])

  return (
    <Container maxW="6xl" py={8}>
      <VStack gap={8}>
        <Heading size="xl" textAlign="center">
          {t('results.title')}
        </Heading>

        {/* Прогресс прохождения */}
        {progress && (
          <Box
            w="100%"
            maxW="lg"
            mx="auto"
            p={4}
            borderRadius="lg"
            bg="bg.subtle"
            borderWidth="1px"
            borderColor="border"
          >
            <HStack justify="space-between" mb={2}>
              <Text fontSize="sm" color="fg.muted">
                {t('coverage.completed', { answered: progress.totalAnswered, total: progress.totalQuestions })}
              </Text>
              <Text fontSize="sm" fontWeight="bold" color="brand.fg">
                {progress.coveragePercent}%
              </Text>
            </HStack>
            <Progress.Root value={progress.coveragePercent} size="sm" colorPalette="brand">
              <Progress.Track>
                <Progress.Range />
              </Progress.Track>
            </Progress.Root>
            {progress.availableCount > 0 && (
              <Text fontSize="xs" color="fg.muted" mt={2}>
                {t('results.moreAvailable', { count: progress.availableCount })}
              </Text>
            )}
          </Box>
        )}

        {/* Кнопка «Продолжить» (главная CTA если есть ещё вопросы) */}
        {onContinue && progress && progress.availableCount > 0 && (
          <VStack gap={1}>
            <Button size="lg" colorPalette="brand" onClick={onContinue}>
              <LuArrowRight />
              {t('results.answerMore', { count: Math.min(50, progress.availableCount) })}
            </Button>
            {/* 5.9.3 (гибрид): XP раз в сутки — повторные порции дня уточняют профиль без XP */}
            {xpCountedToday === false && (
              <Text fontSize="xs" color="fg.muted" textAlign="center">
                {t('results.xpAlreadyEarned')}
              </Text>
            )}
          </VStack>
        )}

        {/* Safety-net: кризисный блок с телефонами доверия (5.6.4) */}
        {showSafetyNet && <SafetyNetBlock />}

        {/* Предупреждения BAR-фильтра */}
        {warnings.map((w, i) => (
          <Alert.Root key={i} status={w.type === 'warning' ? 'warning' : 'info'} variant="outline" borderRadius="lg">
            <Alert.Indicator>
              <LuTriangleAlert />
            </Alert.Indicator>
            <Alert.Description>{t(`results.warnings.${w.messageKey}`)}</Alert.Description>
          </Alert.Root>
        ))}

        {/* Радарные диаграммы */}
        <SimpleGrid columns={{ base: 1, lg: averagedScores ? 2 : 1 }} gap={8} w="100%">
          <PersonalityRadarChart
            data={chartData}
            title={t('results.currentSession')}
            color="green.500"
            comparisonData={comparisonData}
            comparisonColor="gray.400"
            comparisonTitle={averagedScores ? t('results.averaged') : undefined}
            confidence={confidence as Record<string, string> | undefined}
          />
          {averagedScores && (
            <PersonalityRadarChart data={comparisonData!} title={t('results.averaged')} color="gray.400" />
          )}
        </SimpleGrid>

        {/* Индикаторы достоверности для шкал с низкой точностью */}
        {confidence && <LowConfidenceWarnings confidence={confidence} isRu={isRu} />}

        {/* Гексаграмма триад (этап 5.2) — только если сессия покрыла шкалы триад (банк v2) */}
        {HEXAGRAM_SCALE_CODES.some((code) => (scores[code] ?? 0) > 0) && (
          <Box w="100%" p={{ base: 4, md: 6 }} borderRadius="lg" borderWidth="1px" borderColor="border">
            <HexagramChart
              scores={scores}
              title={t('results.architectureTitle')}
              showNarrative
            />
          </Box>
        )}

        {/* Мягкая формулировка при высоких «тёмных» шкалах (5.6.4) */}
        {showDarkReassurance && <DarkReassuranceNote />}

        {/* Детали профиля: топ-3 ведущих ЧЕРТ в developmental-фрейме (ipsative-ранжирование), взаимодействие, модификатор PAG */}
        <ProfileDetails scores={scores} confidence={confidence} relevantCounts={relevantCounts} />

        {/* Состояния (BAR/DPR) — отдельно от черт (5.6.1) */}
        <StatesBlock scores={scores} confidence={confidence} />

        {/* Зачем проходить снова */}
        <Box w="100%" p={6} borderRadius="lg" bg="bg.subtle" borderWidth="1px" borderColor="border">
          <Heading size="md" mb={3}>
            {t('results.whyRetake.title')}
          </Heading>
          <Text color="fg.muted">{t('results.whyRetake.description')}</Text>
        </Box>

        {/* Ранг и достижения */}
        {rankInfo && (
          <Box w="100%" p={6} borderRadius="lg" borderWidth="1px" borderColor="border">
            <Heading size="md" mb={3}>
              {t('ranks.title')}
            </Heading>
            <RankBadge rankCode={rankInfo.rankCode} xp={rankInfo.xp} showProgress />
          </Box>
        )}

        {/* Новые достижения */}
        {newAchievements && newAchievements.length > 0 && (
          <Box w="100%">
            <Heading size="md" mb={3}>
              {t('achievements.newUnlocked')} 🎉
            </Heading>
            <HStack gap={3} overflowX="auto" pb={2}>
              {newAchievements.map((code) => (
                <AchievementCard key={code} code={code} unlocked unlockedAt={new Date()} />
              ))}
            </HStack>
          </Box>
        )}

        {/* Баннер для незалогиненных — предложение сохранить результаты */}
        {!isAuthenticated && (
          <Box w="100%" p={6} borderRadius="lg" bg="bg.subtle" borderWidth="1px" borderColor="border">
            <Heading size="md" mb={3}>
              {t('guestBanner.title')}
            </Heading>
            <Text color="fg.muted" mb={4}>
              {t('guestBanner.description')}
            </Text>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={2} mb={4}>
              {(['benefit1', 'benefit2', 'benefit3', 'benefit4'] as const).map((key) => (
                <HStack key={key} gap={2} align="start">
                  <Text color="brand.fg">•</Text>
                  <Text fontSize="sm">{t(`guestBanner.${key}`)}</Text>
                </HStack>
              ))}
            </SimpleGrid>
            <HStack gap={3}>
              <Button asChild size="md" colorPalette="brand">
                <Link href="/sign-in">{t('guestBanner.signIn')}</Link>
              </Button>
              <Button asChild size="md" variant="outline">
                <Link href="/sign-in">{t('guestBanner.signUp')}</Link>
              </Button>
            </HStack>
          </Box>
        )}

        {/* Блок привязки психолога */}
        <PsychologistLinkBlock />

        {/* Действия */}
        <VStack gap={3}>
          {onContinue && progress && progress.availableCount > 0
            ? (
              <>
                <Button size="lg" colorPalette="brand" onClick={onContinue}>
                  <LuArrowRight />
                  {t('results.answerMore', { count: Math.min(50, progress.availableCount) })}
                </Button>
                <Button size="md" variant="ghost" onClick={onRestart}>
                  {t('results.backToMain')}
                </Button>
              </>
            )
            : (
              <Button size="lg" colorPalette="brand" onClick={onRestart}>
                {t('results.retake')}
              </Button>
            )}
          {/* Поделиться результатом (5.4) */}
          <ShareResultButton shareText={t('shareText')} shareTitle={t('results.title')} size="md" />
          {/* Сокращённый дисклеймер */}
          <Text fontSize="xs" color="fg.subtle" textAlign="center" maxW="lg">
            {t('results.shortDisclaimer')}
          </Text>
        </VStack>
      </VStack>
    </Container>
  )
}

/** Предупреждения о шкалах с низкой достоверностью */
function LowConfidenceWarnings({
  confidence,
  isRu,
}: {
  confidence: Record<PersonalityTypeCode, ScaleConfidence>
  isRu: boolean
}) {
  const t = useTranslations('quiz')
  const lowScales = PERSONALITY_TYPES.filter(
    (type) => confidence[type.code] === 'insufficient' || confidence[type.code] === 'low',
  )

  if (lowScales.length === 0) {
    return null
  }

  return (
    <Box
      w="100%"
      p={4}
      borderRadius="lg"
      bg="bg.subtle"
      borderWidth="1px"
      borderColor="border"
      borderLeftWidth="3px"
      borderLeftColor="warning.solid"
    >
      <Text fontSize="sm" fontWeight="bold" color="warning.fg" mb={2}>
        {t('results.lowConfidence.title')}
      </Text>
      <Text fontSize="xs" color="fg.muted" mb={2}>
        {t('results.lowConfidence.hint')}
      </Text>
      <HStack flexWrap="wrap" gap={2}>
        {lowScales.map((type) => (
          <Box
            key={type.code}
            px={2}
            py={1}
            borderRadius="md"
            borderWidth="1px"
            borderColor={confidence[type.code] === 'insufficient' ? 'border.emphasized' : 'warning.emphasized'}
            borderStyle={confidence[type.code] === 'insufficient' ? 'dashed' : 'solid'}
          >
            <Text fontSize="xs" color={confidence[type.code] === 'insufficient' ? 'fg.muted' : 'warning.fg'}>
              {isRu ? type.label : type.labelEn} {isRu ? type.archetype : type.archetypeEn}
            </Text>
          </Box>
        ))}
      </HStack>
    </Box>
  )
}
