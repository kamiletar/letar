import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'
import { RatingDisplay } from '@letar/ui'
import { redirect } from 'next/navigation'

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isInstructor } from '@/lib/roles'

import { getInstructorReviewsAction } from '@/app/(student)/my-reviews/_actions/review.action'

import { InstructorReviewsList } from './_components/instructor-reviews-list'

export const metadata = {
  title: 'Отзывы обо мне',
  description: 'Отзывы учеников о вашей работе',
}

export default async function InstructorReviewsPage() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/reviews')
  }

  if (!isInstructor(session.user.roles)) {
    redirect('/dashboard')
  }

  // Получаем профиль инструктора с рейтингом
  const profile = await prisma.instructorProfile.findFirst({
    where: { userId: session.user.id },
    select: {
      averageRating: true,
      reviewCount: true,
    },
  })

  const result = await getInstructorReviewsAction()

  if (!result.success) {
    return (
      <Container maxW="container.lg" py={8}>
        <Box layerStyle="panel.error" p={6}>
          <Heading size="lg" color="error.fg">
            Ошибка
          </Heading>
          <Text color="error.fg" mt={2}>
            {result.error === 'NO_PROFILE' ? 'Необходимо заполнить профиль инструктора' : 'Не удалось загрузить отзывы'}
          </Text>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxW="container.lg" py={8}>
      <VStack gap={6} align="stretch">
        <Box display="flex" justifyContent="space-between" alignItems="start" flexWrap="wrap" gap={4}>
          <Box>
            <Heading size="xl">Отзывы обо мне</Heading>
            <Text color="fg.muted" mt={2}>
              Что говорят ученики о ваших занятиях
            </Text>
          </Box>

          {/* Сводка рейтинга */}
          {profile && (
            <Box bg="bg.subtle" p={4} borderRadius="lg">
              <Text fontSize="sm" color="fg.muted" mb={2}>
                Ваш рейтинг
              </Text>
              <RatingDisplay rating={profile.averageRating} reviewCount={profile.reviewCount} size="lg" />
            </Box>
          )}
        </Box>

        {result.reviews.length === 0 ? (
          <Box bg="bg.subtle" p={8} borderRadius="lg" textAlign="center">
            <Text color="fg.muted" mb={2}>
              У вас пока нет отзывов
            </Text>
            <Text color="fg.muted" fontSize="sm">
              Отзывы появятся после того, как ученики завершат занятия
            </Text>
          </Box>
        ) : (
          <InstructorReviewsList reviews={result.reviews} instructorUserId={session.user.id} />
        )}
      </VStack>
    </Container>
  )
}
