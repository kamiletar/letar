'use client'

import { Badge, Box, HStack, Text, VStack } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { LuQuote } from 'react-icons/lu'

/**
 * Intro-карточка с двумя icebreaker-вопросами для психологов (этап 5.4).
 *
 * Показывается на экспресс-интро (фестивальный режим). Провоцирует разговор
 * у стенда: «Вы психически здоровы?» + факт о когорте Данидина с citable-источником
 * (не мифическая цифра «5%», которую аудитория психологов немедленно оспорит).
 */
export function IcebreakerCard() {
  const t = useTranslations('express.icebreaker')

  return (
    <Box
      w="100%"
      p={5}
      borderRadius="lg"
      borderWidth="1px"
      borderColor="brand.emphasized"
      bg="brand.subtle"
      textAlign="left"
    >
      <VStack gap={3} align="stretch">
        <HStack gap={2}>
          <Badge colorPalette="brand" variant="solid" size="sm">
            {t('badge')}
          </Badge>
          <Text fontWeight="bold" fontSize="sm" color="brand.fg">
            {t('title')}
          </Text>
        </HStack>

        <VStack gap={2.5} align="stretch">
          <HStack gap={2} align="start">
            <Box color="brand.fg" flexShrink={0} pt={0.5}>
              <LuQuote size={16} />
            </Box>
            <Text fontSize="md" fontWeight="medium">
              {t('q1')}
            </Text>
          </HStack>
          <HStack gap={2} align="start">
            <Box color="brand.fg" flexShrink={0} pt={0.5}>
              <LuQuote size={16} />
            </Box>
            <Text fontSize="md" fontWeight="medium">
              {t('q2')}
            </Text>
          </HStack>
        </VStack>

        <Text fontSize="xs" color="fg.muted" fontStyle="italic">
          {t('source')}
        </Text>
      </VStack>
    </Box>
  )
}
