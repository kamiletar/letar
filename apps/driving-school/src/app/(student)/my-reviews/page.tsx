import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'
import { ReviewCard } from '@letar/ui'
import { redirect } from 'next/navigation'

import { getSession } from '@/lib/auth'

import { getMyReviewsAction } from './_actions/review.action'

export const metadata = {
  title: 'Мои отзывы',
  description: 'Отзывы, которые вы оставили',
}

export default async function MyReviewsPage() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/my-reviews')
  }

  const result = await getMyReviewsAction()

  if (!result.success) {
    return (
      <Container maxW="container.lg" py={8}>
        <Box layerStyle="panel.error" p={6}>
          <Heading size="lg" color="error.fg">
            Ошибка
          </Heading>
          <Text color="error.fg" mt={2}>
            Не удалось загрузить отзывы
          </Text>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxW="container.lg" py={8}>
      <VStack gap={6} align="stretch">
        <Box>
          <Heading size="xl">Мои отзывы</Heading>
          <Text color="fg.muted" mt={2}>
            Отзывы, которые вы оставили инструкторам и школам
          </Text>
        </Box>

        {result.reviews.length === 0 ? (
          <Box bg="bg.subtle" p={8} borderRadius="lg" textAlign="center">
            <Text color="fg.muted" mb={2}>
              Вы ещё не оставили ни одного отзыва
            </Text>
            <Text color="fg.muted" fontSize="sm">
              После завершения занятия вы сможете оценить работу инструктора
            </Text>
          </Box>
        ) : (
          <VStack gap={4} align="stretch">
            {result.reviews.map((review) => (
              <ReviewCard key={review.id} review={review} currentUserId={session.user.id} />
            ))}
          </VStack>
        )}
      </VStack>
    </Container>
  )
}
