'use client'

import { Badge, Box, Card, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { useLocale } from 'next-intl'
import { EXPERIMENTAL_SCALES, type ScaleCode } from '../../../_data/personality-types'
import { computeArmorRadar } from '../../../_lib/armor-radar'

interface ExperimentalScalesBlockProps {
  /** Кумулятивные баллы клиента (включают экспериментальные шкалы 5.5) */
  scores: Record<ScaleCode, number>
  /**
   * Число отвеченных релевантных вопросов по шкалам. Нужно, чтобы отличить
   * «шкала не отвечена» от честного нуля: по баллу это неразличимо.
   */
  relevantCounts?: Record<ScaleCode, number>
}

/**
 * Блок экспериментальных шкал (этап 5.5) — ТОЛЬКО кабинет психолога.
 * Три бета-шкалы (RES_PHYS/RES_AFF/SPEC_INT) + кросс-индекс «Броня и Радар».
 * Вне ядра 22: пользователь эти шкалы не видит, поэтому здесь показываем
 * конструктные названия и прототипы открыто, но с обязательной пометкой «бета».
 */
export function ExperimentalScalesBlock({ scores, relevantCounts }: ExperimentalScalesBlockProps) {
  const isRu = useLocale() === 'ru'

  const phys = scores.RES_PHYS ?? 0
  const aff = scores.RES_AFF ?? 0

  // Индекс «Броня и Радар» — только когда обе оси измерены. Измеренность считаем
  // по числу ответов, а не по «балл > 0»: честный ноль по броне тоже осмысленный
  // результат и не должен молча прятать индекс. Без relevantCounts — старое
  // поведение (вызовы без этого пропа остаются рабочими).
  const measured = relevantCounts
    ? (relevantCounts.RES_PHYS ?? 0) > 0 && (relevantCounts.RES_AFF ?? 0) > 0
    : phys > 0 && aff > 0
  const armorRadar = measured ? computeArmorRadar(phys, aff) : null

  return (
    <Card.Root w="100%" variant="outline" borderColor="purple.300">
      <Card.Body>
        <HStack mb={1} gap={2}>
          <Heading size="md">{isRu ? 'Экспериментальные шкалы' : 'Experimental scales'}</Heading>
          <Badge colorPalette="purple" variant="subtle" size="sm">
            {isRu ? 'бета' : 'beta'}
          </Badge>
        </HStack>
        <Text fontSize="xs" color="fg.subtle" mb={4}>
          {isRu
            ? 'Авторские / прототипные конструкты вне ядра из 22 шкал. Не показываются клиенту, не входят в экспресс и «ведущие черты». Интерпретировать осторожно — валидация не завершена.'
            : 'Author / prototype constructs outside the 22-scale core. Not shown to the client, excluded from the express test and “leading traits”. Interpret cautiously — validation is not complete.'}
        </Text>

        <VStack gap={4} align="stretch">
          {EXPERIMENTAL_SCALES.map((scale) => {
            const value = scores[scale.code] ?? 0
            return (
              <Box key={scale.code}>
                <HStack justify="space-between" mb={1}>
                  <HStack gap={2}>
                    <Text fontWeight="bold" fontSize="sm">
                      {isRu ? scale.label : scale.labelEn} · {isRu ? scale.clinical : scale.clinicalEn}
                    </Text>
                    <Badge colorPalette="purple" variant="outline" size="xs">
                      β
                    </Badge>
                  </HStack>
                  <Text fontWeight="bold" fontSize="sm" color="fg.muted">
                    {value}%
                  </Text>
                </HStack>
                {/* Полоса балла */}
                <Box position="relative" h="6px" bg="bg.muted" borderRadius="full" overflow="hidden" mb={2}>
                  <Box
                    position="absolute"
                    left={0}
                    top={0}
                    h="100%"
                    w={`${Math.min(100, value)}%`}
                    bg={scale.color}
                    borderRadius="full"
                  />
                </Box>
                <Text fontSize="xs" color="fg.muted">
                  {value >= 50
                    ? isRu
                      ? scale.whenHigh
                      : scale.whenHighEn
                    : isRu
                      ? scale.description
                      : scale.descriptionEn}
                </Text>
                <Text fontSize="2xs" color="fg.subtle" mt={1}>
                  {isRu ? 'Прототип: ' : 'Prototype: '}
                  {isRu ? scale.prototype : scale.prototypeEn}
                </Text>
              </Box>
            )
          })}
        </VStack>

        {/* Кросс-индекс «Броня и Радар» (RES_PHYS × RES_AFF) */}
        {armorRadar && (
          <Box mt={5} p={3} bg="bg.subtle" borderRadius="md">
            <HStack gap={2} mb={1}>
              <Text fontWeight="bold" fontSize="sm">
                {isRu ? 'Индекс «Броня и Радар»: ' : 'Armor & Radar index: '}
                {isRu ? armorRadar.label : armorRadar.labelEn}
              </Text>
            </HStack>
            <Text fontSize="xs" color="fg.muted" mb={2}>
              {isRu ? armorRadar.description : armorRadar.descriptionEn}
            </Text>
            <Text fontSize="xs" color="orange.500">
              {isRu ? 'На что обратить внимание: ' : 'Attention: '}
              {isRu ? armorRadar.attention : armorRadar.attentionEn}
            </Text>
          </Box>
        )}
      </Card.Body>
    </Card.Root>
  )
}
