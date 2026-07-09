'use client'

import { Container, Heading, Text, VStack } from '@chakra-ui/react'
import { notFound } from 'next/navigation'

import { ExperimentalScalesBlock } from '../../cabinet/[clientId]/_components/experimental-scales-block'
import { type ScaleCode, SCORED_SCALE_CODES } from '../../_data/personality-types'

/**
 * Dev-страница визуальной проверки блока экспериментальных шкал (этап 5.5) —
 * только для разработки. Показывает блок с примерными баллами для трёх
 * сценариев индекса «Броня и Радар» (Громоотвод / Крепость / Оголённый нерв).
 */
export default function ExperimentalDevPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  const base = Object.fromEntries(SCORED_SCALE_CODES.map((code) => [code, 40])) as Record<ScaleCode, number>

  // Громоотвод: высокая броня + высокий радар
  const lightningRod: Record<ScaleCode, number> = { ...base, RES_PHYS: 82, RES_AFF: 74, SPEC_INT: 55 }
  // Крепость: высокая броня + низкий радар
  const fortress: Record<ScaleCode, number> = { ...base, RES_PHYS: 78, RES_AFF: 22, SPEC_INT: 30 }
  // Оголённый нерв: низкая броня + высокий радар
  const bareNerve: Record<ScaleCode, number> = { ...base, RES_PHYS: 18, RES_AFF: 81, SPEC_INT: 65 }

  return (
    <Container maxW="3xl" py={8}>
      <VStack gap={8} align="stretch">
        <Heading size="lg">Экспериментальные шкалы — dev-превью (5.5)</Heading>

        <VStack gap={2} align="stretch">
          <Text fontWeight="bold" color="fg.muted">
            Сценарий «Громоотвод» (броня↑ радар↑)
          </Text>
          <ExperimentalScalesBlock scores={lightningRod} />
        </VStack>

        <VStack gap={2} align="stretch">
          <Text fontWeight="bold" color="fg.muted">
            Сценарий «Крепость» (броня↑ радар↓)
          </Text>
          <ExperimentalScalesBlock scores={fortress} />
        </VStack>

        <VStack gap={2} align="stretch">
          <Text fontWeight="bold" color="fg.muted">
            Сценарий «Оголённый нерв» (броня↓ радар↑)
          </Text>
          <ExperimentalScalesBlock scores={bareNerve} />
        </VStack>
      </VStack>
    </Container>
  )
}
