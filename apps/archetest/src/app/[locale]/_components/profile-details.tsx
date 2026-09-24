'use client'

import { useShowClinicalNames } from '@/app/_hooks/use-psychologist'
import { Box, Card, Heading, Text, VStack } from '@chakra-ui/react'
import { useLocale, useTranslations } from 'next-intl'
import { Fragment, useMemo } from 'react'
import type { PersonalityTypeCode } from '../_data/personality-types'
import { PERSONALITY_TYPES, replaceTypeCodes, STATE_CODES } from '../_data/personality-types'
import { getInteraction, getMoodModifier } from '../_data/type-interactions'
import type { IpsativeScale } from '../_lib/ipsative'
import { computeIpsativeRanking } from '../_lib/ipsative'
import type { ScaleConfidence } from '../_lib/scoring-core'
import { DevelopmentalProfileCard } from './developmental-profile-card'
import { useScaleConfidenceLabel } from './use-scale-confidence-label'

interface ProfileDetailsProps {
  scores: Record<PersonalityTypeCode, number>
  confidence?: Record<PersonalityTypeCode, ScaleConfidence> | null
  /** Число отвеченных релевантных вопросов по шкалам — включает ipsative-интервалы (5.6) */
  relevantCounts?: Record<PersonalityTypeCode, number> | null
}

/**
 * Текстовые детали профиля: топ-3 типа, суперсила, взаимодействие, модификаторы.
 * Переиспользуется в quiz-results и quiz-intro (кнопка "Мой профиль").
 */
