'use client'

import { toaster } from '@/app/_components/ui/toaster'
import {
  Button,
  Card,
  Container,
  Heading,
  HStack,
  Icon,
  RadioGroup,
  Spinner,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { LuCircleCheck, LuSend, LuStar } from 'react-icons/lu'
import { getSurveyAction, submitSurveyAction } from './_actions/survey.action'

interface Question {
  id: string
  text: string
  type: 'TEXT' | 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'RATING' | 'SCALE'
  options: string[]
  required: boolean
}

interface SurveyData {
  survey: {
    id: string
    title: string
    description: string | null
    questions: Question[]
  }
  organization: {
    id: string
    name: string
    slug: string
  }
  memberId: string
}

interface Answer {
  questionId: string
  textAnswer?: string
  selectedOption?: string
  ratingValue?: number
}

/**
 * Страница заполнения опроса
 */
export default function SurveyPage() {
  const params = useParams()
  const router = useRouter()
  const orgSlug = params?.orgSlug as string

  const [surveyData, setSurveyData] = useState<SurveyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Загружаем опрос
  useEffect(() => {
    const fetchSurvey = async () => {
      try {
        const result = await getSurveyAction(orgSlug)

        if ('error' in result) {
          setError(result.error ?? null)
          return
        }

        setSurveyData(result.data)

        // Инициализируем ответы
        const initialAnswers: Record<string, Answer> = {}
        for (const q of result.data.survey.questions) {
          initialAnswers[q.id] = { questionId: q.id }
        }
        setAnswers(initialAnswers)
      } catch (err) {
        console.error('Failed to fetch survey:', err)
        setError('UNKNOWN_ERROR')
      } finally {
        setLoading(false)
      }
    }

    if (orgSlug) {
      fetchSurvey()
    }
  }, [orgSlug])

  // Обновить ответ на вопрос
  const updateAnswer = useCallback((questionId: string, update: Partial<Answer>) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], ...update },
    }))
  }, [])

  // Отправить опрос
  const handleSubmit = useCallback(async () => {
    if (!surveyData) {
      return
    }

    // Проверяем обязательные вопросы
    for (const q of surveyData.survey.questions) {
      if (q.required) {
        const answer = answers[q.id]
        const hasAnswer = answer?.textAnswer || answer?.selectedOption || answer?.ratingValue

        if (!hasAnswer) {
          toaster.error({ title: `Ответьте на вопрос: "${q.text}"` })
          return
        }
      }
    }

    setSubmitting(true)
    try {
      const result = await submitSurveyAction({
        surveyId: surveyData.survey.id,
        memberId: surveyData.memberId,
        answers: Object.values(answers),
      })

      if ('error' in result) {
        toaster.error({ title: 'Не удалось отправить ответы' })
        return
      }

      setSubmitted(true)
      toaster.success({ title: 'Спасибо за ваши ответы!' })
    } catch (err) {
      console.error('Failed to submit survey:', err)
      toaster.error({ title: 'Произошла ошибка' })
    } finally {
      setSubmitting(false)
    }
  }, [surveyData, answers])

  // Загрузка
  if (loading) {
    return (
      <Container maxW="2xl" py={20}>
        <VStack gap={4}>
          <Spinner size="xl" color="brand.500" />
          <Text color="fg.muted">Загрузка опроса...</Text>
        </VStack>
      </Container>
    )
  }

  // Ошибка
  if (error) {
    const errorMessages: Record<string, string> = {
      UNAUTHORIZED: 'Необходимо войти в систему',
      ORG_NOT_FOUND: 'Организация не найдена',
      NOT_A_MEMBER: 'Вы не являетесь членом этой команды',
      NO_ACTIVE_SURVEY: 'Нет активного опроса',
      ALREADY_RESPONDED: 'Вы уже ответили на этот опрос',
      UNKNOWN_ERROR: 'Произошла ошибка',
    }

    return (
      <Container maxW="md" py={20}>
        <Card.Root>
          <Card.Body>
            <VStack gap={4} textAlign="center">
              <Heading size="lg" color="red.500">
                Ошибка
              </Heading>
              <Text color="fg.muted">{errorMessages[error] || error}</Text>
              <Button variant="outline" onClick={() => router.push('/')}>
                На главную
              </Button>
            </VStack>
          </Card.Body>
        </Card.Root>
      </Container>
    )
  }

  // Успешная отправка
  if (submitted) {
    return (
      <Container maxW="md" py={20}>
        <Card.Root>
          <Card.Body>
            <VStack gap={6} py={8} textAlign="center">
              <Icon color="green.500" boxSize={16}>
                <LuCircleCheck />
              </Icon>
              <VStack gap={2}>
                <Heading size="lg">Спасибо!</Heading>
                <Text color="fg.muted">Ваши ответы помогут работодателям лучше узнать кандидата.</Text>
              </VStack>
              <Button variant="outline" onClick={() => router.push('/')}>
                На главную
              </Button>
            </VStack>
          </Card.Body>
        </Card.Root>
      </Container>
    )
  }

  if (!surveyData) {
    return null
  }

  return (
    <Container maxW="2xl" py={10}>
      <VStack gap={8} align="stretch">
        {/* Заголовок */}
        <Card.Root>
          <Card.Body>
            <VStack gap={2} textAlign="center">
              <Text color="fg.muted" fontSize="sm">
                Опрос от {surveyData.organization.name}
              </Text>
              <Heading size="xl">{surveyData.survey.title}</Heading>
              {surveyData.survey.description && <Text color="fg.muted">{surveyData.survey.description}</Text>}
            </VStack>
          </Card.Body>
        </Card.Root>

        {/* Вопросы */}
        {surveyData.survey.questions.map((question, index) => (
          <Card.Root key={question.id}>
            <Card.Body>
              <VStack gap={4} align="stretch">
                <HStack justify="space-between">
                  <Text fontWeight="medium">
                    {index + 1}. {question.text}
                    {question.required && (
                      <Text as="span" color="red.500">
                        {' '}
                        *
                      </Text>
                    )}
                  </Text>
                </HStack>

                {/* Текстовый ответ */}
                {question.type === 'TEXT' && (
                  <Textarea
                    placeholder="Ваш ответ..."
                    value={answers[question.id]?.textAnswer || ''}
                    onChange={(e) => updateAnswer(question.id, { textAnswer: e.target.value })}
                    rows={3}
                  />
                )}

                {/* Одиночный выбор */}
                {question.type === 'SINGLE_CHOICE' && (
                  <RadioGroup.Root
                    value={answers[question.id]?.selectedOption || ''}
                    onValueChange={(details) =>
                      updateAnswer(question.id, {
                        selectedOption: details.value || undefined,
                      })
                    }
                  >
                    <VStack align="start" gap={2}>
                      {question.options.map((option) => (
                        <RadioGroup.Item key={option} value={option}>
                          <RadioGroup.ItemHiddenInput />
                          <RadioGroup.ItemIndicator />
                          <RadioGroup.ItemText>{option}</RadioGroup.ItemText>
                        </RadioGroup.Item>
                      ))}
                    </VStack>
                  </RadioGroup.Root>
                )}

                {/* Рейтинг (1-10 звёзд) */}
                {question.type === 'RATING' && (
                  <HStack gap={1}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                      <Button
                        key={value}
                        variant={answers[question.id]?.ratingValue === value ? 'solid' : 'ghost'}
                        colorPalette={answers[question.id]?.ratingValue === value ? 'yellow' : 'gray'}
                        size="sm"
                        onClick={() => updateAnswer(question.id, { ratingValue: value })}
                      >
                        {value}
                      </Button>
                    ))}
                  </HStack>
                )}

                {/* Шкала (1-5) */}
                {question.type === 'SCALE' && (
                  <HStack gap={2} justify="center">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Button
                        key={value}
                        variant={answers[question.id]?.ratingValue === value ? 'solid' : 'outline'}
                        colorPalette={answers[question.id]?.ratingValue === value ? 'brand' : 'gray'}
                        size="lg"
                        onClick={() => updateAnswer(question.id, { ratingValue: value })}
                      >
                        <Icon>
                          <LuStar />
                        </Icon>
                        {value}
                      </Button>
                    ))}
                  </HStack>
                )}
              </VStack>
            </Card.Body>
          </Card.Root>
        ))}

        {/* Кнопка отправки */}
        <Button colorPalette="brand" size="lg" onClick={handleSubmit} loading={submitting}>
          <LuSend />
          Отправить ответы
        </Button>
      </VStack>
    </Container>
  )
}
