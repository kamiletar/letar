'use client'

import { Badge, Box, Card, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { useLocale, useTranslations } from 'next-intl'
import { ScoreBar } from '../../../_components/score-bar'
import { getScaleName } from '../../../_data/personality-types'
import type { DarkCoreCode, DarkCoreIndex } from '../../../_lib/dark-core'

interface DarkCoreBlockProps {
  /** Уже посчитанный индекс — гейт показа тоже по нему (structure !== 'insufficient') */
  index: DarkCoreIndex
}

/** Конструктное название шкалы — психологу показываем открыто */
function scaleName(code: DarkCoreCode, isRu: boolean): string {
  return getScaleName(code, { audience: 'clinician', triadAlias: true }, isRu)
}

/** Отклонение со знаком */
function signed(value: number): string {
  return value > 0 ? `+${value}` : `${value}`
}

/**
 * Индекс «Тёмное ядро» (Фаза 3) — ТОЛЬКО кабинет психолога.
 * Приближение D-фактора из четырёх тёмных шкал ядра + разложение на «вкусы».
 *
 * Порядок блоков намеренный: структурный вывод стоит ВЫШЕ числа. Число — процент
 * от максимума, а не перцентиль, и не должно работать заголовком: психолог якорится
 * на первом, что видит.
 */
export function DarkCoreBlock({ index }: DarkCoreBlockProps) {
  const isRu = useLocale() === 'ru'
  const t = useTranslations('cabinet.darkCore')

  return (
    <Card.Root w="100%" variant="outline" borderColor="gray.400">
      <Card.Body>
        <HStack mb={1} gap={2}>
          <Heading size="md">{t('title')}</Heading>
          <Badge colorPalette="gray" variant="subtle" size="sm">
            {t('badge')}
          </Badge>
        </HStack>
        <Text fontSize="xs" color="fg.subtle" mb={4}>
          {t('intro')}
        </Text>

        {/* 1. Структурный вывод — главное */}
        <Box p={3} bg="bg.subtle" borderRadius="md" mb={4}>
          <Text fontWeight="bold" fontSize="sm" mb={1}>
            {isRu ? index.label : index.labelEn}
            {index.leadingFlavor && `: ${scaleName(index.leadingFlavor.code, isRu)}`}
          </Text>
          <Text fontSize="xs" color="fg.muted" mb={2}>
            {isRu ? index.description : index.descriptionEn}
          </Text>
          <Text fontSize="xs" color="orange.500">
            {t('attention')}
            {isRu ? index.attention : index.attentionEn}
          </Text>
        </Box>

        {/* 2. Вкусы — что остаётся от шкалы, если вычесть общее ядро */}
        <VStack gap={4} align="stretch" mb={4}>
          {index.flavors.map((flavor) => (
            <Box key={flavor.code}>
              <HStack justify="space-between" mb={1} gap={2}>
                <HStack gap={2} flexWrap="wrap">
                  <Text fontWeight="bold" fontSize="sm">
                    {scaleName(flavor.code, isRu)} · {isRu ? flavor.label : flavor.labelEn}
                  </Text>
                  {flavor.pronounced && (
                    <Badge colorPalette={flavor.deviation > 0 ? 'orange' : 'blue'} variant="subtle" size="xs">
                      {signed(flavor.deviation)}
                    </Badge>
                  )}
                  {flavor.source === 'extrapolated' && (
                    <Badge colorPalette="purple" variant="outline" size="xs">
                      {t('extrapolated')}
                    </Badge>
                  )}
                </HStack>
                <Text fontWeight="bold" fontSize="sm" color="fg.muted" whiteSpace="nowrap">
                  {flavor.score}%
                </Text>
              </HStack>
              <ScoreBar
                value={flavor.score}
                color={flavor.pronounced && flavor.deviation > 0 ? 'orange.400' : 'gray.400'}
                mb={2}
              />
              <Text fontSize="xs" color="fg.muted">
                {flavor.pronounced
                  ? isRu
                    ? flavor.description
                    : flavor.descriptionEn
                  : isRu
                  ? flavor.residual
                  : flavor.residualEn}
              </Text>
              <Text fontSize="2xs" color="fg.subtle" mt={1}>
                {t('answers')}
                {flavor.n} · {t('intervalPrefix')}
                {flavor.ciLow}–{flavor.ciHigh}% · {t(`confidence.${flavor.confidence}`)}
              </Text>
            </Box>
          ))}
        </VStack>

        {/* 3. Число — НЕ заголовок блока */}
        {index.core !== null && (
          <Box p={3} bg="bg.subtle" borderRadius="md" mb={3}>
            <Text fontSize="sm">
              <Text as="span" fontWeight="bold">
                {t('coreLevel')}
                {index.core}%
              </Text>
              {index.coreCiLow !== null
                && ` (${t('interval')} ${index.coreCiLow}–${index.coreCiHigh}%)`}
            </Text>
            {index.spread !== null && (
              <Text fontSize="xs" color="fg.muted" mt={1}>
                {t('spread')}
                {index.spread} {t('points')}
              </Text>
            )}
            {index.profile && (
              <Text fontSize="xs" color="fg.muted" mt={1}>
                {t('profileRank', {
                  meanRank: index.profile.meanRank,
                  totalScales: index.profile.totalScales,
                  inTopN: index.profile.inTopN,
                  topN: index.profile.topN,
                  direction: index.profile.coreVsProfile >= 0 ? 'above' : 'below',
                  gap: Math.abs(index.profile.coreVsProfile),
                })}
              </Text>
            )}
            {index.missingCodes.length > 0 && (
              <Text fontSize="2xs" color="fg.subtle" mt={1}>
                {t('notMeasured')}
                {index.missingCodes.map((code) => scaleName(code, isRu)).join(', ')}
              </Text>
            )}
          </Box>
        )}

        {/* 4. Анализ чувствительности — нарциссизм документированно ухудшает приближение */}
        {index.narcissismDrivesEstimate && index.coreWithoutNarcissism !== null && (
          <Box p={3} bg="bg.subtle" borderRadius="md" mb={3}>
            <Text fontSize="xs" color="fg.muted">
              {t('withoutNarcissism', {
                coreWithoutNarcissism: index.coreWithoutNarcissism,
                narcissismDelta: signed(index.narcissismDelta ?? 0),
              })}
            </Text>
          </Box>
        )}

        {/* 5. Оговорка — обязательна, приходит из модуля вместе с числом */}
        <Text fontSize="2xs" color="fg.subtle">
          {isRu ? index.caveat : index.caveatEn}
        </Text>
      </Card.Body>
    </Card.Root>
  )
}
