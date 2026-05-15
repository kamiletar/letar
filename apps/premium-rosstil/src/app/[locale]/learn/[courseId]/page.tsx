'use client'

import { toaster } from '@/app/_components/ui/toaster'
import type { Lesson, QuizQuestion } from '@/hooks/use-learning'
import { COURSE_CATEGORY_CONFIG, useLearning } from '@/hooks/use-learning'
import { Link } from '@/i18n/navigation'
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
import { notFound } from 'next/navigation'
import { use, useState } from 'react'
import {
  FaArrowLeft,
  FaArrowRight,
  FaBook,
  FaCheck,
  FaCheckCircle,
  FaClock,
  FaGraduationCap,
  FaList,
  FaLock,
  FaPen,
  FaPlay,
  FaQuestion,
  FaTrophy,
} from 'react-icons/fa'

interface CoursePageProps {
  params: Promise<{ courseId: string }>
}

export default function CoursePage({ params }: CoursePageProps) {
  const { courseId } = use(params)
  const {
    getCourseById,
    getCourseProgress,
    getCourseCompletionPercent,
    startCourse,
    completeLesson,
    saveQuizScore,
    completeExercise,
    isCourseStarted,
    isCourseCompleted,
  } = useLearning()

  const [currentLessonIndex, setCurrentLessonIndex] = useState<number | null>(null)
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [exerciseCompleted, setExerciseCompleted] = useState(false)

  const course = getCourseById(courseId)

  if (!course) {
    notFound()
  }

  const progress = getCourseProgress(courseId)
  const completionPercent = getCourseCompletionPercent(courseId)
  const isStarted = isCourseStarted(courseId)
  const isCompleted = isCourseCompleted(courseId)
  const categoryConfig = COURSE_CATEGORY_CONFIG[course.category]

  // Текущий урок
  const currentLesson = currentLessonIndex !== null ? course.lessons[currentLessonIndex] : null

  // Проверить, пройден ли урок
  const isLessonCompleted = (lessonId: string) => {
    return progress?.completedLessons.includes(lessonId) ?? false
  }

  // Начать курс
  const handleStartCourse = async () => {
    await startCourse(courseId)
    setCurrentLessonIndex(0)
    toaster.success({ title: 'Курс начат!' })
  }

  // Продолжить с последнего урока
  const handleContinueCourse = () => {
    if (progress) {
      const nextLessonIndex = course.lessons.findIndex((l) => !progress.completedLessons.includes(l.id))
      setCurrentLessonIndex(nextLessonIndex >= 0 ? nextLessonIndex : 0)
    } else {
      setCurrentLessonIndex(0)
    }
  }

  // Открыть урок
  const handleOpenLesson = (index: number) => {
    // Проверить, доступен ли урок (предыдущие уроки должны быть пройдены)
    const allPreviousCompleted = course.lessons.slice(0, index).every((l) => isLessonCompleted(l.id))

    if (index === 0 || allPreviousCompleted) {
      setCurrentLessonIndex(index)
      setQuizAnswers({})
      setQuizSubmitted(false)
      setExerciseCompleted(false)
    } else {
      toaster.error({ title: 'Сначала пройдите предыдущие уроки' })
    }
  }

  // Завершить текущий урок
  const handleCompleteLesson = async () => {
    if (currentLesson) {
      await completeLesson(courseId, currentLesson.id)
      toaster.success({ title: 'Урок завершён!' })

      // Перейти к следующему уроку или закрыть
      if (currentLessonIndex !== null && currentLessonIndex < course.lessons.length - 1) {
        setCurrentLessonIndex(currentLessonIndex + 1)
        setQuizAnswers({})
        setQuizSubmitted(false)
        setExerciseCompleted(false)
      } else {
        setCurrentLessonIndex(null)
        toaster.success({ title: '🎉 Курс завершён! Поздравляем!', description: 'Вы прошли все уроки' })
      }
    }
  }

  // Отправить ответы квиза
  const handleSubmitQuiz = async () => {
    if (!currentLesson?.quizQuestions) {
      return
    }

    const totalQuestions = currentLesson.quizQuestions.length
    const correctAnswers = currentLesson.quizQuestions.filter((q) => quizAnswers[q.id] === q.correctIndex).length
    const score = Math.round((correctAnswers / totalQuestions) * 100)

    await saveQuizScore(courseId, currentLesson.id, score)
    setQuizSubmitted(true)

    if (score >= 70) {
      toaster.success({
        title: `Отлично! ${score}% правильных ответов`,
        description: 'Вы можете перейти к следующему уроку',
      })
    } else {
      toaster.error({
        title: `${score}% правильных ответов`,
        description: 'Попробуйте ещё раз для лучшего результата',
      })
    }
  }

  // Отметить упражнение выполненным
  const handleCompleteExercise = async () => {
    if (currentLesson) {
      await completeExercise(courseId, currentLesson.id)
      setExerciseCompleted(true)
      toaster.success({ title: 'Упражнение выполнено!' })
    }
  }

  // Вернуться к списку уроков
  const handleBackToLessons = () => {
    setCurrentLessonIndex(null)
  }

  // Отрисовка содержимого урока
  const renderLessonContent = (lesson: Lesson) => {
    switch (lesson.type) {
      case 'text':
        return renderMarkdown(lesson.content)
      case 'quiz':
        return renderQuiz(lesson)
      case 'exercise':
        return renderExercise(lesson)
      default:
        return null
    }
  }

  // Простой рендеринг Markdown
  const renderMarkdown = (content: string) => {
    const lines = content.split('\n')
    const elements: React.ReactNode[] = []
    let currentList: string[] = []
    let listType: 'ul' | 'ol' | null = null

    const flushList = () => {
      if (currentList.length > 0 && listType) {
        const ListTag = listType === 'ol' ? 'ol' : 'ul'
        elements.push(
          <Box
            key={elements.length}
            as={ListTag}
            pl={6}
            my={2}
            css={{
              '& li': { marginBottom: '0.25rem' },
            }}
          >
            {/* oxlint-disable-next-line eslint-plugin-react(no-array-index-key) -- Markdown парсер: элементы списка могут повторяться */}
            {currentList.map((item, i) => (
              <li key={`list-${i}`}>{item}</li>
            ))}
          </Box>
        )
        currentList = []
        listType = null
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Заголовки
      if (line.startsWith('# ')) {
        flushList()
        elements.push(
          <Heading key={i} size="xl" mt={6} mb={4}>
            {line.substring(2)}
          </Heading>
        )
        continue
      }
      if (line.startsWith('## ')) {
        flushList()
        elements.push(
          <Heading key={i} size="lg" mt={6} mb={3}>
            {line.substring(3)}
          </Heading>
        )
        continue
      }
      if (line.startsWith('### ')) {
        flushList()
        elements.push(
          <Heading key={i} size="md" mt={4} mb={2}>
            {line.substring(4)}
          </Heading>
        )
        continue
      }

      // Маркированный список
      if (line.startsWith('- ') || line.startsWith('* ')) {
        if (listType !== 'ul') {
          flushList()
          listType = 'ul'
        }
        currentList.push(line.substring(2))
        continue
      }

      // Нумерованный список
      if (line.match(/^\d+\.\s/)) {
        if (listType !== 'ol') {
          flushList()
          listType = 'ol'
        }
        currentList.push(line.replace(/^\d+\.\s/, ''))
        continue
      }

      // Эмодзи линии
      if (line.startsWith('❌') || line.startsWith('✅') || line.startsWith('⚠️')) {
        flushList()
        elements.push(
          <Text key={i} fontSize="sm" my={1}>
            {line}
          </Text>
        )
        continue
      }

      // Пустая строка
      if (!line.trim()) {
        flushList()
        continue
      }

      // Обычный параграф
      flushList()
      let text = line
      text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      text = text.replace(/\*(.+?)\*/g, '<em>$1</em>')

      elements.push(<Text key={i} my={2} dangerouslySetInnerHTML={{ __html: text }} />)
    }

    flushList()
    return elements
  }

  // Рендеринг квиза
  const renderQuiz = (lesson: Lesson) => {
    if (!lesson.quizQuestions) {
      return null
    }

    const totalQuestions = lesson.quizQuestions.length
    const answeredCount = Object.keys(quizAnswers).length
    const allAnswered = answeredCount === totalQuestions

    return (
      <VStack align="stretch" gap={6}>
        <Text color="fg.muted">
          Ответьте на все вопросы, чтобы пройти тест. Нужно набрать минимум 70% для прохождения.
        </Text>

        {lesson.quizQuestions.map((question, qIndex) => (
          <QuizQuestionCard
            key={question.id}
            question={question}
            questionNumber={qIndex + 1}
            selectedAnswer={quizAnswers[question.id]}
            onSelectAnswer={(answerIndex) => {
              if (!quizSubmitted) {
                setQuizAnswers({ ...quizAnswers, [question.id]: answerIndex })
              }
            }}
            showResult={quizSubmitted}
          />
        ))}

        <HStack justify="space-between">
          <Text fontSize="sm" color="fg.muted">
            Отвечено: {answeredCount} из {totalQuestions}
          </Text>

          {!quizSubmitted ? (
            <Button colorPalette="fg" disabled={!allAnswered} onClick={handleSubmitQuiz}>
              Проверить ответы
            </Button>
          ) : (
            <HStack gap={2}>
              <Button
                variant="outline"
                onClick={() => {
                  setQuizAnswers({})
                  setQuizSubmitted(false)
                }}
              >
                Пройти снова
              </Button>
              <Button colorPalette="fg" onClick={handleCompleteLesson}>
                Завершить урок
              </Button>
            </HStack>
          )}
        </HStack>
      </VStack>
    )
  }

  // Рендеринг упражнения
  const renderExercise = (lesson: Lesson) => {
    return (
      <VStack align="stretch" gap={6}>
        <Text color="fg.muted">Выполните практическое задание и отметьте его как выполненное.</Text>

        <Card.Root bg="bg.subtle">
          <Card.Body>{lesson.exerciseTask && renderMarkdown(lesson.exerciseTask)}</Card.Body>
        </Card.Root>

        <HStack justify="flex-end">
          {!exerciseCompleted ? (
            <Button colorPalette="fg" onClick={handleCompleteExercise}>
              <Icon as={FaCheck} mr={2} />
              Отметить как выполненное
            </Button>
          ) : (
            <HStack gap={2}>
              <Badge colorPalette="green" size="lg">
                <Icon as={FaCheckCircle} mr={1} />
                Выполнено
              </Badge>
              <Button colorPalette="fg" onClick={handleCompleteLesson}>
                Завершить урок
              </Button>
            </HStack>
          )}
        </HStack>
      </VStack>
    )
  }

  // Если открыт урок - показываем его
  if (currentLesson && currentLessonIndex !== null) {
    const isLastLesson = currentLessonIndex === course.lessons.length - 1
    const canComplete =
      currentLesson.type === 'text' ||
      (currentLesson.type === 'quiz' && quizSubmitted) ||
      (currentLesson.type === 'exercise' && exerciseCompleted)

    return (
      <Container maxW="4xl" py={8}>
        <VStack gap={6} align="stretch">
          {/* Навигация */}
          <HStack justify="space-between">
            <Button variant="ghost" size="sm" onClick={handleBackToLessons}>
              <Icon as={FaList} mr={2} />К списку уроков
            </Button>
            <Text fontSize="sm" color="fg.muted">
              Урок {currentLessonIndex + 1} из {course.lessons.length}
            </Text>
          </HStack>

          {/* Прогресс */}
          <Progress.Root value={((currentLessonIndex + 1) / course.lessons.length) * 100} size="sm">
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>

          {/* Заголовок урока */}
          <VStack align="start" gap={2}>
            <HStack gap={2}>
              <Badge variant="subtle">
                {currentLesson.type === 'text' && (
                  <>
                    <Icon as={FaBook} mr={1} /> Теория
                  </>
                )}
                {currentLesson.type === 'quiz' && (
                  <>
                    <Icon as={FaQuestion} mr={1} /> Тест
                  </>
                )}
                {currentLesson.type === 'exercise' && (
                  <>
                    <Icon as={FaPen} mr={1} /> Практика
                  </>
                )}
              </Badge>
              <Badge variant="outline">
                <Icon as={FaClock} mr={1} />
                {currentLesson.duration} мин
              </Badge>
            </HStack>
            <Heading size="xl">{currentLesson.title}</Heading>
          </VStack>

          {/* Контент урока */}
          <Box>{renderLessonContent(currentLesson)}</Box>

          {/* Навигация между уроками */}
          <HStack justify="space-between" pt={4}>
            <Button
              variant="outline"
              disabled={currentLessonIndex === 0}
              onClick={() => {
                setCurrentLessonIndex(currentLessonIndex - 1)
                setQuizAnswers({})
                setQuizSubmitted(false)
                setExerciseCompleted(false)
              }}
            >
              <Icon as={FaArrowLeft} mr={2} />
              Назад
            </Button>

            {currentLesson.type === 'text' && (
              <Button colorPalette="fg" onClick={handleCompleteLesson}>
                {isLastLesson ? 'Завершить курс' : 'Следующий урок'}
                <Icon as={FaArrowRight} ml={2} />
              </Button>
            )}

            {(currentLesson.type === 'quiz' || currentLesson.type === 'exercise') && canComplete && (
              <Button colorPalette="fg" onClick={handleCompleteLesson}>
                {isLastLesson ? 'Завершить курс' : 'Следующий урок'}
                <Icon as={FaArrowRight} ml={2} />
              </Button>
            )}
          </HStack>
        </VStack>
      </Container>
    )
  }

  // Список уроков курса
  return (
    <Container maxW="4xl" py={8}>
      <VStack gap={6} align="stretch">
        {/* Навигация */}
        <Button asChild variant="ghost" size="sm" alignSelf="flex-start">
          <Link href="/learn">
            <Icon as={FaArrowLeft} mr={2} />
            Все курсы
          </Link>
        </Button>

        {/* Заголовок курса */}
        <VStack align="start" gap={4}>
          <HStack gap={2}>
            <Badge colorPalette="fg">
              {categoryConfig.emoji} {categoryConfig.name}
            </Badge>
            <Badge variant="outline">
              {course.difficulty === 'beginner'
                ? 'Начальный'
                : course.difficulty === 'intermediate'
                  ? 'Средний'
                  : 'Продвинутый'}
            </Badge>
            {course.certificate && (
              <Badge colorPalette="yellow">
                <Icon as={FaTrophy} mr={1} />С сертификатом
              </Badge>
            )}
          </HStack>

          <Heading size="2xl">{course.title}</Heading>
          <Text fontSize="lg" color="fg.muted">
            {course.description}
          </Text>

          {/* Мета информация */}
          <HStack gap={4} fontSize="sm" color="fg.muted">
            <HStack gap={2}>
              <Icon as={FaBook} />
              <Text>{course.lessons.length} уроков</Text>
            </HStack>
            <HStack gap={2}>
              <Icon as={FaClock} />
              <Text>{course.totalDuration} мин</Text>
            </HStack>
          </HStack>

          {/* Прогресс */}
          {isStarted && (
            <VStack align="stretch" gap={2} w="full">
              <HStack justify="space-between" fontSize="sm">
                <Text color="fg.muted">Ваш прогресс</Text>
                <Text fontWeight="bold">{completionPercent}%</Text>
              </HStack>
              <Progress.Root value={completionPercent} size="md">
                <Progress.Track>
                  <Progress.Range />
                </Progress.Track>
              </Progress.Root>
            </VStack>
          )}

          {/* Кнопки действий */}
          <HStack gap={4}>
            {!isStarted ? (
              <Button colorPalette="fg" size="lg" onClick={handleStartCourse}>
                <Icon as={FaPlay} mr={2} />
                Начать курс
              </Button>
            ) : isCompleted ? (
              <Button colorPalette="fg" size="lg" onClick={() => handleOpenLesson(0)}>
                <Icon as={FaGraduationCap} mr={2} />
                Пройти снова
              </Button>
            ) : (
              <Button colorPalette="fg" size="lg" onClick={handleContinueCourse}>
                <Icon as={FaPlay} mr={2} />
                Продолжить
              </Button>
            )}
          </HStack>
        </VStack>

        {/* Завершение курса */}
        {isCompleted && (
          <Card.Root bg="green.subtle" borderColor="green.emphasized">
            <Card.Body>
              <HStack gap={4}>
                <Icon as={FaTrophy} boxSize={10} color="green.600" />
                <VStack align="start" gap={1}>
                  <Text fontWeight="bold" fontSize="lg">
                    🎉 Курс завершён!
                  </Text>
                  <Text fontSize="sm" color="fg.muted">
                    Поздравляем! Вы прошли все уроки этого курса.
                  </Text>
                </VStack>
              </HStack>
            </Card.Body>
          </Card.Root>
        )}

        {/* Список уроков */}
        <VStack align="stretch" gap={4}>
          <Heading size="lg">
            <Icon as={FaList} mr={2} />
            Программа курса
          </Heading>

          <Grid gap={3}>
            {course.lessons.map((lesson, index) => {
              const completed = isLessonCompleted(lesson.id)
              const previousCompleted =
                index === 0 || course.lessons.slice(0, index).every((l) => isLessonCompleted(l.id))
              const isLocked = !previousCompleted && !completed

              return (
                <Card.Root
                  key={lesson.id}
                  cursor={isLocked ? 'not-allowed' : 'pointer'}
                  opacity={isLocked ? 0.6 : 1}
                  _hover={isLocked ? {} : { shadow: 'md' }}
                  transition="all 0.2s"
                  onClick={() => {
                    if (!isLocked) {
                      handleOpenLesson(index)
                    }
                  }}
                >
                  <Card.Body>
                    <HStack justify="space-between">
                      <HStack gap={4}>
                        {/* Номер/статус */}
                        <Box
                          w={10}
                          h={10}
                          borderRadius="full"
                          bg={completed ? 'green.500' : isLocked ? 'bg.muted' : 'fg.subtle'}
                          color={completed ? 'white' : isLocked ? 'fg.muted' : 'fg'}
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          fontWeight="bold"
                        >
                          {completed ? <Icon as={FaCheck} /> : isLocked ? <Icon as={FaLock} /> : index + 1}
                        </Box>

                        {/* Информация */}
                        <VStack align="start" gap={1}>
                          <Text fontWeight="medium">{lesson.title}</Text>
                          <HStack gap={3} fontSize="xs" color="fg.muted">
                            <HStack gap={1}>
                              {lesson.type === 'text' && <Icon as={FaBook} />}
                              {lesson.type === 'quiz' && <Icon as={FaQuestion} />}
                              {lesson.type === 'exercise' && <Icon as={FaPen} />}
                              <Text>
                                {lesson.type === 'text' && 'Теория'}
                                {lesson.type === 'quiz' && 'Тест'}
                                {lesson.type === 'exercise' && 'Практика'}
                              </Text>
                            </HStack>
                            <HStack gap={1}>
                              <Icon as={FaClock} />
                              <Text>{lesson.duration} мин</Text>
                            </HStack>
                          </HStack>
                        </VStack>
                      </HStack>

                      {/* Статус */}
                      {completed && <Badge colorPalette="green">Пройден</Badge>}
                      {!completed && !isLocked && isStarted && <Badge colorPalette="blue">Доступен</Badge>}
                    </HStack>
                  </Card.Body>
                </Card.Root>
              )
            })}
          </Grid>
        </VStack>
      </VStack>
    </Container>
  )
}

/**
 * Компонент вопроса квиза
 */
function QuizQuestionCard({
  question,
  questionNumber,
  selectedAnswer,
  onSelectAnswer,
  showResult,
}: {
  question: QuizQuestion
  questionNumber: number
  selectedAnswer?: number
  onSelectAnswer: (index: number) => void
  showResult: boolean
}) {
  return (
    <Card.Root>
      <Card.Body>
        <VStack align="stretch" gap={4}>
          <Text fontWeight="bold">
            {questionNumber}. {question.question}
          </Text>

          <VStack align="stretch" gap={2}>
            {question.options.map((option, index) => {
              const isSelected = selectedAnswer === index
              const isCorrect = index === question.correctIndex
              let bg = 'bg.subtle'
              let borderColor = 'border.subtle'

              if (showResult) {
                if (isCorrect) {
                  bg = 'green.subtle'
                  borderColor = 'green.500'
                } else if (isSelected && !isCorrect) {
                  bg = 'red.subtle'
                  borderColor = 'red.500'
                }
              } else if (isSelected) {
                bg = 'fg.subtle'
                borderColor = 'fg.emphasized'
              }

              return (
                <Box
                  key={`${question.id}-option-${option}`}
                  p={3}
                  bg={bg}
                  borderWidth="1px"
                  borderColor={borderColor}
                  borderRadius="md"
                  cursor={showResult ? 'default' : 'pointer'}
                  onClick={() => {
                    if (!showResult) {
                      onSelectAnswer(index)
                    }
                  }}
                  _hover={showResult ? {} : { bg: 'bg.muted' }}
                  transition="all 0.2s"
                >
                  <HStack justify="space-between">
                    <Text fontSize="sm">{option}</Text>
                    {showResult && isCorrect && <Icon as={FaCheckCircle} color="green.500" />}
                  </HStack>
                </Box>
              )
            })}
          </VStack>

          {showResult && question.explanation && (
            <Box p={3} bg="blue.subtle" borderRadius="md">
              <Text fontSize="sm" color="blue.800">
                💡 {question.explanation}
              </Text>
            </Box>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
