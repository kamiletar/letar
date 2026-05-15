'use client'

import {
  Avatar,
  Box,
  Carousel,
  Container,
  Heading,
  HStack,
  IconButton,
  Stack,
  Text,
  useBreakpointValue,
} from '@chakra-ui/react'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'

export interface Review {
  id: string
  rating: number
  text: string
  authorName: string
  authorAvatar?: string | null
  authorRole: string
  createdAt: Date
}

export interface TestimonialsProps {
  reviews?: Review[]
}

// Статичные отзывы (fallback)
const fallbackReviews: Review[] = [
  {
    id: '1',
    rating: 5,
    text: 'Очень удобное приложение! Легко нашла инструктора и записалась на первое занятие. Расписание всегда под рукой.',
    authorName: 'Мария Иванова',
    authorRole: 'Ученица',
    createdAt: new Date(),
  },
  {
    id: '2',
    rating: 5,
    text: 'Платформа сняла с меня головную боль по учету учеников и времени. Теперь я могу сосредоточиться на обучении.',
    authorName: 'Алексей Петров',
    authorRole: 'Инструктор',
    createdAt: new Date(),
  },
  {
    id: '3',
    rating: 5,
    text: 'Отличный инструмент для управления процессами автошколы. Статистика и отчетность помогают развивать бизнес.',
    authorName: 'Елена Смирнова',
    authorRole: 'Администратор',
    createdAt: new Date(),
  },
  {
    id: '4',
    rating: 5,
    text: 'Удобный поиск инструкторов по районам и отзывам. Выбрал лучшего за пару минут!',
    authorName: 'Дмитрий Козлов',
    authorRole: 'Ученик',
    createdAt: new Date(),
  },
  {
    id: '5',
    rating: 4,
    text: 'Наконец-то нашла платформу, где всё продумано. Записаться на занятие можно в один клик.',
    authorName: 'Анна Сидорова',
    authorRole: 'Ученица',
    createdAt: new Date(),
  },
]

export function Testimonials({ reviews }: TestimonialsProps) {
  const displayReviews = reviews && reviews.length > 0 ? reviews : fallbackReviews

  // Адаптивное количество слайдов: 1 на мобильных, 2 на md, 3 на lg+
  const slidesPerPage = useBreakpointValue({ base: 1, md: 2, lg: 3 }) ?? 1

  return (
    <Box py={{ base: 16, md: 24 }} bg="bg.subtle" id="testimonials">
      <Container maxW="container.xl">
        <Stack gap={10} align="center">
          <Heading size="2xl" textAlign="center">
            Отзывы наших пользователей
          </Heading>

          <Box w="full" position="relative">
            <Carousel.Root slideCount={displayReviews.length} slidesPerPage={slidesPerPage} gap="6" loop allowMouseDrag>
              <Carousel.ItemGroup>
                {displayReviews.map((review, index) => (
                  <Carousel.Item key={review.id} index={index}>
                    <TestimonialCard review={review} />
                  </Carousel.Item>
                ))}
              </Carousel.ItemGroup>

              <Carousel.Control justifyContent="center" gap={4} mt={6}>
                <Carousel.PrevTrigger asChild>
                  <IconButton aria-label="Предыдущий" variant="outline" size="sm" rounded="full">
                    <ChevronLeft size={18} />
                  </IconButton>
                </Carousel.PrevTrigger>

                <Carousel.Indicators />

                <Carousel.NextTrigger asChild>
                  <IconButton aria-label="Следующий" variant="outline" size="sm" rounded="full">
                    <ChevronRight size={18} />
                  </IconButton>
                </Carousel.NextTrigger>
              </Carousel.Control>
            </Carousel.Root>
          </Box>
        </Stack>
      </Container>
    </Box>
  )
}

function TestimonialCard({ review }: { review: Review }) {
  return (
    <Box
      p={6}
      bg="bg.panel"
      borderRadius="xl"
      shadow="sm"
      borderWidth={1}
      h="full"
      display="flex"
      flexDirection="column"
    >
      {/* Звёзды */}
      <HStack mb={4} color="orange.400">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={`star-${i}`} size={16} fill={i < review.rating ? 'currentColor' : 'none'} />
        ))}
      </HStack>

      {/* Текст отзыва */}
      <Text fontSize="md" mb={6} fontStyle="italic" flex="1">
        "{review.text}"
      </Text>

      {/* Автор */}
      <HStack gap={3}>
        <Avatar.Root size="sm">
          {review.authorAvatar ? (
            <Avatar.Image src={review.authorAvatar} alt={review.authorName} />
          ) : (
            <Avatar.Fallback>{getInitials(review.authorName)}</Avatar.Fallback>
          )}
        </Avatar.Root>
        <Stack gap={0}>
          <Text fontWeight="semibold" fontSize="sm">
            {review.authorName}
          </Text>
          <Text color="fg.muted" fontSize="xs">
            {review.authorRole}
          </Text>
        </Stack>
      </HStack>
    </Box>
  )
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
