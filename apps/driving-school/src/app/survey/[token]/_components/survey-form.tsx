'use client'

/**
 * Форма заполнения NPS опроса.
 */

import { Box, Button, Grid, HStack, Text, Textarea, VStack } from '@chakra-ui/react'
import { useState, useTransition } from 'react'
import { LuFrown, LuMeh, LuSmile } from 'react-icons/lu'

import { toaster } from '@/app/_components/ui/toaster'

import { submitSurveyAction } from '../../../(school-admin)/school/surveys/_actions/survey.action'

interface SurveyFormProps {
  token: string
  onSuccess: () => void
}

/**
 * Цвет для NPS оценки
 */
function getNpsColor(score: number): string {
  if (score >= 9) {
    return 'green'
  } // Promoter
  if (score >= 7) {
    return 'yellow'
  } // Passive
  return 'red' // Detractor
}

/**
 * Категория NPS
 */
function getNpsCategory(score: number | null): { label: string; icon: React.ReactNode; color: string } {
  if (score === null) {
    return { label: 'Выберите оценку', icon: null, color: 'gray' }
  }
  if (score >= 9) {
    return { label: 'Промоутер', icon: <LuSmile />, color: 'green' }
  }
  if (score >= 7) {
    return { label: 'Нейтральный', icon: <LuMeh />, color: 'yellow' }
  }
  return { label: 'Критик', icon: <LuFrown />, color: 'red' }
}

export function SurveyForm({ token, onSuccess }: SurveyFormProps) {
  const [npsScore, setNpsScore] = useState<number | null>(null)
  const [positiveComment, setPositiveComment] = useState('')
  const [improvementComment, setImprovementComment] = useState('')
  const [isPending, startTransition] = useTransition()

  const category = getNpsCategory(npsScore)

  const handleSubmit = () => {
    if (npsScore === null) {
      toaster.error({ title: 'Выберите оценку от 0 до 10' })
      return
    }

    startTransition(async () => {
      const result = await submitSurveyAction({
        token,
        npsScore,
        positiveComment: positiveComment || undefined,
        improvementComment: improvementComment || undefined,
      })

      if (result.success) {
        toaster.success({ title: 'Спасибо за ваш отзыв!' })
        onSuccess()
      } else {
        toaster.error({ title: 'Ошибка', description: result.error })
      }
    })
  }

  return (
    <VStack align="stretch" gap={6}>
      {/* NPS вопрос */}
      <Box>
        <Text fontWeight="semibold" mb={3}>
          Насколько вероятно, что вы порекомендуете нашу автошколу друзьям или знакомым?
        </Text>

        {/* Шкала 0-10 */}
        <Grid templateColumns="repeat(11, 1fr)" gap={1}>
          {Array.from({ length: 11 }, (_, i) => (
            <Button
              key={i}
              size="sm"
              variant={npsScore === i ? 'solid' : 'outline'}
              colorPalette={npsScore === i ? getNpsColor(i) : 'gray'}
              onClick={() => setNpsScore(i)}
              disabled={isPending}
            >
              {i}
            </Button>
          ))}
        </Grid>

        {/* Подписи под шкалой */}
        <HStack justify="space-between" mt={2}>
          <Text fontSize="xs" color="fg.muted">
            Точно не порекомендую
          </Text>
          <Text fontSize="xs" color="fg.muted">
            Обязательно порекомендую
          </Text>
        </HStack>

        {/* Выбранная категория */}
        {npsScore !== null && (
          <HStack mt={3} gap={2} justify="center">
            <Box color={`${category.color}.500`}>{category.icon}</Box>
            <Text fontSize="sm" color={`${category.color}.fg`}>
              {category.label}
            </Text>
          </HStack>
        )}
      </Box>

      {/* Положительный комментарий */}
      <Box>
        <Text fontWeight="medium" mb={2}>
          Что вам понравилось больше всего?
        </Text>
        <Text fontSize="sm" color="fg.muted" mb={2}>
          Необязательно
        </Text>
        <Textarea
          value={positiveComment}
          onChange={(e) => setPositiveComment(e.target.value)}
          placeholder="Расскажите, что было особенно хорошо..."
          rows={3}
          disabled={isPending}
          maxLength={1000}
        />
      </Box>

      {/* Комментарий для улучшения */}
      <Box>
        <Text fontWeight="medium" mb={2}>
          Что можно улучшить?
        </Text>
        <Text fontSize="sm" color="fg.muted" mb={2}>
          Необязательно
        </Text>
        <Textarea
          value={improvementComment}
          onChange={(e) => setImprovementComment(e.target.value)}
          placeholder="Ваши предложения помогут нам стать лучше..."
          rows={3}
          disabled={isPending}
          maxLength={1000}
        />
      </Box>

      {/* Кнопка отправки */}
      <Button colorPalette="blue" size="lg" onClick={handleSubmit} loading={isPending} disabled={npsScore === null}>
        Отправить отзыв
      </Button>
    </VStack>
  )
}
