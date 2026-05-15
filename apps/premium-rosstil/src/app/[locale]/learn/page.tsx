'use client'

import { toaster } from '@/app/_components/ui/toaster'
import type { CourseCategory } from '@/hooks/use-learning'
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
import { useState } from 'react'
import { FaBook, FaCheckCircle, FaClock, FaGraduationCap, FaLightbulb, FaPlay, FaStar, FaTimes } from 'react-icons/fa'

export default function LearnPage() {
  const { courses, isLoading, getCourseCompletionPercent, getDailyTip, markTipShown, categoryConfig } = useLearning()

  const [selectedCategory, setSelectedCategory] = useState<CourseCategory | 'all'>('all')

  const [tipDismissed, setTipDismissed] = useState(false)

  // Фильтрация курсов
  const filteredCourses = selectedCategory === 'all' ? courses : courses.filter((c) => c.category === selectedCategory)

  // Курсы в процессе
  const inProgressCourses = courses.filter((course) => {
    const progress = getCourseCompletionPercent(course.id)
    return progress > 0 && progress < 100
  })

  // Завершённые курсы
  const completedCoursesFiltered = courses.filter((course) => {
    const progress = getCourseCompletionPercent(course.id)
    return progress === 100
  })

  // Совет дня
  const dailyTip = getDailyTip()

  if (isLoading) {
    return (
      <Container maxW="6xl" py={8}>
        <Text>Загрузка...</Text>
      </Container>
    )
  }

  return (
    <Container maxW="6xl" py={8}>
      <VStack gap={6} align="stretch">
        {/* Заголовок */}
        <VStack align="start" gap={1}>
          <Heading size="xl">
            <Icon as={FaGraduationCap} mr={3} />
            Обучение
          </Heading>
          <Text color="fg.muted">Бесплатные курсы и советы по стилю</Text>
        </VStack>

        {/* Совет дня */}
        {dailyTip && !tipDismissed && (
          <Card.Root bg="yellow.subtle" borderColor="yellow.emphasized">
            <Card.Body>
              <HStack justify="space-between" align="start">
                <HStack gap={3} align="start">
                  <Icon as={FaLightbulb} color="yellow.600" boxSize={5} mt={1} />
                  <VStack align="start" gap={1}>
                    <Text fontWeight="bold" fontSize="sm">
                      Совет дня
                    </Text>
                    <Text fontSize="sm">{dailyTip.text}</Text>
                    <Badge variant="subtle" size="sm">
                      {categoryConfig[dailyTip.category as CourseCategory]?.emoji}{' '}
                      {categoryConfig[dailyTip.category as CourseCategory]?.name}
                    </Badge>
                  </VStack>
                </HStack>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    markTipShown(dailyTip.id)
                    setTipDismissed(true)
                    toaster.success({ title: 'Совет скрыт' })
                  }}
                >
                  <Icon as={FaTimes} />
                </Button>
              </HStack>
            </Card.Body>
          </Card.Root>
        )}

        {/* Статистика */}
        <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4}>
          <Card.Root>
            <Card.Body>
              <HStack gap={3}>
                <Box
                  w={12}
                  h={12}
                  borderRadius="lg"
                  bg="blue.subtle"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Icon as={FaBook} color="blue.600" boxSize={5} />
                </Box>
                <VStack align="start" gap={0}>
                  <Text fontSize="2xl" fontWeight="bold">
                    {courses.length}
                  </Text>
                  <Text fontSize="sm" color="fg.muted">
                    Всего курсов
                  </Text>
                </VStack>
              </HStack>
            </Card.Body>
          </Card.Root>

          <Card.Root>
            <Card.Body>
              <HStack gap={3}>
                <Box
                  w={12}
                  h={12}
                  borderRadius="lg"
                  bg="orange.subtle"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Icon as={FaPlay} color="orange.600" boxSize={5} />
                </Box>
                <VStack align="start" gap={0}>
                  <Text fontSize="2xl" fontWeight="bold">
                    {inProgressCourses.length}
                  </Text>
                  <Text fontSize="sm" color="fg.muted">
                    В процессе
                  </Text>
                </VStack>
              </HStack>
            </Card.Body>
          </Card.Root>

          <Card.Root>
            <Card.Body>
              <HStack gap={3}>
                <Box
                  w={12}
                  h={12}
                  borderRadius="lg"
                  bg="green.subtle"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Icon as={FaCheckCircle} color="green.600" boxSize={5} />
                </Box>
                <VStack align="start" gap={0}>
                  <Text fontSize="2xl" fontWeight="bold">
                    {completedCoursesFiltered.length}
                  </Text>
                  <Text fontSize="sm" color="fg.muted">
                    Завершено
                  </Text>
                </VStack>
              </HStack>
            </Card.Body>
          </Card.Root>
        </Grid>

        {/* Курсы в процессе */}
        {inProgressCourses.length > 0 && (
          <VStack align="stretch" gap={4}>
            <Heading size="md">
              <Icon as={FaPlay} mr={2} />
              Продолжить обучение
            </Heading>
            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
              {inProgressCourses.map((course) => {
                const progress = getCourseCompletionPercent(course.id)
                const catConfig = COURSE_CATEGORY_CONFIG[course.category]
                return (
                  <Card.Root key={course.id} asChild _hover={{ shadow: 'md' }} transition="all 0.2s">
                    <Link href={`/learn/${course.id}`}>
                      <Card.Body>
                        <VStack align="stretch" gap={3}>
                          <HStack justify="space-between">
                            <Badge variant="subtle">
                              {catConfig.emoji} {catConfig.name}
                            </Badge>
                            <Text fontSize="sm" fontWeight="bold" color="fg.muted">
                              {progress}%
                            </Text>
                          </HStack>
                          <Text fontWeight="bold">{course.title}</Text>
                          <Progress.Root value={progress} size="sm">
                            <Progress.Track>
                              <Progress.Range />
                            </Progress.Track>
                          </Progress.Root>
                          <Button size="sm" colorPalette="fg">
                            Продолжить
                          </Button>
                        </VStack>
                      </Card.Body>
                    </Link>
                  </Card.Root>
                )
              })}
            </Grid>
          </VStack>
        )}

        {/* Категории */}
        <Card.Root>
          <Card.Body>
            <VStack align="start" gap={3}>
              <Text fontWeight="medium" fontSize="sm">
                Категории
              </Text>
              <HStack gap={2} flexWrap="wrap">
                <Button
                  size="sm"
                  variant={selectedCategory === 'all' ? 'solid' : 'outline'}
                  colorPalette={selectedCategory === 'all' ? 'fg' : 'gray'}
                  onClick={() => setSelectedCategory('all')}
                >
                  Все курсы
                </Button>
                {(
                  Object.entries(COURSE_CATEGORY_CONFIG) as [
                    CourseCategory,
                    (typeof COURSE_CATEGORY_CONFIG)[CourseCategory],
                  ][]
                ).map(([cat, config]) => (
                  <Button
                    key={cat}
                    size="sm"
                    variant={selectedCategory === cat ? 'solid' : 'outline'}
                    colorPalette={selectedCategory === cat ? 'fg' : 'gray'}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {config.emoji} {config.name}
                  </Button>
                ))}
              </HStack>
            </VStack>
          </Card.Body>
        </Card.Root>

        {/* Каталог курсов */}
        <VStack align="stretch" gap={4}>
          <Heading size="md">
            <Icon as={FaBook} mr={2} />
            Каталог курсов ({filteredCourses.length})
          </Heading>

          {filteredCourses.length === 0 ? (
            <Card.Root>
              <Card.Body py={12} textAlign="center">
                <VStack gap={4}>
                  <Icon as={FaGraduationCap} boxSize={12} color="fg.muted" />
                  <Text color="fg.muted">Курсы в этой категории пока не добавлены</Text>
                </VStack>
              </Card.Body>
            </Card.Root>
          ) : (
            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={6}>
              {filteredCourses.map((course) => {
                const progress = getCourseCompletionPercent(course.id)
                const catConfig = COURSE_CATEGORY_CONFIG[course.category]
                const isCompleted = progress === 100
                const isStarted = progress > 0

                return (
                  <Card.Root key={course.id} overflow="hidden" _hover={{ shadow: 'lg' }} transition="all 0.2s">
                    {/* Обложка */}
                    <Box position="relative">
                      <Box
                        aspectRatio={16 / 9}
                        bg="bg.subtle"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Icon as={FaGraduationCap} boxSize={12} color="fg.muted" />
                      </Box>

                      {/* Категория */}
                      <Badge
                        position="absolute"
                        top={2}
                        left={2}
                        colorPalette="blackAlpha"
                        bg="blackAlpha.700"
                        color="white"
                      >
                        {catConfig.emoji} {catConfig.name}
                      </Badge>

                      {/* Статус */}
                      {isCompleted && (
                        <Badge position="absolute" top={2} right={2} colorPalette="green" bg="green.500" color="white">
                          <Icon as={FaCheckCircle} mr={1} />
                          Пройден
                        </Badge>
                      )}
                    </Box>

                    <Card.Body p={4}>
                      <VStack align="stretch" gap={3}>
                        {/* Мета информация */}
                        <HStack gap={3} fontSize="xs" color="fg.muted">
                          <HStack gap={1}>
                            <Icon as={FaBook} />
                            <Text>{course.lessons.length} уроков</Text>
                          </HStack>
                          <HStack gap={1}>
                            <Icon as={FaClock} />
                            <Text>{course.totalDuration} мин</Text>
                          </HStack>
                          <HStack gap={1}>
                            <Icon as={FaStar} />
                            <Text>
                              {course.difficulty === 'beginner'
                                ? 'Начальный'
                                : course.difficulty === 'intermediate'
                                  ? 'Средний'
                                  : 'Продвинутый'}
                            </Text>
                          </HStack>
                        </HStack>

                        {/* Заголовок */}
                        <Text fontWeight="bold" lineClamp={2}>
                          {course.title}
                        </Text>

                        {/* Описание */}
                        <Text fontSize="sm" color="fg.muted" lineClamp={2}>
                          {course.description}
                        </Text>

                        {/* Прогресс */}
                        {isStarted && (
                          <VStack align="stretch" gap={1}>
                            <HStack justify="space-between" fontSize="xs">
                              <Text color="fg.muted">Прогресс</Text>
                              <Text fontWeight="bold">{progress}%</Text>
                            </HStack>
                            <Progress.Root value={progress} size="sm">
                              <Progress.Track>
                                <Progress.Range />
                              </Progress.Track>
                            </Progress.Root>
                          </VStack>
                        )}

                        {/* Кнопка */}
                        <Button asChild colorPalette="fg" mt={2}>
                          <Link href={`/learn/${course.id}`}>
                            {isCompleted ? 'Повторить' : isStarted ? 'Продолжить' : 'Начать курс'}
                          </Link>
                        </Button>
                      </VStack>
                    </Card.Body>
                  </Card.Root>
                )
              })}
            </Grid>
          )}
        </VStack>
      </VStack>
    </Container>
  )
}
