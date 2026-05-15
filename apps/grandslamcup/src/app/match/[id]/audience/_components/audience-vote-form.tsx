'use client'

/**
 * Кнопки голосования зрителя (1-5) для текста и подачи
 *
 * Mobile-first: крупные кнопки, двойной ряд.
 * В Telegram Mini App автоматически использует нативную MainButton + HapticFeedback.
 */

import { useTelegramMainButton, useTelegramWebApp } from '@/app/_hooks/use-telegram-webapp'
import { Box, Button, Heading, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'

interface AudienceVoteFormProps {
  playerName: string
  teamName: string
  onVote: (textScore: number, deliveryScore: number) => Promise<void>
}

export function AudienceVoteForm({ playerName, teamName, onVote }: AudienceVoteFormProps) {
  const [textScore, setTextScore] = useState<number | null>(null)
  const [deliveryScore, setDeliveryScore] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const { isTelegram, hapticImpact, hapticNotification } = useTelegramWebApp()

  const canSubmit = textScore !== null && deliveryScore !== null && !submitting

  const handleSubmit = async () => {
    if (!textScore || !deliveryScore) {
      return
    }
    setSubmitting(true)
    try {
      await onVote(textScore, deliveryScore)
      hapticNotification('success')
      setSubmitted(true)
    } catch {
      hapticNotification('error')
    } finally {
      setSubmitting(false)
    }
  }

  // Нативная Telegram MainButton — большая зелёная кнопка снизу экрана.
  // Вне Telegram — no-op, fallback на обычную <Button> ниже.
  useTelegramMainButton({
    text: 'Отправить оценку',
    visible: !submitted && canSubmit,
    loading: submitting,
    onClick: handleSubmit,
  })

  // Обёртка над setScore с тактильной отдачей
  const pickText = (n: number) => {
    setTextScore(n)
    hapticImpact('light')
  }
  const pickDelivery = (n: number) => {
    setDeliveryScore(n)
    hapticImpact('light')
  }

  if (submitted) {
    return (
      <Box textAlign="center" py={6}>
        <Text fontSize="2xl" fontWeight="bold" color="green.500">
          Голос принят!
        </Text>
        <Text color="fg.muted" mt={1}>
          {playerName} — {textScore}/{deliveryScore}
        </Text>
      </Box>
    )
  }

  return (
    <VStack gap={5} align="stretch">
      <Box textAlign="center">
        <Heading size="lg">{playerName}</Heading>
        <Text color="fg.muted">{teamName}</Text>
      </Box>

      {/* Текст */}
      <Box>
        <Text fontWeight="semibold" mb={2} textAlign="center">
          Текст
        </Text>
        <SimpleGrid columns={5} gap={2}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Button
              key={n}
              size="lg"
              h="56px"
              variant={textScore === n ? 'solid' : 'outline'}
              colorPalette={textScore === n ? 'blue' : 'gray'}
              onClick={() => pickText(n)}
              fontSize="xl"
            >
              {n}
            </Button>
          ))}
        </SimpleGrid>
      </Box>

      {/* Подача */}
      <Box>
        <Text fontWeight="semibold" mb={2} textAlign="center">
          Подача
        </Text>
        <SimpleGrid columns={5} gap={2}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Button
              key={n}
              size="lg"
              h="56px"
              variant={deliveryScore === n ? 'solid' : 'outline'}
              colorPalette={deliveryScore === n ? 'purple' : 'gray'}
              onClick={() => pickDelivery(n)}
              fontSize="xl"
            >
              {n}
            </Button>
          ))}
        </SimpleGrid>
      </Box>

      {/* Отправить — fallback HTML-кнопка вне Telegram (в TG используется нативная MainButton) */}
      {!isTelegram && (
        <Button size="lg" colorPalette="green" disabled={!canSubmit} onClick={handleSubmit} loading={submitting}>
          Отправить оценку
        </Button>
      )}
    </VStack>
  )
}
