'use client'

import { useShowClinicalNames } from '@/app/_hooks/use-psychologist'
import { Badge, Box, Card, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { useLocale } from 'next-intl'
import { LuShieldAlert, LuSparkles, LuTarget } from 'react-icons/lu'
import { getGrowthPractices, PRACTICE_METHOD_LABELS } from '../_data/growth-practices'
import type { PersonalityTypeCode } from '../_data/personality-types'
import { getPersonalityType, replaceTypeCodes } from '../_data/personality-types'
import { getPositiveProfile } from '../_data/positive-profiles'

interface DevelopmentalProfileCardProps {
  code: PersonalityTypeCode
  /** Порядковый номер в топе (для заголовка «1.») */
  rank?: number
  /** Балл шкалы (%) — показывается рядом с заголовком */
  score?: number
  /** Нижняя граница 95%-интервала точности (ipsative, 5.6) */
  ciLow?: number
  /** Верхняя граница 95%-интервала точности (ipsative, 5.6) */
  ciHigh?: number
  /** Метка достоверности (например «Низкая точность»); null/undefined — не показывать */
  confidenceLabel?: string | null
  /** Показывать ли клинический ярлык (психолог/админ). По умолчанию берётся из роли. */
  showClinicalOverride?: boolean
}

/**
 * Карточка developmental-фрейма для одной шкалы (этап 5.6.1):
 * три блока — **Суперсила** (как черта работает в плюс) →
 * **Ловушка** (когда вредит, без стигмы) →
 * **Практики** (конкретные доказательные действия).
 *
 * Клинический ярлык показывается только психологу/админу — юзер видит только архетип.
 */
export function DevelopmentalProfileCard({
  code,
  rank,
  score,
  ciLow,
  ciHigh,
  confidenceLabel,
  showClinicalOverride,
}: DevelopmentalProfileCardProps) {
  const locale = useLocale()
  const isRu = locale === 'ru'
  const showClinicalRole = useShowClinicalNames()
  const showClinical = showClinicalOverride ?? showClinicalRole

  const type = getPersonalityType(code)
  const profile = getPositiveProfile(code)
  const practices = getGrowthPractices(code)

  const label = isRu ? type.label : type.labelEn
  const archetype = isRu ? type.archetype : type.archetypeEn
  const trap = isRu ? type.whenHigh : type.whenHighEn
  const superpower = profile
    ? replaceTypeCodes(isRu ? profile.text : profile.textEn || profile.text, isRu, showClinical)
    : null

  return (
    <Card.Root w="100%" variant="outline" borderColor={type.color}>
      <Card.Body>
        <VStack align="stretch" gap={5}>
          {/* Заголовок: архетип (+ клиника только для психолога) + бета-метка */}
          <HStack gap={2} align="baseline" flexWrap="wrap">
            <Heading size="md">
              {rank !== undefined && `${rank}. `}
              {label}{' '}
              <Box asChild fontWeight="normal">
                <span>{archetype}</span>
              </Box>
            </Heading>
            {type.beta && (
              <Badge colorPalette="purple" variant="subtle" size="sm">
                β {isRu ? 'бета' : 'beta'}
              </Badge>
            )}
            {showClinical && (
              <Text color="fg.muted" fontWeight="normal" fontSize="sm">
                ({isRu ? type.clinical : type.clinicalEn})
              </Text>
            )}
            {confidenceLabel && (
              <Badge colorPalette="warning" variant="subtle" size="sm">
                {confidenceLabel}
              </Badge>
            )}
          </HStack>

          {score !== undefined && (
            <HStack gap={2} mt={-3} align="baseline">
              <Text
                fontSize="sm"
                color={score >= 60 ? 'error.fg' : score >= 40 ? 'warning.fg' : 'fg.muted'}
                fontWeight={score >= 60 ? 'bold' : 'normal'}
              >
                {score}%
              </Text>
              {/* 95%-интервал точности ipsative-ранжирования (5.6) */}
              {ciLow !== undefined && ciHigh !== undefined && (
                <Text fontSize="xs" color="fg.muted">
                  {isRu
                    ? `диапазон ${Math.round(ciLow)}–${Math.round(ciHigh)}%`
                    : `range ${Math.round(ciLow)}–${Math.round(ciHigh)}%`}
                </Text>
              )}
            </HStack>
          )}

          {/* Блок 1: Суперсила */}
          {superpower && (
            <Box>
              <HStack gap={2} mb={2} color="success.fg">
                <LuSparkles />
                <Heading size="sm">{isRu ? 'Суперсила' : 'Superpower'}</Heading>
              </HStack>
              <Text whiteSpace="pre-line" fontSize="sm" lineHeight="tall" color="fg">
                {superpower}
              </Text>
            </Box>
          )}

          {/* Блок 2: Ловушка */}
          {trap && (
            <Box p={3} bg="bg.subtle" borderRadius="md" borderLeft="3px solid" borderLeftColor="warning.solid">
              <HStack gap={2} mb={2} color="warning.fg">
                <LuShieldAlert />
                <Heading size="sm">{isRu ? 'Ловушка' : 'The trap'}</Heading>
              </HStack>
              {/* fg.muted, не fg.subtle: на карточке bg.subtle приглушённый текст проваливал AA */}
              <Text fontSize="sm" lineHeight="tall" color="fg.muted">
                {replaceTypeCodes(trap, isRu, showClinical)}
              </Text>
            </Box>
          )}

          {/* Блок 3: Практики */}
          {practices.length > 0 && (
            <Box>
              <HStack gap={2} mb={3} color="info.fg">
                <LuTarget />
                <Heading size="sm">{isRu ? 'Практики' : 'Practices'}</Heading>
              </HStack>
              <VStack align="stretch" gap={3}>
                {practices.map((practice, i) => (
                  <HStack key={i} align="start" gap={3}>
                    <Text color="info.fg" fontWeight="bold" fontSize="sm" lineHeight="tall">
                      {i + 1}.
                    </Text>
                    <Box>
                      <Text fontSize="sm" lineHeight="tall">
                        {isRu ? practice.text : practice.textEn}
                      </Text>
                      <Badge mt={1} colorPalette="info" variant="surface" size="sm">
                        {isRu ? PRACTICE_METHOD_LABELS[practice.method].ru : PRACTICE_METHOD_LABELS[practice.method].en}
                      </Badge>
                    </Box>
                  </HStack>
                ))}
              </VStack>
            </Box>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
