'use client'

import { Box, Button, Heading, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

interface QuizQuestionCardProps {
  /** Текст вопроса */
  scenario: string
  /** Варианты ответа (уже перемешанные) */
  options: { text: string; originalIndex: number }[]
  /** Номер вопроса (для отображения) */
  questionNumber: number
  /** Уже выбранный ответ (originalIndex) или undefined */
  selectedOption?: number
  /** Колбэк при выборе ответа */
  onAnswer: (originalIndex: number) => void
  /** Переход к следующему вопросу */
  onNext: () => void
  /** Пропуск вопроса (убрать ответ если был) */
  onSkip: () => void
}

export function QuizQuestionCard({
  scenario,
  options,
  questionNumber,
  selectedOption,
  onAnswer,
  onNext,
  onSkip,
}: QuizQuestionCardProps) {
  const t = useTranslations('quiz')
  const [justAnswered, setJustAnswered] = useState(false)
  // Оптимистичное выделение (5.4): подсветка выбранного варианта рендерится
  // мгновенно на клиенте, не дожидаясь round-trip через состояние родителя.
  const [optimisticIndex, setOptimisticIndex] = useState<number | null>(null)

  // Сбрасываем оптимистичное выделение при смене вопроса
  useEffect(() => {
    setOptimisticIndex(null)
  }, [questionNumber])

  // Авто-переход через 400ms после ответа
  useEffect(() => {
    if (!justAnswered) {
      return
    }
    const timer = setTimeout(() => {
      setJustAnswered(false)
      onNext()
    }, 400)
    return () => clearTimeout(timer)
  }, [justAnswered, onNext])

  const handleSelect = useCallback(
    (originalIndex: number) => {
      // Сначала — мгновенная локальная подсветка (0ms lag), затем ответ родителю
      setOptimisticIndex(originalIndex)
      onAnswer(originalIndex)
      setJustAnswered(true)
    },
    [onAnswer]
  )

  return (
    <VStack gap={6} w="100%">
      <Box textAlign="center">
        <Text fontSize="sm" color="fg.muted" mb={2}>
          {t('questionLabel', { number: questionNumber })}
        </Text>
        <Heading size="lg" lineHeight="tall">
          {scenario}
        </Heading>
      </Box>

      <SimpleGrid columns={1} gap={3} w="100%">
        {options.map((opt) => {
          // Оптимистичное выделение имеет приоритет над ответом родителя (0ms lag)
          const isSelected =
            optimisticIndex !== null ? optimisticIndex === opt.originalIndex : selectedOption === opt.originalIndex
          return (
            <Button
              key={opt.originalIndex}
              data-testid="quiz-option"
              variant={isSelected ? 'solid' : 'outline'}
              colorPalette={isSelected ? 'blue' : 'gray'}
              size="lg"
              minH="56px"
              py={4}
              h="auto"
              whiteSpace="normal"
              textAlign="left"
              justifyContent="flex-start"
              onClick={() => handleSelect(opt.originalIndex)}
            >
              <Text>{opt.text}</Text>
            </Button>
          )
        })}
        <Button
          data-testid="quiz-skip"
          variant="outline"
          size="lg"
          minH="56px"
          colorPalette="gray"
          mt={2}
          onClick={() => {
            onSkip()
            setJustAnswered(true)
          }}
        >
          {t('skipQuestion')}
        </Button>
      </SimpleGrid>
    </VStack>
  )
}
