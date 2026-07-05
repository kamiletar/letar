'use client'

import { useShowClinicalNames } from '@/app/_hooks/use-psychologist'
import { Box, Card, Heading, Text, VStack } from '@chakra-ui/react'
import { useLocale } from 'next-intl'
import { useMemo } from 'react'
import type { ScaleConfidence } from '../_actions/quiz.action'
import type { PersonalityTypeCode } from '../_data/personality-types'
import { PERSONALITY_TYPES, replaceTypeCodes, STATE_CODES } from '../_data/personality-types'
import { getInteraction, getMoodModifier } from '../_data/type-interactions'
import { DevelopmentalProfileCard } from './developmental-profile-card'

interface ProfileDetailsProps {
  scores: Record<PersonalityTypeCode, number>
  confidence?: Record<PersonalityTypeCode, ScaleConfidence> | null
}

/** Метка достоверности */
function getConfidenceLabel(conf: ScaleConfidence, isRu: boolean): string | null {
  switch (conf) {
    case 'insufficient':
      return isRu ? 'Недостаточно данных' : 'Insufficient data'
    case 'low':
      return isRu ? 'Низкая точность' : 'Low accuracy'
    default:
      return null
  }
}

/**
 * Текстовые детали профиля: топ-3 типа, суперсила, взаимодействие, модификаторы.
 * Переиспользуется в quiz-results и quiz-intro (кнопка "Мой профиль").
 */
export function ProfileDetails({ scores, confidence }: ProfileDetailsProps) {
  const locale = useLocale()
  const isRu = locale === 'ru'
  const showClinical = useShowClinicalNames()

  // Топ-3 ведущих ЧЕРТ (состояния BAR/DPR исключены — они в отдельном блоке «Состояния»)
  const top3 = useMemo(() => {
    return PERSONALITY_TYPES.filter((type) => !STATE_CODES.includes(type.code))
      .map((type) => ({
        ...type,
        score: scores[type.code] ?? 0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
  }, [scores])

  return (
    <VStack gap={4} w="100%">
      {/* Топ-3 ведущих черт — developmental-фрейм: Суперсила → Ловушка → Практики (этап 5.6.1) */}
      <Heading size="lg">{isRu ? 'Ваши ведущие черты' : 'Your leading traits'}</Heading>
      <Text fontSize="sm" color="fg.muted" textAlign="center" maxW="2xl">
        {isRu
          ? 'Каждая черта — не приговор, а ресурс: у неё есть суперсила, ловушка и конкретные практики для роста.'
          : 'Each trait is a resource, not a verdict: it has a superpower, a trap, and concrete practices for growth.'}
      </Text>
      {top3.map((type, i) => {
        const conf = confidence?.[type.code]
        const confLabel = conf ? getConfidenceLabel(conf, isRu) : null
        return (
          <DevelopmentalProfileCard
            key={type.code}
            code={type.code}
            rank={i + 1}
            score={type.score}
            confidenceLabel={confLabel}
            showClinicalOverride={showClinical}
          />
        )
      })}

      {/* Взаимодействие топ-2 */}
      {top3.length >= 2 &&
        (() => {
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
                      {isRu ? 'Динамика' : 'Dynamic'}
                    </Text>
                    <Text fontSize="sm">
                      {replaceTypeCodes(
                        isRu ? interaction.dynamic : interaction.dynamicEn || interaction.dynamic,
                        isRu,
                        showClinical
                      )}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" fontSize="sm" color="green.500" mb={1}>
                      {isRu ? 'Сильные стороны' : 'Strengths'}
                    </Text>
                    <Text fontSize="sm">
                      {replaceTypeCodes(
                        isRu ? interaction.strengths : interaction.strengthsEn || interaction.strengths,
                        isRu,
                        showClinical
                      )}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" fontSize="sm" color="orange.500" mb={1}>
                      {isRu ? 'Зоны риска' : 'Risk areas'}
                    </Text>
                    <Text fontSize="sm">
                      {replaceTypeCodes(
                        isRu ? interaction.risks : interaction.risksEn || interaction.risks,
                        isRu,
                        showClinical
                      )}
                    </Text>
                  </Box>
                  <Box p={3} bg="bg.subtle" borderRadius="md" w="100%">
                    <Text fontWeight="bold" fontSize="sm" mb={1}>
                      {isRu ? 'Совет' : 'Advice'}
                    </Text>
                    <Text fontSize="sm">
                      {replaceTypeCodes(
                        isRu ? interaction.advice : interaction.adviceEn || interaction.advice,
                        isRu,
                        showClinical
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
                {isRu
                  ? `Если у вас выражен ${type?.label ?? code} (${type?.archetype ?? ''})`
                  : `If ${type?.labelEn ?? code} (${type?.archetypeEn ?? ''}) is pronounced`}
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
