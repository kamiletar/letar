'use client'

import { useShowClinicalNames } from '@/app/_hooks/use-psychologist'
import { Box, Card, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { useLocale } from 'next-intl'
import { useMemo } from 'react'
import type { ScaleConfidence } from '../_actions/quiz.action'
import type { PersonalityTypeCode } from '../_data/personality-types'
import { PERSONALITY_TYPES, replaceTypeCodes } from '../_data/personality-types'
import { getPositiveProfile } from '../_data/positive-profiles'
import { getInteraction, getMoodModifier } from '../_data/type-interactions'

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

  const top3 = useMemo(() => {
    return PERSONALITY_TYPES.map((type) => ({
      ...type,
      score: scores[type.code] ?? 0,
    }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
  }, [scores])

  return (
    <VStack gap={4} w="100%">
      {/* Топ-3 типа */}
      <Heading size="lg">{isRu ? 'Ваши ведущие типы' : 'Your top types'}</Heading>
      {top3.map((type, i) => {
        const conf = confidence?.[type.code]
        const confLabel = conf ? getConfidenceLabel(conf, isRu) : null
        return (
          <Card.Root key={type.code} w="100%" variant="outline">
            <Card.Body>
              <VStack align="start" gap={2}>
                <HStack gap={2} align="baseline" flexWrap="wrap">
                  <Heading size="md">
                    {i + 1}. {isRu ? type.label : type.labelEn}{' '}
                    <Text as="span" fontWeight="normal">
                      {isRu ? type.archetype : type.archetypeEn}
                    </Text>
                  </Heading>
                  {showClinical && (
                    <Text color="fg.muted" fontWeight="normal" fontSize="sm">
                      ({isRu ? type.clinical : type.clinicalEn})
                    </Text>
                  )}
                  {confLabel && (
                    <Text
                      fontSize="xs"
                      color="white"
                      bg="orange.500"
                      px={1.5}
                      py={0.5}
                      borderRadius="sm"
                      fontWeight="medium"
                    >
                      {confLabel}
                    </Text>
                  )}
                </HStack>
                <Text
                  fontSize="sm"
                  color={type.score >= 60 ? 'red.500' : type.score >= 40 ? 'orange.500' : 'fg.muted'}
                  fontWeight={type.score >= 60 ? 'bold' : 'normal'}
                >
                  {type.score}%
                </Text>
                <Text color="fg" lineHeight="tall">
                  {isRu ? type.description : type.descriptionEn}
                </Text>
                {type.score >= 40 && (
                  <Box
                    mt={2}
                    p={3}
                    bg="bg.subtle"
                    borderRadius="md"
                    borderLeft="3px solid"
                    borderLeftColor={type.color}
                  >
                    <Text fontSize="sm" color="fg.subtle">
                      {isRu ? type.whenHigh : type.whenHighEn}
                    </Text>
                  </Box>
                )}
              </VStack>
            </Card.Body>
          </Card.Root>
        )
      })}

      {/* Суперсила — топ-1 */}
      {top3[0] &&
        (() => {
          const profile = getPositiveProfile(top3[0].code)
          if (!profile) {
            return null
          }
          return (
            <Card.Root w="100%" variant="outline" borderColor={top3[0].color}>
              <Card.Body>
                <Heading size="md" mb={3}>
                  {isRu ? 'Ваша суперсила' : 'Your superpower'}: {isRu ? top3[0].label : top3[0].labelEn}{' '}
                  {isRu ? top3[0].archetype : top3[0].archetypeEn}
                </Heading>
                <Text whiteSpace="pre-line" fontSize="sm" lineHeight="tall">
                  {replaceTypeCodes(isRu ? profile.text : profile.textEn || profile.text, isRu, showClinical)}
                </Text>
              </Card.Body>
            </Card.Root>
          )
        })()}

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

      {/* Модификаторы BAR/PAG/DPR ≥ 40% */}
      {(['BAR', 'PAG', 'DPR'] as const).map((code) => {
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
