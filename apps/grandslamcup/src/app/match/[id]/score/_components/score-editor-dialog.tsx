'use client'

/**
 * Диалог редактирования оценок уже завершённого выступления.
 *
 * Счетовод кликает «✏» рядом с performance в истории — открывается диалог
 * с двумя секциями (ТЕКСТ и ПОДАЧА), в каждой по 5 полей с кликабельными блоками 1-5.
 * Сохранение вызывает updatePerformanceScoresAction которое пересчитывает adjusted + totalScore + счёт матча.
 */

import { Box, Button, Dialog, Flex, HStack, Portal, Separator, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { LuPencil } from 'react-icons/lu'
import { updatePerformanceScoresAction } from '../_actions/scorer.action'

interface ScoreEditorDialogProps {
  performanceId: string
  playerName: string
  initialTextScores: number[]
  initialDeliveryScores: number[]
  onSaved?: () => void
}

export function ScoreEditorDialog({
  performanceId,
  playerName,
  initialTextScores,
  initialDeliveryScores,
  onSaved,
}: ScoreEditorDialogProps) {
  const [open, setOpen] = useState(false)
  const [textScores, setTextScores] = useState<number[]>(initialTextScores)
  const [deliveryScores, setDeliveryScores] = useState<number[]>(initialDeliveryScores)
  const [saving, setSaving] = useState<'TEXT' | 'DELIVERY' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const updateScore = (dim: 'TEXT' | 'DELIVERY', index: number, value: number) => {
    if (dim === 'TEXT') {
      const next = [...textScores]
      next[index] = value
      setTextScores(next)
    } else {
      const next = [...deliveryScores]
      next[index] = value
      setDeliveryScores(next)
    }
  }

  const handleSave = async (dim: 'TEXT' | 'DELIVERY') => {
    setSaving(dim)
    setError(null)
    const scores = dim === 'TEXT' ? textScores : deliveryScores
    const res = await updatePerformanceScoresAction(performanceId, dim, scores)
    setSaving(null)
    if (!res.success) {
      setError(res.error ?? 'Не удалось сохранить')
      return
    }
    onSaved?.()
  }

  const handleClose = () => {
    setOpen(false)
    setError(null)
    setTextScores(initialTextScores)
    setDeliveryScores(initialDeliveryScores)
  }

  return (
    <Dialog.Root open={open} onOpenChange={(e) => (e.open ? setOpen(true) : handleClose())}>
      <Dialog.Trigger asChild>
        <Button size="xs" variant="ghost" colorPalette="gray" title="Исправить оценки">
          <LuPencil size={12} />
        </Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW={{ base: 'calc(100vw - 32px)', sm: 'lg' }}>
            <Dialog.Header>
              <Dialog.Title>Исправить оценки: {playerName}</Dialog.Title>
            </Dialog.Header>
            <Dialog.CloseTrigger />
            <Dialog.Body>
              <VStack gap={4} align="stretch">
                {error && (
                  <Text color="red.fg" fontSize="sm">
                    {error}
                  </Text>
                )}

                <ScoreSection label="ТЕКСТ" scores={textScores} onChange={(i, v) => updateScore('TEXT', i, v)} />
                <Button size="sm" colorPalette="blue" loading={saving === 'TEXT'} onClick={() => handleSave('TEXT')}>
                  Сохранить текст
                </Button>

                <Separator />

                <ScoreSection
                  label="ПОДАЧА"
                  scores={deliveryScores}
                  onChange={(i, v) => updateScore('DELIVERY', i, v)}
                />
                <Button
                  size="sm"
                  colorPalette="purple"
                  loading={saving === 'DELIVERY'}
                  onClick={() => handleSave('DELIVERY')}
                >
                  Сохранить подачу
                </Button>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={handleClose}>
                Закрыть
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

function ScoreSection({
  label,
  scores,
  onChange,
}: {
  label: string
  scores: number[]
  onChange: (index: number, value: number) => void
}) {
  // Нормализуем массив до 5 элементов (для пустых берём 0)
  const normalized = Array.from({ length: 5 }, (_, i) => scores[i] ?? 0)

  return (
    <Box>
      <Text fontWeight="bold" mb={2}>
        {label}
      </Text>
      <VStack gap={2} align="stretch">
        {normalized.map((currentScore, index) => (
          <Flex key={index} align="center" gap={2}>
            <Text fontSize="xs" color="fg.muted" minW="20px">
              #{index + 1}
            </Text>
            <HStack gap={1} flex={1}>
              {[1, 2, 3, 4, 5].map((score) => (
                <Button
                  key={score}
                  flex={1}
                  size="sm"
                  variant={currentScore === score ? 'solid' : 'outline'}
                  colorPalette={currentScore === score ? 'blue' : 'gray'}
                  onClick={() => onChange(index, score)}
                  fontWeight="bold"
                  px={0}
                  minW={0}
                >
                  {score}
                </Button>
              ))}
            </HStack>
          </Flex>
        ))}
      </VStack>
    </Box>
  )
}
