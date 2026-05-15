'use client'

import { toaster } from '@/app/_components/ui/toaster'
import type { QuizResult, QuizType } from '@/hooks/use-style-quiz'
import { COLOR_TYPE_CONFIG, DRESS_STYLE_CONFIG, STYLE_CONFIG, useStyleQuiz } from '@/hooks/use-style-quiz'
import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Grid,
  Heading,
  HStack,
  Icon,
  Progress,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useState } from 'react'
import { FaArrowLeft, FaArrowRight, FaCheck, FaHeart, FaPalette, FaRedo, FaStar, FaTshirt } from 'react-icons/fa'

// Конфигурация квизов
const QUIZ_CONFIG: Record<
  QuizType,
  {
    title: string
    description: string
    icon: React.ElementType
    color: string
    questionsCount: number
  }
> = {
  style: {
    title: 'Определи свой стиль',
    description: 'Узнайте, какой стиль одежды вам подходит больше всего',
    icon: FaStar,
    color: 'purple',
    questionsCount: 10,
  },
  colorType: {
    title: 'Твой цветотип',
    description: 'Определите свой цветотип и узнайте, какие цвета вам идут',
    icon: FaPalette,
    color: 'orange',
    questionsCount: 8,
  },
  dress: {
    title: 'Идеальное платье',
    description: 'Найдите силуэт платья, который подчеркнёт вашу фигуру',
    icon: FaTshirt,
    color: 'pink',
    questionsCount: 5,
  },
}

type ViewMode = 'list' | 'quiz' | 'result' | 'history'

