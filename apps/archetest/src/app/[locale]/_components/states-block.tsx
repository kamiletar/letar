'use client'

import { useShowClinicalNames } from '@/app/_hooks/use-psychologist'
import { Box, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { LuActivity } from 'react-icons/lu'
import type { PersonalityTypeCode } from '../_data/personality-types'
import { STATE_CODES } from '../_data/personality-types'
import type { ScaleConfidence } from '../_lib/scoring-core'
import { DevelopmentalProfileCard } from './developmental-profile-card'
import { useScaleConfidenceLabel } from './use-scale-confidence-label'

interface StatesBlockProps {
  scores: Record<PersonalityTypeCode, number>
  confidence?: Record<PersonalityTypeCode, ScaleConfidence> | null
  /** Порог отображения состояния (%). По умолчанию 40. */
  threshold?: number
}

/**
 * Блок «Состояния» (этап 5.6.1): BAR и DPR — эпизодические аффективные состояния,
 * а не устойчивые черты. Показывать их в радаре рядом с чертами — категориальная ошибка,
 * заметная специалисту. Отдельный блок с дестигматизирующим нарративом «черты стабильны,
 * состояния приходят и уходят». Каждое состояние получает тот же developmental-фрейм
 * (суперсила → ловушка → практики), где практики включают опору на сопровождение специалиста.
 */
export function StatesBlock({ scores, confidence, threshold = 40 }: StatesBlockProps) {
  const t = useTranslations('statesBlock')
  const confidenceLabel = useScaleConfidenceLabel()
  const showClinical = useShowClinicalNames()

  const activeStates = STATE_CODES.filter((code) => (scores[code] ?? 0) >= threshold)

  if (activeStates.length === 0) {
    return null
  }

  return (
    <Box w="100%">
      <HStack gap={2} mb={2} color="orange.500">
        <LuActivity />
        <Heading size="lg">{t('title')}</Heading>
      </HStack>
      <Text fontSize="sm" color="fg.muted" mb={4} maxW="2xl">
        {t('intro')}
      </Text>
      <VStack align="stretch" gap={4}>
        {activeStates.map((code) => (
          <DevelopmentalProfileCard
            key={code}
            code={code}
            score={scores[code] ?? 0}
            confidenceLabel={confidenceLabel(confidence?.[code])}
            showClinicalOverride={showClinical}
          />
        ))}
      </VStack>
    </Box>
  )
}
