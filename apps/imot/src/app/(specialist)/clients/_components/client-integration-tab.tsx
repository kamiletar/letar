/* oxlint-disable no-explicit-any */
'use client'

import { IntegrationReport } from '@/app/_components'
import type { ClientProfiles } from '@/lib/utils/integration-analysis'
import { analyzeIntegration } from '@/lib/utils/integration-analysis'
import { Alert, Box, Text } from '@chakra-ui/react'
import { LuInfo } from 'react-icons/lu'

interface ClientIntegrationTabProps {
  profiles: {
    numerology: any | null
    neuroPsych: any | null
    energy: any | null
    body: any | null
    style: any | null
  }
}

export function ClientIntegrationTab({ profiles }: ClientIntegrationTabProps) {
  // Проверяем, есть ли хотя бы 2 профиля для анализа
  const profilesCount = Object.values(profiles).filter((p) => p !== null).length

  if (profilesCount < 2) {
    return (
      <Box>
        <Alert.Root status="info">
          <LuInfo />
          <Alert.Title>Недостаточно данных для анализа интеграции</Alert.Title>
          <Alert.Description>
            Для проведения анализа интеграции необходимо заполнить как минимум 2 профиля из 5 уровней диагностики.
            Перейдите на вкладку "Профили" чтобы заполнить недостающие профили.
          </Alert.Description>
        </Alert.Root>
      </Box>
    )
  }

  // Преобразуем профили в формат для анализа
  const clientProfiles: ClientProfiles = {
    numerology: profiles.numerology
      ? {
          personalityNumber: profiles.numerology.personalityNumber,
          destinyNumber: profiles.numerology.destinyNumber,
          soulNumber: profiles.numerology.soulNumber,
          talents: profiles.numerology.talents,
          karmicLessons: profiles.numerology.karmicLessons,
        }
      : null,
    neuroPsych: profiles.neuroPsych
      ? {
          behaviorPatterns: profiles.neuroPsych.behaviorPatterns,
          cognitiveStyle: profiles.neuroPsych.cognitiveStyle,
          defenseMechanisms: profiles.neuroPsych.defenseMechanisms,
          emotionalPatterns: profiles.neuroPsych.emotionalPatterns,
        }
      : null,
    energy: profiles.energy
      ? {
          rootChakra: profiles.energy.rootChakra,
          sacralChakra: profiles.energy.sacralChakra,
          solarPlexusChakra: profiles.energy.solarPlexusChakra,
          heartChakra: profiles.energy.heartChakra,
          throatChakra: profiles.energy.throatChakra,
          thirdEyeChakra: profiles.energy.thirdEyeChakra,
          crownChakra: profiles.energy.crownChakra,
          moneyChannelLevel: profiles.energy.moneyChannelLevel,
          relationshipEnergy: profiles.energy.relationshipEnergy,
        }
      : null,
    body: profiles.body
      ? {
          tensionMap: profiles.body.tensionMap,
          psychosomaticIssues: profiles.body.psychosomaticIssues,
          breathingPatterns: profiles.body.breathingPatterns,
        }
      : null,
    style: profiles.style
      ? {
          colorType: profiles.style.colorType,
          primaryArchetype: profiles.style.primaryArchetype,
          secondaryArchetype: profiles.style.secondaryArchetype,
          authenticityLevel: profiles.style.authenticityLevel,
        }
      : null,
  }

  // Проводим анализ интеграции
  const analysis = analyzeIntegration(clientProfiles)

  return (
    <Box>
      <Text fontSize="lg" fontWeight="medium" mb={4}>
        Анализ интеграции между 5 уровнями диагностики
      </Text>
      <Text color="fg.muted" mb={6}>
        Этот анализ выявляет точки пересечения между разными уровнями диагностики и помогает понять глубинные паттерны
        личности клиента.
      </Text>
      <IntegrationReport analysis={analysis} />
    </Box>
  )
}
