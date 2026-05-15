import { Avatar, Box, Container, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { notFound, redirect } from 'next/navigation'

import { ReviewForm } from '@/app/_components/review-form'
import { getSession } from '@/lib/auth'
import { canReviewSchoolAction, createReviewAction } from '../../_actions/review.action'
import { ReviewFormSchema } from '../../_schemas/review-form.schema'

export const metadata = {
  title: 'Оставить отзыв о школе',
  description: 'Оцените вашу автошколу',
}

interface NewSchoolReviewPageProps {
  params: Promise<{ schoolId: string }>
}

export default async function NewSchoolReviewPage({ params }: NewSchoolReviewPageProps) {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/my-reviews')
  }

  const { schoolId } = await params

  // Проверяем возможность оставить отзыв
  const canReview = await canReviewSchoolAction(schoolId)

  if (!canReview.canReview) {
    return (
      <Container maxW="container.md" py={8}>
        <Box layerStyle="panel.error" p={6}>
          <Heading size="lg" color="error.fg">
            Невозможно оставить отзыв
          </Heading>
          <Text color="error.fg" mt={2}>
            {canReview.reason}
          </Text>
        </Box>
      </Container>
    )
  }

  if (!canReview.organization) {
    notFound()
  }

  const school = canReview.organization

  return (
    <Container maxW="container.md" py={8}>
      <VStack gap={6} align="stretch">
        <Box>
          <Heading size="xl">Оставить отзыв о школе</Heading>
          <Text color="fg.muted" mt={2}>
            Расскажите о своём опыте обучения в школе
          </Text>
        </Box>

        {/* Информация о школе */}
        <Box bg="bg.subtle" p={6} borderRadius="lg">
          <HStack gap={4}>
            <Avatar.Root size="lg">
              {school.logo && <Avatar.Image src={school.logo} />}
              <Avatar.Fallback>{school.name.charAt(0)}</Avatar.Fallback>
            </Avatar.Root>
            <Box>
              <Text fontWeight="bold" fontSize="lg">
                {school.name}
              </Text>
              <Text color="fg.muted">Автошкола</Text>
            </Box>
          </HStack>
        </Box>

        {/* Форма отзыва */}
        <Box bg="bg.panel" p={6} borderRadius="lg" borderWidth="1px">
          <ReviewForm action={createReviewAction} schema={ReviewFormSchema} organizationId={schoolId} />
        </Box>
      </VStack>
    </Container>
  )
}
