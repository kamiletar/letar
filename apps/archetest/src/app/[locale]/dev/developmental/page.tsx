'use client'

import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'
import { notFound } from 'next/navigation'

import { DevelopmentalProfileCard } from '../../_components/developmental-profile-card'
import { StatesBlock } from '../../_components/states-block'
import { ALL_SCALE_CODES, STATE_CODES } from '../../_data/personality-types'

/**
 * Dev-страница визуальной проверки developmental-фрейма (этап 5.6.1) — только для разработки.
 * Показывает карточку «Суперсила → Ловушка → Практики» для всех 22 шкал (как юзер, без клиники)
 * и блок «Состояния» с примерными баллами BAR/DPR.
 */
export default function DevelopmentalDevPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  // Примерные баллы: состояния выражены, чтобы блок «Состояния» отрисовался
  const sampleScores = Object.fromEntries(
    ALL_SCALE_CODES.map((code) => [code, STATE_CODES.includes(code) ? 65 : 50])
  ) as Record<(typeof ALL_SCALE_CODES)[number], number>

  const traitCodes = ALL_SCALE_CODES.filter((code) => !STATE_CODES.includes(code))

  return (
    <Container maxW="3xl" py={8}>
      <VStack gap={6} align="stretch">
        <Heading size="lg">Developmental-фрейм — dev-превью (5.6.1)</Heading>

        <Box>
          <Text fontWeight="bold" mb={2}>
            Блок «Состояния» (BAR/DPR как состояния, не черты)
          </Text>
          <StatesBlock scores={sampleScores} threshold={40} />
        </Box>

        <Box>
          <Text fontWeight="bold" mb={2}>
            Карточки черт (Суперсила → Ловушка → Практики), взгляд юзера — без клиники
          </Text>
          <VStack gap={4} align="stretch">
            {traitCodes.map((code, i) => (
              <DevelopmentalProfileCard
                key={code}
                code={code}
                rank={i + 1}
                score={sampleScores[code]}
                showClinicalOverride={false}
              />
            ))}
          </VStack>
        </Box>
      </VStack>
    </Container>
  )
}