export function ProfileDetails({ scores, confidence, relevantCounts }: ProfileDetailsProps) {
  const locale = useLocale()
  const isRu = locale === 'ru'
  const t = useTranslations('profileDetails')
  const confidenceLabel = useScaleConfidenceLabel()
  const showClinical = useShowClinicalNames()

  // Ipsative-ранжирование (5.6): ранги внутри профиля + 95%-интервалы точности.
  // Без relevantCounts (клиентский фолбэк гостя/сетевой ошибки) — прежняя сортировка без интервалов
  const ranking = useMemo(
    () => (relevantCounts ? computeIpsativeRanking(scores, relevantCounts, { exclude: STATE_CODES }) : null),
    [scores, relevantCounts],
  )

  // Топ-3 ведущих ЧЕРТ (состояния BAR/DPR исключены — они в отдельном блоке «Состояния»)
  const top3 = useMemo(() => {
    const entryByCode = new Map<PersonalityTypeCode, IpsativeScale>(ranking?.map((r) => [r.code, r]) ?? [])
    return PERSONALITY_TYPES.filter((type) => !STATE_CODES.includes(type.code))
      .map((type) => ({
        ...type,
        score: scores[type.code] ?? 0,
        ipsative: entryByCode.get(type.code),
      }))
      .sort((a, b) => (a.ipsative && b.ipsative ? a.ipsative.rank - b.ipsative.rank : b.score - a.score))
      .slice(0, 3)
  }, [scores, ranking])

  return (
    <VStack gap={4} w="100%">
      {/* Топ-3 ведущих черт — developmental-фрейм: Суперсила → Ловушка → Практики (этап 5.6.1) */}
      <Heading size="lg">{t('title')}</Heading>
      <Text fontSize="sm" color="fg.muted" textAlign="center" maxW="2xl">
        {t('resourceNote')}
      </Text>
      {/* Методологическая подпись ipsative-ранжирования (5.6) */}
      {ranking && (
        <Text fontSize="xs" color="fg.subtle" textAlign="center" maxW="2xl">
          {t('ipsativeNote')}
        </Text>
      )}
      {top3.map((type, i) => {
        const conf = confidence?.[type.code]
        const confLabel = confidenceLabel(conf)
        // Перекрывающиеся интервалы соседей = статистически неразличимы: честно говорим,
        // что порядок условен, вместо ложной точности «61,2% > 60,8%»
        const next = top3[i + 1]
        const tiedWithNext = type.ipsative !== undefined
          && next?.ipsative !== undefined
          && type.ipsative.tieGroup === next.ipsative.tieGroup
        return (
          <Fragment key={type.code}>
            <DevelopmentalProfileCard
              code={type.code}
              rank={i + 1}
              score={type.score}
              ciLow={type.ipsative?.ciLow}
              ciHigh={type.ipsative?.ciHigh}
              confidenceLabel={confLabel}
              showClinicalOverride={showClinical}
            />
            {tiedWithNext && (
              <Text fontSize="xs" color="fg.muted" textAlign="center">
                {t('tiedNote')}
              </Text>
            )}
          </Fragment>
        )
      })}

      {/* Взаимодействие топ-2 */}
      {top3.length >= 2
        && (() => {
          const interaction = getInteraction(top3[0].code, top3[1].code)
          if (!interaction) {
            return null
          }
          const label1 = `${isRu ? top3[0].label : top3[0].labelEn} ${isRu ? top3[0].archetype : top3[0].archetypeEn}`
          const label2 = `${isRu ? top3[1].label : top3[1].labelEn} ${isRu ? top3[1].archetype : top3[1].archetypeEn}`
          return (
            <Card.Root w="100%" variant="outline">
              <Card.Body>
                <Heading size="md" mb={3}>
                  {label1} + {label2}
                </Heading>
                <VStack align="start" gap={3}>
                  <Box>
                    <Text fontWeight="bold" fontSize="sm" color="fg.muted" mb={1}>
                      {t('dynamic')}
                    </Text>
                    <Text fontSize="sm">
                      {replaceTypeCodes(
                        isRu ? interaction.dynamic : interaction.dynamicEn || interaction.dynamic,
                        isRu,
                        showClinical,
                      )}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" fontSize="sm" color="green.500" mb={1}>
                      {t('strengths')}
                    </Text>
                    <Text fontSize="sm">
                      {replaceTypeCodes(
                        isRu ? interaction.strengths : interaction.strengthsEn || interaction.strengths,
                        isRu,
                        showClinical,
                      )}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" fontSize="sm" color="orange.500" mb={1}>
                      {t('risks')}
                    </Text>
                    <Text fontSize="sm">
                      {replaceTypeCodes(
                        isRu ? interaction.risks : interaction.risksEn || interaction.risks,
                        isRu,
                        showClinical,
                      )}
                    </Text>
                  </Box>
                  <Box p={3} bg="bg.subtle" borderRadius="md" w="100%">
                    <Text fontWeight="bold" fontSize="sm" mb={1}>
                      {t('advice')}
                    </Text>
                    <Text fontSize="sm">
                      {replaceTypeCodes(
                        isRu ? interaction.advice : interaction.adviceEn || interaction.advice,
                        isRu,
                        showClinical,
                      )}
                    </Text>
                  </Box>
                </VStack>
              </Card.Body>
            </Card.Root>
          )
        })()}

      {/* Модификатор PAG ≥ 40% (состояния BAR/DPR вынесены в отдельный блок «Состояния») */}
      {(['PAG'] as const).map((code) => {
        if ((scores[code] ?? 0) < 40) {
          return null
        }
        const mod = getMoodModifier(code)
        if (!mod) {
          return null
        }
        const type = PERSONALITY_TYPES.find((t) => t.code === code)
        return (
          <Card.Root key={code} w="100%" variant="outline" borderColor="orange.300">
            <Card.Body>
              <Heading size="sm" mb={2}>
                {t('ifPronounced', {
                  label: (isRu ? type?.label : type?.labelEn) ?? code,
                  archetype: (isRu ? type?.archetype : type?.archetypeEn) ?? '',
                })}
              </Heading>
              <VStack align="start" gap={2}>
                <Text fontSize="sm">
                  {replaceTypeCodes(isRu ? mod.forSelf : mod.forSelfEn || mod.forSelf, isRu, showClinical)}
                </Text>
              </VStack>
            </Card.Body>
          </Card.Root>
        )
      })}
    </VStack>
  )
}
