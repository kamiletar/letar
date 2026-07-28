'use client'

import { Badge, Box, Card, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { useLocale } from 'next-intl'
import { ScoreBar } from '../../../_components/score-bar'
import { getScaleName } from '../../../_data/personality-types'
import type { DarkCoreCode, DarkCoreIndex } from '../../../_lib/dark-core'
import type { ScaleConfidence } from '../../../_lib/scoring-core'

interface DarkCoreBlockProps {
  /** Уже посчитанный индекс — гейт показа тоже по нему (structure !== 'insufficient') */
  index: DarkCoreIndex
}

/** Конструктное название шкалы — психологу показываем открыто */
function scaleName(code: DarkCoreCode, isRu: boolean): string {
  return getScaleName(code, { audience: 'clinician', triadAlias: true }, isRu)
}

/** Подпись достоверности. Это покрытие банка вопросов, а не надёжность измерения */
function confidenceLabel(confidence: ScaleConfidence, isRu: boolean): string {
  const ru: Record<ScaleConfidence, string> = {
    insufficient: 'минимальное покрытие банка',
    low: 'низкое покрытие банка',
    moderate: 'среднее покрытие банка',
    high: 'высокое покрытие банка',
  }
  const en: Record<ScaleConfidence, string> = {
    insufficient: 'minimal item coverage',
    low: 'low item coverage',
    moderate: 'moderate item coverage',
    high: 'high item coverage',
  }
  return isRu ? ru[confidence] : en[confidence]
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

  return (
    <Card.Root w="100%" variant="outline" borderColor="gray.400">
      <Card.Body>
        <HStack mb={1} gap={2}>
          <Heading size="md">{isRu ? 'Тёмное ядро' : 'Dark core'}</Heading>
          <Badge colorPalette="gray" variant="subtle" size="sm">
            {isRu ? 'приближение D' : 'D approximation'}
          </Badge>
        </HStack>
        <Text fontSize="xs" color="fg.subtle" mb={4}>
          {isRu
            ? 'Общий фактор четырёх тёмных шкал (макиавеллизм, нарциссизм, психопатия, садизм) и разложение на «вкусы» по Bader et al. (2023). Клиенту не показывается. Кумулятивно по всем ответам — динамики по сессиям здесь нет.'
            : 'The common factor of four dark scales (Machiavellianism, narcissism, psychopathy, sadism) and its decomposition into “flavors” per Bader et al. (2023). Not shown to the client. Cumulative across all answers — no per-session dynamics here.'}
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
            {isRu ? 'На что обратить внимание: ' : 'Attention: '}
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
                      {isRu ? 'экстраполяция' : 'extrapolated'}
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
                {isRu ? 'Ответов: ' : 'Answers: '}
                {flavor.n} · {isRu ? 'интервал ' : 'interval '}
                {flavor.ciLow}–{flavor.ciHigh}% · {confidenceLabel(flavor.confidence, isRu)}
              </Text>
            </Box>
          ))}
        </VStack>

        {/* 3. Число — НЕ заголовок блока */}
        {index.core !== null && (
          <Box p={3} bg="bg.subtle" borderRadius="md" mb={3}>
            <Text fontSize="sm">
              <Text as="span" fontWeight="bold">
                {isRu ? 'Уровень ядра: ' : 'Core level: '}
                {index.core}%
              </Text>
              {index.coreCiLow !== null &&
                ` (${isRu ? 'интервал' : 'interval'} ${index.coreCiLow}–${index.coreCiHigh}%)`}
            </Text>
            {index.spread !== null && (
              <Text fontSize="xs" color="fg.muted" mt={1}>
                {isRu ? 'Размах между шкалами: ' : 'Spread across scales: '}
                {index.spread} {isRu ? 'пунктов' : 'points'}
              </Text>
            )}
            {index.profile && (
              <Text fontSize="xs" color="fg.muted" mt={1}>
                {isRu
                  ? `Внутри профиля: тёмные шкалы занимают в среднем ${index.profile.meanRank}-е место из ${index.profile.totalScales}, ${index.profile.inTopN} из них — в топ-${index.profile.topN}. Ядро ${
                      index.profile.coreVsProfile >= 0 ? 'выше' : 'ниже'
                    } собственного фона профиля на ${Math.abs(index.profile.coreVsProfile)} пунктов.`
                  : `Within the profile: dark scales rank ${index.profile.meanRank} on average out of ${index.profile.totalScales}, ${index.profile.inTopN} of them in the top ${index.profile.topN}. The core is ${
                      index.profile.coreVsProfile >= 0 ? 'above' : 'below'
                    } the profile’s own baseline by ${Math.abs(index.profile.coreVsProfile)} points.`}
              </Text>
            )}
            {index.missingCodes.length > 0 && (
              <Text fontSize="2xs" color="fg.subtle" mt={1}>
                {isRu ? 'Не измерено (мало ответов): ' : 'Not measured (too few answers): '}
                {index.missingCodes.map((code) => scaleName(code, isRu)).join(', ')}
              </Text>
            )}
          </Box>
        )}

        {/* 4. Анализ чувствительности — нарциссизм документированно ухудшает приближение */}
        {index.narcissismDrivesEstimate && index.coreWithoutNarcissism !== null && (
          <Box p={3} bg="bg.subtle" borderRadius="md" mb={3}>
            <Text fontSize="xs" color="fg.muted">
              {isRu
                ? `Без нарциссизма ядро составило бы ${index.coreWithoutNarcissism}% (разница ${signed(
                    index.narcissismDelta ?? 0
                  )}). Нарциссическое «восхищение» — агентный, по сути не-аверсивный компонент, и именно оно хуже прочего представляет общее ядро (Hilbig et al., 2023). Оценку стоит читать с поправкой на это.`
                : `Without narcissism the core would be ${index.coreWithoutNarcissism}% (difference ${signed(
                    index.narcissismDelta ?? 0
                  )}). Narcissistic “admiration” is an agentic, essentially non-aversive component, and it represents the common core worst of all (Hilbig et al., 2023). Read the estimate with that in mind.`}
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
