'use client'

import { useShowClinicalNames } from '@/app/_hooks/use-psychologist'
import { Link } from '@/i18n/navigation'
import { Alert, Box, Button, Container, Heading, HStack, Progress, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo } from 'react'
import { LuArrowRight, LuTriangleAlert } from 'react-icons/lu'
import type { ScaleConfidence } from '../_actions/quiz.action'
import type { PersonalityTypeCode } from '../_data/personality-types'
import { HEXAGRAM_SCALE_CODES, PERSONALITY_TYPES } from '../_data/personality-types'
import { needsDarkReassurance, needsSafetyNet } from '../_lib/safety-net'
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
  averagedScores: Record<PersonalityTypeCode, number> | null
  /** Авторизирован ли пользователь */
  isAuthenticated?: boolean
  onRestart: () => void
  /** Продолжить с новыми вопросами (null если все пройдены) */
  onContinue?: () => void
  newAchievements?: string[]
  rankInfo?: { rankCode: string; xp: number } | null
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
  isRu: boolean,
  showClinical: boolean,
): { type: 'info' | 'warning'; message: string }[] {
  const warnings: { type: 'info' | 'warning'; message: string }[] = []

  // BAR ≥ 40%: цикличность настроения может завышать эмоциональные шкалы
  if ((scores.BAR ?? 0) >= 40) {
    warnings.push({
      type: 'warning',
      message: showClinical
        ? isRu
          ? 'Высокий балл по шкале биполярного расстройства. Баллы по шкалам NAR, BOR, HIS, ANT могут быть завышены из-за маниакальных/депрессивных эпизодов. Рекомендуется клиническая оценка.'
          : 'High bipolar scale score. NAR, BOR, HIS, ANT scores may be inflated due to manic/depressive episodes. Clinical evaluation is recommended.'
        : isRu
        ? 'Заметна выраженная переменчивость настроения. В такие периоды баллы по эмоциональным шкалам могут быть выше обычного — учитывайте это, читая результат.'
        : 'Pronounced mood variability is present. During such periods, scores on emotional scales may be higher than usual — keep this in mind when reading the result.',
    })
  }

  // Дифференциальные заметки — только для психолога (клинический контекст)
  if (!showClinical) {
    return warnings
  }

  // BOR ≥ 40% + BAR ≥ 40%: дифференциальная диагностика
  if ((scores.BOR ?? 0) >= 40 && (scores.BAR ?? 0) >= 40) {
    warnings.push({
      type: 'info',
      message: isRu
        ? 'Высокие баллы одновременно по пограничному и биполярному расстройству. Ключевое различие: BOR — реактивные эмоции (часы), BAR — эндогенные циклы (дни–недели). Рекомендуется консультация специалиста.'
        : 'High scores on both borderline and bipolar scales. Key difference: BOR — reactive emotions (hours), BAR — endogenous cycles (days–weeks). Specialist consultation recommended.',
    })
  }

  // DPR ≥ 40% + BAR ≥ 30%: маскировка
  if ((scores.DPR ?? 0) >= 40 && (scores.BAR ?? 0) >= 30) {
    warnings.push({
      type: 'info',
      message: isRu
        ? 'Хронический пессимизм (DPR) может маскировать депрессивную фазу биполярного расстройства (BAR). Обратите внимание на наличие периодов подъёма.'
        : 'Chronic pessimism (DPR) may mask the depressive phase of bipolar disorder (BAR). Note any periods of elevation.',
    })
  }

  return warnings
}

