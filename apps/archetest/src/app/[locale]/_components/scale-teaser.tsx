'use client'

import { Link } from '@/i18n/navigation'
import { Button, Card, Heading, HStack, Icon, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { LuLock } from 'react-icons/lu'

import { getScaleName, type PersonalityTypeCode, TEASER_SCALE_CODES } from '../_data/personality-types'

interface ScaleTeaserProps {
  /** Русская локаль (иначе английская) */
  isRu: boolean
}

/** Название шкалы в тизере: юзерский label + архетип, без клинических ярлыков (политика 5.6.1) */
function teaserName(code: PersonalityTypeCode, isRu: boolean): string {
  return getScaleName(code, { audience: 'user' }, isRu)
}

/**
 * Тизер оставшихся шкал (этап 5.7): под гексаграммой — заблокированный список
 * шкал, которые раскроет полный тест. Незакрашенная карта мотивирует продолжить.
 * Клинические названия скрыты (политика 5.6.1) — только архетипы. BAR/DPR
 * («Состояния») в список не входят — упомянуты отдельной строкой.
 */
export function ScaleTeaser({ isRu }: ScaleTeaserProps) {
  const t = useTranslations('express')

  return (
    <Card.Root w="100%" variant="subtle">
      <Card.Body>
        <VStack gap={4} align="stretch">
          <VStack gap={1} align="center" textAlign="center">
            <Heading size="sm">{t('teaserTitle')}</Heading>
            <Text fontSize="sm" color="fg.muted">
              {t('teaserSubtitle')}
            </Text>
          </VStack>

          <SimpleGrid columns={{ base: 2, sm: 3 }} gap={2}>
            {TEASER_SCALE_CODES.map((code) => (
              <HStack
                key={code}
                gap={1.5}
                px={2.5}
                py={1.5}
                borderRadius="md"
                bg="bg.muted"
                opacity={0.65}
                filter="grayscale(0.7)"
              >
                <Icon boxSize={3} color="fg.subtle" flexShrink={0}>
                  <LuLock />
                </Icon>
                <Text fontSize="xs" fontWeight="medium" color="fg.muted" truncate>
                  {teaserName(code, isRu)}
                </Text>
              </HStack>
            ))}
          </SimpleGrid>

          <Text fontSize="xs" color="fg.subtle" textAlign="center">
            {t('teaserStatesNote')}
          </Text>

          <Button asChild colorPalette="blue" size="sm" alignSelf="center">
            <Link href="/">{t('fullTestCta')}</Link>
          </Button>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
