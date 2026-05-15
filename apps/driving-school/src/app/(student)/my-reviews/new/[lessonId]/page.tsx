import { Avatar, Box, Container, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { notFound, redirect } from 'next/navigation'

import { ReviewForm } from '@/app/_components/review-form'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

import { canReviewLessonAction, createReviewAction } from '../../_actions/review.action'
import { ReviewFormSchema } from '../../_schemas/review-form.schema'

export const metadata = {
  title: 'Оставить отзыв',
  description: 'Оцените занятие с инструктором',
}

interface NewReviewPageProps {
  params: Promise<{ lessonId: string }>
}

export default async function NewReviewPage({ params }: NewReviewPageProps) {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/my-reviews')
  }

  const { lessonId } = await params

  // Проверяем возможность оставить отзыв
  const canReview = await canReviewLessonAction(lessonId)

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

  // Получаем информацию о занятии
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      instructor: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      slot: {
        select: {
          startTime: true,
          endTime: true,
        },
      },
      lessonType: {
        select: {
          name: true,
        },
      },
    },
  })

  if (!lesson) {
    notFound()
  }

  const formattedDate = format(new Date(lesson.slot.startTime), 'd MMMM yyyy, HH:mm', { locale: ru })

  return (
    <Container maxW="container.md" py={8}>
      <VStack gap={6} align="stretch">
        <Box>
          <Heading size="xl">Оставить отзыв</Heading>
          <Text color="fg.muted" mt={2}>
            Расскажите о своём опыте обучения
          </Text>
        </Box>

        {/* Информация о занятии */}
        <Box bg="bg.subtle" p={6} borderRadius="lg">
          <HStack gap={4}>
            <Avatar.Root size="lg">
              {lesson.instructor.image && <Avatar.Image src={lesson.instructor.image} />}
              <Avatar.Fallback>{lesson.instructor.name?.charAt(0) ?? '?'}</Avatar.Fallback>
            </Avatar.Root>
            <Box>
              <Text fontWeight="bold" fontSize="lg">
                {lesson.instructor.name}
              </Text>
              <Text color="fg.muted">
                {lesson.lessonType?.name || 'Занятие'} • {formattedDate}
              </Text>
            </Box>
          </HStack>
        </Box>

        {/* Форма отзыва */}
        <Box bg="bg.panel" p={6} borderRadius="lg" borderWidth="1px">
          <ReviewForm action={createReviewAction} schema={ReviewFormSchema} lessonId={lessonId} />
        </Box>
      </VStack>
    </Container>
  )
}