/** Метка достоверности для UI */
export function QuizResults({
  scores,
  confidence,
  averagedScores,
  isAuthenticated = true,
  onRestart,
  onContinue,
  newAchievements,
  rankInfo,
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
  const warnings = useMemo(() => getWarnings(scores, isRu, showClinical), [scores, isRu, showClinical])
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
                {isRu
                  ? `Пройдено: ${progress.totalAnswered} из ${progress.totalQuestions} вопросов`
                  : `Completed: ${progress.totalAnswered} of ${progress.totalQuestions} questions`}
              </Text>
              <Text fontSize="sm" fontWeight="bold" color="blue.500">
                {progress.coveragePercent}%
              </Text>
            </HStack>
            <Progress.Root value={progress.coveragePercent} size="sm" colorPalette="blue">
              <Progress.Track>
                <Progress.Range />
              </Progress.Track>
            </Progress.Root>
            {progress.availableCount > 0 && (
              <Text fontSize="xs" color="fg.muted" mt={2}>
                {isRu
                  ? `Ещё ${progress.availableCount} вопросов доступно для повышения точности`
                  : `${progress.availableCount} more questions available for better accuracy`}
              </Text>
            )}
          </Box>
        )}

        {/* Кнопка «Продолжить» (главная CTA если есть ещё вопросы) */}
        {onContinue && progress && progress.availableCount > 0 && (
          <Button size="lg" colorPalette="blue" onClick={onContinue}>
            <LuArrowRight />
            {isRu
              ? `Пройти ещё ${Math.min(50, progress.availableCount)} вопросов`
              : `Answer ${Math.min(50, progress.availableCount)} more questions`}
          </Button>
        )}

        {/* Safety-net: кризисный блок с телефонами доверия (5.6.4) */}
        {showSafetyNet && <SafetyNetBlock isRu={isRu} />}

        {/* Предупреждения BAR-фильтра */}
        {warnings.map((w, i) => (
          <Alert.Root key={i} status={w.type === 'warning' ? 'warning' : 'info'} variant="outline" borderRadius="lg">
            <Alert.Indicator>
              <LuTriangleAlert />
            </Alert.Indicator>
            <Alert.Description>{w.message}</Alert.Description>
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
          <Box w="100%" p={6} borderRadius="lg" borderWidth="1px" borderColor="border">
            <HexagramChart
              scores={scores}
              title={isRu ? 'Архитектура личности' : 'Personality Architecture'}
              showNarrative
            />
          </Box>
        )}

        {/* Мягкая формулировка при высоких «тёмных» шкалах (5.6.4) */}
        {showDarkReassurance && <DarkReassuranceNote isRu={isRu} />}

        {/* Детали профиля: топ-3 ведущих ЧЕРТ в developmental-фрейме, взаимодействие, модификатор PAG */}
        <ProfileDetails scores={scores} confidence={confidence} />

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
                  <Text color="blue.500">•</Text>
                  <Text fontSize="sm">{t(`guestBanner.${key}`)}</Text>
                </HStack>
              ))}
            </SimpleGrid>
            <HStack gap={3}>
              <Button asChild size="md" colorPalette="blue">
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
                <Button size="lg" colorPalette="blue" onClick={onContinue}>
                  <LuArrowRight />
                  {isRu
                    ? `Пройти ещё ${Math.min(50, progress.availableCount)} вопросов`
                    : `Answer ${Math.min(50, progress.availableCount)} more questions`}
                </Button>
                <Button size="md" variant="ghost" onClick={onRestart}>
                  {isRu ? 'Вернуться на главную' : 'Back to main'}
                </Button>
              </>
            )
            : (
              <Button size="lg" colorPalette="blue" onClick={onRestart}>
                {t('results.retake')}
              </Button>
            )}
          {/* Поделиться результатом (5.4) */}
          <ShareResultButton shareText={t('shareText')} shareTitle={t('results.title')} size="md" />
          {/* Сокращённый дисклеймер */}
          <Text fontSize="xs" color="fg.subtle" textAlign="center" maxW="lg">
            {isRu
              ? 'Тест носит ориентировочный характер и не является диагностическим инструментом. Результаты не заменяют консультацию специалиста. При наличии трудностей обратитесь к квалифицированному психологу или психотерапевту.'
              : 'This test is indicative and is not a diagnostic tool. Results do not replace a specialist consultation. If you experience difficulties, consult a qualified psychologist or psychotherapist.'}
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
  const lowScales = PERSONALITY_TYPES.filter(
    (type) => confidence[type.code] === 'insufficient' || confidence[type.code] === 'low',
  )

  if (lowScales.length === 0) {
    return null
  }

  return (
    <Box w="100%" p={4} borderRadius="lg" bg="orange.50/5" borderWidth="1px" borderColor="orange.200">
      <Text fontSize="sm" fontWeight="bold" color="orange.500" mb={2}>
        {isRu ? '⚠ Шкалы с недостаточной точностью' : '⚠ Scales with insufficient accuracy'}
      </Text>
      <Text fontSize="xs" color="fg.muted" mb={2}>
        {isRu
          ? 'Для этих шкал пройдено мало релевантных вопросов. Пройдите ещё вопросов для повышения точности.'
          : 'Few relevant questions answered for these scales. Complete more questions to improve accuracy.'}
      </Text>
      <HStack flexWrap="wrap" gap={2}>
        {lowScales.map((type) => (
          <Box
            key={type.code}
            px={2}
            py={1}
            borderRadius="md"
            bg={confidence[type.code] === 'insufficient' ? 'gray.100/10' : 'orange.100/10'}
            borderWidth="1px"
            borderColor={confidence[type.code] === 'insufficient' ? 'gray.300' : 'orange.300'}
            borderStyle={confidence[type.code] === 'insufficient' ? 'dashed' : 'solid'}
          >
            <Text fontSize="xs" color={confidence[type.code] === 'insufficient' ? 'fg.subtle' : 'orange.500'}>
              {isRu ? type.label : type.labelEn} {isRu ? type.archetype : type.archetypeEn}
            </Text>
          </Box>
        ))}
      </HStack>
    </Box>
  )
}
