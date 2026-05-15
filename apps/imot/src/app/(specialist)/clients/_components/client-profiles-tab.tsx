'use client'

import type { Archetype, ColorType } from '@/generated/prisma'
import { AccordionItem, AccordionItemContent, AccordionItemTrigger, AccordionRoot } from '@chakra-ui/react'
import { BodyProfileForm, EnergyProfileForm, NeuroPsychProfileForm, NumerologyProfileForm, StyleProfileForm } from '.'
import {
  upsertBodyProfile,
  upsertEnergyProfile,
  upsertNeuroPsychProfile,
  upsertNumerologyProfile,
  upsertStyleProfile,
} from '../_actions/profile.actions'

/**
 * Конвертирует null значения в undefined для совместимости Prisma → Form
 */
function nullToUndefined<T extends Record<string, unknown>>(
  obj: T | null | undefined
): { [K in keyof T]: Exclude<T[K], null> | undefined } | undefined {
  if (!obj) {
    return undefined
  }
  const result = {} as { [K in keyof T]: Exclude<T[K], null> | undefined }
  for (const key in obj) {
    const value = obj[key]
    result[key] = (value === null ? undefined : value) as Exclude<T[typeof key], null> | undefined
  }
  return result
}

interface ClientProfilesTabProps {
  clientId: string
  profiles: {
    numerology?: {
      lifePathNumber?: number | null
      destinyNumber?: number | null
      soulNumber?: number | null
      personalityNumber?: number | null
      maturityNumber?: number | null
      currentCycle?: string | null
      cycleDescription?: string | null
      talents?: string | null
      gifts?: string | null
      purpose?: string | null
      karmicLessons?: string | null
      karmicDebts?: string | null
      matrixData?: string | null
      notes?: string | null
    } | null
    neuroPsych?: {
      behaviorPatterns?: string | null
      cognitiveStyle?: string | null
      learningStyle?: string | null
      decisionMaking?: string | null
      defenseMechanisms?: string | null
      copingStrategies?: string | null
      emotionalPatterns?: string | null
      triggers?: string | null
      resourceStates?: string | null
      strengths?: string | null
      notes?: string | null
    } | null
    energy?: {
      rootChakra?: number | null
      sacralChakra?: number | null
      solarPlexusChakra?: number | null
      heartChakra?: number | null
      throatChakra?: number | null
      thirdEyeChakra?: number | null
      crownChakra?: number | null
      energyBlocks?: string | null
      blockageAreas?: string | null
      moneyChannelLevel?: number | null
      moneyBlockages?: string | null
      relationshipEnergy?: number | null
      relationshipBlocks?: string | null
      vitalityLevel?: number | null
      energyLeaks?: string | null
      notes?: string | null
    } | null
    body?: {
      tensionMap?: string | null
      tensionAreas?: string | null
      psychosomaticIssues?: string | null
      symptoms?: string | null
      chronicConditions?: string | null
      breathingPatterns?: string | null
      breathingIssues?: string | null
      bodyResources?: string | null
      physicalStrengths?: string | null
      bodyMindConnection?: string | null
      bodyMessages?: string | null
      notes?: string | null
    } | null
    style?: {
      colorType?: ColorType | null
      colorPalette?: string | null
      colorRecommendations?: string | null
      primaryArchetype?: Archetype | null
      secondaryArchetype?: Archetype | null
      archetypeDescription?: string | null
      selfExpression?: string | null
      authenticityLevel?: number | null
      innerOuterAlignment?: string | null
      styleConflicts?: string | null
      styleRecommendations?: string | null
      notes?: string | null
    } | null
  }
}

/**
 * Клиентский компонент для вкладки профилей с аккордеоном
 */
export function ClientProfilesTab({ clientId, profiles }: ClientProfilesTabProps) {
  return (
    <AccordionRoot collapsible multiple defaultValue={['numerology']}>
      {/* 1. Нумерология */}
      <AccordionItem value="numerology">
        <AccordionItemTrigger>
          1. Нумерология - Матрица судьбы {profiles.numerology ? '(Заполнен)' : '(Не заполнен)'}
        </AccordionItemTrigger>
        <AccordionItemContent>
          <NumerologyProfileForm
            onSubmit={upsertNumerologyProfile}
            clientId={clientId}
            defaultValue={nullToUndefined(profiles.numerology)}
          />
        </AccordionItemContent>
      </AccordionItem>

      {/* 2. Нейропсихология */}
      <AccordionItem value="neuropsych">
        <AccordionItemTrigger>
          2. Нейропсихология - Паттерны поведения {profiles.neuroPsych ? '(Заполнен)' : '(Не заполнен)'}
        </AccordionItemTrigger>
        <AccordionItemContent>
          <NeuroPsychProfileForm
            onSubmit={upsertNeuroPsychProfile}
            clientId={clientId}
            defaultValue={nullToUndefined(profiles.neuroPsych)}
          />
        </AccordionItemContent>
      </AccordionItem>

      {/* 3. Энергетика */}
      <AccordionItem value="energy">
        <AccordionItemTrigger>
          3. Энергетика - 7 чакр {profiles.energy ? '(Заполнен)' : '(Не заполнен)'}
        </AccordionItemTrigger>
        <AccordionItemContent>
          <EnergyProfileForm
            onSubmit={upsertEnergyProfile}
            clientId={clientId}
            defaultValue={nullToUndefined(profiles.energy)}
          />
        </AccordionItemContent>
      </AccordionItem>

      {/* 4. Тело */}
      <AccordionItem value="body">
        <AccordionItemTrigger>
          4. Тело - Карта зажимов {profiles.body ? '(Заполнен)' : '(Не заполнен)'}
        </AccordionItemTrigger>
        <AccordionItemContent>
          <BodyProfileForm
            onSubmit={upsertBodyProfile}
            clientId={clientId}
            defaultValue={nullToUndefined(profiles.body)}
          />
        </AccordionItemContent>
      </AccordionItem>

      {/* 5. Стиль */}
      <AccordionItem value="style">
        <AccordionItemTrigger>
          5. Стиль - Цветотип и архетип {profiles.style ? '(Заполнен)' : '(Не заполнен)'}
        </AccordionItemTrigger>
        <AccordionItemContent>
          <StyleProfileForm
            onSubmit={upsertStyleProfile}
            clientId={clientId}
            defaultValue={nullToUndefined(profiles.style)}
          />
        </AccordionItemContent>
      </AccordionItem>
    </AccordionRoot>
  )
}
