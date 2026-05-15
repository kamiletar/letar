import { Box, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { RatingDisplay } from '@letar/ui'
import { redirect } from 'next/navigation'

import { getSchoolReviewsAction } from '@/app/(student)/my-reviews/_actions/review.action'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

import { SchoolReviewsList } from '../_components/school-reviews-list'

export const metadata = {
  title: 'Отзывы о школе',
  description: 'Отзывы учеников о вашей школе',
}

interface SchoolReviewsPageProps {
  params: Promise<{ schoolId: string }>
}

export default async function SchoolReviewsPage({ params }: SchoolReviewsPageProps) {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/school/reviews')
  }

  const { schoolId } = await params

  // Проверяем, что пользователь - админ школы (организации)
  const membership = await prisma.member.findFirst({
    where: {
      organizationId: schoolId,
      userId: session.user.id,
      role: 'owner',
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          averageRating: true,
          reviewCount: true,
        },
      },
    },
  })

  if (!membership) {
    redirect('/school/reviews')
  }

  const result = await getSchoolReviewsAction(schoolId)

  if (!result.success) {
    return (
      <Box layerStyle="panel.error" p={6}>
        <Heading size="lg" color="error.fg">
          Ошибка
        </Heading>
        <Text color="error.fg" mt={2}>
          Не удалось загрузить отзывы
        </Text>
      </Box>
    )
  }

  const school = membership.organization

  return (
    <VStack gap={6} align="stretch">
      {/* Сводка рейтинга */}
      <HStack justify="flex-end">
        <Box bg="bg.subtle" p={4} borderRadius="lg">
          <Text fontSize="sm" color="fg.muted" mb={2}>
            Рейтинг школы
          </Text>
          <RatingDisplay rating={school.averageRating} reviewCount={school.reviewCount} size="lg" />
        </Box>
      </HStack>

      {result.reviews.length === 0 ? (
        <Box bg="bg.subtle" p={8} borderRadius="lg" textAlign="center">
          <Text color="fg.muted" mb={2}>
            У школы пока нет отзывов
          </Text>
          <Text color="fg.muted" fontSize="sm">
            Отзывы появятся после того, как ученики их оставят
          </Text>
        </Box>
      ) : (
        <SchoolReviewsList reviews={result.reviews} adminUserId={session.user.id} />
      )}
    </VStack>
  )
}