export default function QuizPage() {
  const { results, isLoading, getQuizQuestions, saveQuizResult, getQuizResult, deleteQuizResult } = useStyleQuiz()

  const [view, setView] = useState<ViewMode>('list')
  const [currentQuiz, setCurrentQuiz] = useState<QuizType | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [lastResult, setLastResult] = useState<QuizResult | null>(null)

  // Начать квиз
  const startQuiz = (quizType: QuizType) => {
    setCurrentQuiz(quizType)
    setCurrentQuestion(0)
    setAnswers({})
    setView('quiz')
  }

  // Ответить на вопрос
  const handleAnswer = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }))
  }

  // Следующий вопрос
  const nextQuestion = () => {
    if (!currentQuiz) {
      return
    }
    const questions = getQuizQuestions(currentQuiz)
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1)
    }
  }

  // Предыдущий вопрос
  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1)
    }
  }

  // Завершить квиз
  const finishQuiz = async () => {
    if (!currentQuiz) {
      return
    }

    const result = await saveQuizResult(currentQuiz, answers)
    setLastResult(result)
    setView('result')
    toaster.success({ title: 'Квиз пройден!' })
  }

  // Вернуться к списку
  const goToList = () => {
    setView('list')
    setCurrentQuiz(null)
    setCurrentQuestion(0)
    setAnswers({})
    setLastResult(null)
  }

  // Посмотреть прошлый результат
  const viewPastResult = (quizType: QuizType) => {
    const result = getQuizResult(quizType)
    if (result) {
      setLastResult(result)
      setCurrentQuiz(quizType)
      setView('result')
    }
  }

  // Пройти заново
  const retakeQuiz = async () => {
    if (!currentQuiz) {
      return
    }
    await deleteQuizResult(currentQuiz)
    startQuiz(currentQuiz)
  }

  if (isLoading) {
    return (
      <Container maxW="4xl" py={8}>
        <Text>Загрузка...</Text>
      </Container>
    )
  }

  // Список квизов
  if (view === 'list') {
    return (
      <Container maxW="4xl" py={8}>
        <VStack gap={6} align="stretch">
          {/* Заголовок */}
          <VStack align="start" gap={1}>
            <Heading size="xl">
              <Icon as={FaStar} mr={3} />
              Стильные квизы
            </Heading>
            <Text color="fg.muted">Узнайте больше о своём стиле и предпочтениях</Text>
          </VStack>

          {/* Сетка квизов */}
          <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={6}>
            {(Object.entries(QUIZ_CONFIG) as [QuizType, (typeof QUIZ_CONFIG)[QuizType]][]).map(([quizType, config]) => {
              const existingResult = getQuizResult(quizType)

              return (
                <Card.Root key={quizType} overflow="hidden" _hover={{ shadow: 'lg' }} transition="all 0.2s">
                  <Box bg={`${config.color}.100`} p={6} textAlign="center">
                    <Icon as={config.icon} boxSize={12} color={`${config.color}.500`} />
                  </Box>
                  <Card.Body>
                    <VStack align="stretch" gap={3}>
                      <Heading size="md">{config.title}</Heading>
                      <Text fontSize="sm" color="fg.muted">
                        {config.description}
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        {config.questionsCount} вопросов
                      </Text>

                      {existingResult ? (
                        <VStack gap={2}>
                          <Badge colorPalette="green" size="lg">
                            <Icon as={FaCheck} mr={1} />
                            Пройден
                          </Badge>
                          <HStack gap={2} w="full">
                            <Button flex={1} size="sm" variant="outline" onClick={() => viewPastResult(quizType)}>
                              Результат
                            </Button>
                            <Button flex={1} size="sm" variant="ghost" onClick={() => startQuiz(quizType)}>
                              <Icon as={FaRedo} mr={1} />
                              Заново
                            </Button>
                          </HStack>
                        </VStack>
                      ) : (
                        <Button colorPalette="fg" onClick={() => startQuiz(quizType)}>
                          Пройти квиз
                        </Button>
                      )}
                    </VStack>
                  </Card.Body>
                </Card.Root>
              )
            })}
          </Grid>

          {/* История результатов */}
          {results.length > 0 && (
            <Card.Root>
              <Card.Header>
                <Heading size="md">
                  <Icon as={FaHeart} mr={2} />
                  Ваш стиль-профиль
                </Heading>
              </Card.Header>
              <Card.Body>
                <VStack align="stretch" gap={4}>
                  {results.map((result) => {
                    const config = QUIZ_CONFIG[result.quizType]
                    const resultDesc = getResultDescription(result.quizType, result.result)

                    return (
                      <HStack key={result.quizType} p={3} bg="bg.muted" borderRadius="md" justify="space-between">
                        <HStack gap={3}>
                          <Icon as={config.icon} color={`${config.color}.500`} />
                          <VStack align="start" gap={0}>
                            <Text fontWeight="medium">{config.title}</Text>
                            <Text fontSize="sm" color="fg.muted">
                              {resultDesc?.emoji} {resultDesc?.name}
                            </Text>
                          </VStack>
                        </HStack>
                        <Button size="sm" variant="ghost" onClick={() => viewPastResult(result.quizType)}>
                          Подробнее
                        </Button>
                      </HStack>
                    )
                  })}
                </VStack>
              </Card.Body>
            </Card.Root>
          )}
        </VStack>
      </Container>
    )
  }

  // Прохождение квиза
  if (view === 'quiz' && currentQuiz) {
    const questions = getQuizQuestions(currentQuiz)
    const question = questions[currentQuestion]
    const config = QUIZ_CONFIG[currentQuiz]
    const progress = ((currentQuestion + 1) / questions.length) * 100
    const currentAnswer = answers[question.id]
    const allAnswered = Object.keys(answers).length === questions.length

    return (
      <Container maxW="2xl" py={8}>
        <VStack gap={6} align="stretch">
          {/* Заголовок и прогресс */}
          <VStack align="stretch" gap={2}>
            <HStack justify="space-between">
              <Button variant="ghost" size="sm" onClick={goToList}>
                <Icon as={FaArrowLeft} mr={2} />К списку
              </Button>
              <Text fontSize="sm" color="fg.muted">
                {currentQuestion + 1} из {questions.length}
              </Text>
            </HStack>
            <Progress.Root value={progress} size="sm" colorPalette={config.color}>
              <Progress.Track>
                <Progress.Range />
              </Progress.Track>
            </Progress.Root>
            <Text fontSize="sm" fontWeight="medium" color={`${config.color}.500`}>
              {config.title}
            </Text>
          </VStack>

          {/* Вопрос */}
          <Card.Root>
            <Card.Body>
              <VStack gap={6} align="stretch">
                <Heading size="md" textAlign="center">
                  {question.question}
                </Heading>

                {/* Варианты ответов */}
                <VStack gap={3}>
                  {question.options.map((option) => (
                    <Button
                      key={option.id}
                      variant={currentAnswer === option.id ? 'solid' : 'outline'}
                      colorPalette={currentAnswer === option.id ? config.color : 'gray'}
                      size="lg"
                      w="full"
                      h="auto"
                      py={4}
                      whiteSpace="normal"
                      textAlign="left"
                      onClick={() => handleAnswer(question.id, option.id)}
                    >
                      {option.text}
                    </Button>
                  ))}
                </VStack>
              </VStack>
            </Card.Body>
          </Card.Root>

          {/* Навигация */}
          <HStack justify="space-between">
            <Button variant="ghost" onClick={prevQuestion} disabled={currentQuestion === 0}>
              <Icon as={FaArrowLeft} mr={2} />
              Назад
            </Button>

            {currentQuestion < questions.length - 1 ? (
              <Button colorPalette="fg" onClick={nextQuestion} disabled={!currentAnswer}>
                Далее
                <Icon as={FaArrowRight} ml={2} />
              </Button>
            ) : (
              <Button colorPalette="fg" onClick={finishQuiz} disabled={!allAnswered}>
                <Icon as={FaCheck} mr={2} />
                Завершить
              </Button>
            )}
          </HStack>
        </VStack>
      </Container>
    )
  }

  // Результат квиза
  if (view === 'result' && lastResult && currentQuiz) {
    const config = QUIZ_CONFIG[currentQuiz]
    const resultDesc = getResultDescription(currentQuiz, lastResult.result)

    if (!resultDesc) {
      return null
    }

    return (
      <Container maxW="2xl" py={8}>
        <VStack gap={6} align="stretch">
          {/* Заголовок */}
          <Button variant="ghost" size="sm" alignSelf="start" onClick={goToList}>
            <Icon as={FaArrowLeft} mr={2} />К списку квизов
          </Button>

          {/* Результат */}
          <Card.Root overflow="hidden">
            <Box bg={`${config.color}.100`} p={8} textAlign="center">
              <Text fontSize="6xl" mb={2}>
                {resultDesc.emoji}
              </Text>
              <Badge colorPalette={config.color} size="lg" mb={2}>
                {config.title}
              </Badge>
              <Heading size="xl">{resultDesc.name}</Heading>
            </Box>
            <Card.Body>
              <VStack align="stretch" gap={6}>
                {/* Описание */}
                <Text fontSize="lg" textAlign="center">
                  {resultDesc.description}
                </Text>

                {/* Характеристики (для стиля) */}
                {'characteristics' in resultDesc && (
                  <Box>
                    <Text fontWeight="medium" mb={2}>
                      Характеристики вашего стиля:
                    </Text>
                    <VStack align="stretch" gap={1}>
                      {resultDesc.characteristics.map((char) => (
                        <HStack key={char}>
                          <Text color={`${config.color}.500`}>•</Text>
                          <Text fontSize="sm">{char}</Text>
                        </HStack>
                      ))}
                    </VStack>
                  </Box>
                )}

                {/* Рекомендации (для стиля) */}
                {'recommendations' in resultDesc && (
                  <Box>
                    <Text fontWeight="medium" mb={2}>
                      Рекомендуемые вещи:
                    </Text>
                    <HStack gap={2} flexWrap="wrap">
                      {resultDesc.recommendations.map((rec) => (
                        <Badge key={rec} colorPalette={config.color} variant="subtle">
                          {rec}
                        </Badge>
                      ))}
                    </HStack>
                  </Box>
                )}

                {/* Цвета (для стиля) */}
                {'colors' in resultDesc && (
                  <Box>
                    <Text fontWeight="medium" mb={2}>
                      Ваша палитра:
                    </Text>
                    <HStack gap={2} flexWrap="wrap">
                      {resultDesc.colors.map((color) => (
                        <Badge key={color} variant="outline">
                          {color}
                        </Badge>
                      ))}
                    </HStack>
                  </Box>
                )}

                {/* Лучшие цвета (для цветотипа) */}
                {'bestColors' in resultDesc && (
                  <Box>
                    <Text fontWeight="medium" mb={2}>
                      Ваши лучшие цвета:
                    </Text>
                    <HStack gap={2} flexWrap="wrap">
                      {resultDesc.bestColors.map((color) => (
                        <Badge key={color} colorPalette="green" variant="subtle">
                          {color}
                        </Badge>
                      ))}
                    </HStack>
                  </Box>
                )}

                {/* Избегать (для цветотипа) */}
                {'avoidColors' in resultDesc && (
                  <Box>
                    <Text fontWeight="medium" mb={2}>
                      Избегать:
                    </Text>
                    <HStack gap={2} flexWrap="wrap">
                      {resultDesc.avoidColors.map((color) => (
                        <Badge key={color} colorPalette="red" variant="subtle">
                          {color}
                        </Badge>
                      ))}
                    </HStack>
                  </Box>
                )}

                {/* Металлы (для цветотипа) */}
                {'metals' in resultDesc && (
                  <Box>
                    <Text fontWeight="medium" mb={2}>
                      Украшения:
                    </Text>
                    <HStack gap={2} flexWrap="wrap">
                      {resultDesc.metals.map((metal) => (
                        <Badge key={metal} colorPalette="yellow" variant="subtle">
                          {metal}
                        </Badge>
                      ))}
                    </HStack>
                  </Box>
                )}

                {/* Для кого (для платья) */}
                {'bestFor' in resultDesc && (
                  <Box>
                    <Text fontWeight="medium" mb={2}>
                      Подходит для:
                    </Text>
                    <VStack align="stretch" gap={1}>
                      {resultDesc.bestFor.map((item) => (
                        <HStack key={item}>
                          <Text color={`${config.color}.500`}>•</Text>
                          <Text fontSize="sm">{item}</Text>
                        </HStack>
                      ))}
                    </VStack>
                  </Box>
                )}

                {/* Случаи (для платья) */}
                {'occasions' in resultDesc && (
                  <Box>
                    <Text fontWeight="medium" mb={2}>
                      Подходящие случаи:
                    </Text>
                    <HStack gap={2} flexWrap="wrap">
                      {resultDesc.occasions.map((occ) => (
                        <Badge key={occ} colorPalette={config.color} variant="subtle">
                          {occ}
                        </Badge>
                      ))}
                    </HStack>
                  </Box>
                )}

                {/* Чего избегать (для стиля) */}
                {'avoid' in resultDesc && (
                  <Box>
                    <Text fontWeight="medium" mb={2}>
                      Лучше избегать:
                    </Text>
                    <HStack gap={2} flexWrap="wrap">
                      {resultDesc.avoid.map((item) => (
                        <Badge key={item} colorPalette="red" variant="subtle">
                          {item}
                        </Badge>
                      ))}
                    </HStack>
                  </Box>
                )}

                {/* Распределение ответов */}
                <Box p={4} bg="bg.muted" borderRadius="md">
                  <Text fontWeight="medium" mb={2} fontSize="sm">
                    Распределение ваших ответов:
                  </Text>
                  <VStack align="stretch" gap={1}>
                    {Object.entries(lastResult.scores)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 4)
                      .map(([type, score]) => {
                        const typeDesc = getResultDescription(currentQuiz, type)
                        const maxScore = Object.values(lastResult.scores).reduce((a, b) => a + b, 0)
                        const percent = Math.round((score / maxScore) * 100)

                        return (
                          <HStack key={type} justify="space-between">
                            <Text fontSize="sm">
                              {typeDesc?.emoji} {typeDesc?.name}
                            </Text>
                            <HStack gap={2}>
                              <Progress.Root
                                value={percent}
                                size="sm"
                                w="80px"
                                colorPalette={type === lastResult.result ? config.color : 'gray'}
                              >
                                <Progress.Track>
                                  <Progress.Range />
                                </Progress.Track>
                              </Progress.Root>
                              <Text fontSize="xs" color="fg.muted" w="35px">
                                {percent}%
                              </Text>
                            </HStack>
                          </HStack>
                        )
                      })}
                  </VStack>
                </Box>

                {/* Кнопки */}
                <HStack gap={3}>
                  <Button flex={1} variant="outline" onClick={retakeQuiz}>
                    <Icon as={FaRedo} mr={2} />
                    Пройти заново
                  </Button>
                  <Button flex={1} colorPalette="fg" onClick={goToList}>
                    Другие квизы
                  </Button>
                </HStack>
              </VStack>
            </Card.Body>
          </Card.Root>
        </VStack>
      </Container>
    )
  }

  return null
}

// Вспомогательная функция для получения описания результата
function getResultDescription(quizType: QuizType, result: string) {
  switch (quizType) {
    case 'style':
      return STYLE_CONFIG[result as keyof typeof STYLE_CONFIG]
    case 'colorType':
      return COLOR_TYPE_CONFIG[result as keyof typeof COLOR_TYPE_CONFIG]
    case 'dress':
      return DRESS_STYLE_CONFIG[result as keyof typeof DRESS_STYLE_CONFIG]
  }
}
