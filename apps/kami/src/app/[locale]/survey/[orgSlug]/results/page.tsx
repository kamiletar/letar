'use client'

import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Heading,
  HStack,
  Icon,
  Progress,
  Separator,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LuArrowLeft, LuChartBar, LuFileText, LuMessageSquare, LuStar, LuUsers } from 'react-icons/lu'
import { getSurveyResultsAction, type QuestionResults, type SurveyResults } from './_actions/results.action'

/**
 * Страница результатов опроса
 */
export default function SurveyResultsPage() {
  const params = useParams()
  const router = useRouter()
  const orgSlug = params?.orgSlug as string

  const [results, setResults] = useState<SurveyResults | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Загружаем результаты
  useEffect(() => {
    const fetchResults = async () => {
      try {
        const result = await getSurveyResultsAction(orgSlug)

        if ('error' in result) {
          setError(result.error ?? null)
          return
        }

        setResults(result.data)
      } catch (err) {
        console.error('Failed to fetch results:', err)
        setError('UNKNOWN_ERROR')
      } finally {
        setLoading(false)
      }
    }

    if (orgSlug) {
      fetchResults()
    }
  }, [orgSlug])

  // Загрузка
  if (loading) {
    return (
      <Container maxW="4xl" py={20}>
        <VStack gap={4}>
          <Spinner size="xl" color="brand.500" />
          <Text color="fg.muted">Загрузка результатов...</Text>
        </VStack>
      </Container>
    )
  }

  // Ошибка
  if (error) {
    const errorMessages: Record<string, string> = {
      UNAUTHORIZED: 'Необходимо войти в систему',
      ORG_NOT_FOUND: 'Организация не найдена',
      ACCESS_DENIED: 'Доступ запрещён. Только владелец или администратор могут видеть результаты.',
      NO_SURVEY: 'Нет активного или завершённого опроса',
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

  if (!results) {
    return null
  }

  return (
    <Container maxW="4xl" py={10}>
      <VStack gap={8} align="stretch">
        {/* Навигация */}
        <Button variant="ghost" onClick={() => router.back()} alignSelf="start">
          <LuArrowLeft />
          Назад
        </Button>

        {/* Заголовок */}
        <Card.Root>
          <Card.Body>
            <VStack gap={4}>
              <HStack gap={3} justify="center">
                <Icon color="brand.500" boxSize={8}>
                  <LuChartBar />
                </Icon>
                <Heading size="xl">Результаты опроса</Heading>
              </HStack>

              <Heading size="lg" textAlign="center">
                {results.survey.title}
              </Heading>

              {results.survey.description && (
                <Text color="fg.muted" textAlign="center">
                  {results.survey.description}
                </Text>
              )}

              <HStack gap={4} flexWrap="wrap" justify="center">
                <Badge colorPalette={results.survey.status === 'active' ? 'green' : 'gray'} size="lg">
                  {results.survey.status === 'active' ? 'Активен' : 'Завершён'}
                </Badge>
                <HStack gap={1}>
                  <Icon color="fg.muted">
                    <LuUsers />
                  </Icon>
                  <Text fontWeight="medium">{results.responseCount} ответов</Text>
                </HStack>
                {results.survey.isAnonymous && (
                  <Badge colorPalette="purple" size="lg">
                    Анонимный
                  </Badge>
                )}
              </HStack>
            </VStack>
          </Card.Body>
        </Card.Root>

        {/* Вопросы и результаты */}
        {results.questions.map((question, index) => (
          <QuestionCard key={question.id} question={question} index={index} responseCount={results.responseCount} />
        ))}

        {/* Если нет ответов */}
        {results.responseCount === 0 && (
          <Card.Root>
            <Card.Body>
              <VStack gap={4} py={8} textAlign="center">
                <Icon color="fg.muted" boxSize={12}>
                  <LuMessageSquare />
                </Icon>
                <Heading size="md" color="fg.muted">
                  Пока нет ответов
                </Heading>
                <Text color="fg.muted">Когда участники заполнят опрос, здесь появятся результаты.</Text>
              </VStack>
            </Card.Body>
          </Card.Root>
        )}
      </VStack>
    </Container>
  )
}

/**
 * Карточка с результатами вопроса
 */
function QuestionCard({
  question,
  index,
  responseCount,
}: {
  question: QuestionResults
  index: number
  responseCount: number
}) {
  return (
    <Card.Root>
      <Card.Body>
        <VStack gap={4} align="stretch">
          <HStack justify="space-between">
            <HStack gap={2}>
              <Badge colorPalette="brand" size="sm">
                {index + 1}
              </Badge>
              <Text fontWeight="medium">{question.text}</Text>
            </HStack>
            <QuestionTypeIcon type={question.type} />
          </HStack>

          <Separator />

          {/* Результаты по типу */}
          {question.type === 'TEXT' && <TextResults answers={question.textAnswers || []} />}

          {(question.type === 'SINGLE_CHOICE' || question.type === 'MULTI_CHOICE') && (
            <ChoiceResults
              options={question.options}
              distribution={question.choiceDistribution || {}}
              responseCount={responseCount}
            />
          )}

          {(question.type === 'RATING' || question.type === 'SCALE') && (
            <RatingResults
              averageRating={question.averageRating}
              distribution={question.ratingDistribution || {}}
              minValue={question.minValue || 1}
              maxValue={question.maxValue || (question.type === 'SCALE' ? 5 : 10)}
              minLabel={question.minLabel}
              maxLabel={question.maxLabel}
              responseCount={responseCount}
            />
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}

/**
 * Иконка типа вопроса
 */
function QuestionTypeIcon({ type }: { type: QuestionResults['type'] }) {
  const icons = {
    TEXT: LuFileText,
    SINGLE_CHOICE: LuChartBar,
    MULTI_CHOICE: LuChartBar,
    RATING: LuStar,
    SCALE: LuStar,
  }
  const IconComponent = icons[type]

  return (
    <Icon color="fg.muted">
      <IconComponent />
    </Icon>
  )
}

/**
 * Результаты текстовых ответов
 */
function TextResults({ answers }: { answers: string[] }) {
  if (answers.length === 0) {
    return (
      <Text color="fg.muted" fontStyle="italic">
        Нет текстовых ответов
      </Text>
    )
  }

  return (
    <VStack gap={2} align="stretch">
      {answers.map((answer) => (
        <Box key={answer} p={3} bg="bg.subtle" borderRadius="md">
          <Text fontSize="sm">"{answer}"</Text>
        </Box>
      ))}
    </VStack>
  )
}

/**
 * Результаты выбора вариантов
 */
function ChoiceResults({
  options,
  distribution,
  responseCount,
}: {
  options: string[]
  distribution: Record<string, number>
  responseCount: number
}) {
  return (
    <VStack gap={3} align="stretch">
      {options.map((option) => {
        const count = distribution[option] || 0
        const percentage = responseCount > 0 ? (count / responseCount) * 100 : 0

        return (
          <Box key={option}>
            <HStack justify="space-between" mb={1}>
              <Text fontSize="sm">{option}</Text>
              <HStack gap={2}>
                <Text fontSize="sm" fontWeight="medium">
                  {count}
                </Text>
                <Text fontSize="sm" color="fg.muted">
                  ({percentage.toFixed(0)}%)
                </Text>
              </HStack>
            </HStack>
            <Progress.Root value={percentage} size="sm" colorPalette="brand">
              <Progress.Track>
                <Progress.Range />
              </Progress.Track>
            </Progress.Root>
          </Box>
        )
      })}
    </VStack>
  )
}

/**
 * Результаты рейтинга/шкалы
 */
function RatingResults({
  averageRating,
  distribution,
  minValue,
  maxValue,
  minLabel,
  maxLabel,
  responseCount,
}: {
  averageRating?: number
  distribution: Record<number, number>
  minValue: number
  maxValue: number
  minLabel?: string | null
  maxLabel?: string | null
  responseCount: number
}) {
  const values = Array.from({ length: maxValue - minValue + 1 }, (_, i) => minValue + i)

  return (
    <VStack gap={4} align="stretch">
      {/* Средний балл */}
      {averageRating !== undefined && (
        <HStack gap={3} justify="center">
          <Icon color="yellow.500" boxSize={8}>
            <LuStar />
          </Icon>
          <Text fontSize="3xl" fontWeight="bold">
            {averageRating.toFixed(1)}
          </Text>
          <Text color="fg.muted" fontSize="lg">
            / {maxValue}
          </Text>
        </HStack>
      )}

      {/* Подписи */}
      {(minLabel || maxLabel) && (
        <HStack justify="space-between" fontSize="sm" color="fg.muted">
          <Text>{minLabel || minValue}</Text>
          <Text>{maxLabel || maxValue}</Text>
        </HStack>
      )}

      {/* Распределение */}
      <VStack gap={2} align="stretch">
        {values.map((value) => {
          const count = distribution[value] || 0
          const percentage = responseCount > 0 ? (count / responseCount) * 100 : 0

          return (
            <Box key={value}>
              <HStack justify="space-between" mb={1}>
                <HStack gap={1}>
                  <Icon color="yellow.500" boxSize={4}>
                    <LuStar />
                  </Icon>
                  <Text fontSize="sm" fontWeight="medium">
                    {value}
                  </Text>
                </HStack>
                <HStack gap={2}>
                  <Text fontSize="sm">{count}</Text>
                  <Text fontSize="sm" color="fg.muted">
                    ({percentage.toFixed(0)}%)
                  </Text>
                </HStack>
              </HStack>
              <Progress.Root value={percentage} size="sm" colorPalette="yellow">
                <Progress.Track>
                  <Progress.Range />
                </Progress.Track>
              </Progress.Root>
            </Box>
          )
        })}
      </VStack>
    </VStack>
  )
}
