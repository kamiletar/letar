'use client'

import { Alert, Box, Link as ChakraLink, HStack, Text, VStack } from '@chakra-ui/react'
import { LuHeartPulse, LuPhone } from 'react-icons/lu'
import { CRISIS_HELPLINES, DARK_REASSURANCE_COPY, SAFETY_NET_COPY } from '../_data/crisis-resources'

/** Превращает телефон в tel:-ссылку (оставляет только цифры и ведущий +) */
function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

interface SafetyNetBlockProps {
  /** Русская локаль (иначе английская) */
  isRu: boolean
}

/**
 * Кризисный блок safety-net (этап 5.6.4): мягкое сообщение + телефоны доверия.
 * Показывается при выраженных баллах шкал состояния (DPR/BAR/BOR) — решение
 * о показе принимает вызывающий через `needsSafetyNet`. Тон заботливый,
 * без «диагноза». Взрослая линия МЧС первой, детская — с пометкой аудитории.
 */
export function SafetyNetBlock({ isRu }: SafetyNetBlockProps) {
  return (
    <Alert.Root status="info" variant="outline" borderRadius="lg" w="100%">
      <Alert.Indicator>
        <LuHeartPulse />
      </Alert.Indicator>
      <Box flex={1}>
        <Alert.Title fontWeight="bold">{isRu ? SAFETY_NET_COPY.title.ru : SAFETY_NET_COPY.title.en}</Alert.Title>
        <Alert.Description>
          <Text mt={1}>{isRu ? SAFETY_NET_COPY.body.ru : SAFETY_NET_COPY.body.en}</Text>

          <Text mt={3} fontWeight="semibold" fontSize="sm">
            {isRu ? SAFETY_NET_COPY.helplinesTitle.ru : SAFETY_NET_COPY.helplinesTitle.en}
          </Text>
          <VStack align="stretch" gap={2} mt={2}>
            {CRISIS_HELPLINES.map((line) => (
              <Box key={line.phone}>
                <HStack gap={2} align="center" flexWrap="wrap">
                  <LuPhone aria-hidden />
                  <ChakraLink href={telHref(line.phone)} fontWeight="bold" color="fg">
                    {line.phone}
                  </ChakraLink>
                  <Text fontSize="sm">— {isRu ? line.name : line.nameEn}</Text>
                </HStack>
                <Text fontSize="xs" color="fg.muted" pl={6}>
                  {isRu ? line.hours : line.hoursEn}
                  {line.audience && ` · ${isRu ? line.audience : line.audienceEn}`}
                </Text>
              </Box>
            ))}
          </VStack>

          <Text mt={3} fontSize="xs" color="fg.muted">
            {isRu ? SAFETY_NET_COPY.disclaimer.ru : SAFETY_NET_COPY.disclaimer.en}
          </Text>
        </Alert.Description>
      </Box>
    </Alert.Root>
  )
}

/**
 * Мягкая дестигматизирующая формулировка по «тёмным» шкалам (этап 5.6.4).
 * Показывается при высоком балле тёмной шкалы — решение принимает вызывающий
 * через `needsDarkReassurance`. Developmental-тон: черта = ресурс, не приговор.
 */
export function DarkReassuranceNote({ isRu }: SafetyNetBlockProps) {
  return (
    <Box w="100%" p={4} borderRadius="lg" bg="bg.subtle" borderWidth="1px" borderColor="border">
      <Text fontWeight="semibold" fontSize="sm" mb={1}>
        {isRu ? DARK_REASSURANCE_COPY.title.ru : DARK_REASSURANCE_COPY.title.en}
      </Text>
      <Text fontSize="sm" color="fg.muted">
        {isRu ? DARK_REASSURANCE_COPY.body.ru : DARK_REASSURANCE_COPY.body.en}
      </Text>
    </Box>
  )
}
