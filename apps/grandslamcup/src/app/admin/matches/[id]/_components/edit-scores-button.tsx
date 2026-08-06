'use client'

/**
 * Кнопка + диалог редактирования оценок выступления (админка).
 * 5 оценок за текст + 5 за подачу, пересчёт adjusted/total.
 */

import { toaster } from '@/app/_components/ui/toaster'
import { Box, Button, Flex, HStack, Input, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LuPencil, LuX } from 'react-icons/lu'
import { updatePerformanceScoresAction } from '../_actions/match-detail.action'

interface EditScoresButtonProps {
  performanceId: string
  currentTextScores: number[]
  currentDeliveryScores: number[]
}

export function EditScoresButton({ performanceId, currentTextScores, currentDeliveryScores }: EditScoresButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [textScores, setTextScores] = useState<number[]>(
    currentTextScores.length === 5 ? [...currentTextScores] : [3, 3, 3, 3, 3],
  )
  const [deliveryScores, setDeliveryScores] = useState<number[]>(
    currentDeliveryScores.length === 5 ? [...currentDeliveryScores] : [3, 3, 3, 3, 3],
  )

  const updateScore = (type: 'text' | 'delivery', index: number, value: string) => {
    const num = Math.min(5, Math.max(1, Number.parseInt(value) || 1))
    if (type === 'text') {
      setTextScores((prev) => {
        const next = [...prev]
        next[index] = num
        return next
      })
    } else {
      setDeliveryScores((prev) => {
        const next = [...prev]
        next[index] = num
        return next
      })
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const result = await updatePerformanceScoresAction({
        performanceId,
        textScores,
        deliveryScores,
      })
      if ('error' in result) {
        toaster.error({ title: String(result.error) })
      } else {
        toaster.success({ title: `Итого: ${result.totalScore}` })
        setOpen(false)
        router.refresh()
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <Button size="xs" variant="ghost" onClick={() => setOpen(true)} title="Редактировать оценки">
        <LuPencil size={12} />
      </Button>
    )
  }

  return (
    <Box bg="bg.panel" borderWidth="1px" borderColor="border.muted" borderRadius="lg" p={3} minW="280px">
      <Flex justify="space-between" align="center" mb={2}>
        <Text fontSize="sm" fontWeight="bold">
          Редактирование оценок
        </Text>
        <Button variant="ghost" size="xs" onClick={() => setOpen(false)}>
          <LuX size={14} />
        </Button>
      </Flex>

      <VStack gap={2} align="stretch">
        {/* Текст */}
        <Box>
          <Text fontSize="xs" fontWeight="medium" mb={1}>
            Текст (5 судей, 1-5)
          </Text>
          <HStack gap={1}>
            {textScores.map((s, i) => (
              <Input
                key={`t${i}`}
                type="number"
                value={s}
                onChange={(e) => updateScore('text', i, e.target.value)}
                min={1}
                max={5}
                size="xs"
                w="40px"
                textAlign="center"
                fontFamily="mono"
              />
            ))}
          </HStack>
        </Box>

        {/* Подача */}
        <Box>
          <Text fontSize="xs" fontWeight="medium" mb={1}>
            Подача (5 судей, 1-5)
          </Text>
          <HStack gap={1}>
            {deliveryScores.map((s, i) => (
              <Input
                key={`d${i}`}
                type="number"
                value={s}
                onChange={(e) => updateScore('delivery', i, e.target.value)}
                min={1}
                max={5}
                size="xs"
                w="40px"
                textAlign="center"
                fontFamily="mono"
              />
            ))}
          </HStack>
        </Box>

        <Flex gap={2} justify="flex-end">
          <Button size="xs" variant="outline" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button size="xs" colorPalette="blue" onClick={handleSubmit} loading={submitting}>
            Сохранить
          </Button>
        </Flex>
      </VStack>
    </Box>
  )
}
